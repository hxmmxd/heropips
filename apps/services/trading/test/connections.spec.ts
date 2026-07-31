import { beforeEach, describe, expect, it } from "vitest";
import { PAPER_STARTING_BALANCE_USD_MINOR, type ConnectionRes } from "@heropips/contracts";
import { BrokerAdapters, LIVE_PENDING_DETAIL } from "../src/brokers/adapters";
import { DEV_CRED_KEY_HEX, loadConfig } from "../src/common/config";
import { decryptJson } from "../src/common/crypto";
import { ApiHttpError } from "../src/common/errors";
import { ConnectionsService } from "../src/connections/connections.service";
import { FakeQuotes, makeUser } from "./fakes";
import { MemRepo } from "./mem-repo";

const BINANCE_KEY = "AKIA1234567890SECRETKEY"; // secret-scan:allow — fake fixture, asserts creds are encrypted at rest
const BINANCE_SECRET = "sk_live_1234567890abcdef";

describe("ConnectionsService", () => {
  let repo: MemRepo;
  let svc: ConnectionsService;
  const user = makeUser();

  beforeEach(() => {
    repo = new MemRepo();
    svc = new ConnectionsService(
      repo,
      new BrokerAdapters(new FakeQuotes()),
      loadConfig({}),
      () => new Date("2026-07-28T10:00:00.000Z"),
    );
  });

  it("auto-creates exactly ONE paper connection on first touch, seeded", async () => {
    const first = await svc.list(user);
    expect(first.connections).toHaveLength(1);
    expect(first.connections[0]).toMatchObject({
      broker: "paper",
      label: "Paper account",
      mode: "paper",
      status: "active",
    });
    expect(repo.connections[0].balanceUsdMinor).toBe(PAPER_STARTING_BALANCE_USD_MINOR);

    const again = await svc.list(user);
    expect(again.connections).toHaveLength(1); // idempotent first-touch
  });

  it("stores binance keys encrypted and marks the connection pending", async () => {
    const res = await svc.create(user, {
      broker: "binance",
      label: "Binance main",
      credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET },
    });
    expect(res.status).toBe("pending");
    expect(res.mode).toBe("live");
    expect(res.status_detail).toBe(LIVE_PENDING_DETAIL);

    const row = repo.connections.find((c) => c.id === res.id);
    expect(row?.credCipher).toBeTruthy();
    // At rest: AES-256-GCM blob, never plaintext.
    expect(row?.credCipher).not.toContain(BINANCE_KEY);
    expect(row?.credCipher).not.toContain(BINANCE_SECRET);
    const decrypted = decryptJson<{ api_key: string; api_secret: string }>(
      row!.credCipher!,
      DEV_CRED_KEY_HEX,
    );
    expect(decrypted.api_key).toBe(BINANCE_KEY);
    expect(decrypted.api_secret).toBe(BINANCE_SECRET);
  });

  it("NEVER echoes credentials: response JSON carries no credential fields", async () => {
    const res = await svc.create(user, {
      broker: "kucoin",
      label: "KuCoin",
      credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET, passphrase: "hunter22" },
    });
    for (const payload of [res, (await svc.list(user)).connections] as unknown[]) {
      const json = JSON.stringify(payload);
      expect(json).not.toContain("api_key");
      expect(json).not.toContain("api_secret");
      expect(json).not.toContain("passphrase");
      expect(json).not.toContain("credential");
      expect(json).not.toContain(BINANCE_KEY);
      expect(json).not.toContain(BINANCE_SECRET);
      expect(json).not.toContain("hunter22");
      expect(json).not.toContain("cred_cipher");
    }
    const keys = Object.keys(res) as (keyof ConnectionRes)[];
    expect(keys.sort()).toEqual(
      ["broker", "created_at", "id", "label", "mode", "status", "status_detail"].sort(),
    );
  });

  it("rejects malformed live keys with a validation error", async () => {
    await expect(
      svc.create(user, { broker: "binance", label: "bad", credentials: { api_key: "short", api_secret: BINANCE_SECRET } }),
    ).rejects.toMatchObject({ body: { error_code: "validation_failed" } });

    await expect(
      svc.create(user, { broker: "mt5", label: "bad", credentials: { mt5_login: "abc", mt5_server: "Sv", mt5_password: "pw" } }),
    ).rejects.toMatchObject({ body: { error_code: "validation_failed" } });
  });

  it("accepts a complete MT5 credential set as pending", async () => {
    const res = await svc.create(user, {
      broker: "mt5",
      label: "FTMO",
      credentials: { mt5_login: "1234567", mt5_server: "FTMO-Server", mt5_password: "s3cretpw" },
    });
    expect(res.status).toBe("pending");
    expect(res.status_detail).toBe(LIVE_PENDING_DETAIL);
  });

  it("enforces the live_connections package limit (3 for founding)", async () => {
    for (let i = 0; i < 3; i++) {
      await svc.create(user, {
        broker: "binance",
        label: `live ${i}`,
        credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET },
      });
    }
    await expect(
      svc.create(user, {
        broker: "binance",
        label: "one too many",
        credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET },
      }),
    ).rejects.toMatchObject({ body: { error_code: "connection_limit_reached" } });
  });

  it("fails closed for non-founding users (0 live connections)", async () => {
    await expect(
      svc.create(makeUser({ id: "u2", founding: false }), {
        broker: "binance",
        label: "nope",
        credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET },
      }),
    ).rejects.toMatchObject({ body: { error_code: "connection_limit_reached" } });
  });

  it("delete is idempotent and scoped to the owner", async () => {
    const res = await svc.create(user, {
      broker: "binance",
      label: "temp",
      credentials: { api_key: BINANCE_KEY, api_secret: BINANCE_SECRET },
    });
    await svc.remove(user, res.id);
    expect(repo.connections.find((c) => c.id === res.id)).toBeUndefined();
    await expect(svc.remove(user, res.id)).resolves.toBeUndefined(); // repeat is a no-op
    await expect(svc.remove(user, "does-not-exist")).resolves.toBeUndefined();
  });

  it("refuses to delete a connection with open positions (409, remediation)", async () => {
    const list = await svc.list(user);
    const paperId = list.connections[0].id;
    await repo.upsertPosition({
      id: "p1",
      userId: user.id,
      connectionId: paperId,
      symbol: "BTCUSDT",
      side: "long",
      qty: 1,
      avgEntry: 50_000,
      entryFeesUsdMinor: 0,
      openedAt: "2026-07-28T09:00:00.000Z",
      signalId: null,
    });
    try {
      await svc.remove(user, paperId);
      expect.unreachable("delete should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiHttpError);
      const e = err as ApiHttpError;
      expect(e.status).toBe(409);
      expect(e.body.error_code).toBe("order_rejected");
      expect(e.body.remediation).toBeTruthy();
    }
  });
});
