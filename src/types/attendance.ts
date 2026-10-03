export type AttendanceState = "NOT_CLOCKED_IN" | "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
export type AttendanceAction = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AttendanceBreak {
  id?: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface AttendanceEvidence {
  clock_in_at: string;
  clock_out_at: string | null;
  breaks: AttendanceBreak[];
  break_seconds: number;
  worked_seconds: number | null;
}

export interface AttendanceSession {
  id: string;
  work_date: string;
  timezone: string;
  state: Exclude<AttendanceState, "NOT_CLOCKED_IN">;
  original: AttendanceEvidence;
  effective: AttendanceEvidence;
  corrected: boolean;
  revision_number: number;
  provenance: string;
  employee_id?: string;
}

export interface AttendanceStatus {
  state: AttendanceState;
  timezone: string;
  work_date: string;
  session: AttendanceSession | null;
  allowed_actions: AttendanceAction[];
}

export interface AttendancePage<T> {
  data: T[];
  meta: { total: number; current_page: number; last_page: number; per_page?: number };
}

export interface AttendanceCalendar {
  month: string;
  days: { date: string; session_count: number; states: AttendanceSession["state"][] }[];
}

export interface AttendanceCorrection {
  id: string;
  session_id: string;
  employee_id?: string;
  kind: "EMPLOYEE_REQUEST" | "ADMIN_INTERVENTION";
  status: CorrectionStatus;
  original: AttendanceEvidence;
  proposed: AttendanceEvidence;
  reason: string;
  decision_reason: string | null;
  submitted_at: string | null;
  decided_at: string | null;
}

export interface AttendanceCorrectionInput {
  clock_in_at: string;
  clock_out_at: string;
  breaks: { started_at: string; ended_at: string }[];
  reason: string;
}
