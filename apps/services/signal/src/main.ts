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
  const logger = new Logger("signal-svc");

  await migrate(pool); // idempotent bootstrap DDL before we accept traffic

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // M3: this service takes no request bodies at all, so anything past a few
    // KiB is already wrong; 32 KiB keeps it consistent with its siblings.
    new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES }),
    { logger: ["error", "warn", "log"] },
  );
  // CORS stays off: the Next.js BFF and trading-svc call this service server-side only.
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4004);
  await app.listen(port, "0.0.0.0");
  logger.log(`signal-svc listening on :${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error("signal-svc failed to start", err);
  process.exit(1);
});
