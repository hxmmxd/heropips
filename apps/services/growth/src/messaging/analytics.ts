import { createHash } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { MessagingConfig } from "./config";

/**
 * GA4 Measurement Protocol (free tier of GA4 itself) — server-side email
 * events so marketing sees the full funnel next to web analytics:
 *   email_sent → email_open → email_click, all keyed by template.
 * Fire-and-forget: analytics must never block or fail a send.
 */
export class Ga4Client {
  private readonly logger = new Logger("ga4-mp");
  private readonly endpoint: string | null;

  constructor(cfg: Pick<MessagingConfig, "ga4MeasurementId" | "ga4ApiSecret">) {
    this.endpoint =
      cfg.ga4MeasurementId && cfg.ga4ApiSecret
        ? `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(cfg.ga4MeasurementId)}&api_secret=${encodeURIComponent(cfg.ga4ApiSecret)}`
        : null;
  }

  /** Stable pseudonymous id — GA4 requires a client_id; email never leaves us raw. */
  static clientId(email: string): string {
    return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
  }

  track(email: string, event: string, params: Record<string, string | number>): void {
    if (this.endpoint === null) return;
    void fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: Ga4Client.clientId(email),
        non_personalized_ads: true,
        events: [{ name: event, params }],
      }),
      signal: AbortSignal.timeout(2_000),
    }).catch((err: unknown) => {
      this.logger.debug(`ga4 event dropped: ${err instanceof Error ? err.message : "error"}`);
    });
  }
}
