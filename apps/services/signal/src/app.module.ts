import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { loadConfig, SIGNAL_CONFIG } from "./common/config";
import { RateLimitGuard } from "./common/rate-limit";
import { db } from "./db/client";
import { BinancePublicSource } from "./market/binance.source";
import { MarketController } from "./market/market.controller";
import { SimQuantSource } from "./market/sim.source";
import { QUANT_SOURCE, type QuantSource } from "./market/source";
import { OutboxService } from "./outbox/outbox.service";
import { DrizzleSignalRepo, SIGNAL_REPO } from "./signals/signals.repo";
import { SignalsController } from "./signals/signals.controller";
import { SignalsService } from "./signals/signals.service";

@Controller()
export class HealthController {
  @Get("healthz")
  health(): { ok: true } {
    return { ok: true };
  }
}

const config = loadConfig();

function buildSource(): QuantSource {
  const sim = new SimQuantSource(config.simSeed);
  // Binance mode still needs the sim underneath: fx/metal symbols and any
  // network failure fall back to it (and are labeled as sim data).
  return config.source === "binance" ? new BinancePublicSource(sim) : sim;
}

@Module({
  controllers: [HealthController, SignalsController, MarketController],
  providers: [
    { provide: SIGNAL_CONFIG, useValue: config },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RateLimitGuard(reflector),
      inject: [Reflector],
    },
    { provide: QUANT_SOURCE, useValue: buildSource() },
    { provide: SIGNAL_REPO, useValue: new DrizzleSignalRepo(db) },
    SignalsService,
    OutboxService,
  ],
})
export class AppModule {}
