import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { createAppModule } from "./app.module";
import { ChatGateway } from "./chat/gateway";
import { ChatService } from "./chat/chat.service";
import { CHAT_TICKETS, type ChatTickets } from "./chat/tickets";
import { BODY_LIMIT_BYTES, loadConfig } from "./common/config";
import { createDb } from "./db/client";
import { migrate } from "./db/migrate";
import { PgIdentityRepo } from "./db/repo";
import { OutboxRelay } from "./outbox/relay";

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  await migrate(config.databaseUrl);

  const { db, pool } = createDb(config.databaseUrl);
  const repo = new PgIdentityRepo(db);

  const app = await NestFactory.create<NestFastifyApplication>(
    createAppModule({ repo, config }),
    // M3: fastify's 1 MiB default is far larger than any request this service
    // accepts (the biggest is a 2000-char chat message), and the body is
    // buffered before zod ever sees it.
    new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES }),
    { logger: ["log", "warn", "error"] },
  );
  await app.init();

  const relay = new OutboxRelay(repo, config.kafkaBrokers);
  relay.start();

  // Founding-lounge WS: single-use 60s ticket presented as a subprotocol, never
  // a session bearer in the URL (H2/H3).
  const chat = app.get(ChatService);
  const tickets = app.get<ChatTickets>(CHAT_TICKETS);
  const gateway = new ChatGateway((ticket) => tickets.consume(ticket));
  gateway.attach(app.getHttpAdapter().getInstance().server);
  chat.onMessage = (message) => gateway.broadcast(message);

  const shutdown = async (): Promise<void> => {
    gateway.close();
    await relay.stop();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await app.listen({ port: config.port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`[identity] listening on :${config.port}`);
}

void bootstrap();
