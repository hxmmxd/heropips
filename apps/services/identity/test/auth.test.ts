import { describe, expect, it } from "vitest";
import type { AuthSessionRes } from "@heropips/contracts";
import { AuthService } from "../src/auth/auth.service";
import { sha256Hex } from "../src/common/crypto";
import { ApiException } from "../src/common/errors";
import { FakeClock, FakeVerifier, META, metaFor, testConfig } from "./helpers";
import { MemRepo } from "./mem-repo";

const DAY_MS = 24 * 60 * 60 * 1000;

type AuthHarness = { auth: AuthService; repo: MemRepo; clock: FakeClock; verifier: FakeVerifier };

function makeAuth(): AuthHarness {
  const repo = new MemRepo();
  const clock = new FakeClock();
  const verifier = new FakeVerifier();
  const auth = new AuthService(repo, testConfig(), verifier, clock.now);
  return { auth, repo, clock, verifier };
}

const REDEEM = {
  email: "hero@example.com",
  access_code: "hp_ltd_abc123",
  password: "super-secret-pw",
  display_name: "Hero One",
};

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

describe("redeem", () => {
  it("happy path via billing verify: founding user, session, audit row", async () => {
    const { auth, repo, verifier } = makeAuth();
    verifier.addPaidOrder("hp_ltd_abc123", "hero@example.com");

    const res = await auth.redeem(REDEEM, META);
    expect(res.user).toMatchObject({
      email: "hero@example.com",
      display_name: "Hero One",
      role: "member",
      founding: true,
    });
    expect(verifier.calls).toEqual([{ email: "hero@example.com", orderId: "hp_ltd_abc123" }]);

    // password stored as scrypt only, session stored hashed only
    expect(repo.users[0].passwordHash.startsWith("scrypt$")).toBe(true);
    expect(repo.users[0].passwordHash).not.toContain(REDEEM.password);
    expect(repo.sessions[0].tokenSha256).toBe(sha256Hex(res.token));
    expect(repo.sessions[0].tokenSha256).not.toBe(res.token);
    expect(repo.auditActions()).toEqual(["auth.redeemed"]);
    expect(repo.outboxRows).toHaveLength(2);
    const registered = repo.outboxRows.find((r) => r.payload.type === "user.registered");
    expect(registered).toBeDefined();
    expect(registered?.payload.payload).toMatchObject({ email: "hero@example.com" });
  });

  it("falls back to EARLY_ACCESS_CODES when billing says no (or is down): comped founding grant", async () => {
    const { auth, repo, verifier } = makeAuth();
    verifier.fail = true;
    const res = await auth.redeem({ ...REDEEM, access_code: "HERO-EARLY-1" }, META);
    // Admin-issued codes are comped founding grants — same entitlements as a purchase.
    expect(res.user.founding).toBe(true);
    expect(repo.users[0].packageSku).toBe("ltd_founding");
  });

  it("unknown code -> 401 access_code_invalid; no user created", async () => {
    const { auth, repo } = makeAuth();
    await expectApi(auth.redeem(REDEEM, META), 401, "access_code_invalid");
    expect(repo.users).toHaveLength(0);
  });

  it("duplicate email -> 409, second user not created", async () => {
    const { auth, repo, verifier } = makeAuth();
    verifier.addPaidOrder("hp_ltd_abc123", "hero@example.com");
    await auth.redeem(REDEEM, META);
    await expectApi(auth.redeem({ ...REDEEM, access_code: "HERO-EARLY-1" }, metaFor("198.51.100.9")), 409, "forbidden");
    expect(repo.users).toHaveLength(1);
  });

  it("rate limit: 6th attempt from one ip inside a minute -> 429", async () => {
    const { auth, verifier } = makeAuth();
    verifier.addPaidOrder("hp_ltd_abc123", "hero@example.com");
    for (let i = 0; i < 5; i++) {
      await auth.redeem({ ...REDEEM, email: `hero${i}@example.com`, access_code: i === 0 ? "hp_ltd_abc123" : "HERO-EARLY-1" }, META).catch(() => undefined);
    }
    await expectApi(auth.redeem(REDEEM, META), 429, "rate_limited");
  });
});

describe("login", () => {
  async function withUser(): Promise<AuthHarness & { session: AuthSessionRes }> {
    const ctx = makeAuth();
    ctx.verifier.addPaidOrder("hp_ltd_abc123", "hero@example.com");
    const session = await ctx.auth.redeem(REDEEM, META);
    return { ...ctx, session };
  }

  it("valid credentials -> session + audit auth.login", async () => {
    const { auth, repo } = await withUser();
    const res = await auth.login({ email: "hero@example.com", password: REDEEM.password }, META);
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe("hero@example.com");
    expect(repo.auditActions()).toEqual(["auth.redeemed", "auth.login"]);
  });

  it("unknown email and wrong password produce byte-identical 401 bodies", async () => {
    const { auth } = await withUser();
    const bodies: unknown[] = [];
    for (const attempt of [
      { email: "nobody@example.com", password: "does-not-matter" },
      { email: "hero@example.com", password: "wrong-password" },
    ]) {
      try {
        await auth.login(attempt, metaFor("198.51.100.1"));
        expect.unreachable("login should fail");
      } catch (err) {
        if (!(err instanceof ApiException)) throw err;
        expect(err.getStatus()).toBe(401);
        bodies.push(err.getResponse());
      }
    }
    expect(JSON.stringify(bodies[0])).toBe(JSON.stringify(bodies[1]));
  });

  it("per-email limit: 6th attempt -> 429 even from different ips", async () => {
    const { auth } = await withUser();
    for (let i = 0; i < 5; i++) {
      await auth
        .login({ email: "hero@example.com", password: "wrong-password" }, metaFor(`10.0.0.${i}`))
        .catch(() => undefined);
    }
    await expectApi(
      auth.login({ email: "hero@example.com", password: REDEEM.password }, metaFor("10.0.0.99")),
      429,
      "rate_limited",
    );
  });

  it("session lifecycle: introspect ok -> logout revokes -> 401 session_expired", async () => {
    const { auth, session } = await withUser();
    const bearer = `Bearer ${session.token}`;
    const user = await auth.introspect(bearer);
    expect(user.email).toBe("hero@example.com");

    await auth.logout(bearer);
    await expectApi(auth.introspect(bearer), 401, "session_expired");
  });

  it("expired session -> 401", async () => {
    const { auth, clock, session } = await withUser();
    clock.advance(31 * DAY_MS);
    await expectApi(auth.introspect(`Bearer ${session.token}`), 401, "session_expired");
  });

  it("sliding expiry: activity pushes expires_at out to now+30d (throttled to 1/min)", async () => {
    const { auth, repo, clock, session } = await withUser();
    const initialExpiry = repo.sessions[0].expiresAt.getTime();

    clock.advance(30_000); // under the touch interval -> no write
    await auth.introspect(`Bearer ${session.token}`);
    expect(repo.sessions[0].expiresAt.getTime()).toBe(initialExpiry);

    clock.advance(40_000); // past the interval -> expiry slides
    await auth.introspect(`Bearer ${session.token}`);
    expect(repo.sessions[0].expiresAt.getTime()).toBe(clock.now().getTime() + 30 * DAY_MS);

    // stays alive indefinitely under regular use
    for (let i = 0; i < 40; i++) {
      clock.advance(20 * DAY_MS);
      await auth.introspect(`Bearer ${session.token}`);
    }
    expect(repo.sessions[0].expiresAt.getTime()).toBe(clock.now().getTime() + 30 * DAY_MS);
  });

  it("sessions list flags the current session; revoking another session kills it", async () => {
    const { auth, session } = await withUser();
    const other = await auth.login({ email: "hero@example.com", password: REDEEM.password }, metaFor("10.1.1.1"));

    const list = await auth.sessions(`Bearer ${session.token}`);
    expect(list.sessions).toHaveLength(2);
    const current = list.sessions.find((s) => s.current);
    const rest = list.sessions.find((s) => !s.current);
    expect(current).toBeTruthy();
    expect(rest).toBeTruthy();

    await auth.revokeSessionById(`Bearer ${session.token}`, rest!.id);
    await expectApi(auth.introspect(`Bearer ${other.token}`), 401, "session_expired");
    // revoking a foreign/unknown session id -> 404
    await expectApi(auth.revokeSessionById(`Bearer ${session.token}`, rest!.id), 404, "forbidden");
  });
});
