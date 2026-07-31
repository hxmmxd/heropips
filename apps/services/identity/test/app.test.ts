import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { createAppModule } from "../src/app.module";
import { FakeVerifier, testConfig } from "./helpers";
import { MemRepo } from "./mem-repo";

/** End-to-end wiring smoke over fastify inject: module factory, filter, routes. */
describe("HTTP surface (fastify inject)", () => {
  let app: NestFastifyApplication;
  let repo: MemRepo;
  let token: string;

  beforeAll(async () => {
    repo = new MemRepo();
    const verifier = new FakeVerifier();
    verifier.addPaidOrder("hp_ltd_smoke1", "hero@example.com");
    app = await NestFactory.create<NestFastifyApplication>(
      createAppModule({ repo, config: testConfig(), verifier }),
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /healthz -> {ok:true}", async () => {
    const res = await app.getHttpAdapter().getInstance().inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("POST /v1/auth/redeem -> 200 AuthSessionRes", async () => {
    const res = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/v1/auth/redeem",
      payload: {
        email: "hero@example.com",
        access_code: "hp_ltd_smoke1",
        password: "super-secret-pw",
        display_name: "Hero One",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toMatchObject({ email: "hero@example.com", founding: true });
    token = body.token;
    expect(token).toBeTruthy();
  });

  it("GET /v1/auth/introspect with bearer -> SessionUserRes; without -> 401 session_expired", async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const ok = await fastify.inject({
      method: "GET",
      url: "/v1/auth/introspect",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().email).toBe("hero@example.com");

    const missing = await fastify.inject({ method: "GET", url: "/v1/auth/introspect" });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().error_code).toBe("session_expired");
  });

  it("GET /v1/sessions flags current; DELETE revokes; /v1/me/* respond", async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const auth = { authorization: `Bearer ${token}` };

    const login = await fastify.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "hero@example.com", password: "super-secret-pw" },
    });
    expect(login.statusCode).toBe(200);

    const sessions = await fastify.inject({ method: "GET", url: "/v1/sessions", headers: auth });
    expect(sessions.statusCode).toBe(200);
    const rows = sessions.json().sessions;
    expect(rows).toHaveLength(2);
    const other = rows.find((s: { current: boolean }) => !s.current);

    const del = await fastify.inject({ method: "DELETE", url: `/v1/sessions/${other.id}`, headers: auth });
    expect(del.statusCode).toBe(200);

    const me = await fastify.inject({ method: "GET", url: "/v1/me", headers: auth });
    expect(me.statusCode).toBe(200);
    const pkg = await fastify.inject({ method: "GET", url: "/v1/me/package", headers: auth });
    expect(pkg.json().sku).toBe("ltd_founding");
    const auditRes = await fastify.inject({ method: "GET", url: "/v1/me/audit", headers: auth });
    expect(auditRes.json().entries.length).toBeGreaterThan(0);
  });

  it("chat: post + history round-trip over HTTP", async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const auth = { authorization: `Bearer ${token}` };
    const post = await fastify.inject({
      method: "POST",
      url: "/v1/chat/messages",
      headers: auth,
      payload: { body: "gm heroes" },
    });
    expect(post.statusCode).toBe(200);
    expect(post.json().body).toBe("gm heroes");

    const history = await fastify.inject({ method: "GET", url: "/v1/chat/history", headers: auth });
    expect(history.statusCode).toBe(200);
    expect(history.json().channel).toBe("founding-lounge");
    expect(history.json().messages.at(-1).body).toBe("gm heroes");
  });

  it("POST /v1/chat/ticket mints a single-use WS ticket, no-store", async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({
      method: "POST",
      url: "/v1/chat/ticket",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const body = res.json();
    expect(body.expires_in).toBe(60);
    expect(String(body.ticket).startsWith("hpct_")).toBe(true);
    // The 30-day session bearer must never be echoed back to the browser (H2).
    expect(JSON.stringify(body)).not.toContain(token);

    const anon = await fastify.inject({ method: "POST", url: "/v1/chat/ticket" });
    expect(anon.statusCode).toBe(401);
  });

  /**
   * B2/B1 end-to-end: the guard is wired as an APP_GUARD, the 429 body is the
   * contract ApiError, and buckets are keyed per forwarded client IP — not per
   * proxy peer, which is what made the old limits platform-global.
   */
  it("rate limits ticket minting per session and keeps other clients unaffected", async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const mint = (ip: string, bearer: string) =>
      fastify.inject({
        method: "POST",
        url: "/v1/chat/ticket",
        headers: { authorization: `Bearer ${bearer}`, "x-hp-client-ip": ip },
      });

    let limitedStatus = 0;
    let limitedBody: unknown = null;
    for (let i = 0; i < 40 && limitedStatus === 0; i++) {
      const res = await mint("203.0.113.10", token);
      if (res.statusCode === 429) {
        limitedStatus = res.statusCode;
        limitedBody = res.json();
      }
    }
    expect(limitedStatus).toBe(429);
    expect(limitedBody).toMatchObject({ error_code: "rate_limited" });

    // A second session from a different client IP is untouched by that flood.
    const second = await fastify.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "hero@example.com", password: "super-secret-pw" },
    });
    expect(second.statusCode).toBe(200);
    const fresh = await mint("198.51.100.20", second.json().token);
    expect(fresh.statusCode).toBe(200);
  });

  it("login failure body is the contract ApiError", async () => {
    const res = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "hero@example.com", password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error_code: "auth_invalid_credentials", message: "Invalid email or password." });
  });
});
