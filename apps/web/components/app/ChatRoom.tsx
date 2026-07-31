"use client";

import * as React from "react";
import { ChatHistoryRes, ChatMessageRes, type ChatMessageRes as Msg } from "@heropips/contracts";
import { Button, Input, Kicker, Spinner } from "@heropips/ui";
import { EmptyMark, IconChat } from "@/components/app/icons";
import { fmtDay, fmtTime } from "@/components/app/format";

const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:4003/v1/chat/ws";
const POLL_MS = 10_000;
const COOLDOWN_MS = 2_000;

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function mergeMessages(prev: Msg[], incoming: Msg[]): Msg[] {
  const seen = new Set(prev.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  return fresh.length === 0 ? prev : [...prev, ...fresh].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/**
 * Founding Lounge. SSR delivers the last 50 messages; the client upgrades to
 * a direct WebSocket (route handlers can't proxy WS). If the socket drops,
 * we degrade to 10s history polling and show a reconnecting chip.
 */
export function ChatRoom({ initial, ownUserId }: { initial: Msg[]; ownUserId: string }) {
  const [messages, setMessages] = React.useState<Msg[]>(initial);
  const [live, setLive] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const stickBottom = React.useRef(true);
  const wsRef = React.useRef<WebSocket | null>(null);

  /* autoscroll while pinned to bottom */
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const poll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/app/chat/history", { cache: "no-store" });
      const parsed = ChatHistoryRes.safeParse(await res.json());
      if (res.ok && parsed.success) setMessages((prev) => mergeMessages(prev, parsed.data.messages));
    } catch {
      /* next poll retries */
    }
  }, []);

  /* WS lifecycle with polling fallback */
  React.useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let pollId: number | null = null;
    let retryId: number | null = null;

    const startPolling = () => {
      if (pollId === null) pollId = window.setInterval(poll, POLL_MS);
    };
    const stopPolling = () => {
      if (pollId !== null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };

    async function connect() {
      if (disposed) return;
      try {
        // Single-use 60s ticket, never the session bearer. It rides in the
        // subprotocol header — the only header a browser WebSocket can set —
        // so the credential stays out of the URL and out of proxy access logs.
        const ticketRes = await fetch("/api/app/chat/token", { method: "POST", cache: "no-store" });
        if (!ticketRes.ok) throw new Error("ticket");
        const { ticket } = (await ticketRes.json()) as { ticket: string };
        ws = new WebSocket(WS_URL, ["hp.chat.v1", `hp.ticket.${ticket}`]);
        wsRef.current = ws;
        ws.onopen = () => {
          if (disposed) return;
          setLive(true);
          stopPolling();
        };
        ws.onmessage = (ev) => {
          try {
            // identity-svc pushes {type:"chat.message", message: ChatMessageRes}
            const frame = JSON.parse(String(ev.data)) as { type?: string; message?: unknown };
            const payload = frame?.type === "chat.message" ? frame.message : frame;
            const parsed = ChatMessageRes.safeParse(payload);
            if (parsed.success) setMessages((prev) => mergeMessages(prev, [parsed.data]));
          } catch {
            /* non-message frame */
          }
        };
        ws.onclose = () => {
          if (disposed) return;
          setLive(false);
          startPolling();
          retryId = window.setTimeout(() => void connect(), 5_000);
        };
        ws.onerror = () => ws?.close();
      } catch {
        if (disposed) return;
        setLive(false);
        startPolling();
        retryId = window.setTimeout(() => void connect(), 5_000);
      }
    }

    void connect();
    return () => {
      disposed = true;
      stopPolling();
      if (retryId !== null) window.clearTimeout(retryId);
      ws?.close();
    };
  }, [poll]);

  async function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("body") as HTMLInputElement;
    const body = input.value.trim();
    if (!body || cooldown) return;
    setCooldown(true);
    setSending(true);
    setError(null);
    window.setTimeout(() => setCooldown(false), COOLDOWN_MS);
    try {
      const res = await fetch("/api/app/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        input.value = "";
        stickBottom.current = true;
        const parsed = ChatMessageRes.safeParse(await res.json());
        if (parsed.success) setMessages((prev) => mergeMessages(prev, [parsed.data]));
        else void poll();
      } else if (res.status === 429) {
        setError("Easy there — one message every couple of seconds.");
      } else {
        setError("Message didn't send. Try again.");
      }
    } catch {
      setError("Network error. Message not sent.");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <div className="ap-panel ap-chat">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Founding Lounge</h2>
        <div className="ap-panel-side">
          <span className={`ap-live ${live ? "ap-live--on" : "ap-live--off"}`} aria-live="polite">
            {live ? "Live" : <><Spinner size={14} /> reconnecting…</>}
          </span>
        </div>
      </div>
      {/* tabIndex + role=log: a scrollable region must be reachable by keyboard
          (WCAG 2.1.1 — axe `scrollable-region-focusable`). Without the tab stop
          a keyboard-only member cannot scroll back through the lounge at all.
          `role="log"` is the right semantic for an append-only transcript and
          gives AT the polite live-region behaviour for free. */}
      <div
        className="ap-chat-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="log"
        aria-label="Lounge transcript"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.length === 0 ? (
          <div className="ap-empty">
            <EmptyMark />
            <span className="ap-empty-ico" aria-hidden="true"><IconChat /></span>
            <Kicker>lounge · quiet</Kicker>
            <h3 className="ap-empty-title">Quiet in here</h3>
            <p>500 Founding Heroes, one room. Say hello — the team reads everything.</p>
          </div>
        ) : (
          messages.map((m) => {
            const day = dayKey(m.created_at);
            const divider = day !== lastDay;
            lastDay = day;
            const own = m.user_id === ownUserId;
            return (
              <React.Fragment key={m.id}>
                {divider ? <div className="ap-chat-day">{fmtDay(m.created_at)}</div> : null}
                <div className={`ap-msg${own ? " ap-msg--own" : ""}`}>
                  <div className="ap-msg-meta">
                    <span>{own ? "You" : m.display_name}</span>
                    <span className="num">{fmtTime(m.created_at)}</span>
                  </div>
                  {m.body}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
      <form className="ap-chat-composer" onSubmit={onSend}>
        <label htmlFor="chat-body" className="sr-only">Message</label>
        <Input id="chat-body" name="body" maxLength={2000} placeholder="Message the lounge…" autoComplete="off" />
        <Button type="submit" disabled={cooldown} aria-busy={cooldown} busy={sending} style={{ flex: "none" }}>
          {cooldown ? "…" : "Send"}
        </Button>
      </form>
      <p aria-live="polite" className="ap-note" style={{ paddingTop: 6, minHeight: 24 }}>{error ?? ""}</p>
    </div>
  );
}
