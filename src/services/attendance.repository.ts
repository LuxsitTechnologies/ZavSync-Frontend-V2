import { apiRequest } from "@/services/api/client";
import type { AttendanceAction, AttendanceCalendar, AttendanceCorrection, AttendanceCorrectionInput, AttendancePage, AttendanceSession, AttendanceStatus } from "@/types/attendance";

const actionPaths: Record<AttendanceAction, string> = {
  CLOCK_IN: "/employee/attendance/clock-in",
  CLOCK_OUT: "/employee/attendance/clock-out",
  BREAK_START: "/employee/attendance/breaks/start",
  BREAK_END: "/employee/attendance/breaks/end",
};

export const attendanceRepository = {
  status: (companyId: string, signal?: AbortSignal) =>
    apiRequest<AttendanceStatus>("/employee/attendance/status", { companyId, signal }),
  transition: (companyId: string, action: AttendanceAction, idempotencyKey: string, signal?: AbortSignal) =>
    apiRequest<AttendanceSession>(actionPaths[action], { method: "POST", companyId, body: {}, idempotencyKey, signal }),
  history: (companyId: string, from: string, to: string, page = 1, state?: AttendanceSession["state"], signal?: AbortSignal) =>
    apiRequest<AttendancePage<AttendanceSession>>("/employee/attendance/history", { companyId, query: { from, to, page, per_page: 20, state }, signal }),
  detail: (companyId: string, sessionId: string, signal?: AbortSignal) =>
    apiRequest<AttendanceSession>(`/employee/attendance/${encodeURIComponent(sessionId)}`, { companyId, signal }),
  calendar: (companyId: string, month: string, signal?: AbortSignal) =>
    apiRequest<AttendanceCalendar>("/employee/attendance/calendar", { companyId, query: { month }, signal }),
  corrections: (companyId: string, page = 1, signal?: AbortSignal) =>
    apiRequest<AttendancePage<AttendanceCorrection>>("/employee/attendance/corrections", { companyId, query: { page, per_page: 20 }, signal }),
  requestCorrection: (companyId: string, sessionId: string, input: AttendanceCorrectionInput, idempotencyKey: string, signal?: AbortSignal) =>
    apiRequest<AttendanceCorrection>(`/employee/attendance/${encodeURIComponent(sessionId)}/corrections`, { method: "POST", companyId, body: input, idempotencyKey, signal }),
};

export const attendanceAdminRepository = {
  sessions: (companyId: string, page = 1, employeeId?: string, from?: string, to?: string, signal?: AbortSignal) =>
    apiRequest<AttendancePage<AttendanceSession>>("/attendance/sessions", { companyId, query: { page, per_page: 20, employee_id: employeeId, from, to }, signal }),
  detail: (companyId: string, sessionId: string, signal?: AbortSignal) =>
    apiRequest<AttendanceSession & { corrections: AttendanceCorrection[] }>(`/attendance/sessions/${encodeURIComponent(sessionId)}`, { companyId, signal }),
  corrections: (companyId: string, page = 1, status?: AttendanceCorrection["status"], signal?: AbortSignal) =>
    apiRequest<AttendancePage<AttendanceCorrection>>("/attendance/corrections", { companyId, query: { page, per_page: 20, status }, signal }),
  decide: (companyId: string, correctionId: string, decision: "approve" | "reject", reason: string, signal?: AbortSignal) =>
    apiRequest<AttendanceCorrection>(`/attendance/corrections/${encodeURIComponent(correctionId)}/${decision}`, { method: "POST", companyId, body: { reason }, signal }),
  intervene: (companyId: string, sessionId: string, input: AttendanceCorrectionInput, idempotencyKey: string, signal?: AbortSignal) =>
    apiRequest<AttendanceCorrection>(`/attendance/sessions/${encodeURIComponent(sessionId)}/interventions`, { method: "POST", companyId, body: input, idempotencyKey, signal }),
};
