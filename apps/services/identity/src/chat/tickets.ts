import { randomBytes } from "node:crypto";

/** Explicit DI token: tsx/esbuild does not emit decorator design:paramtypes metadata. */
export const CHAT_TICKETS = "CHAT_TICKETS";

/** Wire shape of POST /v1/chat/ticket (no contracts entry: identity-internal). */
export type ChatTicketRes = { ticket: string; expires_in: number };

const TTL_MS = 60_000;
/** Bounded by the mint rate limit; a hard ceiling keeps a bug from growing the map forever. */
const MAX_LIVE = 10_000;

/**
 * Single-use, 60s WS tickets. The 30-day session bearer never reaches browser
 * JS and never travels in a URL (H2/H3): the browser mints a ticket over the
 * BFF and offers it as a WebSocket subprotocol, which is not written to the
 * edge access log the way a query string is.
 *
 * State is in-process. That is correct for a credential whose whole life is one
 * upgrade against the same container; if identity is ever load balanced, the
 * mint and the upgrade must land on the same instance (true today: one upstream)
 * or this moves to Redis.
 */
export class ChatTickets {
  private readonly live = new Map<string, { userId: string; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  mint(userId: string): ChatTicketRes {
    const at = this.now();
    this.sweep(at);
    if (this.live.size >= MAX_LIVE) {
      // Every surviving entry is <=60s old here, so this is unreachable under
      // the mint rate limit; refusing beats unbounded growth if that changes.
      throw new Error("chat ticket store is full");
    }
    const ticket = `hpct_${randomBytes(16).toString("base64url")}`;
    this.live.set(ticket, { userId, expiresAt: at + TTL_MS });
    return { ticket, expires_in: Math.floor(TTL_MS / 1000) };
  }

  /** Consume a ticket. Returns the owning user id, or null when unknown/expired/replayed. */
  consume(ticket: string): { userId: string } | null {
    const entry = this.live.get(ticket);
    if (!entry) return null;
    this.live.delete(ticket); // single use, including on the expired path
    return entry.expiresAt > this.now() ? { userId: entry.userId } : null;
  }

  get size(): number {
    return this.live.size;
  }

  private sweep(at: number): void {
    for (const [ticket, entry] of this.live) {
      if (entry.expiresAt <= at) this.live.delete(ticket);
    }
  }
}
