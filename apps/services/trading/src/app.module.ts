import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { HttpIntrospector, INTROSPECTOR } from "./auth/introspect";
import { BROKER_ADAPTERS, BrokerAdapters } from "./brokers/adapters";
import { TRADING_CONFIG, loadConfig } from "./common/config";
import { RateLimitGuard } from "./common/rate-limit";
import { ConnectionsController } from "./connections/connections.controller";
import { ConnectionsService } from "./connections/connections.service";
import { db } from "./db/client";
import { DrizzleTradingRepo, TRADING_REPO } from "./db/repo";
import { CLOCK, ExecService } from "./exec/exec.service";
import { ExecController } from "./exec/exec.controller";
import { OutboxService } from "./outbox/outbox.service";
import { MarkSweeper } from "./pnl/marks";
import { PnlController } from "./pnl/pnl.controller";
import { ReadService } from "./pnl/read.service";
import { HttpQuoteProvider, QUOTE_PROVIDER } from "./quotes/provider";

@Controller()
export class HealthController {
  @Get("healthz")
  health(): { ok: true } {
    return { ok: true };
  }
}

const config = loadConfig();
const quotes = new HttpQuoteProvider(config.signalUrl);

@Module({
  controllers: [HealthController, ConnectionsController, ExecController, PnlController],
  providers: [
    { provide: TRADING_CONFIG, useValue: config },
    { provide: TRADING_REPO, useValue: new DrizzleTradingRepo(db) },
    { provide: INTROSPECTOR, useValue: new HttpIntrospector(config.identityUrl) },
    { provide: QUOTE_PROVIDER, useValue: quotes },
    { provide: BROKER_ADAPTERS, useValue: new BrokerAdapters(quotes) },
    { provide: CLOCK, useValue: () => new Date() },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RateLimitGuard(reflector),
      inject: [Reflector],
    },
    ConnectionsService,
    ExecService,
    ReadService,
    MarkSweeper,
    OutboxService,
  ],
})
export class AppModule {}
