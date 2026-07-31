import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { loadConfig, type GrowthConfig } from "../src/common/config";
import { ApiHttpError } from "../src/common/errors";
import { INTERNAL_TOKEN_HEADER, InternalAuthGuard } from "../src/common/internal-auth";

/**
 * H4: /v1/academy/** and /v1/referrals/** take the acting user from the request
 * body, so the CALLER has to be authenticated. Before this guard, anything that
 * could reach the container could read or write any member's academy row.
 */
function contextFor(headers: Record<string, string | undefined>, internal: boolean): ExecutionContext {
  const handler = function handle(): void {};
  return {
    getHandler: () => handler,
    getClass: () => class Probe {},
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    reflectorInternal: internal,
  } as unknown as ExecutionContext;
}

function guardFor(cfg: Partial<GrowthConfig>, internal: boolean): InternalAuthGuard {
  const config = loadConfig({}) as GrowthConfig;
  const reflector = { get: () => (internal ? true : undefined) } as unknown as Reflector;
  return new InternalAuthGuard(reflector, { ...config, ...cfg });
}

function expectUnauthorized(fn: () => boolean): void {
  try {
    fn();
    expect.unreachable("expected 401 unauthorized");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).status).toBe(401);
    expect((err as ApiHttpError).body.error_code).toBe("unauthorized");
  }
}

describe("InternalAuthGuard", () => {
  const TOKEN = "internal-service-token";

  it("accepts the exact shared token on an internal route", () => {
    const guard = guardFor({ internalToken: TOKEN }, true);
    expect(guard.canActivate(contextFor({ [INTERNAL_TOKEN_HEADER]: TOKEN }, true))).toBe(true);
  });

  it("rejects a missing, wrong, prefix, longer or shorter token", () => {
    const guard = guardFor({ internalToken: TOKEN }, true);
    for (const presented of [
      undefined,
      "",
      TOKEN.slice(0, TOKEN.length - 1),
      `${TOKEN}x`,
      "x".repeat(TOKEN.length),
      TOKEN.toUpperCase(),
    ]) {
      expectUnauthorized(() =>
        guard.canActivate(contextFor({ [INTERNAL_TOKEN_HEADER]: presented }, true)),
      );
    }
  });

  it("leaves non-internal routes (public certificate verify, leaderboard) open", () => {
    const guard = guardFor({ internalToken: TOKEN }, false);
    expect(guard.canActivate(contextFor({}, false))).toBe(true);
  });

  it("is a no-op when no token is configured — dev only; production refuses to boot", () => {
    const guard = guardFor({ internalToken: null }, true);
    expect(guard.canActivate(contextFor({}, true))).toBe(true);
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/INTERNAL_SVC_TOKEN/);
  });
});
