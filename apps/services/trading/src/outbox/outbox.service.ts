import { randomUUID } from "node:crypto";
import { Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import type { EventEnvelope } from "@heropips/contracts";
import { db } from "../db/client";
import { OutboxRelay } from "./relay";

/** Build a contract EventEnvelope for an outbox row payload. */
export function makeEnvelope(type: string, payload: unknown): EventEnvelope {
  return {
    event_id: randomUUID(),
    type,
    occurred_at: new Date().toISOString(),
    tenant_id: "heropips",
    payload,
  };
}

/** Owns the relay lifecycle; the HTTP path only ever inserts outbox rows. */
@Injectable()
export class OutboxService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly relay = new OutboxRelay(db);

  onApplicationBootstrap(): void {
    this.relay.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.relay.stop();
  }
}
