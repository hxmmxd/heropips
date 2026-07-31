import { afterEach, describe, expect, it, vi } from "vitest";
import { BadClientIp, clientIp } from "./client-ip";
import { byIp, bySubject, enforce, MemoryStore, type RateLimitPolicy } from "./rate-limit";

const POLICY: RateLimitPolicy = { limit: 3, windowMs: 60_000 };

function request(ip: string | null): Request {
  return new Request("https://heropips.com/api/test", {
    headers: ip === null ? {} : { "x-forwarded-for": ip },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("enforce", () => {
  it("allows every request under the limit", async () => {
    const req = request("203.0.113.7");
    for (let i = 0; i < POLICY.limit; i += 1) {
      expect(await enforce(req, byIp("under", POLICY))).toBeNull();
    }
  });

  it("denies once the limit is spent, with Retry-After and RateLimit headers", async () => {
    const req = request("203.0.113.8");
    for (let i = 0; i < POLICY.limit; i += 1) await enforce(req, byIp("deny", POLICY));

    const res = await enforce(req, byIp("deny", POLICY));
    expect(res?.status).toBe(429);
    expect(await res?.json()).toMatchObject({ error_code: "rate_limited" });
    expect(Number(res?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(res?.headers.get("ratelimit-limit")).toBe(String(POLICY.limit));
    expect(res?.headers.get("ratelimit-remaining")).toBe("0");
    expect(Number(res?.headers.get("ratelimit-reset"))).toBeGreaterThan(0);
  });

  it("refills when the window rolls over", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T12:00:00Z"));
    const req = request("203.0.113.9");
    for (let i = 0; i < POLICY.limit; i += 1) await enforce(req, byIp("window", POLICY));
    expect((await enforce(req, byIp("window", POLICY)))?.status).toBe(429);

    vi.setSystemTime(new Date("2026-07-30T12:01:01Z"));
    expect(await enforce(req, byIp("window", POLICY))).toBeNull();
  });

  it("counts distinct IPs, distinct subjects and distinct scopes separately", async () => {
    const spent = request("203.0.113.10");
    for (let i = 0; i < POLICY.limit; i += 1) await enforce(spent, byIp("keys", POLICY));
    expect((await enforce(spent, byIp("keys", POLICY)))?.status).toBe(429);

    expect(await enforce(request("203.0.113.11"), byIp("keys", POLICY))).toBeNull();
    expect(await enforce(spent, byIp("keys-other", POLICY))).toBeNull();
    expect(await enforce(spent, bySubject("keys", POLICY, "member-a"))).toBeNull();
  });

  it("denies on the tightest rule when several are composed", async () => {
    const req = request("203.0.113.12");
    const wide = { limit: 50, windowMs: 60_000 };
    for (let i = 0; i < POLICY.limit; i += 1) {
      await enforce(req, bySubject("compose", POLICY, "member-b"), byIp("compose", wide));
    }
    const res = await enforce(req, bySubject("compose", POLICY, "member-b"), byIp("compose", wide));
    expect(res?.status).toBe(429);
    expect(res?.headers.get("ratelimit-limit")).toBe(String(POLICY.limit));
  });

  it("fails closed with 400 when no client IP can be derived", async () => {
    expect(() => clientIp(request(null))).toThrow(BadClientIp);

    const res = await enforce(request(null), byIp("closed", POLICY));
    expect(res?.status).toBe(400);
    expect(await res?.json()).toMatchObject({ error_code: "validation_failed" });
  });

  it("rejects a forged left-most forwarded-for entry and keys on the trusted hop", async () => {
    const forged = new Request("https://heropips.com/api/test", {
      headers: { "x-forwarded-for": "10.9.9.9, 203.0.113.13" },
    });
    expect(clientIp(forged)).toBe("203.0.113.13");
  });
});

describe("MemoryStore", () => {
  it("evicts counters whose window has closed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T12:00:00Z"));
    const store = new MemoryStore(30_000);

    await store.hit("a", 60_000);
    await store.hit("b", 60_000);
    expect(store.size).toBe(2);

    // Sweep inside the window keeps live counters.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(store.size).toBe(2);

    // Past the window close, the timer drops them.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(store.size).toBe(0);
  });
});
