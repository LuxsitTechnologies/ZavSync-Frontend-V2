import { apiRequest } from '@/services/api/client';
import type { AdminLeaveRequest, Holiday, LeaveAllocation, LeaveBalance, LeaveDecision, LeaveEvidence, LeavePage, LeaveStatus, LeaveType } from '@/types/leave';
const root = '/leave';
const requestPath = (id: string) => `${root}/requests/${encodeURIComponent(id)}`;
export const adminLeaveRepository = {
  history: (companyId: string, page: number, status: LeaveStatus | '', employee_id: string, signal: AbortSignal) => apiRequest<LeavePage<AdminLeaveRequest>>(`${root}/requests`, { companyId, query: { page, status, employee_id }, signal }),
  detail: (companyId: string, id: string, signal: AbortSignal) => apiRequest<AdminLeaveRequest>(requestPath(id), { companyId, signal }),
  decide: (companyId: string, id: string, action: LeaveDecision, reason: string, signal: AbortSignal) => apiRequest<AdminLeaveRequest>(`${requestPath(id)}/${action}`, { method: 'POST', companyId, body: reason ? { reason } : {}, signal }),
  types: (companyId: string, signal: AbortSignal) => apiRequest<{ data: LeaveType[] }>(`${root}/types`, { companyId, signal }),
  createType: (companyId: string, body: { name: string; is_paid: boolean }, signal: AbortSignal) => apiRequest<LeaveType>(`${root}/types`, { method: 'POST', companyId, body, signal }),
  updateType: (companyId: string, id: string, body: { name?: string; is_active?: boolean }, signal: AbortSignal) => apiRequest<LeaveType>(`${root}/types/${encodeURIComponent(id)}`, { method: 'PATCH', companyId, body, signal }),
  allocations: (companyId: string, employee_id: string, year: number, signal: AbortSignal) => apiRequest<{ data: LeaveAllocation[] }>(`${root}/entitlements`, { companyId, query: { employee_id, year }, signal }),
  allocate: (companyId: string, body: { employee_id: string; leave_type_id: string; year: number; allocated_units: number }, signal: AbortSignal) => apiRequest<LeaveBalance & { id: string }>(`${root}/entitlements`, { method: 'POST', companyId, body, signal }),
  adjust: (companyId: string, id: string, body: { delta_units: number; reason: string }, idempotencyKey: string, signal: AbortSignal) => apiRequest<LeaveBalance & { id: string; delta_units: number }>(`${root}/entitlements/${encodeURIComponent(id)}/adjustments`, { method: 'POST', companyId, body, idempotencyKey, signal }),
  holidays: (companyId: string, signal: AbortSignal) => apiRequest<{ data: Holiday[] }>(`${root}/holidays`, { companyId, signal }),
  createHoliday: (companyId: string, body: { name: string; date: string; description: string }, signal: AbortSignal) => apiRequest<Holiday>(`${root}/holidays`, { method: 'POST', companyId, body, signal }),
  updateHoliday: (companyId: string, id: string, body: Partial<Pick<Holiday, 'name' | 'date' | 'description' | 'is_active'>>, signal: AbortSignal) => apiRequest<Holiday>(`${root}/holidays/${encodeURIComponent(id)}`, { method: 'PATCH', companyId, body, signal }),
  evidence: (companyId: string, id: string, signal: AbortSignal) => apiRequest<{ data: LeaveEvidence[] }>(`${requestPath(id)}/attachments`, { companyId, signal }),
  downloadPath: (id: string, document: string) => `${requestPath(id)}/attachments/${encodeURIComponent(document)}`,
};
