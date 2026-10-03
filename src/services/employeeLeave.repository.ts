import { apiRequest } from '@/services/api/client';
import type { Holiday, LeaveEvidence, LeaveInput, LeavePage, LeaveRequest, LeaveStatus, LeaveSummary, LeaveType } from '@/types/leave';
const root = '/employee/leave';
const requestPath = (id: string) => `${root}/requests/${encodeURIComponent(id)}`;
export const employeeLeaveRepository = {
  summary: (companyId: string, year: number, signal: AbortSignal) => apiRequest<LeaveSummary>(`${root}/summary`, { companyId, query: { year }, signal }),
  types: (companyId: string, signal: AbortSignal) => apiRequest<{ data: LeaveType[] }>(`${root}/types`, { companyId, signal }),
  history: (companyId: string, page: number, status: LeaveStatus | '', signal: AbortSignal) => apiRequest<LeavePage<LeaveRequest>>(`${root}/requests`, { companyId, query: { page, status }, signal }),
  detail: (companyId: string, id: string, signal: AbortSignal) => apiRequest<LeaveRequest>(requestPath(id), { companyId, signal }),
  create: (companyId: string, body: LeaveInput, idempotencyKey: string, signal: AbortSignal) => apiRequest<LeaveRequest>(`${root}/requests`, { method: 'POST', companyId, body, idempotencyKey, signal }),
  cancel: (companyId: string, id: string, signal: AbortSignal) => apiRequest<LeaveRequest>(`${requestPath(id)}/cancel`, { method: 'POST', companyId, signal }),
  holidays: (companyId: string, signal: AbortSignal) => apiRequest<{ data: Holiday[] }>(`${root}/holidays`, { companyId, signal }),
  evidence: (companyId: string, id: string, signal: AbortSignal) => apiRequest<{ data: LeaveEvidence[] }>(`${requestPath(id)}/attachments`, { companyId, signal }),
  upload: (companyId: string, id: string, file: File, signal: AbortSignal) => {
    const body = new FormData(); body.append('file', file);
    return apiRequest<LeaveEvidence>(`${requestPath(id)}/attachments`, { method: 'POST', companyId, body, signal });
  },
  downloadPath: (id: string, document: string) => `${requestPath(id)}/attachments/${encodeURIComponent(document)}`,
};
