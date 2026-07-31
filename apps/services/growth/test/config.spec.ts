import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/common/config";
import { statusTokenSecret } from "../src/common/token";
import { loadMessagingConfig } from "../src/messaging/config";

/**
 * `devVerificationCode` pins every early-access code to one value and echoes it
 * to the caller, so what turns it on is a security boundary, not a preference.
 */
describe("loadConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Production now also needs INTERNAL_SVC_TOKEN — see the fail-closed block below. */
  const PROD = { NODE_ENV: "production", INTERNAL_SVC_TOKEN: "svc-token" };

  it("issues random codes in production by default", () => {
    expect(loadConfig(PROD).devVerificationCode).toBeNull();
  });

  it("pins the code outside production so a bare dev run needs no setup", () => {
    expect(loadConfig({}).devVerificationCode).toBe("123456");
    expect(loadConfig({ NODE_ENV: "development" }).devVerificationCode).toBe("123456");
  });

  it("honours an explicit code — local containers run NODE_ENV=production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cfg = loadConfig({ ...PROD, EARLY_ACCESS_DEV_CODE: "654321" });

    expect(cfg.devVerificationCode).toBe("654321");
    // …but never silently: a real deployment must see this in its logs.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("EARLY_ACCESS_DEV_CODE");
  });

  it("does not warn when the pinned code is confined to non-production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadConfig({ EARLY_ACCESS_DEV_CODE: "654321" }).devVerificationCode).toBe("654321");
    expect(warn).not.toHaveBeenCalled();
  });

  it("treats blank env values as unset", () => {
    const cfg = loadConfig({ ADMIN_TOKEN: "   ", ADMIN_NOTIFY_EMAIL: "" });
    expect(cfg.adminToken).toBeNull();
    expect(cfg.adminNotifyEmail).toBeNull();
  });

  it("trims the admin recipient and token", () => {
    const cfg = loadConfig({ ADMIN_TOKEN: " tok ", ADMIN_NOTIFY_EMAIL: " ops@heropips.com " });
    expect(cfg.adminToken).toBe("tok");
    expect(cfg.adminNotifyEmail).toBe("ops@heropips.com");
  });
});

/**
 * M1/H4: a missing secret must stop the boot, not silently downgrade a control.
 * Every one of these used to fall back to a value published in this repository.
 */
describe("fail closed in production", () => {
  it("refuses to boot without INTERNAL_SVC_TOKEN (academy/referrals would be open)", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/INTERNAL_SVC_TOKEN/);
    expect(() => loadConfig({ NODE_ENV: "production", INTERNAL_SVC_TOKEN: "  " })).toThrow(
      /INTERNAL_SVC_TOKEN/,
    );
    expect(loadConfig({ NODE_ENV: "production", INTERNAL_SVC_TOKEN: "t" }).internalToken).toBe("t");
  });

  it("leaves the internal surface open outside production so `pnpm dev` needs no setup", () => {
    expect(loadConfig({}).internalToken).toBeNull();
  });

  it("refuses the published STATUS_TOKEN_SECRET placeholder in production", () => {
    expect(() => statusTokenSecret({ NODE_ENV: "production" })).toThrow(/STATUS_TOKEN_SECRET/);
    expect(() =>
      statusTokenSecret({ NODE_ENV: "production", STATUS_TOKEN_SECRET: "dev-status-secret-change-me" }),
    ).toThrow(/STATUS_TOKEN_SECRET/);
    expect(statusTokenSecret({ NODE_ENV: "production", STATUS_TOKEN_SECRET: "real" })).toBe("real");
    expect(statusTokenSecret({})).toBe("dev-status-secret-change-me");
  });

  it("refuses to boot messaging without SMTP_URL in production (it would send nothing)", () => {
    expect(() =>
      loadMessagingConfig({ NODE_ENV: "production", STATUS_TOKEN_SECRET: "real" }),
    ).toThrow(/SMTP_URL/);
    const ok = loadMessagingConfig({
      NODE_ENV: "production",
      STATUS_TOKEN_SECRET: "real",
      SMTP_URL: "smtp://mail:25",
    });
    expect(ok.smtpUrl).toBe("smtp://mail:25");
    expect(ok.statusTokenSecret).toBe("real");
  });
});
