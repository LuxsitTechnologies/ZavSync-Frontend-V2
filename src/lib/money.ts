/**
 * Money helpers for the accounting engine.
 *
 * Amounts are integers in MINOR UNITS (paisa). Floating point is never used for
 * authoritative accounting arithmetic — sums, splits and comparisons all work on
 * integers. Display formatting is the only place a decimal string appears.
 */
import type { Money } from "@/types/accounting";

export const MINOR_UNITS = 100;

export function toMinor(major: number): Money {
  return Math.round(major * MINOR_UNITS);
}

export function toMajor(minor: Money): number {
  return minor / MINOR_UNITS;
}

export function addMoney(...values: Money[]): Money {
  return values.reduce((sum, v) => sum + Math.trunc(v), 0);
}

export function subtractMoney(a: Money, b: Money): Money {
  return Math.trunc(a) - Math.trunc(b);
}

export function sumBy<T>(rows: T[], pick: (row: T) => Money): Money {
  return rows.reduce((sum, row) => sum + Math.trunc(pick(row)), 0);
}

/** Multiply a money amount by a quantity/rate, rounding half-up to minor units. */
export function multiplyMoney(amount: Money, factor: number): Money {
  return Math.round(Math.trunc(amount) * factor);
}

export function isZero(value: Money): boolean {
  return Math.trunc(value) === 0;
}

export function isNegative(value: Money): boolean {
  return Math.trunc(value) < 0;
}

/**
 * Parse a user-typed amount ("1,250.5", "1250.50") into minor units.
 * Returns null when the input is not a valid non-negative amount.
 */
export function parseMoneyInput(raw: string, { allowNegative = false } = {}): Money | null {
  const cleaned = raw.replace(/[\s,]/g, "").replace(/^\+/, "");
  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith("-");
  if (negative && !allowNegative) return null;
  const [whole, fraction = ""] = cleaned.replace("-", "").split(".");
  const minor = Number(whole || "0") * MINOR_UNITS + Number(fraction.padEnd(2, "0") || "0");
  if (!Number.isFinite(minor)) return null;
  return negative ? -minor : minor;
}

/** Plain decimal string for inputs — no currency symbol, no grouping. */
export function toMoneyInput(value: Money | null | undefined): string {
  if (value === null || value === undefined) return "";
  const negative = value < 0;
  const abs = Math.abs(Math.trunc(value));
  const text = `${Math.floor(abs / MINOR_UNITS)}.${String(abs % MINOR_UNITS).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

/** Currency display used across every accounting screen. */
export function formatMoney(value: Money, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toMajor(Math.trunc(value)));
}

/** Compact form for summary cards. */
export function formatMoneyCompact(value: Money, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toMajor(Math.trunc(value)));
}

/** Dash for zero, so tables stay scannable. */
export function formatMoneyOrDash(value: Money, currency = "PKR"): string {
  return isZero(value) ? "—" : formatMoney(value, currency);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 3 }).format(value);
}
