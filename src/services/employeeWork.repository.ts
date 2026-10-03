import { apiRequest } from '@/services/api/client';
import type { WorkReader, WorkKind, WorkItem, WorkPage, WorkComment, WorkFile, TicketInput } from '@/types/work';
const root = (kind: WorkKind) => `/employee/${kind}`;
const path = (kind: WorkKind, id: string) => `${root(kind)}/${encodeURIComponent(id)}`;
export const employeeWorkRepository = {
  list: (company: string, kind: WorkKind, page: number, status: string, _filter: string, signal: AbortSignal) => apiRequest<WorkPage>(root(kind), { companyId: company, query: { page, status }, signal }),
  detail: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<WorkItem>(path(kind,id), { companyId: company, signal }),
  comments: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<{data: WorkComment[]}>(`${path(kind,id)}/comments`, { companyId: company, signal }),
  comment: (company: string, kind: WorkKind, id: string, body: string, key: string, signal: AbortSignal) => apiRequest<WorkComment>(`${path(kind,id)}/comments`, { companyId: company, method: 'POST', body: {body}, idempotencyKey: key, signal }),
  files: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<{data: WorkFile[]}>(`${path(kind,id)}/attachments`, { companyId: company, signal }),
  upload: (company: string, kind: WorkKind, id: string, file: File, key: string, signal: AbortSignal) => {
    const body = new FormData(); body.append('file',file);
    return apiRequest<WorkFile>(`${path(kind,id)}/attachments`, { companyId: company, method: 'POST', body, idempotencyKey: key, signal });
  },
  downloadPath: (kind: WorkKind, id: string, file: string) => `${path(kind,id)}/attachments/${encodeURIComponent(file)}`,
  create: (company: string, body: TicketInput, key: string, signal: AbortSignal) => apiRequest<WorkItem>('/employee/tickets', { companyId: company, method: 'POST', body, idempotencyKey: key, signal }),
  transition: (company: string, kind: WorkKind, id: string, action: 'start' | 'complete' | 'close', version: number, signal: AbortSignal) => apiRequest<WorkItem>(`${path(kind,id)}/${action}`, { companyId: company, method: 'POST', body: {version}, signal }),
} satisfies WorkReader & Record<string, unknown>;
