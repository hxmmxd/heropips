import { Controller, Get, Module, type Type } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { BODY_LIMIT_BYTES, loadConfig, type BillingConfig } from "./common/config";
import { ApiExceptionFilter } from "./common/errors";
import { RateLimitGuard } from "./common/rate-limit";
import type { BillingRepo } from "./db/repo";
import { CheckoutController } from "./founding/checkout.controller";
import { FoundingService } from "./founding/founding.service";
import { SeatsController } from "./founding/seats.controller";
import { StatusController } from "./founding/status.controller";
import { VerifyController } from "./founding/verify.controller";
import { IpnController } from "./ipn/ipn.controller";
import { IpnService } from "./ipn/ipn.service";
import { NowPaymentsClient, type InvoiceClient } from "./nowpayments/client";

export const BILLING_REPO = "BILLING_REPO";
export const INVOICE_CLIENT = "INVOICE_CLIENT";
export const BILLING_CONFIG = "BILLING_CONFIG";

@Controller()
export class HealthController {
  @Get("healthz")
  health(): { ok: true } {
    return { ok: true };
  }
}

export type AppDeps = {
  /** Required in practice: main.ts passes the Pg repo, tests pass an in-memory repo. */
  repo: BillingRepo;
  invoices?: InvoiceClient;
  config?: BillingConfig;
};

/**
 * Module factory instead of a static AppModule: tsx/esbuild does not emit
 * design:paramtypes, so all providers are wired with explicit tokens, and
 * tests inject an in-memory repo without @nestjs/testing.
 */
export function createAppModule(deps: AppDeps): Type<unknown> {
  const config = deps.config ?? loadConfig();
  const invoices = deps.invoices ?? new NowPaymentsClient(config.npApiUrl, config.npApiKey);

  @Module({
    controllers: [
      HealthController,
      SeatsController,
      CheckoutController,
      StatusController,
      IpnController,
      VerifyController,
    ],
    providers: [
      { provide: BILLING_CONFIG, useValue: config },
      { provide: BILLING_REPO, useValue: deps.repo },
      { provide: INVOICE_CLIENT, useValue: invoices },
      {
        provide: FoundingService,
        useFactory: (repo: BillingRepo, inv: InvoiceClient, cfg: BillingConfig) =>
          new FoundingService(repo, inv, cfg),
        inject: [BILLING_REPO, INVOICE_CLIENT, BILLING_CONFIG],
      },
      {
        provide: IpnService,
        useFactory: (repo: BillingRepo, cfg: BillingConfig) =>
          new IpnService(repo, cfg.npIpnSecret),
        inject: [BILLING_REPO, BILLING_CONFIG],
      },
      {
        provide: APP_GUARD,
        useFactory: (reflector: Reflector) => new RateLimitGuard(reflector),
        inject: [Reflector],
      },
      { provide: APP_FILTER, useClass: ApiExceptionFilter },
    ],
  })
  class AppModule {}

  return AppModule;
}

/**
 * FastifyAdapter whose JSON parser captures the exact raw bytes on
 * request.rawBody before parsing — required for IPN HMAC verification.
 */
export function rawBodyFastifyAdapter(): FastifyAdapter {
  // M3: fastify defaults to a 1 MiB body; an IPN callback is a small flat JSON
  // object, and every byte is HMAC-SHA512'd pre-auth, so cap it well below that.
  const adapter = new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES });
  // useBodyParser registers a buffer-mode ('parseAs: buffer') application/json
  // parser that stores the exact raw bytes on request.rawBody (rawBody flag),
  // and marks the adapter's parsers as registered so app.init() does not
  // stack a conflicting default JSON parser on top.
  adapter.useBodyParser(
    "application/json",
    true,
    {},
    (_req: unknown, body: Buffer | string, done: (err: Error | null, result?: unknown) => void) => {
      const text = Buffer.isBuffer(body) ? body.toString("utf8") : body;
      if (text.length === 0) return done(null, {});
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        done(err as Error);
      }
    },
  );
  return adapter;
}
