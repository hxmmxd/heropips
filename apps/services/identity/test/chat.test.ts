import { describe, expect, it } from "vitest";
import type { ChatMessageRes } from "@heropips/contracts";
import { ChatGateway, type ChatSocket } from "../src/chat/gateway";
import { ChatService } from "../src/chat/chat.service";
import { ChatTickets } from "../src/chat/tickets";
import { ApiException } from "../src/common/errors";
import type { UserRow } from "../src/db/repo";
import { FakeClock } from "./helpers";
import { MemRepo } from "./mem-repo";

type ChatHarness = { chat: ChatService; repo: MemRepo; clock: FakeClock; user: UserRow };

function makeChat(): ChatHarness {
  const repo = new MemRepo();
  const clock = new FakeClock();
  const chat = new ChatService(repo, clock.now);
  const user: UserRow = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "hero@example.com",
    passwordHash: "scrypt$irrelevant",
    displayName: "Hero One",
    role: "member",
    founding: true,
    packageSku: "ltd_founding",
    createdAt: clock.now(),
  };
  repo.users.push(user);
  return { chat, repo, clock, user };
}

async function expectApi(promise: Promise<unknown>, status: number, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`expected ApiException ${status} ${code}`);
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;
    expect(err.getStatus()).toBe(status);
    expect(err.getResponse()).toMatchObject({ error_code: code });
  }
}

describe("founding lounge chat", () => {
  it("post stores the trimmed body RAW (html untouched) and returns ChatMessageRes", async () => {
    const { chat, repo, user } = makeChat();
    const events: ChatMessageRes[] = [];
    chat.onMessage = (m) => events.push(m);

    const msg = await chat.post(user, { body: "  <b>gm heroes</b>  " });
    expect(msg.body).toBe("<b>gm heroes</b>"); // trimmed, NOT escaped — escaping happens at render
    expect(msg.display_name).toBe("Hero One");
    expect(repo.chatRows[0].body).toBe("<b>gm heroes</b>");
    expect(events).toEqual([msg]); // broadcast hook fired
    expect(repo.auditActions()).toContain("chat.message.posted");
  });

  it("flood guard: second message within 2s -> 429 chat_flood; ok again after 2s", async () => {
    const { chat, clock, user } = makeChat();
    await chat.post(user, { body: "one" });
    await expectApi(chat.post(user, { body: "two" }), 429, "chat_flood");
    clock.advance(2_000);
    await expect(chat.post(user, { body: "three" })).resolves.toBeTruthy();
  });

  it("flood guard is per user", async () => {
    const { chat, repo, user } = makeChat();
    const other: UserRow = { ...user, id: "22222222-2222-2222-2222-222222222222", email: "b@example.com" };
    repo.users.push(other);
    await chat.post(user, { body: "hi" });
    await expect(chat.post(other, { body: "hi too" })).resolves.toBeTruthy();
  });

  it("sustained cap: pacing at 1 msg / 2s still trips the 20/min bucket", async () => {
    const { chat, clock, user } = makeChat();
    let sent = 0;
    let flooded = false;
    for (let i = 0; i < 80; i++) {
      clock.advance(2_000);
      try {
        await chat.post(user, { body: `m${i}` });
        sent += 1;
      } catch (err) {
        if (!(err instanceof ApiException)) throw err;
        expect(err.getResponse()).toMatchObject({ error_code: "chat_flood" });
        flooded = true;
        break;
      }
    }
    expect(flooded).toBe(true);
    expect(sent).toBeGreaterThanOrEqual(20); // burst capacity honored
    expect(sent).toBeLessThan(80); // sustained bucket capped the run
  });

  it("history: newest last, limit clamped to 100, keyset cursor pages back", async () => {
    const { chat, clock, user } = makeChat();
    for (let i = 0; i < 7; i++) {
      clock.advance(60_000);
      await chat.post(user, { body: `msg-${i}` });
    }

    const page1 = await chat.history(undefined, "3");
    expect(page1.channel).toBe("founding-lounge");
    expect(page1.messages.map((m) => m.body)).toEqual(["msg-4", "msg-5", "msg-6"]); // newest LAST
    expect(page1.next_cursor).not.toBeNull();

    const page2 = await chat.history(page1.next_cursor ?? undefined, "3");
    expect(page2.messages.map((m) => m.body)).toEqual(["msg-1", "msg-2", "msg-3"]);

    const page3 = await chat.history(page2.next_cursor ?? undefined, "3");
    expect(page3.messages.map((m) => m.body)).toEqual(["msg-0"]);
    expect(page3.next_cursor).toBeNull();

    const clamped = await chat.history(undefined, "9999");
    expect(clamped.messages).toHaveLength(7);
  });

  it("empty/invalid body -> 422", async () => {
    const { chat, user } = makeChat();
    await expectApi(chat.post(user, { body: "   " }), 422, "validation_failed");
  });
});

class FakeSocket implements ChatSocket {
  readyState = 1;
  isAlive?: boolean;
  sent: string[] = [];
  closedWith: number | null = null;
  terminated = false;
  private readonly listeners = new Map<string, Array<(data?: unknown) => void>>();

  send(data: string): void {
    this.sent.push(data);
  }
  ping(): void {}
  close(code?: number): void {
    this.closedWith = code ?? 1000;
    this.readyState = 3;
    for (const cb of this.listeners.get("close") ?? []) cb();
  }
  terminate(): void {
    this.terminated = true;
    this.readyState = 3;
    for (const cb of this.listeners.get("close") ?? []) cb();
  }
  on(event: "pong" | "close" | "error", listener: () => void): void;
  on(event: "message", listener: (data: unknown) => void): void;
  on(event: string, listener: (data?: unknown) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }
}

describe("chat WS gateway", () => {
  const MESSAGE: ChatMessageRes = {
    id: "m1",
    user_id: "u1",
    display_name: "Hero One",
    body: "gm",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const noTickets = (): null => null;

  it("broadcasts {type:'chat.message', message} to every open socket", () => {
    const gateway = new ChatGateway(noTickets);
    const a = new FakeSocket();
    const b = new FakeSocket();
    const closed = new FakeSocket();
    closed.readyState = 3;
    gateway.register(a, "u1");
    gateway.register(b, "u2");
    gateway.register(closed, "u3");

    gateway.broadcast(MESSAGE);
    expect(JSON.parse(a.sent[0])).toEqual({ type: "chat.message", message: MESSAGE });
    expect(b.sent).toHaveLength(1);
    expect(closed.sent).toHaveLength(0);
    gateway.close();
  });

  it("M8: at the global cap the NEW socket is rejected 1013 — incumbents stay connected", () => {
    const gateway = new ChatGateway(noTickets, 2);
    const first = new FakeSocket();
    const second = new FakeSocket();
    const third = new FakeSocket();
    expect(gateway.register(first, "u1")).toBe(true);
    expect(gateway.register(second, "u2")).toBe(true);
    expect(gateway.register(third, "u3")).toBe(false);

    expect(gateway.size).toBe(2);
    expect(first.closedWith).toBe(null);
    expect(third.closedWith).toBe(1013);
    gateway.broadcast(MESSAGE);
    expect(first.sent).toHaveLength(1);
    expect(second.sent).toHaveLength(1);
    expect(third.sent).toHaveLength(0);
    gateway.close();
  });

  it("M8: one member cannot take every slot — per-user cap rejects the extra socket", () => {
    const gateway = new ChatGateway(noTickets, 500, 2);
    const a = new FakeSocket();
    const b = new FakeSocket();
    const c = new FakeSocket();
    const other = new FakeSocket();
    expect(gateway.register(a, "hog")).toBe(true);
    expect(gateway.register(b, "hog")).toBe(true);
    expect(gateway.register(c, "hog")).toBe(false);
    expect(c.closedWith).toBe(1013);
    expect(gateway.sizeFor("hog")).toBe(2);

    // A different member is unaffected.
    expect(gateway.register(other, "someone-else")).toBe(true);
    // Closing one frees a slot for that user again.
    a.close();
    expect(gateway.sizeFor("hog")).toBe(1);
    expect(gateway.register(new FakeSocket(), "hog")).toBe(true);
    gateway.close();
  });

  it("closed sockets are removed from the set", () => {
    const gateway = new ChatGateway(noTickets);
    const a = new FakeSocket();
    gateway.register(a, "u1");
    expect(gateway.size).toBe(1);
    a.close();
    expect(gateway.size).toBe(0);
    expect(gateway.sizeFor("u1")).toBe(0);
    gateway.close();
  });
});

describe("chat WS tickets", () => {
  it("mints a single-use 60s ticket: consume works once, replay fails", () => {
    const clock = new FakeClock();
    const tickets = new ChatTickets(() => clock.now().getTime());
    const { ticket, expires_in } = tickets.mint("u1");

    expect(expires_in).toBe(60);
    expect(ticket.startsWith("hpct_")).toBe(true);
    expect(tickets.consume(ticket)).toEqual({ userId: "u1" });
    expect(tickets.consume(ticket)).toBe(null);
  });

  it("expires after 60s; an unknown ticket never verifies", () => {
    const clock = new FakeClock();
    const tickets = new ChatTickets(() => clock.now().getTime());
    const { ticket } = tickets.mint("u1");

    clock.advance(61_000);
    expect(tickets.consume(ticket)).toBe(null);
    expect(tickets.consume("hpct_not-a-real-ticket")).toBe(null);
  });
});
