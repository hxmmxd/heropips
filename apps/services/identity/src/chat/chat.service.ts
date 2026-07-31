import { randomUUID } from "node:crypto";
import { ChatPostReq, type ChatHistoryRes, type ChatMessageRes } from "@heropips/contracts";
import { audit } from "../common/audit";
import { decodeCursor, encodeCursor } from "../common/cursor";
import { ApiException } from "../common/errors";
import { TokenBucket } from "../common/rate-limit";
import type { IdentityRepo, UserRow } from "../db/repo";

const DEFAULT_PAGE = 50;
const MAX_PAGE = 100;

export class ChatService {
  /** Wired to the WS gateway in main.ts; null in unit tests unless asserted. */
  onMessage: ((message: ChatMessageRes) => void) | null = null;

  private readonly burst: TokenBucket; // 1 message / 2s
  private readonly sustained: TokenBucket; // 20 messages / min

  constructor(
    private readonly repo: IdentityRepo,
    private readonly now: () => Date = () => new Date(),
  ) {
    const clock = (): number => this.now().getTime();
    this.burst = new TokenBucket(1, 2_000, clock);
    this.sustained = new TokenBucket(20, 60_000, clock);
  }

  async history(cursor: string | undefined, limitRaw: string | undefined): Promise<ChatHistoryRes> {
    const requested = Number(limitRaw ?? DEFAULT_PAGE);
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), MAX_PAGE) : DEFAULT_PAGE;
    const rows = await this.repo.listChatMessages(limit + 1, decodeCursor(cursor));
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const oldest = page[page.length - 1];
    return {
      channel: "founding-lounge",
      // repo returns newest first; the contract wants newest last.
      messages: page
        .map((r) => toMessage(r.id, r.userId, r.displayName, r.body, r.createdAt))
        .reverse(),
      next_cursor:
        hasMore && oldest ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id }) : null,
    };
  }

  async post(user: UserRow, input: unknown): Promise<ChatMessageRes> {
    if (!this.burst.allow(user.id) || !this.sustained.allow(user.id)) {
      throw new ApiException(429, "chat_flood", "Slow down — 1 message per 2s, 20 per minute.");
    }
    const parsed = ChatPostReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(422, "validation_failed", "Message must be 1-2000 characters.");
    }
    const at = this.now();
    const id = randomUUID();
    // Body is stored raw (unescaped); consumers escape at render time.
    await this.repo.insertChatMessage({ id, userId: user.id, body: parsed.data.body, createdAt: at });
    await audit(this.repo, at, user.id, "chat.message.posted", id, null);
    const message = toMessage(id, user.id, user.displayName, parsed.data.body, at);
    this.onMessage?.(message);
    return message;
  }
}

function toMessage(
  id: string,
  userId: string,
  displayName: string,
  body: string,
  createdAt: Date,
): ChatMessageRes {
  return {
    id,
    user_id: userId,
    display_name: displayName,
    body,
    created_at: createdAt.toISOString(),
  };
}
