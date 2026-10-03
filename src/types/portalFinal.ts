export interface PortalFile { id: string; original_filename: string; mime_type: string; size_bytes: number }
export interface Colleague { id: string; full_name: string; department: string | null; designation: string | null; location: string | null }
export interface PortalRecord {
  id: string; version?: number; status?: string; name?: string; title?: string; description?: string | null;
  original_filename?: string; category?: string; mime_type?: string; size_bytes?: number;
  released_at?: string | null; employee_id?: string; created_at?: string; published_at?: string | null;
  priority?: string; expires_at?: string | null; attachment?: PortalFile | null; receipt?: PortalFile | null;
  relationship?: string; phone?: string; full_name?: string; department?: string | null; designation?: string | null; location?: string | null;
  lead?: Colleague | null; member_count?: number; manager?: Colleague | null; direct_report_count?: number;
  start_time?: string; end_time?: string; start_date?: string; end_date?: string; timezone?: string; is_active?: boolean;
  shift_date?: string; shift_name?: string; slot_id?: string; shift_id?: string; rota_id?: string;
  required_coverage?: number; assigned_count?: number; coverage_gap?: number; assignments?: PortalRecord[];
  requester_employee_id?: string; target_employee_id?: string; from_assignment_id?: string; to_assignment_id?: string;
  reason?: string; decision_reason?: string | null; target_accepted_at?: string | null; decided_at?: string | null;
  type?: string; item_description?: string; category_id?: string; amount_minor?: number; currency?: string; expense_date?: string; submitted_at?: string | null;
  events?: {id: string; type: string; version: number; reason: string | null; occurred_at: string}[] | null;
}
export interface PortalList { data: PortalRecord[]; meta?: {total: number; current_page: number; last_page: number}; manager?: Colleague | null; direct_report_count?: number }
export interface PortalDetail extends PortalRecord { team?: PortalRecord; rota?: PortalRecord; data?: PortalRecord[]; slots?: PortalRecord[]; meta?: PortalList['meta'] }
export type PortalDomain = 'documents' | 'announcements' | 'directory' | 'teams' | 'direct-reports' | 'contacts' | 'schedule' | 'swaps' | 'assets' | 'expenses' | 'categories' | 'shifts' | 'rotas';
