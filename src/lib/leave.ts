import type { AdminLeaveRequest, LeaveDecision } from '@/types/leave';
export function leaveDays(units: number): string {
  if (!Number.isSafeInteger(units)) return 'Unavailable';
  const absolute = Math.abs(units);
  return `${units < 0 ? '-' : ''}${Math.floor(absolute / 2)}${absolute % 2 ? '.5' : ''}`;
}
export function companyDate(timezone: string | undefined, instant: Date = new Date()): string {
  if (!timezone) return '';
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant); }
  catch { return ''; }
}
export function leaveDecisions(item: AdminLeaveRequest, permitted: boolean, today: string): LeaveDecision[] {
  // Fail closed if a response lacks the certified ownership field.
  if (!permitted || item.is_own_request !== false) return [];
  if (item.status === 'PENDING') return ['approve', 'reject'];
  if (item.status === 'CANCELLATION_PENDING') return today && item.start_date > today ? ['approve-cancellation', 'reject-cancellation'] : ['reject-cancellation'];
  return [];
}
