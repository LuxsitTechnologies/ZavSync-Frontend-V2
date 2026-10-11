import { apiRequest } from '@/services/api/client';
import type { WorkReader, WorkKind, WorkItem, WorkPage, WorkComment, WorkFile, TaskInput, WorkAction } from '@/types/work';
const root = (kind: WorkKind) => `/${kind}`;
const path = (kind: WorkKind, id: string) => `${root(kind)}/${encodeURIComponent(id)}`;
export const adminWorkRepository = {
  assignees: (company: string, search: string, page: number, signal: AbortSignal) => apiRequest<{
    data: { id: string; employee_code: string; full_name: string; status: string }[];
    meta: { total: number; current_page: number; last_page: number };
  }>('/tasks/assignees', { companyId: company, query: { search, page, per_page: 20 }, signal }),
  list: (company: string, kind: WorkKind, page: number, status: string, filter: string, signal: AbortSignal) => apiRequest<WorkPage>(root(kind), { companyId: company, query: { page, status, ...(kind === 'tasks' ? { assigned_employee_id: filter } : { employee_id: filter }) }, signal }),
  detail: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<WorkItem>(path(kind,id), { companyId: company, signal }),
  comments: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<{data: WorkComment[]}>(`${path(kind,id)}/comments`, { companyId: company, signal }),
  comment: (company: string, kind: WorkKind, id: string, body: string, key: string, signal: AbortSignal) => apiRequest<WorkComment>(`${path(kind,id)}/comments`, { companyId: company, method: 'POST', body: {body}, idempotencyKey: key, signal }),
  files: (company: string, kind: WorkKind, id: string, signal: AbortSignal) => apiRequest<{data: WorkFile[]}>(`${path(kind,id)}/attachments`, { companyId: company, signal }),
  upload: (company: string, kind: WorkKind, id: string, file: File, key: string, signal: AbortSignal) => {
    const body = new FormData(); body.append('file',file);
    return apiRequest<WorkFile>(`${path(kind,id)}/attachments`, { companyId: company, method: 'POST', body, idempotencyKey: key, signal });
  },
  downloadPath: (kind: WorkKind, id: string, file: string) => `${path(kind,id)}/attachments/${encodeURIComponent(file)}`,
  create: (company: string, body: TaskInput, key: string, signal: AbortSignal) => apiRequest<WorkItem>('/tasks', { companyId: company, method: 'POST', body, idempotencyKey: key, signal }),
  update: (company: string, id: string, body: Omit<TaskInput,'assigned_employee_id'> & {version: number}, signal: AbortSignal) => apiRequest<WorkItem>(path('tasks',id), { companyId: company, method: 'PATCH', body, signal }),
  assign: (company: string, id: string, assigned_employee_id: string, version: number, signal: AbortSignal) => apiRequest<WorkItem>(`${path('tasks',id)}/assign`, { companyId: company, method: 'POST', body: {assigned_employee_id,version}, signal }),
  transition: (company: string, kind: WorkKind, id: string, action: WorkAction, version: number, signal: AbortSignal) => apiRequest<WorkItem>(`${path(kind,id)}/${action}`, { companyId: company, method: 'POST', body: {version}, signal }),
} satisfies WorkReader & Record<string, unknown>;
