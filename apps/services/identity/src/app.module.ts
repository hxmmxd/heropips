import { Controller, Get, Module, type Type } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { AuthController } from "./auth/auth.controller";
import { AuthService, type FoundingVerifier } from "./auth/auth.service";
import { HttpFoundingVerifier } from "./auth/billing-verify.client";
import { SessionsController } from "./auth/sessions.controller";
import { ChatController } from "./chat/chat.controller";
import { ChatService } from "./chat/chat.service";
import { CHAT_TICKETS, ChatTickets } from "./chat/tickets";
import { loadConfig, type IdentityConfig } from "./common/config";
import { ApiExceptionFilter } from "./common/errors";
import { RateLimitGuard } from "./common/rate-limit";
import type { IdentityRepo } from "./db/repo";
import { MeController } from "./me/me.controller";
import { MeService } from "./me/me.service";

export const IDENTITY_REPO = "IDENTITY_REPO";
export const IDENTITY_CONFIG = "IDENTITY_CONFIG";
export const FOUNDING_VERIFIER = "FOUNDING_VERIFIER";
export const CLOCK = "CLOCK";

@Controller()
export class HealthController {
  @Get("healthz")
  health(): { ok: true } {
    return { ok: true };
  }
}

export type AppDeps = {
  /** Required in practice: main.ts passes the Pg repo, tests pass an in-memory repo. */
  repo: IdentityRepo;
  config?: IdentityConfig;
  verifier?: FoundingVerifier;
  now?: () => Date;
};

/**
 * Module factory instead of a static AppModule: tsx/esbuild does not emit
 * design:paramtypes, so all providers are wired with explicit tokens, and
 * tests inject an in-memory repo without @nestjs/testing.
 */
export function createAppModule(deps: AppDeps): Type<unknown> {
  const config = deps.config ?? loadConfig();
  const verifier = deps.verifier ?? new HttpFoundingVerifier(config.billingUrl);
  const now = deps.now ?? ((): Date => new Date());

  @Module({
    controllers: [
      HealthController,
      AuthController,
      SessionsController,
      MeController,
      ChatController,
    ],
    providers: [
      { provide: IDENTITY_CONFIG, useValue: config },
      { provide: IDENTITY_REPO, useValue: deps.repo },
      { provide: FOUNDING_VERIFIER, useValue: verifier },
      { provide: CLOCK, useValue: now },
      {
        provide: AuthService,
        useFactory: (repo: IdentityRepo, cfg: IdentityConfig, billing: FoundingVerifier, clock: () => Date) =>
          new AuthService(repo, cfg, billing, clock),
        inject: [IDENTITY_REPO, IDENTITY_CONFIG, FOUNDING_VERIFIER, CLOCK],
      },
      {
        provide: MeService,
        useFactory: (repo: IdentityRepo, auth: AuthService, clock: () => Date) =>
          new MeService(repo, auth, clock),
        inject: [IDENTITY_REPO, AuthService, CLOCK],
      },
      {
        provide: ChatService,
        useFactory: (repo: IdentityRepo, clock: () => Date) => new ChatService(repo, clock),
        inject: [IDENTITY_REPO, CLOCK],
      },
      {
        provide: CHAT_TICKETS,
        useFactory: (clock: () => Date) => new ChatTickets(() => clock().getTime()),
        inject: [CLOCK],
      },
      {
        provide: APP_GUARD,
        useFactory: (reflector: Reflector, clock: () => Date) =>
          new RateLimitGuard(reflector, () => clock().getTime()),
        inject: [Reflector, CLOCK],
      },
      { provide: APP_FILTER, useClass: ApiExceptionFilter },
    ],
  })
  class AppModule {}

  return AppModule;
}
