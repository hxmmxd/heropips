/**
 * signal-svc env config, mirroring growth's common/config.ts style.
 * DATABASE_URL / DATABASE_URL_SIGNAL are consumed directly by db/client.ts.
 */
export type SignalConfig = {
  /** Market data source: "sim" (default, deterministic) or "binance" (public REST, crypto only). */
  source: "sim" | "binance";
  /** PRNG seed for the simulated quant feed. Same seed ⇒ identical candles ⇒ identical signals. */
  simSeed: number;
  /** Generation/resolution tick interval in seconds. 0 disables the loop (tests). */
  intervalSec: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SignalConfig {
  const source = env.SOURCE?.trim() === "binance" ? "binance" : "sim";
  const seed = Number.parseInt(env.SIM_SEED ?? "", 10);
  const interval = Number.parseInt(env.SIGNAL_INTERVAL_SEC ?? "", 10);
  return {
    source,
    simSeed: Number.isFinite(seed) ? seed : 42,
    intervalSec: Number.isFinite(interval) && interval >= 0 ? interval : 60,
  };
}

export const SIGNAL_CONFIG = Symbol("SIGNAL_CONFIG");

/**
 * M3: this service exposes read-only endpoints, so no legitimate request has a
 * body at all. 32 KiB matches its siblings and refuses anything larger before
 * fastify buffers it (the default is 1 MiB).
 */
export const BODY_LIMIT_BYTES = 32 * 1024;
