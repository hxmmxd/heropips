import { Kafka, logLevel, type Producer } from "kafkajs";
import type { IdentityRepo } from "../db/repo";

const TICK_MS = 2_000;
const WARN_EVERY_MS = 30_000;

/**
 * Transactional-outbox-lite relay: every 2s publish unsent rows, mark sent_at.
 * Kafka unreachable -> warn once per 30s and keep retrying; never crashes,
 * never blocks the HTTP path (runs on its own timer).
 */
export class OutboxRelay {
  private timer: NodeJS.Timeout | undefined;
  private producer: Producer | null = null;
  private connected = false;
  private ticking = false;
  private lastWarnAt = 0;

  constructor(
    private readonly repo: IdentityRepo,
    private readonly brokers: string[],
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.producer && this.connected) {
      await this.producer.disconnect().catch(() => undefined);
    }
    this.connected = false;
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const rows = await this.repo.fetchUnsentOutbox(100);
      if (rows.length === 0) return;
      if (!this.producer) {
        const kafka = new Kafka({
          clientId: "hp-identity",
          brokers: this.brokers,
          logLevel: logLevel.NOTHING,
          retry: { retries: 1 },
        });
        this.producer = kafka.producer({ allowAutoTopicCreation: true });
      }
      if (!this.connected) {
        await this.producer.connect();
        this.connected = true;
      }
      for (const row of rows) {
        const payload = row.payload.payload as { actor_id?: string } | undefined;
        await this.producer.send({
          topic: row.topic,
          messages: [
            {
              key: payload?.actor_id ?? row.payload.event_id,
              value: JSON.stringify(row.payload),
            },
          ],
        });
        await this.repo.markOutboxSent([row.id]);
      }
    } catch (err) {
      this.connected = false;
      const now = Date.now();
      if (now - this.lastWarnAt >= WARN_EVERY_MS) {
        this.lastWarnAt = now;
        // eslint-disable-next-line no-console
        console.warn(
          `[identity] outbox relay: Kafka unavailable, will keep retrying (${(err as Error).message})`,
        );
      }
    } finally {
      this.ticking = false;
    }
  }
}
