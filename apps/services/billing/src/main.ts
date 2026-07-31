import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createAppModule, rawBodyFastifyAdapter } from "./app.module";
import { loadConfig } from "./common/config";
import { createDb } from "./db/client";
import { migrate } from "./db/migrate";
import { PgBillingRepo } from "./db/repo";
import { HoldsJob } from "./founding/holds.job";
import { OutboxRelay } from "./outbox/relay";

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  await migrate(config.databaseUrl, config.ltdSeatCap);

  const { db, pool } = createDb(config.databaseUrl);
  const repo = new PgBillingRepo(db);

  const app = await NestFactory.create<NestFastifyApplication>(
    createAppModule({ repo, config }),
    rawBodyFastifyAdapter(),
    { logger: ["log", "warn", "error"] },
  );

  const relay = new OutboxRelay(repo, config.kafkaBrokers);
  relay.start();
  const holds = new HoldsJob(repo);
  holds.start();

  const shutdown = async (): Promise<void> => {
    holds.stop();
    await relay.stop();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await app.listen({ port: config.port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`[billing] listening on :${config.port}`);
}

void bootstrap();
