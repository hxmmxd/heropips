import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NONCE_HEADER, THEME_INIT, THEME_INIT_SHA256, contentSecurityPolicy, newNonce } from "./security-headers";

/**
 * The pinned hash is the only thing standing between THEME_INIT and a CSP
 * violation that blanks the pre-paint theme on every first load. It cannot be
 * computed at module scope (edge runtime, one constant string, would need
 * top-level await), so it is asserted here instead.
 */
describe("THEME_INIT_SHA256", () => {
  it("matches the script it is supposed to allow", () => {
    const digest = createHash("sha256").update(THEME_INIT, "utf8").digest("base64");
    expect(THEME_INIT_SHA256, "edit THEME_INIT and you must repin THEME_INIT_SHA256").toBe(`sha256-${digest}`);
  });
});

describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy("TESTNONCE");

  it("allows the theme script by hash, never by nonce", () => {
    // A nonce attribute is blanked by the browser after parsing, so React would
    // report a hydration mismatch on <script nonce>. See THEME_INIT's comment.
    expect(csp).toContain(`'${THEME_INIT_SHA256}'`);
  });

  it("carries the per-request nonce for everything Next emits", () => {
    expect(csp).toContain("'nonce-TESTNONCE'");
  });

  it("never falls back to unsafe-inline for scripts", () => {
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src "));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("locks down the directives default-src does not cover in CSP2", () => {
    for (const directive of ["object-src 'none'", "worker-src 'self'", "manifest-src 'self'", "frame-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(csp).toContain(directive);
    }
  });
});

describe("newNonce", () => {
  it("returns a fresh 128-bit base64 value every call", () => {
    const values = new Set(Array.from({ length: 64 }, () => newNonce()));
    expect(values.size).toBe(64);
    for (const v of values) expect(Buffer.from(v, "base64")).toHaveLength(16);
  });
});

it("exposes the nonce header name middleware and Next agree on", () => {
  expect(NONCE_HEADER).toBe("x-hp-nonce");
});
