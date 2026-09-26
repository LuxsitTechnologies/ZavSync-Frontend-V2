export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export function money(value: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function compactMoney(value: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function shortDate(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Local calendar date for date-only form fields; avoids UTC day shifts. */
export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function labelize(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const TONE_MAP: Record<string, Tone> = {
  active: "success",
  paid: "success",
  approved: "success",
  probation: "warning",
  partial: "warning",
  pending: "warning",
  submitted: "info",
  accepted: "success",
  failed: "danger",
  not_submitted: "neutral",
  draft: "neutral",
  not_applicable: "neutral",
  notice_period: "warning",
  resigned: "neutral",
  terminated: "danger",
  overdue: "danger",
  unpaid: "danger",
  rejected: "danger",
  on_leave: "info",
  present: "success",
  late: "warning",
  half_day: "warning",
  absent: "danger",
  cancelled: "neutral",
  posted: "success",
  void: "neutral",
  inactive: "neutral",
  hold: "warning",
  won: "success",
  lost: "danger",
  new: "neutral",
  qualified: "info",
  proposal: "warning",
  negotiation: "brand",
  low_stock: "danger",
  in_stock: "success",
};

export function statusTone(status: string): Tone {
  return TONE_MAP[status] ?? "neutral";
}
