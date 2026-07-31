import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  EA_CODE_LENGTH,
  EA_CODE_MAX_ATTEMPTS,
  EA_CODE_RESEND_SEC,
  EA_CODE_TTL_SEC,
  EARLY_ACCESS_EVENTS,
  TOPICS,
  type EarlyAccessCodeReq,
  type EarlyAccessCodeRes,
  type EarlyAccessJoinRes,
  type EarlyAccessStatsRes,
  type EarlyAccessStatusRes,
  type EarlyAccessVerifyReq,
  type TraderProfile,
} from "@heropips/contracts";
import { apiError } from "../common/errors";
import { generateNumericCode, generateReferralCode } from "../common/codes";
import { GROWTH_CONFIG, type GrowthConfig } from "../common/config";
import { effectivePosition, jumpsFor, maskEmail } from "../common/position";
import { signStatusToken, verifyStatusToken } from "../common/token";
import { hashVerificationCode, verificationCodeMatches } from "../common/verification";
import { makeEnvelope } from "../outbox/outbox.service";
import { MessagingService } from "../messaging/messaging.service";
import * as T from "../messaging/templates/library";
import { EARLY_ACCESS_REPO, type EarlyAccessRepo, type EarlyAccessEntryRow } from "./early-access.repo";

/* =========================================================================
 * Early access — email-first, code-verified signup.
 *
 *   POST /code    issue + email a 6-digit code (never stored in plaintext)
 *   POST /verify   check the code, THEN create the queue entry
 *
 * Nothing reaches waitlist_entries until an address proves it can receive
 * mail, so the launch-invite list is deliverable by construction.
 * ======================================================================= */

const DAY_MS = 86_400_000;

/** Trader-profile enum → the label an operator reads in the signup email. */
const PROFILE_LABELS = {
  experience: {
    first_time: "First time trading",
    under_1y: "Under a year trading",
    "1_3y": "1–3 years trading",
    "3y_plus": "3+ years trading",
  },
  markets: {
    forex: "Forex",
    crypto: "Crypto",
    stocks: "Stocks",
    indices: "Indices",
    commodities: "Commodities",
  },
  platforms: {
    mt4_mt5: "MT4 / MT5",
    binance: "Binance",
    kucoin: "KuCoin",
    tradingview: "TradingView",
    other: "Somewhere else",
  },
  terminology: {
    fluent: "Fluent in the terminology",
    getting_there: "Getting there on terminology",
    new_to_me: "Terminology is new to them",
  },
} as const;

function describeProfile(profile: TraderProfile | undefined): string[] {
  if (!profile) return [];
  const lines: string[] = [];
  if (profile.experience) lines.push(PROFILE_LABELS.experience[profile.experience]);
  if (profile.markets && profile.markets.length > 0) {
    lines.push(`Trades: ${profile.markets.map((m) => PROFILE_LABELS.markets[m]).join(", ")}`);
  }
  if (profile.platforms && profile.platforms.length > 0) {
    lines.push(`Platforms: ${profile.platforms.map((p) => PROFILE_LABELS.platforms[p]).join(", ")}`);
  }
  if (profile.terminology) lines.push(PROFILE_LABELS.terminology[profile.terminology]);
  return lines;
}

@Injectable()
export class EarlyAccessService {
  private readonly logger = new Logger(EarlyAccessService.name);

  // Explicit tokens: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(
    @Inject(EARLY_ACCESS_REPO) private readonly repo: EarlyAccessRepo,
    @Inject(MessagingService) private readonly messaging: MessagingService,
    @Inject(GROWTH_CONFIG) private readonly cfg: GrowthConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* ---------------------------------------------------------- step 1: code */

  async requestCode(req: EarlyAccessCodeReq): Promise<EarlyAccessCodeRes> {
    // Normalise here rather than trusting the caller: the whole flow keys off
    // this string (hash, lookup, mask) and a case mismatch would split them.
    const email = req.email.trim().toLowerCase();
    const now = this.now();

    const pending = await this.repo.findVerification(email);
    if (pending) {
      const waited = Math.floor((now.getTime() - pending.lastSentAt.getTime()) / 1000);
      const remaining = EA_CODE_RESEND_SEC - waited;
      if (remaining > 0) {
        throw apiError(
          429,
          "rate_limited",
          `A code was just sent to this address. Wait ${remaining}s before asking for another.`,
          "Check your inbox and spam folder — the first code is still valid.",
        );
      }
    }

    // Only the inbox owner learns whether the address is already on the list:
    // it changes the email copy, never the HTTP response.
    const known = (await this.repo.findByEmail(email)) !== null;
    const code = this.cfg.devVerificationCode ?? generateNumericCode(EA_CODE_LENGTH);
    const issued = await this.repo.issueVerification({
      email,
      codeHash: hashVerificationCode(email, code),
      expiresAt: new Date(now.getTime() + EA_CODE_TTL_SEC * 1000),
      sentAt: now,
    });

    const result = await this.messaging.dispatch(
      T.eaVerifyCode,
      { code, expiresMinutes: Math.round(EA_CODE_TTL_SEC / 60), known },
      email,
      // Keyed on the issuance instant, not a counter: verifying deletes the
      // row, so `sends` restarts at 1 and would collide with an earlier send —
      // the dedupe ledger would then swallow the new code silently.
      `tx:ea_code:${email}:${issued.lastSentAt.getTime()}`,
    );
    if (result === "failed") {
      throw apiError(
        502,
        "internal",
        "We couldn't send the code to that address.",
        "Check the spelling and try again in a moment.",
      );
    }

    return {
      email_masked: maskEmail(email),
      expires_in: EA_CODE_TTL_SEC,
      resend_in: EA_CODE_RESEND_SEC,
      ...(this.cfg.devVerificationCode !== null ? { dev_code: this.cfg.devVerificationCode } : {}),
    };
  }

  /* -------------------------------------------------------- step 2: verify */

  async verify(req: EarlyAccessVerifyReq): Promise<EarlyAccessJoinRes> {
    const email = req.email.trim().toLowerCase();
    const now = this.now();

    const pending = await this.repo.findVerification(email);
    if (!pending) {
      throw apiError(
        401,
        "verification_required",
        "That code is no longer active.",
        "Request a fresh code and enter it within 15 minutes.",
      );
    }
    if (pending.expiresAt.getTime() <= now.getTime()) {
      await this.repo.clearVerification(email);
      throw apiError(
        401,
        "verification_code_expired",
        "That code expired.",
        "Request a new one — it takes a second.",
      );
    }
    if (!verificationCodeMatches(email, req.code, pending.codeHash)) {
      const attempts = await this.repo.bumpVerificationAttempts(email);
      const left = EA_CODE_MAX_ATTEMPTS - attempts;
      if (left <= 0) {
        await this.repo.clearVerification(email);
        throw apiError(
          401,
          "verification_code_invalid",
          "Too many wrong codes.",
          "Request a new code to try again.",
        );
      }
      throw apiError(
        401,
        "verification_code_invalid",
        `That code doesn't match. ${left} ${left === 1 ? "try" : "tries"} left.`,
        "Check the most recent email — older codes stop working.",
      );
    }

    await this.repo.clearVerification(email);
    const joined = await this.join({ ...req, email }, now);

    if (!joined.result.duplicate) {
      await this.notifyAdmin(req, joined.entry, joined.result, now);
    }
    return joined.result;
  }

  /* ------------------------------------------------------------ the queue */

  private async join(
    req: EarlyAccessVerifyReq,
    verifiedAt: Date,
  ): Promise<{ result: EarlyAccessJoinRes; entry: EarlyAccessEntryRow; referrerCode: string | null }> {
    return this.repo.joinTx(async (ops) => {
      const email = req.email; // already normalised by verify()

      const existing = await ops.findByEmail(email);
      if (existing) {
        // Answers given this time replace the stored ones; skipping the
        // questions must never wipe what they told us before.
        if (req.profile) await ops.updateProfile(existing.id, req.profile);
        const total = await ops.countEntries();
        const referrals = await ops.countReferrals(existing.id);
        return {
          entry: existing,
          referrerCode: null,
          result: {
            position: effectivePosition(existing.basePosition, referrals),
            total,
            code: existing.code,
            status_token: signStatusToken({ e: existing.email }),
            duplicate: true,
          },
        };
      }

      let referredBy: string | null = null;
      let referrerCode: string | null = null;
      if (req.ref) {
        const referrer = await ops.findByCode(req.ref);
        // Unknown codes are silently ignored; self-referral is impossible to honor.
        if (referrer && referrer.email !== email) {
          referredBy = referrer.id;
          referrerCode = referrer.code;
        }
      }

      let code = generateReferralCode();
      for (let attempt = 0; attempt < 5 && (await ops.findByCode(code)) !== null; attempt++) {
        code = generateReferralCode();
      }

      const basePosition = (await ops.countEntries()) + 1;
      const entry = await ops.insertEntry({
        email,
        code,
        referredBy,
        basePosition,
        utm: boundUtm(req.utm),
        profile: req.profile ?? null,
        verifiedAt,
      });

      const position = effectivePosition(entry.basePosition, 0);
      await ops.insertOutbox(
        TOPICS.growthEvents,
        makeEnvelope(EARLY_ACCESS_EVENTS.joined, {
          // ids, not raw PII, on the bus — the messaging consumer re-reads
          // the entry from this same database for email/code enrichment.
          entry_id: entry.id,
          referrer_entry_id: referredBy,
          email_masked: maskEmail(email),
          position,
          ref: referredBy !== null,
          profiled: req.profile !== undefined,
        }),
      );

      return {
        entry,
        referrerCode,
        result: {
          position,
          total: basePosition,
          code: entry.code,
          status_token: signStatusToken({ e: email }),
          duplicate: false,
        },
      };
    });
  }

  /**
   * Operational heads-up on every verified signup. Best-effort by design: a
   * mail problem on our side must never fail a signup that already committed.
   */
  private async notifyAdmin(
    req: EarlyAccessVerifyReq,
    entry: EarlyAccessEntryRow,
    result: EarlyAccessJoinRes,
    at: Date,
  ): Promise<void> {
    const to = this.cfg.adminNotifyEmail;
    if (to === null) return;
    try {
      await this.messaging.dispatch(
        T.adminEarlyAccessSignup,
        {
          email: entry.email,
          position: result.position,
          total: result.total,
          code: entry.code,
          referredByCode: req.ref ?? null,
          profileLines: describeProfile(req.profile),
          joinedAt: at.toISOString().replace("T", " ").slice(0, 16),
        },
        to,
        `tx:admin_ea_signup:${entry.id}`,
      );
    } catch (err) {
      this.logger.warn(`admin signup notice failed for entry=${entry.id}: ${String(err)}`);
    }
  }

  /* ------------------------------------------------------- read-only views */

  async stats(): Promise<EarlyAccessStatsRes> {
    const now = this.now().getTime();
    const [total, joinedToday, joinedWeek] = await Promise.all([
      this.repo.countEntries(),
      this.repo.countEntriesSince(new Date(now - DAY_MS)),
      this.repo.countEntriesSince(new Date(now - 7 * DAY_MS)),
    ]);
    return { total, joined_today: joinedToday, joined_week: joinedWeek };
  }

  async status(token: string): Promise<EarlyAccessStatusRes> {
    const payload = verifyStatusToken(token);
    if (!payload || typeof payload.e !== "string" || payload.e.length === 0) {
      throw apiError(
        401,
        "invalid_token",
        "Status token is invalid.",
        "Rejoin the early access list with the same email to get a fresh link.",
      );
    }

    const entry = await this.repo.findByEmail(payload.e);
    if (!entry) {
      throw apiError(404, "early_access_not_found", "No early access entry matches this token.");
    }

    const [total, referrals] = await Promise.all([
      this.repo.countEntries(),
      this.repo.countReferrals(entry.id),
    ]);

    return {
      email_masked: maskEmail(entry.email),
      position: effectivePosition(entry.basePosition, referrals),
      total,
      code: entry.code,
      referrals_verified: referrals,
      jumps: jumpsFor(referrals),
    };
  }
}

/**
 * M5: `utm` is an unbounded zod record in the contract and is persisted verbatim
 * into a jsonb column, so one POST could write a multi-megabyte row. Real UTM
 * traffic carries five keys (source/medium/campaign/term/content); 12 keys of
 * 32 chars mapping to 120 chars is generous, and anything past that is dropped
 * rather than rejected — a marketing link with junk parameters must still be
 * able to join the queue.
 */
const UTM_MAX_KEYS = 12;
const UTM_MAX_KEY_LEN = 32;
const UTM_MAX_VALUE_LEN = 120;

function boundUtm(utm: Record<string, string> | undefined): Record<string, string> | null {
  if (utm === undefined) return null;
  const bounded: Record<string, string> = {};
  let kept = 0;
  for (const [key, value] of Object.entries(utm)) {
    if (kept >= UTM_MAX_KEYS) break;
    if (key.length === 0 || key.length > UTM_MAX_KEY_LEN) continue;
    bounded[key] = value.slice(0, UTM_MAX_VALUE_LEN);
    kept += 1;
  }
  return kept > 0 ? bounded : null;
}
