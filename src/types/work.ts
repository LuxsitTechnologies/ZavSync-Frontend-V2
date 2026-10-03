export type WorkKind = 'tasks' | 'tickets';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH';
export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export interface WorkItem {
  id: string; title?: string; subject?: string; description: string | null;
  priority: Priority; status: TaskStatus | TicketStatus; version: number; created_at: string;
  due_date?: string; completed_at?: string | null; creator_name?: string; assignee_name?: string;
  category?: string | null;
}
export interface WorkPage { data: WorkItem[]; meta: { total: number; current_page: number; last_page: number } }
export interface WorkComment { id: string; body: string; author: string; created_at: string }
export interface WorkFile { id: string; original_filename: string; mime_type: string; size_bytes: number; created_at: string }
export interface TaskInput { assigned_employee_id: string; title: string; description: string; priority: Priority; due_date: string }
export interface TicketInput { subject: string; description: string; category: string; priority: Priority }
export type WorkAction = 'start' | 'complete' | 'reopen' | 'cancel' | 'resolve' | 'close';
export interface WorkReader {
  list(company: string, kind: WorkKind, page: number, status: string, filter: string, signal: AbortSignal): Promise<WorkPage>;
  detail(company: string, kind: WorkKind, id: string, signal: AbortSignal): Promise<WorkItem>;
  comments(company: string, kind: WorkKind, id: string, signal: AbortSignal): Promise<{ data: WorkComment[] }>;
  comment(company: string, kind: WorkKind, id: string, body: string, key: string, signal: AbortSignal): Promise<WorkComment>;
  files(company: string, kind: WorkKind, id: string, signal: AbortSignal): Promise<{ data: WorkFile[] }>;
  upload(company: string, kind: WorkKind, id: string, file: File, key: string, signal: AbortSignal): Promise<WorkFile>;
  downloadPath(kind: WorkKind, id: string, file: string): string;
}
