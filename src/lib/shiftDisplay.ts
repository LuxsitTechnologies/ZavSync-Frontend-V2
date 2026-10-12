/** Presentation only; the server owns timezone, DST and overlap validation. */
export function nextCalendarDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1)).toISOString().slice(0, 10);
}

export function shiftWindow(shift: { shift_date?: string; start_time?: string; end_time?: string; ends_next_day?: boolean; timezone?: string }): string {
  const start = shift.shift_date ?? "Date unavailable";
  const end = shift.ends_next_day && shift.shift_date ? nextCalendarDate(shift.shift_date) : start;
  return `${start} ${shift.start_time ?? "—"} → ${end} ${shift.end_time ?? "—"}${shift.timezone ? ` (${shift.timezone})` : ""}`;
}
