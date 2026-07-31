import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { BODY_LIMIT_BYTES } from "./common/config";
import { ApiExceptionFilter } from "./common/errors";
import { pool } from "./db/client";
import { migrate } from "./db/migrate";

async function bootstrap(): Promise<void> {
  const logger = new Logger("trading-svc");

  await migrate(pool); // idempotent bootstrap DDL before we accept traffic

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // M3: 32 KiB is far above the largest legal body (a broker connection) and
    // refuses a multi-megabyte POST before AES-GCM or a broker call is reached.
    new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES }),
    { logger: ["error", "warn", "log"] },
  );
  // CORS stays off: the Next.js BFF calls this service server-side only.
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4005);
  await app.listen(port, "0.0.0.0");
  logger.log(`trading-svc listening on :${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error("trading-svc failed to start", err);
  process.exit(1);
});
