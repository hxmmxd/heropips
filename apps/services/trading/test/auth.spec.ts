import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpIntrospector, requireUser } from "../src/auth/introspect";
import { FakeIntrospector, makeUser } from "./fakes";

describe("requireUser", () => {
  const introspector = new FakeIntrospector();
  introspector.users.set("good-token", makeUser());

  it("rejects a missing or malformed Authorization header", async () => {
    await expect(requireUser({ headers: {} }, introspector)).rejects.toMatchObject({
      status: 401,
      body: { error_code: "unauthorized" },
    });
    await expect(
      requireUser({ headers: { authorization: "Basic abc" } }, introspector),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects unknown tokens as session_expired", async () => {
    await expect(
      requireUser({ headers: { authorization: "Bearer nope" } }, introspector),
    ).rejects.toMatchObject({ status: 401, body: { error_code: "session_expired" } });
  });

  it("resolves valid bearer tokens to the session user", async () => {
    const user = await requireUser({ headers: { authorization: "Bearer good-token" } }, introspector);
    expect(user.id).toBe("u1");
  });
});

describe("HttpIntrospector 30s cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hits identity once per token within the TTL, refetches after", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return new Response(JSON.stringify(makeUser()), { status: 200 });
    });
    let clock = 1_000_000;
    const introspector = new HttpIntrospector("http://identity", () => clock);

    await introspector.introspect("tok");
    await introspector.introspect("tok");
    expect(calls).toBe(1);

    clock += 30_001; // TTL elapsed
    await introspector.introspect("tok");
    expect(calls).toBe(2);
  });

  it("does not cache failures", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return new Response("{}", { status: 401 });
    });
    const introspector = new HttpIntrospector("http://identity", () => 0);
    expect(await introspector.introspect("bad")).toBeNull();
    expect(await introspector.introspect("bad")).toBeNull();
    expect(calls).toBe(2);
  });
});
