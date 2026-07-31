import { Body, Controller, Get, Header, HttpCode, Inject, Post, Query, Req } from "@nestjs/common";
import type { ChatHistoryRes, ChatMessageRes } from "@heropips/contracts";
import { AuthService } from "../auth/auth.service";
import { bearerHeader, type HttpRequest } from "../common/http";
import { perMinute, RateLimit } from "../common/rate-limit";
import { ChatService } from "./chat.service";
import { CHAT_TICKETS, type ChatTicketRes, type ChatTickets } from "./tickets";

@Controller("v1/chat")
export class ChatController {
  constructor(
    @Inject(ChatService) private readonly chat: ChatService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CHAT_TICKETS) private readonly tickets: ChatTickets,
  ) {}

  /**
   * 120/min/session: the lounge pages history on scroll-back, so a member
   * reading a long backlog fires several requests a second in bursts. 240/min
   * per IP leaves room for a household or office behind one address.
   */
  @Get("history")
  @RateLimit(perMinute(120, "principal"), perMinute(240, "ip"))
  async history(
    @Req() req: HttpRequest,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ): Promise<ChatHistoryRes> {
    await this.auth.requireSession(bearerHeader(req));
    return this.chat.history(cursor, limit);
  }

  /**
   * 60/min/session is a backstop only — ChatService already enforces the real
   * policy (1 message / 2s and 20/min per user). This bucket exists so a
   * flooding client cannot make the service do a session lookup + zod parse
   * thousands of times a second before hitting that guard.
   */
  @Post("messages")
  @HttpCode(200)
  @RateLimit(perMinute(60, "principal"), perMinute(120, "ip"))
  async post(@Req() req: HttpRequest, @Body() body: unknown): Promise<ChatMessageRes> {
    const ctx = await this.auth.requireSession(bearerHeader(req));
    return this.chat.post(ctx.user, body);
  }

  /**
   * Mints the single-use 60s WS ticket (H2/H3). 30/min/session covers a
   * reconnect loop on a bad connection — one ticket per WS open — and 60/min/IP
   * bounds a mint flood from one address.
   */
  @Post("ticket")
  @HttpCode(200)
  @Header("cache-control", "no-store")
  @RateLimit(perMinute(30, "principal"), perMinute(60, "ip"))
  async ticket(@Req() req: HttpRequest): Promise<ChatTicketRes> {
    const ctx = await this.auth.requireSession(bearerHeader(req));
    return this.tickets.mint(ctx.user.id);
  }
}
