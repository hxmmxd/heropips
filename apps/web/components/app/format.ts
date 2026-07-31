import { SYMBOLS, type SymbolCode } from "@heropips/contracts";

/* =========================================================================
 * Formatting for platform UI. Money arrives as integer USD minor units
 * (cents) and is formatted with INTEGER math only — no float division.
 * Prices are floats and use per-symbol precision from SYMBOLS.
 * ======================================================================= */

/** $1,234.56 from 123456 minor units. `sign: true` prefixes "+" on gains. */
export function fmtUsd(minor: number, opts?: { sign?: boolean }): string {
  const neg = minor < 0;
  const abs = Math.abs(Math.trunc(minor));
  const dollars = Math.floor(abs / 100);
  const cents = abs % 100;
  const core = `$${dollars.toLocaleString("en-US")}.${String(cents).padStart(2, "0")}`;
  if (neg) return `-${core}`;
  return opts?.sign ? `+${core}` : core;
}

/** Price with the symbol's own precision (prices are floats by contract). */
export function fmtPrice(symbol: SymbolCode, value: number): string {
  return value.toFixed(SYMBOLS[symbol].precision);
}

/** Basis points → "2.34%" using integer math. */
export function fmtBps(bps: number): string {
  const abs = Math.abs(Math.trunc(bps));
  return `${bps < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}%`;
}

/** 0..1 ratio → "62%" (or em dash when null). */
export function fmtRatio(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

export function fmtQty(qty: number): string {
  return qty.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Tone class for a signed usd_minor amount. */
export function pnlTone(minor: number): "win" | "loss" | "flat" {
  if (minor > 0) return "win";
  if (minor < 0) return "loss";
  return "flat";
}
