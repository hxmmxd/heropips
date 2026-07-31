import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  PACKAGES,
  PAPER_STARTING_BALANCE_USD_MINOR,
  type ConnectionCreateReq,
  type ConnectionRes,
  type ConnectionsRes,
  type PackageLimits,
  type SessionUserRes,
} from "@heropips/contracts";
import { BROKER_ADAPTERS, LIVE_PENDING_DETAIL, type BrokerAdapters } from "../brokers/adapters";
import { TRADING_CONFIG, type TradingConfig } from "../common/config";
import { encryptJson } from "../common/crypto";
import { apiError } from "../common/errors";
import { TRADING_REPO, type ConnectionRow, type TradingRepo } from "../db/repo";
import { CLOCK, type Clock } from "../exec/exec.service";

/** Fail-closed limits for anyone outside the founding cohort. */
const NON_FOUNDING_LIMITS: PackageLimits = {
  live_connections: 0,
  paper_accounts: 1,
  signals_per_day: 0,
  guard_rules: 0,
};

@Injectable()
export class ConnectionsService {
  constructor(
    @Inject(TRADING_REPO) private readonly repo: TradingRepo,
    @Inject(BROKER_ADAPTERS) private readonly adapters: BrokerAdapters,
    @Inject(TRADING_CONFIG) private readonly config: TradingConfig,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  /**
   * First touch auto-creates exactly ONE paper connection: label
   * "Paper account", mode paper, status active, seeded balance.
   */
  async ensurePaper(userId: string): Promise<ConnectionRow[]> {
    const rows = await this.repo.listConnections(userId);
    if (rows.some((c) => c.mode === "paper")) return rows;
    const row: ConnectionRow = {
      id: randomUUID(),
      userId,
      broker: "paper",
      label: "Paper account",
      mode: "paper",
      status: "active",
      statusDetail: null,
      balanceUsdMinor: PAPER_STARTING_BALANCE_USD_MINOR,
      credCipher: null,
      createdAt: this.now().toISOString(),
    };
    await this.repo.insertConnection(row);
    return [...rows, row];
  }

  async list(user: SessionUserRes): Promise<ConnectionsRes> {
    const rows = await this.ensurePaper(user.id);
    return { connections: rows.map(toConnectionRes) };
  }

  async create(user: SessionUserRes, req: ConnectionCreateReq): Promise<ConnectionRes> {
    const rows = await this.ensurePaper(user.id);
    const limits = user.founding ? PACKAGES.ltd_founding.limits : NON_FOUNDING_LIMITS;

    if (req.broker === "paper") {
      const paperCount = rows.filter((c) => c.mode === "paper").length;
      if (paperCount >= limits.paper_accounts) {
        throw apiError(
          409,
          "connection_limit_reached",
          `Your plan allows ${limits.paper_accounts} paper account${limits.paper_accounts === 1 ? "" : "s"}.`,
          "Remove a paper account to add another.",
        );
      }
      const row: ConnectionRow = {
        id: randomUUID(),
        userId: user.id,
        broker: "paper",
        label: req.label,
        mode: "paper",
        status: "active",
        statusDetail: null,
        balanceUsdMinor: PAPER_STARTING_BALANCE_USD_MINOR,
        credCipher: null,
        createdAt: this.now().toISOString(),
      };
      await this.repo.insertConnection(row);
      return toConnectionRes(row);
    }

    // Live (non-paper) connections count against the package limit.
    const liveCount = rows.filter((c) => c.mode === "live").length;
    if (liveCount >= limits.live_connections) {
      throw apiError(
        409,
        "connection_limit_reached",
        `Your plan allows ${limits.live_connections} live broker connection${limits.live_connections === 1 ? "" : "s"}.`,
        "Delete an existing connection to add another.",
      );
    }

    const validation = await this.adapters.for(req.broker).validate(req.credentials);
    if (!validation.ok) {
      throw apiError(422, "validation_failed", validation.detail ?? "Invalid credentials.");
    }

    // Credentials: AES-256-GCM at rest, never logged, never echoed.
    const row: ConnectionRow = {
      id: randomUUID(),
      userId: user.id,
      broker: req.broker,
      label: req.label,
      mode: "live",
      status: "pending",
      statusDetail: LIVE_PENDING_DETAIL,
      balanceUsdMinor: 0,
      credCipher: encryptJson(req.credentials, this.config.credKeyHex),
      createdAt: this.now().toISOString(),
    };
    await this.repo.insertConnection(row);
    return toConnectionRes(row);
  }

  /** Idempotent delete; open positions block with a remediation hint. */
  async remove(user: SessionUserRes, id: string): Promise<void> {
    const conn = await this.repo.getConnection(id);
    if (!conn || conn.userId !== user.id) return;
    const open = await this.repo.listPositionsByConnection(id);
    if (open.length > 0) {
      throw apiError(
        409,
        "order_rejected",
        "This connection has open positions.",
        "Close all open positions on this connection, then delete it.",
      );
    }
    await this.repo.deleteConnection(id);
  }
}

/** Projection to the wire shape — credential material can never leak here. */
function toConnectionRes(row: ConnectionRow): ConnectionRes {
  return {
    id: row.id,
    broker: row.broker,
    label: row.label,
    mode: row.mode,
    status: row.status,
    status_detail: row.statusDetail,
    created_at: row.createdAt,
  };
}
