<script setup lang="ts">
import { computed, ref, watch } from "vue";

import AppShell from "@/components/zs/AppShell.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { attendanceAdminRepository } from "@/services/attendance.repository";
import { useCompanyStore } from "@/stores/company";
import type { AttendanceCorrection, AttendanceCorrectionInput, AttendancePage, AttendanceSession } from "@/types/attendance";

setPageMeta("Attendance", "Company attendance register and correction review.");
const company = useCompanyStore();
const canRead = computed(() => company.hasModule("payroll") && company.hasPermission("attendance.view"));
const canDecide = computed(() => company.hasPermission("attendance.corrections.manage"));
const canIntervene = computed(() => company.hasPermission("attendance.manage"));
const sessions = ref<AttendancePage<AttendanceSession> | null>(null);
const queue = ref<AttendancePage<AttendanceCorrection> | null>(null);
const selected = ref<(AttendanceSession & { corrections: AttendanceCorrection[] }) | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<ApiError | null>(null);
const decisionReason = ref("");
const interventionKey = ref("");
const intervention = ref<AttendanceCorrectionInput>({ clock_in_at: "", clock_out_at: "", breaks: [], reason: "" });
const employeeId = ref("");
const from = ref("");
const to = ref("");
let generation = 0;
let controller: AbortController | null = null;

const registerColumns: Column[] = [
  { key: "date", header: "Work date" }, { key: "employee", header: "Employee ID" },
  { key: "state", header: "State" }, { key: "check_in", header: "Check In" },
  { key: "check_out", header: "Check Out" }, { key: "detail", header: "Evidence" },
];
const correctionColumns: Column[] = [
  { key: "submitted", header: "Submitted" }, { key: "employee", header: "Employee ID" },
  { key: "reason", header: "Reason" }, { key: "status", header: "Status" },
  { key: "decision", header: "Review" },
];

function clear(): void {
  controller?.abort();
  controller = null;
  generation += 1;
  sessions.value = null;
  queue.value = null;
  selected.value = null;
  loading.value = false;
  saving.value = false;
  error.value = null;
  decisionReason.value = "";
  interventionKey.value = "";
}

function claim(): { id: string; version: number; generation: number; signal: AbortSignal } | null {
  if (company.switching || !company.activeCompanyId || !canRead.value) return null;
  controller?.abort();
  controller = new AbortController();
  return { id: company.activeCompanyId, version: company.contextVersion, generation, signal: controller.signal };
}

function current(context: { id: string; version: number; generation: number }): boolean {
  return !company.switching && company.activeCompanyId === context.id && company.contextVersion === context.version && generation === context.generation;
}

async function load(page = 1, queuePage = 1): Promise<void> {
  const context = claim();
  if (!context) return;
  loading.value = true;
  error.value = null;
  try {
    const register = await attendanceAdminRepository.sessions(context.id, page, employeeId.value || undefined, from.value || undefined, to.value || undefined, context.signal);
    if (!current(context)) return;
    sessions.value = register;
    queue.value = canDecide.value ? await attendanceAdminRepository.corrections(context.id, queuePage, undefined, context.signal) : null;
  } catch (cause) {
    if (current(context)) error.value = cause instanceof ApiError ? cause : new ApiError("Attendance could not be loaded. Please retry.", "network");
  } finally { if (current(context)) loading.value = false; }
}

async function show(sessionId: string): Promise<void> {
  const context = claim();
  if (!context) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await attendanceAdminRepository.detail(context.id, sessionId, context.signal);
    if (!current(context)) return;
    selected.value = result;
    intervention.value = {
      clock_in_at: result.effective.clock_in_at, clock_out_at: result.effective.clock_out_at ?? "",
      breaks: result.effective.breaks.map(item => ({ started_at: item.started_at, ended_at: item.ended_at ?? "" })), reason: "",
    };
    interventionKey.value = "";
  } catch (cause) {
    if (current(context)) error.value = cause instanceof ApiError ? cause : new ApiError("Attendance detail could not be loaded.", "network");
  } finally { if (current(context)) loading.value = false; }
}

async function decide(item: AttendanceCorrection, decision: "approve" | "reject"): Promise<void> {
  if (!canDecide.value || saving.value || decisionReason.value.trim().length < 5 || !company.activeCompanyId) return;
  const id = company.activeCompanyId;
  const version = company.contextVersion;
  const claim = generation;
  saving.value = true;
  error.value = null;
  try {
    await attendanceAdminRepository.decide(id, item.id, decision, decisionReason.value);
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version && generation === claim) {
      decisionReason.value = "";
      await load(sessions.value?.meta.current_page, queue.value?.meta.current_page);
      if (selected.value) await show(selected.value.id);
    }
  } catch (cause) {
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version && generation === claim) error.value = cause instanceof ApiError ? cause : new ApiError("The correction decision could not be saved.", "network");
  } finally { if (generation === claim) saving.value = false; }
}

async function saveIntervention(): Promise<void> {
  if (!canIntervene.value || !selected.value || saving.value || !company.activeCompanyId) return;
  const id = company.activeCompanyId;
  const version = company.contextVersion;
  const claim = generation;
  if (!interventionKey.value) interventionKey.value = crypto.randomUUID();
  saving.value = true;
  error.value = null;
  try {
    await attendanceAdminRepository.intervene(id, selected.value.id, intervention.value, interventionKey.value);
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version && generation === claim) {
      interventionKey.value = "";
      await show(selected.value.id);
      await load(sessions.value?.meta.current_page, queue.value?.meta.current_page);
    }
  } catch (cause) {
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version && generation === claim) {
      error.value = cause instanceof ApiError ? cause : new ApiError("The intervention could not be saved.", "network");
      if (error.value.kind !== "network") interventionKey.value = "";
    }
  } finally { if (generation === claim) saving.value = false; }
}

watch(() => [company.switching, company.activeCompanyId, company.contextVersion, canRead.value] as const, () => {
  clear();
  if (!company.switching && company.activeCompanyId && canRead.value) void load();
}, { immediate: true, flush: "sync" });
</script>

<template>
  <AppShell>
    <PageHeader title="Attendance" description="Company attendance register, evidence and correction review." />
    <p v-if="company.switching" role="status" class="panel p-5">Switching company…</p>
    <p v-else-if="!canRead" role="status" class="panel p-5">Attendance administration requires attendance.view and the payroll module.</p>
    <template v-else>
      <div v-if="error" role="alert" class="panel mb-4 p-4 text-sm text-danger">{{ error.message }} <button type="button" class="underline" @click="load()">Retry</button></div>
      <Panel title="Attendance Register" description="Company-scoped recorded sessions">
        <template #actions><div class="flex flex-wrap items-end gap-2"><Field v-model="employeeId" label="Employee ID" placeholder="Optional UUID" /><Field v-model="from" label="From work date" type="date" /><Field v-model="to" label="To work date" type="date" /><ZButton variant="outline" :disabled="loading" @click="load()">Apply filters</ZButton></div></template>
        <p v-if="loading && !sessions" role="status" class="p-4 text-sm text-content-muted">Loading register…</p>
        <DataTable v-else :columns="registerColumns" :rows="sessions?.data ?? []" :min-width="760" empty="No attendance sessions match these filters.">
          <template #date="{ row }">{{ row.work_date }}<span v-if="row.corrected" class="ml-1 text-content-brand"> · Corrected</span></template>
          <template #employee="{ row }"><span class="break-all text-xs">{{ row.employee_id }}</span></template>
          <template #state="{ row }"><StatusBadge :status="row.state" /></template>
          <template #check_in="{ row }">{{ row.effective.clock_in_at }}</template>
          <template #check_out="{ row }">{{ row.effective.clock_out_at ?? '—' }}</template>
          <template #detail="{ row }"><button type="button" class="text-content-brand underline" @click="show(row.id)">Review evidence</button></template>
        </DataTable>
        <div v-if="sessions && sessions.meta.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><span>Page {{ sessions.meta.current_page }} of {{ sessions.meta.last_page }}</span><div class="flex gap-2"><ZButton variant="outline" :disabled="loading || sessions.meta.current_page <= 1" @click="load(sessions.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="loading || sessions.meta.current_page >= sessions.meta.last_page" @click="load(sessions.meta.current_page + 1)">Next</ZButton></div></div>
      </Panel>

      <Panel v-if="selected" title="Session Evidence" :description="`${selected.work_date} · ${selected.timezone}`" class="mt-4">
        <div class="space-y-4 p-4 text-sm">
          <p class="break-all text-xs text-content-muted">Employee {{ selected.employee_id }} · Session {{ selected.id }}</p>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div class="rounded-md bg-surface-sunken p-3"><p class="font-semibold">Original evidence</p><p class="mt-2">In: {{ selected.original.clock_in_at }}</p><p>Out: {{ selected.original.clock_out_at ?? 'Open' }}</p><p>Break seconds: {{ selected.original.break_seconds }}</p><p>Worked seconds: {{ selected.original.worked_seconds ?? '—' }}</p></div><div class="rounded-md bg-surface-sunken p-3"><p class="font-semibold">Effective revision {{ selected.revision_number }}</p><p class="mt-2">In: {{ selected.effective.clock_in_at }}</p><p>Out: {{ selected.effective.clock_out_at ?? 'Open' }}</p><p>Break seconds: {{ selected.effective.break_seconds }}</p><p>Worked seconds: {{ selected.effective.worked_seconds ?? '—' }}</p></div></div>
          <p v-for="item in selected.corrections" :key="item.id" class="rounded-md border border-line p-3">{{ item.kind }} · {{ item.status }} · {{ item.reason }}</p>
          <form v-if="canIntervene && selected.state === 'CLOCKED_OUT'" class="space-y-3 rounded-md border border-line p-4" @submit.prevent="saveIntervention"><h3 class="font-semibold">Audited intervention</h3><p class="text-xs text-content-muted">This creates a new revision; original punches are not overwritten. Use timestamps with explicit UTC offsets.</p><Field v-model="intervention.clock_in_at" label="Corrected check-in" required /><Field v-model="intervention.clock_out_at" label="Corrected check-out" required /><div v-for="(item, index) in intervention.breaks" :key="index" class="grid gap-2 sm:grid-cols-2"><Field v-model="item.started_at" :label="`Break ${index + 1} start`" required /><Field v-model="item.ended_at" :label="`Break ${index + 1} end`" required /></div><label class="block"><span class="label-caps">Reason</span><textarea v-model="intervention.reason" class="field mt-1.5" rows="3" minlength="5" maxlength="2000" required /></label><ZButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Create revision' }}</ZButton></form>
        </div>
      </Panel>

      <Panel v-if="canDecide" title="Correction Review" description="Pending and decided requests in this company" class="mt-4">
        <div class="p-4"><Field v-model="decisionReason" label="Decision reason" placeholder="Required before approving or rejecting" /></div>
        <DataTable :columns="correctionColumns" :rows="queue?.data ?? []" :min-width="720" empty="No correction requests.">
          <template #submitted="{ row }">{{ row.submitted_at ?? '—' }}</template>
          <template #employee="{ row }"><span class="break-all text-xs">{{ row.employee_id }}</span></template>
          <template #reason="{ row }">{{ row.reason }}</template>
          <template #status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #decision="{ row }"><div v-if="row.status === 'PENDING'" class="flex gap-2"><ZButton variant="outline" :disabled="saving || decisionReason.trim().length < 5" @click="decide(row, 'approve')">Approve</ZButton><ZButton variant="outline" :disabled="saving || decisionReason.trim().length < 5" @click="decide(row, 'reject')">Reject</ZButton></div><span v-else>Decided</span></template>
        </DataTable>
        <div v-if="queue && queue.meta.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><span>Page {{ queue.meta.current_page }} of {{ queue.meta.last_page }}</span><div class="flex gap-2"><ZButton variant="outline" :disabled="loading || queue.meta.current_page <= 1" @click="load(sessions?.meta.current_page, queue.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="loading || queue.meta.current_page >= queue.meta.last_page" @click="load(sessions?.meta.current_page, queue.meta.current_page + 1)">Next</ZButton></div></div>
      </Panel>
    </template>
  </AppShell>
</template>
