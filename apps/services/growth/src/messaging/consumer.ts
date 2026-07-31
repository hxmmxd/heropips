import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { EventEnvelope, TOPICS } from "@heropips/contracts";
import { Kafka, logLevel, type Consumer } from "kafkajs";
import { MESSAGING_CONFIG, type MessagingConfig } from "./config";
import { MessagingService } from "./messaging.service";

const GROUP_ID = "hp-growth-messaging";
const RETRY_CONNECT_MS = 5_000;

/** Every topic that can carry a messaging trigger (see MessagingService). */
const SUBSCRIBED = [
  TOPICS.growthEvents,
  TOPICS.paymentEvents,
  TOPICS.identityEvents,
  TOPICS.signalEvents,
  TOPICS.tradeEvents,
] as const;

/**
 * Kafka → MessagingService bridge. At-least-once delivery is fine: the send
 * ledger's dedupe keys make every email exactly-once. Kafka being down
 * degrades to periodic reconnect attempts — never a crash.
 */
@Injectable()
export class MessagingConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("messaging-consumer");
  private readonly kafka: Kafka;
  private consumer: Consumer | null = null;
  private stopped = false;
  private retryTimer: NodeJS.Timeout | undefined;

  // Explicit tokens: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(
    @Inject(MessagingService) private readonly service: MessagingService,
    @Inject(MESSAGING_CONFIG) private readonly cfg: MessagingConfig,
  ) {
    this.kafka = new Kafka({
      clientId: "hp-growth-messaging",
      brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
      logLevel: logLevel.NOTHING,
      retry: { retries: 1, initialRetryTime: 300 },
    });
  }

  onApplicationBootstrap(): void {
    if (!this.cfg.enabled) return;
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    try {
      await this.consumer?.disconnect();
    } catch {
      /* already down */
    }
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      const consumer = this.kafka.consumer({ groupId: GROUP_ID });
      await consumer.connect();
      for (const topic of SUBSCRIBED) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
      await consumer.run({
        eachMessage: async ({ message }) => {
          const raw = message.value?.toString("utf8");
          if (raw === undefined) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return; // not JSON — not ours
          }
          const envelope = EventEnvelope.safeParse(parsed);
          if (!envelope.success) return;
          try {
            await this.service.handleEvent(envelope.data);
          } catch (err) {
            // Log and move on: the ledger dedupe means a redelivery can heal
            // a transient failure, and one poison event must not stall the lane.
            this.logger.warn(
              `event ${envelope.data.type} failed: ${err instanceof Error ? err.message : "error"}`,
            );
          }
        },
      });
      this.consumer = consumer;
      this.logger.log(`consuming ${SUBSCRIBED.length} topics as ${GROUP_ID}`);
    } catch (err) {
      this.logger.warn(
        `kafka connect failed, retrying in ${RETRY_CONNECT_MS / 1000}s: ${err instanceof Error ? err.message : "error"}`,
      );
      this.retryTimer = setTimeout(() => void this.connect(), RETRY_CONNECT_MS);
      this.retryTimer.unref();
    }
  }
}
