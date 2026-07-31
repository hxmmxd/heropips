import { Logger } from "@nestjs/common";
import { asc, inArray, isNull } from "drizzle-orm";
import { Kafka, logLevel, type Producer } from "kafkajs";
import type { Db } from "../db/client";
import { outbox } from "../db/schema";

const POLL_INTERVAL_MS = 2_000;
const WARN_THROTTLE_MS = 30_000;
const BATCH_LIMIT = 100;

/**
 * Transactional-outbox-lite relay: every 2s publish unsent rows to Kafka and
 * mark them sent. Kafka being unreachable degrades to a throttled warning —
 * the loop retries forever and never crashes or blocks the HTTP path.
 */
export class OutboxRelay {
  private readonly logger = new Logger("outbox-relay");
  private readonly kafka: Kafka;
  private producer: Producer | null = null;
  private connected = false;
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;
  private lastWarnAt = 0;

  constructor(private readonly db: Db) {
    this.kafka = new Kafka({
      clientId: "hp-trading",
      brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
      logLevel: logLevel.NOTHING,
      retry: { retries: 1, initialRetryTime: 300 },
    });
  }

  start(): void {
    this.stopped = false;
    this.schedule();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    try {
      await this.producer?.disconnect();
    } catch {
      /* already down */
    }
  }

  private schedule(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      void this.tick().finally(() => this.schedule());
    }, POLL_INTERVAL_MS);
  }

  private async tick(): Promise<void> {
    try {
      const rows = await this.db
        .select()
        .from(outbox)
        .where(isNull(outbox.sentAt))
        .orderBy(asc(outbox.createdAt))
        .limit(BATCH_LIMIT);
      if (rows.length === 0) return;

      if (!this.producer) {
        this.producer = this.kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
      }
      if (!this.connected) {
        await this.producer.connect();
        this.connected = true;
      }

      const byTopic = new Map<string, typeof rows>();
      for (const row of rows) {
        const batch = byTopic.get(row.topic);
        if (batch) batch.push(row);
        else byTopic.set(row.topic, [row]);
      }

      for (const [topic, batch] of byTopic) {
        await this.producer.send({
          topic,
          messages: batch.map((row) => ({ key: row.id, value: JSON.stringify(row.payload) })),
        });
        await this.db
          .update(outbox)
          .set({ sentAt: new Date() })
          .where(inArray(outbox.id, batch.map((row) => row.id)));
      }
    } catch (err) {
      this.connected = false; // reconnect on the next tick
      const now = Date.now();
      if (now - this.lastWarnAt >= WARN_THROTTLE_MS) {
        this.lastWarnAt = now;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`outbox relay delivery failed (will keep retrying): ${message}`);
      }
    }
  }
}
