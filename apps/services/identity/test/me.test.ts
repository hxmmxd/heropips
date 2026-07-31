import { describe, expect, it } from "vitest";
import type { AuthSessionRes } from "@heropips/contracts";
import { AuthService } from "../src/auth/auth.service";
import { audit } from "../src/common/audit";
import { ApiException } from "../src/common/errors";
import { MeService } from "../src/me/me.service";
import { FakeClock, FakeVerifier, META, metaFor, testConfig } from "./helpers";
import { MemRepo } from "./mem-repo";

type MeHarness = {
  me: MeService;
  auth: AuthService;
  repo: MemRepo;
  clock: FakeClock;
  session: AuthSessionRes;
  bearer: string;
};

const REDEEM = {
  email: "hero@example.com",
  access_code: "hp_ltd_abc123",
  password: "super-secret-pw",
  display_name: "Hero One",
};

async function makeMe(): Promise<MeHarness> {
  const repo = new MemRepo();
  const clock = new FakeClock();
  const verifier = new FakeVerifier();
  verifier.addPaidOrder("hp_ltd_abc123", "hero@example.com");
  const auth = new AuthService(repo, testConfig(), verifier, clock.now);
  const me = new MeService(repo, auth, clock.now);
  const session = await auth.redeem(REDEEM, META);
  return { me, auth, repo, clock, session, bearer: `Bearer ${session.token}` };
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

describe("account", () => {
  it("GET /v1/me returns the session user", async () => {
    const { me, bearer } = await makeMe();
    const user = await me.me(bearer);
    expect(user).toMatchObject({ email: "hero@example.com", display_name: "Hero One", founding: true });
  });

  it("display_name update is validated, persisted, audited", async () => {
    const { me, repo, bearer } = await makeMe();
    await expectApi(me.updateProfile(bearer, { display_name: "x" }), 422, "validation_failed");
    const updated = await me.updateProfile(bearer, { display_name: "  Hero Prime  " });
    expect(updated.display_name).toBe("Hero Prime");
    expect(repo.users[0].displayName).toBe("Hero Prime");
    expect(repo.auditActions()).toContain("me.updated");
  });

  it("password change: wrong current -> 401; short next -> 422", async () => {
    const { me, bearer } = await makeMe();
    await expectApi(
      me.changePassword(bearer, { current_password: "nope", new_password: "long-enough-pw" }),
      401,
      "auth_invalid_credentials",
    );
    await expectApi(
      me.changePassword(bearer, { current_password: REDEEM.password, new_password: "short" }),
      422,
      "validation_failed",
    );
  });

  it("password change revokes every other session, keeps the current one, and new password works", async () => {
    const { me, auth, bearer } = await makeMe();
    const other = await auth.login({ email: REDEEM.email, password: REDEEM.password }, metaFor("10.2.2.2"));

    await me.changePassword(bearer, {
      current_password: REDEEM.password,
      new_password: "brand-new-password",
    });

    await expectApi(auth.introspect(`Bearer ${other.token}`), 401, "session_expired");
    expect((await auth.introspect(bearer)).email).toBe(REDEEM.email); // current survives

    await expectApi(
      auth.login({ email: REDEEM.email, password: REDEEM.password }, metaFor("10.3.3.3")),
      401,
      "auth_invalid_credentials",
    );
    const fresh = await auth.login({ email: REDEEM.email, password: "brand-new-password" }, metaFor("10.4.4.4"));
    expect(fresh.token).toBeTruthy();
  });

  it("audit list: own rows only, newest first, keyset cursor pages through", async () => {
    const { me, repo, clock, bearer, session } = await makeMe();
    for (let i = 0; i < 75; i++) {
      clock.advance(1_000);
      await audit(repo, clock.now(), session.user.id, `test.action.${i}`);
    }
    clock.advance(1_000);
    await audit(repo, clock.now(), "00000000-0000-0000-0000-00000000dead", "someone.elses.row");

    const page1 = await me.auditList(bearer, undefined);
    expect(page1.entries).toHaveLength(50);
    expect(page1.entries[0].action).toBe("test.action.74"); // newest first
    expect(page1.entries.every((e) => e.actor_id === session.user.id)).toBe(true);
    expect(page1.next_cursor).not.toBeNull();

    const page2 = await me.auditList(bearer, page1.next_cursor ?? undefined);
    expect(page2.entries.length).toBeGreaterThan(0);
    expect(page2.next_cursor).toBeNull();
    const seen = new Set([...page1.entries, ...page2.entries].map((e) => e.id));
    expect(seen.size).toBe(page1.entries.length + page2.entries.length); // no overlap
    expect(page2.entries.at(-1)?.action).toBe("auth.redeemed"); // oldest own row
  });

  it("package resolves from PACKAGES by the user's sku", async () => {
    const { me, bearer } = await makeMe();
    const pkg = await me.packageInfo(bearer);
    expect(pkg).toMatchObject({ sku: "ltd_founding", lifetime: true, active: true });
    expect(pkg.limits.live_connections).toBeGreaterThan(0);
  });
});
