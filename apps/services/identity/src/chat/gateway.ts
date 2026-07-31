import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { ChatMessageRes } from "@heropips/contracts";
import { clientIp } from "../common/http";
import { TokenBucket } from "../common/rate-limit";

const HEARTBEAT_MS = 30_000;
const OPEN = 1; // WebSocket.OPEN
const PATH = "/v1/chat/ws";

/** Agreed with the web tier: entry 1 identifies the protocol, entry 2 carries the ticket. */
const SUBPROTOCOL = "hp.chat.v1";
/** Optional wrapper on entry 2; both `hpct_x` and `hp.ticket.hpct_x` are accepted. */
const TICKET_PREFIX = "hp.ticket.";

/** Ticket-less sockets get this long to send {"type":"auth","ticket":"…"}. */
const AUTH_GRACE_MS = 5_000;

/** WS close codes: 1013 = try again later, 4401 = application-level "unauthorized". */
const CLOSE_OVER_CAPACITY = 1013;
const CLOSE_UNAUTHORIZED = 4401;

/**
 * Caps. Both are per container and deliberately roomy for humans:
 * - 3 sockets per user covers a phone + laptop + a stale tab mid-reconnect.
 * - 500 total is the historical ceiling; it is now a REJECT for the newcomer
 *   rather than an eviction of an incumbent (M8).
 */
const MAX_SOCKETS_PER_USER = 3;
const MAX_SOCKETS = 500;

/**
 * 60 upgrades/min/IP: a reconnect storm on a flaky mobile connection is a few
 * per minute, and shared NAT egress multiplies real users behind one IP, so
 * this is set an order of magnitude above observed human behaviour. It exists
 * to stop a handshake flood, not to police reconnects.
 */
const UPGRADES_PER_MIN_PER_IP = 60;

/**
 * Minimal structural socket type so unit tests can drive the gateway with
 * fakes; the real `ws` WebSocket satisfies it.
 */
export type ChatSocket = {
  readyState: number;
  isAlive?: boolean;
  send(data: string): void;
  ping(): void;
  close(code?: number, reason?: string): void;
  terminate(): void;
  on(event: "pong" | "close" | "error", listener: () => void): unknown;
  on(event: "message", listener: (data: unknown) => void): unknown;
};

/** Resolves a single-use ticket to its owner; null when unknown/expired/replayed. */
export type TicketVerifier = (ticket: string) => { userId: string } | null;

/**
 * Founding-lounge WS fanout. One channel, no rooms: every socket gets every
 * message. Auth is a single-use 60s ticket presented as a subprotocol (never in
 * the URL); 30s heartbeat reaps dead connections; at either cap the NEW socket
 * is rejected.
 */
export class ChatGateway {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clients = new Map<ChatSocket, string>();
  private readonly perUser = new Map<string, number>();
  private readonly upgradesByIp: TokenBucket;
  private heartbeat: NodeJS.Timeout | undefined;

  constructor(
    private readonly verifyTicket: TicketVerifier,
    private readonly maxSockets = MAX_SOCKETS,
    private readonly maxPerUser = MAX_SOCKETS_PER_USER,
    private readonly now: () => number = Date.now,
  ) {
    this.upgradesByIp = new TokenBucket(UPGRADES_PER_MIN_PER_IP, 60_000, this.now);
  }

  attach(server: Server): void {
    server.on("upgrade", (req, socket, head) => this.handleUpgrade(req, socket, head));
    this.heartbeat = setInterval(() => this.pingAll(), HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== PATH) {
      socket.destroy();
      return;
    }
    // Rate limited BEFORE the handshake, keyed on the forwarded client IP —
    // req.socket.remoteAddress is the proxy for every real connection.
    const ip = clientIp({ headers: req.headers, ip: req.socket.remoteAddress });
    if (!this.upgradesByIp.allow(ip)) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const ticket = ticketFromSubprotocols(req.headers["sec-websocket-protocol"]);
    // The handshake completes even on failure so the browser can read a close
    // code (a failed handshake surfaces as an opaque error), and only ever
    // echoes the protocol name — echoing the ticket would put the credential
    // straight back into a response header, which is the point of H3.
    this.wss.handleUpgrade(req, socket, head, (raw) => {
      const ws = raw as unknown as ChatSocket;
      if (ticket === null) {
        this.awaitAuthFrame(ws);
        return;
      }
      const owner = this.verifyTicket(ticket);
      if (!owner) {
        ws.close(CLOSE_UNAUTHORIZED, "invalid ticket");
        return;
      }
      this.register(ws, owner.userId);
    });
  }

  /**
   * No subprotocol ticket: allow one {"type":"auth","ticket":"…"} frame within
   * the grace window. Nothing is broadcast to the socket until it authenticates,
   * and the per-IP upgrade limit bounds how many can idle here.
   */
  private awaitAuthFrame(ws: ChatSocket): void {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close(CLOSE_UNAUTHORIZED, "authentication timeout");
      }
    }, AUTH_GRACE_MS);
    timer.unref();

    ws.on("message", (data: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const ticket = ticketFromAuthFrame(data);
      const owner = ticket === null ? null : this.verifyTicket(ticket);
      if (!owner) {
        ws.close(CLOSE_UNAUTHORIZED, "invalid ticket");
        return;
      }
      this.register(ws, owner.userId);
    });
    ws.on("close", () => {
      settled = true;
      clearTimeout(timer);
    });
  }

  /**
   * Admit an authenticated socket. Exposed for tests. At either cap the caller
   * is refused: evicting the oldest socket (the previous behaviour) let one
   * member with 500 connections empty the lounge and keep everyone out.
   */
  register(ws: ChatSocket, userId: string): boolean {
    if (this.clients.size >= this.maxSockets) {
      ws.close(CLOSE_OVER_CAPACITY, "connection limit reached");
      return false;
    }
    if ((this.perUser.get(userId) ?? 0) >= this.maxPerUser) {
      ws.close(CLOSE_OVER_CAPACITY, "too many connections for this account");
      return false;
    }
    ws.isAlive = true;
    this.clients.set(ws, userId);
    this.perUser.set(userId, (this.perUser.get(userId) ?? 0) + 1);
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("close", () => this.drop(ws));
    ws.on("error", () => {
      this.drop(ws);
      ws.terminate();
    });
    return true;
  }

  private drop(ws: ChatSocket): void {
    const userId = this.clients.get(ws);
    if (userId === undefined) return;
    this.clients.delete(ws);
    const left = (this.perUser.get(userId) ?? 1) - 1;
    if (left <= 0) this.perUser.delete(userId);
    else this.perUser.set(userId, left);
  }

  broadcast(message: ChatMessageRes): void {
    const data = JSON.stringify({ type: "chat.message", message });
    for (const ws of this.clients.keys()) {
      if (ws.readyState === OPEN) ws.send(data);
    }
  }

  private pingAll(): void {
    for (const ws of [...this.clients.keys()]) {
      if (ws.isAlive === false) {
        this.drop(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }

  get size(): number {
    return this.clients.size;
  }

  /** Open sockets for one user — the per-account cap in observable form. */
  sizeFor(userId: string): number {
    return this.perUser.get(userId) ?? 0;
  }

  close(): void {
    clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    for (const ws of [...this.clients.keys()]) ws.close(1001, "server shutting down");
    this.clients.clear();
    this.perUser.clear();
    this.wss.close();
  }
}

/** Entry 1 must be the protocol name; entry 2 is the ticket, wrapper optional. */
function ticketFromSubprotocols(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header.join(",") : header;
  if (raw === undefined) return null;
  const offered = raw.split(",").map((p) => p.trim());
  if (offered[0] !== SUBPROTOCOL) return null;
  const second = offered[1];
  if (second === undefined || second.length === 0) return null;
  const ticket = second.startsWith(TICKET_PREFIX) ? second.slice(TICKET_PREFIX.length) : second;
  return ticket.length > 0 ? ticket : null;
}

/** `{"type":"auth","ticket":"hpct_…"}` — the non-browser path. */
function ticketFromAuthFrame(data: unknown): string | null {
  const text =
    typeof data === "string"
      ? data
      : Buffer.isBuffer(data)
        ? data.toString("utf8")
        : null;
  if (text === null || text.length > 512) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  if (!("type" in parsed) || !("ticket" in parsed)) return null;
  const type: unknown = parsed.type;
  const ticket: unknown = parsed.ticket;
  if (type !== "auth" || typeof ticket !== "string" || ticket.length === 0) return null;
  return ticket;
}

