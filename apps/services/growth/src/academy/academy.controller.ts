import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import {
  ACADEMY_LESSONS,
  AcademyCertIssueReq,
  AcademyCompleteReq,
  AcademyGameReq,
  AcademySyncReq,
  type AcademyCertRes,
  type AcademyLeaderboardRes,
  type AcademyMutationRes,
  type AcademyProgressRes,
  type AcademySpinRes,
  type AcademyVerifyRes,
} from "@heropips/contracts";
import { apiError, zodDetails } from "../common/errors";
import { InternalOnly } from "../common/internal-auth";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { AcademyService } from "./academy.service";

/** No dedicated contracts schema for spin — the body is just the acting user. */
const AcademySpinReq = z.object({ user_id: z.string().trim().min(1).max(120) });

/** M4: path params validated before they reach a query. */
const UserId = z.string().trim().min(1).max(120);
const CertificateCode = z.string().trim().min(4).max(32);

const LEADERBOARD_DEFAULT = 10;
const LEADERBOARD_CAP = 50;

/**
 * M5: `client.completions` is an unbounded zod record in the contract. There is
 * exactly one useful entry per lesson, so anything beyond the curriculum size is
 * rejected here — before the service iterates it inside a FOR UPDATE
 * transaction.
 */
const MAX_CLIENT_COMPLETIONS = ACADEMY_LESSONS.length;

/**
 * Internal endpoints — called by the web BFF server-side, never public. The
 * acting identity comes from the request body, so @InternalOnly() requires the
 * shared INTERNAL_SVC_TOKEN on every one of them (H4): without it, anything
 * that can reach this container can read and write any member's academy row.
 * The certificate-verify route is the single deliberate exception (it backs a
 * public credential check) and is rate limited instead.
 */
@Controller("v1/academy")
export class AcademyController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(AcademyService) private readonly academy: AcademyService) {}

  /**
   * 30/min/user + 300/min/IP: sync runs on app open and after an offline
   * session, so a handful per minute is real; the IP rule is loose because
   * every call arrives from the BFF and may represent many members.
   */
  @Post("sync")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(30, "principal"), perMinute(300, "ip"))
  async sync(@Body() body: unknown): Promise<AcademyProgressRes> {
    const parsed = AcademySyncReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    const completions = parsed.data.client?.completions;
    if (completions !== undefined && Object.keys(completions).length > MAX_CLIENT_COMPLETIONS) {
      throw apiError(
        422,
        "validation_failed",
        `client.completions may carry at most ${MAX_CLIENT_COMPLETIONS} entries.`,
        "Send only the lessons this account has finished.",
      );
    }
    return this.academy.sync(parsed.data);
  }

  /** 300/min/user: read-only, polled by the academy shell on navigation. */
  @Get("progress/:userId")
  @InternalOnly()
  @RateLimit(perMinute(300, "principal"), perMinute(600, "ip"))
  progress(@Param("userId") userId: string): Promise<AcademyProgressRes> {
    const parsed = UserId.safeParse(userId);
    if (!parsed.success) throw apiError(422, "validation_failed", "user id is required.");
    return this.academy.progress(parsed.data);
  }

  /** 60/min/user: a fast learner finishes a lesson every minute or two, not every second. */
  @Post("complete")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(60, "principal"), perMinute(300, "ip"))
  async complete(@Body() body: unknown): Promise<AcademyMutationRes> {
    const parsed = AcademyCompleteReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.academy.complete(parsed.data);
  }

  /** 240/min/user: arcade rounds are short — 4/s per member is far past playable. */
  @Post("game")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(240, "principal"), perMinute(600, "ip"))
  async game(@Body() body: unknown): Promise<AcademyMutationRes> {
    const parsed = AcademyGameReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.academy.game(parsed.data);
  }

  /**
   * 10/min/user: business logic already caps the spin to one per UTC day, but
   * every rejected attempt still opens a SELECT … FOR UPDATE transaction.
   */
  @Post("spin")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(10, "principal"), perMinute(120, "ip"))
  async spin(@Body() body: unknown): Promise<AcademySpinRes> {
    const parsed = AcademySpinReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.academy.spin(parsed.data.user_id);
  }

  /** 10/min + 30/hour per user: there are a handful of tracks, and re-issue is idempotent. */
  @Post("certificates")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(10, "principal"), perHour(30, "principal"), perMinute(120, "ip"))
  async issueCertificate(@Body() body: unknown): Promise<AcademyCertRes> {
    const parsed = AcademyCertIssueReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.academy.issueCertificate(parsed.data);
  }

  /**
   * L4: the only public academy route — an employer checking a certificate code.
   * 30/min + 300/hour per IP: a human verifies one or two codes, and codes are
   * 10 Crockford characters (~2^50), so this makes enumeration hopeless rather
   * than merely impractical. Deliberately NOT @InternalOnly().
   */
  @Get("certificates/verify/:code")
  @RateLimit(perMinute(30, "ip"), perHour(300, "ip"))
  verify(@Param("code") code: string): Promise<AcademyVerifyRes> {
    const parsed = CertificateCode.safeParse(code);
    if (!parsed.success) throw apiError(422, "validation_failed", "Certificate code is malformed.");
    return this.academy.verify(parsed.data);
  }

  /** 60/min/IP: a public-ish board, cheap but a full scan; 1/s per address is plenty. */
  @Get("leaderboard")
  @RateLimit(perMinute(60, "ip"))
  leaderboard(@Query("limit") limit: string | undefined): Promise<AcademyLeaderboardRes> {
    const n = Number(limit);
    const capped = Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), LEADERBOARD_CAP) : LEADERBOARD_DEFAULT;
    return this.academy.leaderboard(capped);
  }
}
