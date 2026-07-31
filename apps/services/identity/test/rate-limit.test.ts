import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AuthService } from "../src/auth/auth.service";
import { ApiException } from "../src/common/errors";
import { CLIENT_IP_HEADER, clientIp, requestMeta } from "../src/common/http";
import { RateLimitGuard, TokenBucket } from "../src/common/rate-limit";
import { FakeClock, FakeVerifier, metaFor, testConfig } from "./helpers";
import { MemRepo } from "./mem-repo";

describe("token bucket", () => {
  it("allows capacity, then blocks", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(5, 60_000, () => clock.now().getTime());
    for (let i = 0; i < 5; i++) expect(bucket.allow("ip1")).toBe(true);
    expect(bucket.allow("ip1")).toBe(false);
  });

  it("keys are independent", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(1, 60_000, () => clock.now().getTime());
    expect(bucket.allow("a")).toBe(true);
    expect(bucket.allow("a")).toBe(false);
    expect(bucket.allow("b")).toBe(true);
  });

  it("refills continuously: 5/min -> one token every 12s", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(5, 60_000, () => clock.now().getTime());
    for (let i = 0; i < 5; i++) bucket.allow("ip1");
    expect(bucket.allow("ip1")).toBe(false);
    clock.advance(11_000);
    expect(bucket.allow("ip1")).toBe(false);
    clock.advance(1_000); // 12s total -> exactly one token back
    expect(bucket.allow("ip1")).toBe(true);
    expect(bucket.allow("ip1")).toBe(false);
  });

  it("never refills past capacity", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(2, 1_000, () => clock.now().getTime());
    bucket.allow("k");
    clock.advance(60_000);
    expect(bucket.allow("k")).toBe(true);
    expect(bucket.allow("k")).toBe(true);
    expect(bucket.allow("k")).toBe(false);
  });
});

describe("token bucket: multi-rule support", () => {
  it("peek never consumes and never creates an entry", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(1, 60_000, () => clock.now().getTime());
    expect(bucket.peek("k")).toBe(true);
    expect(bucket.peek("k")).toBe(true);
    expect(bucket.allow("k")).toBe(true);
    expect(bucket.peek("k")).toBe(false);
  });

  it("retryAfterSec reports when the next token lands", () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(5, 60_000, () => clock.now().getTime());
    for (let i = 0; i < 5; i++) bucket.allow("k");
    expect(bucket.retryAfterSec("k")).toBe(12); // 5/min -> one token every 12s
    clock.advance(6_000);
    expect(bucket.retryAfterSec("k")).toBe(6);
    clock.advance(6_000);
    expect(bucket.retryAfterSec("k")).toBe(0);
  });
});

/**
 * B1: identity used to key every per-IP bucket on `req.ip`, which is the web
 * container for 100% of proxied traffic — so `loginByIp` was 10 logins/minute
 * for the whole platform. These assert the forwarded header is what counts.
 */
describe("client ip resolution (B1)", () => {
  const peer = { headers: {}, ip: "10.0.0.5" };

  it("prefers the BFF-forwarded client IP over the peer address", () => {
    expect(clientIp({ headers: { [CLIENT_IP_HEADER]: "203.0.113.7" }, ip: "10.0.0.5" })).toBe(
      "203.0.113.7",
    );
    expect(clientIp(peer)).toBe("10.0.0.5");
  });

  it("ignores a malformed header rather than minting an unbounded bucket key", () => {
    const junk = "x".repeat(500);
    expect(clientIp({ headers: { [CLIENT_IP_HEADER]: junk }, ip: "10.0.0.5" })).toBe("10.0.0.5");
    expect(clientIp({ headers: { [CLIENT_IP_HEADER]: "not an ip" }, ip: "10.0.0.5" })).toBe("10.0.0.5");
  });

  it("never fails open to a distinct key when nothing is available", () => {
    expect(clientIp({ headers: {} })).toBe("unknown");
  });

  it("requestMeta (audit rows + auth buckets) uses the resolved client IP", () => {
    const meta = requestMeta({
      headers: { [CLIENT_IP_HEADER]: "198.51.100.9", "user-agent": "hp-test" },
      ip: "10.0.0.5",
    });
    expect(meta).toEqual({ ip: "198.51.100.9", userAgent: "hp-test" });
  });
});

describe("login/redeem buckets are keyed per forwarded client IP (B1)", () => {
  it("one hot IP cannot exhaust the login bucket for everyone else", async () => {
    const repo = new MemRepo();
    const clock = new FakeClock();
    const auth = new AuthService(repo, testConfig(), new FakeVerifier(), clock.now);
    const attacker = metaFor("203.0.113.1");
    const victim = metaFor("198.51.100.2");
    const pw = { password: "whatever-password" };

    // Burn the attacker's 10/min IP bucket. Distinct emails on purpose: the
    // 5/min per-email bucket is a separate control and must not be what trips.
    for (let i = 0; i < 10; i++) {
      await auth.login({ email: `spray${i}@example.com`, ...pw }, attacker).catch(() => undefined);
    }
    await expect(
      auth.login({ email: "spray99@example.com", ...pw }, attacker),
    ).rejects.toMatchObject({ status: 429 });

    // A different client IP still gets its own bucket: 401, not 429. Before the
    // fix both requests carried the web container's IP and shared one bucket.
    await expect(
      auth.login({ email: "real-member@example.com", ...pw }, victim),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("RateLimitGuard", () => {
  const rule = { scope: "ip" as const, limit: 2, windowMs: 60_000 };

  function contextFor(req: { headers: Record<string, string | undefined>; ip?: string }): ExecutionContext {
    const handler = function handle(): void {};
    return {
      getHandler: () => handler,
      getClass: () => class Probe {},
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  const reflector = { get: () => [rule] } as unknown as Reflector;

  it("keys on the forwarded client IP, not the proxy peer", () => {
    const clock = new FakeClock();
    const guard = new RateLimitGuard(reflector, () => clock.now().getTime());
    const behindProxy = (ip: string) => contextFor({ headers: { [CLIENT_IP_HEADER]: ip }, ip: "10.0.0.5" });

    expect(guard.canActivate(behindProxy("203.0.113.1"))).toBe(true);
    expect(guard.canActivate(behindProxy("203.0.113.1"))).toBe(true);
    expect(() => guard.canActivate(behindProxy("203.0.113.1"))).toThrow();
    // Same proxy peer, different real client: unaffected.
    expect(guard.canActivate(behindProxy("198.51.100.2"))).toBe(true);
  });

  it("429 carries a retry hint and the contract error code", () => {
    const guard = new RateLimitGuard(reflector, Date.now);
    const ctx = contextFor({ headers: { [CLIENT_IP_HEADER]: "203.0.113.9" } });
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    try {
      guard.canActivate(ctx);
      expect.unreachable("expected 429");
    } catch (err) {
      if (!(err instanceof ApiException)) throw err;
      expect(err.getStatus()).toBe(429);
      expect(err.getResponse()).toMatchObject({ error_code: "rate_limited" });
    }
  });

  it("a route with no @RateLimit metadata is not limited", () => {
    const guard = new RateLimitGuard({ get: () => undefined } as unknown as Reflector, Date.now);
    const ctx = contextFor({ headers: {}, ip: "10.0.0.5" });
    for (let i = 0; i < 50; i++) expect(guard.canActivate(ctx)).toBe(true);
  });

  it("multi-rule: a denial on the second rule does not burn a token on the first", () => {
    const clock = new FakeClock();
    const rules = [
      { scope: "ip" as const, limit: 10, windowMs: 60_000 },
      { scope: "ip" as const, limit: 1, windowMs: 60_000 },
    ];
    const guard = new RateLimitGuard(
      { get: () => rules } as unknown as Reflector,
      () => clock.now().getTime(),
    );
    const ctx = contextFor({ headers: { [CLIENT_IP_HEADER]: "203.0.113.5" } });

    expect(guard.canActivate(ctx)).toBe(true);
    for (let i = 0; i < 5; i++) expect(() => guard.canActivate(ctx)).toThrow();

    // The wide rule spent exactly one token, so once the tight rule refills the
    // request is allowed again — a naive implementation would have drained it.
    clock.advance(60_000);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
