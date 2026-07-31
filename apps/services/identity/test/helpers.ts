import type { FoundingVerifier } from "../src/auth/auth.service";
import type { IdentityConfig } from "../src/common/config";
import type { RequestMeta } from "../src/common/http";

export function testConfig(overrides: Partial<IdentityConfig> = {}): IdentityConfig {
  return {
    port: 0,
    databaseUrl: "",
    kafkaBrokers: [],
    billingUrl: "http://billing.local",
    earlyAccessCodes: ["HERO-EARLY-1"],
    sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

/** Deterministic injectable clock. */
export class FakeClock {
  private t: number;

  constructor(startIso = "2026-01-01T00:00:00.000Z") {
    this.t = Date.parse(startIso);
  }

  now = (): Date => new Date(this.t);

  advance(ms: number): void {
    this.t += ms;
  }
}

/** Fake billing verifier: order_id -> owner email. */
export class FakeVerifier implements FoundingVerifier {
  calls: Array<{ email: string; orderId: string }> = [];
  fail = false;
  private readonly orders = new Map<string, string>();

  addPaidOrder(orderId: string, email: string): void {
    this.orders.set(orderId, email.toLowerCase());
  }

  async verify(email: string, orderId: string): Promise<{ ok: boolean; sku?: string }> {
    this.calls.push({ email, orderId });
    if (this.fail) throw new Error("billing down");
    if (this.orders.get(orderId) === email.toLowerCase()) {
      return { ok: true, sku: "ltd_founding" };
    }
    return { ok: false };
  }
}

export const META: RequestMeta = { ip: "203.0.113.7", userAgent: "vitest" };

export function metaFor(ip: string): RequestMeta {
  return { ip, userAgent: "vitest" };
}
