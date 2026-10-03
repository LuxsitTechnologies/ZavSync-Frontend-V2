export const leaveStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLATION_PENDING', 'CANCELLED'] as const;
export type LeaveStatus = typeof leaveStatuses[number];
export type DayPortion = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
export interface LeaveType { id: string; name: string; is_paid: boolean; is_active?: boolean }
export interface LeaveBalance { allocated_units: number; adjustment_units: number; pending_units: number; approved_units: number; available_units: number }
export interface LeaveAllocation extends LeaveBalance { id?: string; leave_type_id: string; type_name: string; year?: number }
export interface LeaveSummary { year: number; data: LeaveAllocation[] }
export interface LeaveInput { leave_type_id: string; start_date: string; end_date: string; day_portion: DayPortion; reason: string }
export interface LeaveRequest extends LeaveInput { id: string; employee_id: string; type_name: string; is_paid: boolean; units: number; status: LeaveStatus; submitted_at: string; events?: LeaveEvent[] }
export interface AdminLeaveRequest extends LeaveRequest { is_own_request: boolean }
export interface LeaveEvent { id: string; action: string; from_status: LeaveStatus | null; to_status: LeaveStatus; reason: string | null; created_at: string }
export interface LeavePage<T> { data: T[]; meta: { total: number; current_page: number; last_page: number } }
export interface Holiday { id: string; name: string; date: string; description: string | null; is_active: boolean }
export interface LeaveEvidence { id: string; original_filename: string; mime_type: string; size_bytes: number; checksum_sha256: string; created_at: string }
export type LeaveDecision = 'approve' | 'reject' | 'approve-cancellation' | 'reject-cancellation';
