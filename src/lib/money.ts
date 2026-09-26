/**
 * Money helpers for the accounting engine.
 *
 * Amounts are integers in MINOR UNITS (paisa). Floating point is never used for
 * authoritative accounting arithmetic — sums, splits and comparisons all work on
 * integers. Display formatting is the only place a decimal string appears.
 */
import type { Money } from "@/types/accounting";

export const MINOR_UNITS = 100;

function parseScaledInput(raw: string, decimals: number, allowNegative = false): number | null {
  const cleaned = raw.replace(/[\s,]/g, "").replace(/^\+/, "");
  const negative = cleaned.startsWith("-");
  if (negative && !allowNegative) return null;
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  if (!new RegExp(`^(?:\\d+(?:\\.\\d{0,${decimals}})?|\\.\\d{1,${decimals}})$`).test(unsigned)) {
    return null;
  }
  const [whole, fraction = ""] = unsigned.split(".");
  const factor = 10 ** decimals;
  const scaled = Number(whole || "0") * factor + Number(fraction.padEnd(decimals, "0") || "0");
  if (!Number.isSafeInteger(scaled)) return null;
  return negative ? -scaled : scaled;
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
  return parseScaledInput(raw, 2, allowNegative);
}

/** Parse a decimal quantity into authoritative integer thousandths. */
export function parseQuantityInput(raw: string): number | null {
  return parseScaledInput(raw, 3);
}

/** Parse a displayed percentage into integer basis points. */
export function parsePercentageInput(raw: string): number | null {
  return parseScaledInput(raw, 2);
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
