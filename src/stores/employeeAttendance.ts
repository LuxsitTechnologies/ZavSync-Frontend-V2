import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { ApiError } from "@/services/api/client";
import { attendanceRepository } from "@/services/attendance.repository";
import { useCompanyStore } from "@/stores/company";
import type { AttendanceAction, AttendanceCalendar, AttendanceCorrection, AttendanceCorrectionInput, AttendancePage, AttendanceSession, AttendanceStatus } from "@/types/attendance";

type RequestKind = "status" | "history" | "calendar" | "corrections" | "detail" | "mutation";
type Context = { id: string; version: number; generation: number; controller: AbortController };
type PendingAction = { action: AttendanceAction; key: string };

const requestError = (error: unknown): ApiError => error instanceof ApiError
  ? error : new ApiError("Attendance could not be loaded. Please retry.", "network");
const pendingKey = (companyId: string) => `zavsync.attendance.pending.${companyId}`;

function readPending(companyId: string): PendingAction | null {
  try {
    const value = sessionStorage.getItem(pendingKey(companyId));
    if (!value) return null;
    const parsed = JSON.parse(value) as PendingAction;
    return ["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"].includes(parsed.action) && typeof parsed.key === "string"
      ? parsed : null;
  } catch { return null; }
}

function savePending(companyId: string, pending: PendingAction | null): void {
  if (pending) sessionStorage.setItem(pendingKey(companyId), JSON.stringify(pending));
  else sessionStorage.removeItem(pendingKey(companyId));
}

const resultState: Record<AttendanceAction, AttendanceStatus["state"]> = {
  CLOCK_IN: "CLOCKED_IN", CLOCK_OUT: "CLOCKED_OUT", BREAK_START: "ON_BREAK", BREAK_END: "CLOCKED_IN",
};

export const useEmployeeAttendanceStore = defineStore("employeeAttendance", () => {
  const company = useCompanyStore();
  const status = ref<AttendanceStatus | null>(null);
  const history = ref<AttendancePage<AttendanceSession> | null>(null);
  const calendar = ref<AttendanceCalendar | null>(null);
  const corrections = ref<AttendancePage<AttendanceCorrection> | null>(null);
  const detail = ref<AttendanceSession | null>(null);
  const loading = ref<Record<RequestKind, boolean>>({ status: false, history: false, calendar: false, corrections: false, detail: false, mutation: false });
  const errors = ref<Partial<Record<RequestKind, ApiError>>>({});
  const pending = ref<PendingAction | null>(null);
  const controllers: Partial<Record<RequestKind, AbortController>> = {};
  let generation = 0;

  const canView = computed(() => company.hasModule("payroll") && company.hasPermission("employee.attendance.view"));
  const canClock = computed(() => canView.value && company.hasPermission("employee.attendance.clock"));
  const canRequestCorrection = computed(() => canView.value && company.hasPermission("employee.attendance.correction.request"));

  function clear(): void {
    Object.values(controllers).forEach(controller => controller?.abort());
    for (const kind of Object.keys(controllers) as RequestKind[]) delete controllers[kind];
    generation += 1;
    status.value = null;
    history.value = null;
    calendar.value = null;
    corrections.value = null;
    detail.value = null;
    pending.value = null;
    loading.value = { status: false, history: false, calendar: false, corrections: false, detail: false, mutation: false };
    errors.value = {};
  }

  function claim(kind: RequestKind): Context | null {
    if (!company.authenticated || company.switching || !company.activeCompanyId || !canView.value) return null;
    controllers[kind]?.abort();
    const controller = new AbortController();
    controllers[kind] = controller;
    return { id: company.activeCompanyId, version: company.contextVersion, generation, controller };
  }

  function current(context: Context, kind: RequestKind): boolean {
    return company.authenticated && !company.switching && company.activeCompanyId === context.id
      && company.contextVersion === context.version && generation === context.generation
      && controllers[kind] === context.controller;
  }

  function begin(kind: RequestKind): void {
    loading.value[kind] = true;
    delete errors.value[kind];
  }

  function finish(context: Context, kind: RequestKind): void {
    if (current(context, kind)) loading.value[kind] = false;
  }

  async function loadStatus(): Promise<void> {
    const context = claim("status");
    if (!context) return;
    begin("status");
    try {
      const result = await attendanceRepository.status(context.id, context.controller.signal);
      if (!current(context, "status")) return;
      status.value = result;
      pending.value = readPending(context.id);
      if (pending.value && result.state === resultState[pending.value.action]) {
        pending.value = null;
        savePending(context.id, null);
      }
    } catch (error) {
      if (current(context, "status")) errors.value.status = requestError(error);
    } finally { finish(context, "status"); }
  }

  async function loadHistory(from: string, to: string, page = 1, state?: AttendanceSession["state"]): Promise<void> {
    const context = claim("history");
    if (!context) return;
    begin("history");
    history.value = null;
    try {
      const result = await attendanceRepository.history(context.id, from, to, page, state, context.controller.signal);
      if (current(context, "history")) history.value = result;
    } catch (error) {
      if (current(context, "history")) errors.value.history = requestError(error);
    } finally { finish(context, "history"); }
  }

  async function loadCalendar(month: string): Promise<void> {
    const context = claim("calendar");
    if (!context) return;
    begin("calendar");
    calendar.value = null;
    try {
      const result = await attendanceRepository.calendar(context.id, month, context.controller.signal);
      if (current(context, "calendar")) calendar.value = result;
    } catch (error) {
      if (current(context, "calendar")) errors.value.calendar = requestError(error);
    } finally { finish(context, "calendar"); }
  }

  async function loadCorrections(page = 1): Promise<void> {
    const context = claim("corrections");
    if (!context) return;
    begin("corrections");
    corrections.value = null;
    try {
      const result = await attendanceRepository.corrections(context.id, page, context.controller.signal);
      if (current(context, "corrections")) corrections.value = result;
    } catch (error) {
      if (current(context, "corrections")) errors.value.corrections = requestError(error);
    } finally { finish(context, "corrections"); }
  }

  async function loadDetail(sessionId: string): Promise<void> {
    const context = claim("detail");
    if (!context) return;
    begin("detail");
    detail.value = null;
    try {
      const result = await attendanceRepository.detail(context.id, sessionId, context.controller.signal);
      if (current(context, "detail")) detail.value = result;
    } catch (error) {
      if (current(context, "detail")) errors.value.detail = requestError(error);
    } finally { finish(context, "detail"); }
  }

  async function transition(action: AttendanceAction): Promise<boolean> {
    if (loading.value.mutation || !canClock.value || !status.value?.allowed_actions.includes(action)) return false;
    const context = claim("mutation");
    if (!context) return false;
    const active = readPending(context.id);
    if (active && active.action !== action) {
      errors.value.mutation = new ApiError("Resolve the previous attendance action before starting another.", "conflict");
      return false;
    }
    const attempt = active ?? { action, key: crypto.randomUUID() };
    pending.value = attempt;
    savePending(context.id, attempt);
    begin("mutation");
    try {
      await attendanceRepository.transition(context.id, action, attempt.key, context.controller.signal);
      if (!current(context, "mutation")) return false;
      pending.value = null;
      savePending(context.id, null);
      await loadStatus();
      return true;
    } catch (error) {
      if (!current(context, "mutation")) return false;
      errors.value.mutation = requestError(error);
      if (errors.value.mutation.kind !== "network") {
        pending.value = null;
        savePending(context.id, null);
      }
      await loadStatus();
      return false;
    } finally { finish(context, "mutation"); }
  }

  async function requestCorrection(sessionId: string, input: AttendanceCorrectionInput, key: string): Promise<boolean> {
    if (loading.value.mutation || !canRequestCorrection.value) return false;
    const context = claim("mutation");
    if (!context) return false;
    begin("mutation");
    try {
      await attendanceRepository.requestCorrection(context.id, sessionId, input, key, context.controller.signal);
      if (!current(context, "mutation")) return false;
      await loadCorrections();
      return true;
    } catch (error) {
      if (current(context, "mutation")) errors.value.mutation = requestError(error);
      return false;
    } finally { finish(context, "mutation"); }
  }

  watch(() => [company.switching, company.activeCompanyId, company.contextVersion, company.authenticated, canView.value] as const,
    clear, { flush: "sync" });

  return {
    status, history, calendar, corrections, detail, loading, errors, pending,
    canView, canClock, canRequestCorrection, clear, loadStatus, loadHistory, loadCalendar,
    loadCorrections, loadDetail, transition, requestCorrection,
  };
});
