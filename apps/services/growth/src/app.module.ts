import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AcademyController } from "./academy/academy.controller";
import { ACADEMY_REPO, DrizzleAcademyRepo } from "./academy/academy.repo";
import { AcademyService } from "./academy/academy.service";
import { AcademyNudges } from "./academy/nudges";
import { AffiliatesController } from "./affiliates/affiliates.controller";
import { AffiliatesService } from "./affiliates/affiliates.service";
import { GROWTH_CONFIG, loadConfig, type GrowthConfig } from "./common/config";
import { InternalAuthGuard } from "./common/internal-auth";
import { RateLimitGuard } from "./common/rate-limit";
import { db } from "./db/client";
import { OutboxService } from "./outbox/outbox.service";
import { ReferralsController } from "./referrals/referrals.controller";
import { DrizzleReferralRepo, REFERRAL_REPO } from "./referrals/referrals.repo";
import { ReferralsService } from "./referrals/referrals.service";
import { EarlyAccessController } from "./early-access/early-access.controller";
import { DrizzleEarlyAccessRepo, EARLY_ACCESS_REPO } from "./early-access/early-access.repo";
import { EarlyAccessService } from "./early-access/early-access.service";
import { loadMessagingConfig, MESSAGING_CONFIG } from "./messaging/config";
import { MessagingConsumer } from "./messaging/consumer";
import { MessagingController } from "./messaging/messaging.controller";
import { DrizzleMessagingRepo, MESSAGING_REPO } from "./messaging/messaging.repo";
import { MessagingService } from "./messaging/messaging.service";
import { MessagingScheduler } from "./messaging/scheduler";
import { EMAIL_TRANSPORT, makeTransport } from "./messaging/transport";

@Controller()
export class HealthController {
  @Get("healthz")
  health(): { ok: true } {
    return { ok: true };
  }
}

const messagingConfig = loadMessagingConfig();
const growthConfig = loadConfig();

@Module({
  controllers: [
    HealthController,
    EarlyAccessController,
    AffiliatesController,
    ReferralsController,
    AcademyController,
    MessagingController,
  ],
  providers: [
    { provide: EARLY_ACCESS_REPO, useValue: new DrizzleEarlyAccessRepo(db) },
    { provide: REFERRAL_REPO, useValue: new DrizzleReferralRepo(db) },
    { provide: ACADEMY_REPO, useValue: new DrizzleAcademyRepo(db) },
    { provide: GROWTH_CONFIG, useValue: growthConfig },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RateLimitGuard(reflector),
      inject: [Reflector],
    },
    {
      // H4: internal-only routes require INTERNAL_SVC_TOKEN.
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, cfg: GrowthConfig) => new InternalAuthGuard(reflector, cfg),
      inject: [Reflector, GROWTH_CONFIG],
    },
    { provide: MESSAGING_CONFIG, useValue: messagingConfig },
    { provide: MESSAGING_REPO, useValue: new DrizzleMessagingRepo(db) },
    { provide: EMAIL_TRANSPORT, useValue: makeTransport(messagingConfig) },
    EarlyAccessService,
    AffiliatesService,
    ReferralsService,
    AcademyService,
    AcademyNudges,
    OutboxService,
    MessagingService,
    MessagingConsumer,
    MessagingScheduler,
  ],
})
export class AppModule {}
