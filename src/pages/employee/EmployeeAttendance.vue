<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Coffee, LogIn, LogOut } from "lucide-vue-next";

import PortalShell from "@/components/employee/PortalShell.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { useCompanyStore } from "@/stores/company";
import { useEmployeeAttendanceStore } from "@/stores/employeeAttendance";
import type { AttendanceAction, AttendanceCorrectionInput, AttendanceSession } from "@/types/attendance";

setPageMeta("Attendance", "Check in, review your history and request corrections.");
type Tab = "today" | "history" | "calendar" | "corrections";
const tabs: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" }, { id: "history", label: "History" },
  { id: "calendar", label: "Calendar" }, { id: "corrections", label: "Corrections" },
];
const tab = ref<Tab>("today");
const tabButtons = ref<HTMLButtonElement[]>([]);
const company = useCompanyStore();
const attendance = useEmployeeAttendanceStore();
const canRead = computed(() => attendance.canView);
const from = ref("");
const to = ref("");
const stateFilter = ref<"" | AttendanceSession["state"]>("");
const month = ref("");
const selectedSession = ref<AttendanceSession | null>(null);
const correctionKey = ref("");
const form = ref<AttendanceCorrectionInput>({ clock_in_at: "", clock_out_at: "", breaks: [], reason: "" });

const historyColumns: Column[] = [
  { key: "date", header: "Work date" }, { key: "check_in", header: "Check In" },
  { key: "check_out", header: "Check Out" }, { key: "worked", header: "Worked" },
  { key: "breaks", header: "Unpaid breaks" }, { key: "state", header: "State" },
  { key: "correction", header: "Correction" },
];
const correctionColumns: Column[] = [
  { key: "submitted", header: "Submitted" }, { key: "change", header: "Requested change" },
  { key: "reason", header: "Reason" }, { key: "status", header: "Status" },
];

function formatInstant(value: string | null | undefined, timezone?: string): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timezone ?? "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  } catch { return value; }
}

function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function setTab(next: Tab): void {
  tab.value = next;
  if (next === "history") void loadHistory();
  if (next === "calendar") void attendance.loadCalendar(month.value);
  if (next === "corrections") {
    void attendance.loadCorrections();
    void loadHistory();
  }
}

async function moveTab(event: KeyboardEvent, index: number): Promise<void> {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const next = (index + direction + tabs.length) % tabs.length;
  setTab(tabs[next].id);
  await nextTick();
  tabButtons.value[next]?.focus();
}

async function loadHistory(page = 1): Promise<void> {
  if (!from.value || !to.value) return;
  await attendance.loadHistory(from.value, to.value, page, stateFilter.value || undefined);
}

function changeMonth(direction: number): void {
  if (!month.value) return;
  const [year, selectedMonth] = month.value.split("-").map(Number);
  const date = new Date(Date.UTC(year, selectedMonth - 1 + direction, 1));
  month.value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  void attendance.loadCalendar(month.value);
}

const calendarCells = computed(() => {
  if (!month.value) return [];
  const [year, selectedMonth] = month.value.split("-").map(Number);
  const first = new Date(Date.UTC(year, selectedMonth - 1, 1));
  const count = new Date(Date.UTC(year, selectedMonth, 0)).getUTCDate();
  const days = new Map(attendance.calendar?.days.map(day => [day.date, day]) ?? []);
  const cells: { date: string | null; day: number | null; states: string[]; count: number }[] = [];
  for (let offset = 0; offset < first.getUTCDay(); offset++) cells.push({ date: null, day: null, states: [], count: 0 });
  for (let day = 1; day <= count; day++) {
    const date = `${month.value}-${String(day).padStart(2, "0")}`;
    const summary = days.get(date);
    cells.push({ date, day, states: summary?.states ?? [], count: summary?.session_count ?? 0 });
  }
  return cells;
});

const openBreak = computed(() => attendance.status?.session?.original.breaks.find(item => item.ended_at === null) ?? null);
const canCorrect = computed(() => attendance.canRequestCorrection && selectedSession.value?.state === "CLOCKED_OUT");

async function selectForCorrection(session: AttendanceSession): Promise<void> {
  if (session.state !== "CLOCKED_OUT" || !attendance.canRequestCorrection) return;
  await attendance.loadDetail(session.id);
  if (!attendance.detail || attendance.detail.id !== session.id) return;
  selectedSession.value = attendance.detail;
  form.value = {
    clock_in_at: attendance.detail.effective.clock_in_at,
    clock_out_at: attendance.detail.effective.clock_out_at ?? "",
    breaks: attendance.detail.effective.breaks.map(item => ({ started_at: item.started_at, ended_at: item.ended_at ?? "" })),
    reason: "",
  };
  correctionKey.value = "";
  setTab("corrections");
}

function chooseCorrectionSession(event: Event): void {
  const id = (event.target as HTMLSelectElement).value;
  const session = attendance.history?.data.find(item => item.id === id);
  if (session) void selectForCorrection(session);
  else selectedSession.value = null;
}

async function sendCorrection(): Promise<void> {
  if (!selectedSession.value || !canCorrect.value || attendance.loading.mutation) return;
  if (!correctionKey.value) correctionKey.value = crypto.randomUUID();
  const succeeded = await attendance.requestCorrection(selectedSession.value.id, form.value, correctionKey.value);
  if (succeeded) {
    selectedSession.value = null;
    correctionKey.value = "";
    form.value = { clock_in_at: "", clock_out_at: "", breaks: [], reason: "" };
  } else if (attendance.errors.mutation?.kind !== "network") {
    correctionKey.value = "";
  }
}

async function act(action: AttendanceAction): Promise<void> {
  const succeeded = await attendance.transition(action);
  if (succeeded && tab.value === "history") await loadHistory();
}

watch(() => [company.switching, company.activeCompanyId, company.contextVersion, canRead.value] as const, async () => {
  selectedSession.value = null;
  correctionKey.value = "";
  from.value = "";
  to.value = "";
  month.value = "";
  if (company.switching || !company.activeCompanyId || !canRead.value) return;
  const companyId = company.activeCompanyId;
  const version = company.contextVersion;
  await attendance.loadStatus();
  if (!attendance.status || company.switching || company.activeCompanyId !== companyId || company.contextVersion !== version) return;
  const date = attendance.status.work_date;
  from.value = `${date.slice(0, 7)}-01`;
  to.value = date;
  month.value = date.slice(0, 7);
  if (tab.value === "history" || tab.value === "corrections") void loadHistory();
  if (tab.value === "calendar") void attendance.loadCalendar(month.value);
}, { immediate: true, flush: "sync" });
</script>

<template>
  <PortalShell>
    <PageHeader title="Attendance" description="Check in, review history and request corrections.">
      <template #actions><ZButton v-if="attendance.canRequestCorrection" variant="outline" @click="setTab('corrections')">Request correction</ZButton></template>
    </PageHeader>

    <p v-if="company.switching" class="panel p-5" role="status">Switching company…</p>
    <p v-else-if="!company.activeCompanyId" class="panel p-5" role="status">Select a company to view attendance.</p>
    <p v-else-if="!canRead" class="panel p-5" role="status">Attendance self-service is unavailable in this company. Access requires employee.attendance.view and the payroll module.</p>
    <p v-else-if="attendance.loading.status && !attendance.status" class="panel p-5" role="status">Loading attendance…</p>
    <div v-else-if="attendance.errors.status && !attendance.status" class="panel p-5 text-sm" role="alert">
      <p v-if="attendance.errors.status.errorCode === 'EMPLOYEE_IDENTITY_NOT_LINKED'">No employee profile is linked to this company membership. Contact your administrator.</p>
      <p v-else>{{ attendance.errors.status.message }}</p>
      <button v-if="attendance.errors.status.errorCode !== 'EMPLOYEE_IDENTITY_NOT_LINKED'" type="button" class="mt-2 underline" @click="attendance.loadStatus()">Retry</button>
    </div>
    <template v-else-if="attendance.status">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="State" :value="attendance.status.state.replaceAll('_', ' ')" tone="brand" />
        <StatCard label="Work date" :value="attendance.status.work_date" />
        <StatCard label="Worked" :value="duration(attendance.status.session?.effective.worked_seconds)" hint="Completed session only" />
        <StatCard label="Unpaid breaks" :value="duration(attendance.status.session?.effective.break_seconds)" hint="Server-recorded duration" />
      </div>

      <div class="mt-4 flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Attendance views">
        <button v-for="(item, index) in tabs" :key="item.id" :ref="el => { if (el) tabButtons[index] = el as HTMLButtonElement; }" type="button" role="tab"
          :id="`attendance-tab-${item.id}`" :aria-controls="`attendance-panel-${item.id}`" :aria-selected="tab === item.id" :tabindex="tab === item.id ? 0 : -1"
          class="nav-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="tab === item.id ? 'bg-surface-sunken text-content' : 'text-content-secondary'" @click="setTab(item.id)" @keydown="moveTab($event, index)">{{ item.label }}</button>
      </div>

      <div v-if="tab === 'today'" id="attendance-panel-today" role="tabpanel" aria-labelledby="attendance-tab-today" class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Today" :description="`${attendance.status.work_date} · ${attendance.status.timezone}`" class="lg:col-span-2">
          <div class="p-4">
            <div class="flex flex-wrap items-center justify-between gap-2"><StatusBadge :status="attendance.status.state" /><span class="text-xs text-content-muted">Times shown in {{ attendance.status.session?.timezone ?? attendance.status.timezone }}</span></div>
            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="item in [
                { label: 'Check In', value: attendance.status.session?.effective.clock_in_at },
                { label: 'Check Out', value: attendance.status.session?.effective.clock_out_at },
                { label: 'Break Start', value: openBreak?.started_at },
                { label: 'Break End', value: attendance.status.session?.original.breaks.at(-1)?.ended_at },
              ]" :key="item.label" class="rounded-md bg-surface-sunken p-3">
                <p class="label-caps">{{ item.label }}</p><p class="num mt-1 break-words text-content">{{ formatInstant(item.value, attendance.status.session?.timezone ?? attendance.status.timezone) }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <ZButton v-if="attendance.status.allowed_actions.includes('CLOCK_IN')" :disabled="attendance.loading.mutation" @click="act('CLOCK_IN')"><LogIn class="size-4" />Clock In</ZButton>
              <ZButton v-if="attendance.status.allowed_actions.includes('CLOCK_OUT')" variant="outline" :disabled="attendance.loading.mutation" @click="act('CLOCK_OUT')"><LogOut class="size-4" />Clock Out</ZButton>
              <ZButton v-if="attendance.status.allowed_actions.includes('BREAK_START')" variant="ghost" :disabled="attendance.loading.mutation" @click="act('BREAK_START')"><Coffee class="size-4" />Start Break</ZButton>
              <ZButton v-if="attendance.status.allowed_actions.includes('BREAK_END')" variant="ghost" :disabled="attendance.loading.mutation" @click="act('BREAK_END')"><Coffee class="size-4" />End Break</ZButton>
              <span v-if="!attendance.status.allowed_actions.length" class="text-xs text-content-muted">No clock action is available for this employee and session.</span>
            </div>
            <p v-if="attendance.loading.mutation" class="mt-3 text-xs text-content-muted" role="status">Saving attendance action…</p>
            <div v-if="attendance.errors.mutation" class="mt-3 text-sm text-danger" role="alert">{{ attendance.errors.mutation.message }} <button type="button" class="underline" @click="attendance.loadStatus()">Reload status</button></div>
            <p v-if="attendance.pending" class="mt-2 text-xs text-content-muted">The previous action may have reached the server. Retry the same action or reload its status; no new event will be assumed.</p>
          </div>
        </Panel>
        <Panel title="Duration Overview">
          <div class="space-y-3 p-4 text-sm">
            <div class="flex items-center justify-between gap-3"><span class="text-content-secondary">Working duration</span><span class="num text-content">{{ duration(attendance.status.session?.effective.worked_seconds) }}</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-content-secondary">Completed unpaid breaks</span><span class="num text-content">{{ duration(attendance.status.session?.effective.break_seconds) }}</span></div>
            <p class="border-t border-line pt-3 text-xs text-content-muted">Duration appears when the server has completed the session. No overtime or payroll classification is inferred.</p>
          </div>
        </Panel>
      </div>

      <Panel v-else-if="tab === 'history'" id="attendance-panel-history" title="Attendance History" class="mt-4" role="tabpanel" aria-labelledby="attendance-tab-history">
        <template #actions>
          <div class="flex flex-wrap items-end gap-2">
            <Field v-model="from" label="From work date" type="date" />
            <Field v-model="to" label="To work date" type="date" />
            <label class="block"><span class="label-caps">State</span><select v-model="stateFilter" class="field mt-1.5"><option value="">All states</option><option value="CLOCKED_IN">Clocked in</option><option value="ON_BREAK">On break</option><option value="CLOCKED_OUT">Clocked out</option></select></label>
            <ZButton variant="outline" :disabled="attendance.loading.history" @click="loadHistory()">Apply filters</ZButton>
          </div>
        </template>
        <p v-if="attendance.loading.history" class="p-4 text-sm text-content-muted" role="status">Loading history…</p>
        <div v-else-if="attendance.errors.history" class="p-4 text-sm text-danger" role="alert">{{ attendance.errors.history.message }} <button type="button" class="underline" @click="loadHistory()">Retry</button></div>
        <DataTable v-else :columns="historyColumns" :rows="attendance.history?.data ?? []" :min-width="760" empty="No attendance sessions match these work dates.">
          <template #date="{ row }">{{ row.work_date }}<span v-if="row.corrected" class="ml-1 text-xs text-content-brand">Corrected</span></template>
          <template #check_in="{ row }">{{ formatInstant(row.effective.clock_in_at, row.timezone) }}</template>
          <template #check_out="{ row }">{{ formatInstant(row.effective.clock_out_at, row.timezone) }}</template>
          <template #worked="{ row }">{{ duration(row.effective.worked_seconds) }}</template>
          <template #breaks="{ row }">{{ duration(row.effective.break_seconds) }}</template>
          <template #state="{ row }"><StatusBadge :status="row.state" /></template>
          <template #correction="{ row }"><button v-if="row.state === 'CLOCKED_OUT' && attendance.canRequestCorrection" type="button" class="text-content-brand underline" @click="selectForCorrection(row)">Request correction</button><span v-else>—</span></template>
        </DataTable>
        <div v-if="attendance.history && attendance.history.meta.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><span>Page {{ attendance.history.meta.current_page }} of {{ attendance.history.meta.last_page }} · {{ attendance.history.meta.total }} sessions</span><div class="flex gap-2"><ZButton variant="outline" :disabled="attendance.loading.history || attendance.history.meta.current_page <= 1" @click="loadHistory(attendance.history.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="attendance.loading.history || attendance.history.meta.current_page >= attendance.history.meta.last_page" @click="loadHistory(attendance.history.meta.current_page + 1)">Next</ZButton></div></div>
      </Panel>

      <Panel v-else-if="tab === 'calendar'" id="attendance-panel-calendar" title="Attendance Calendar" class="mt-4" role="tabpanel" aria-labelledby="attendance-tab-calendar">
        <template #actions><div class="flex items-center gap-3 text-sm"><button type="button" aria-label="Previous month" class="rounded px-2 py-1 focus-visible:outline-2" @click="changeMonth(-1)">‹</button><span>{{ month }}</span><button type="button" aria-label="Next month" class="rounded px-2 py-1 focus-visible:outline-2" @click="changeMonth(1)">›</button></div></template>
        <div class="p-4">
          <p v-if="attendance.loading.calendar" role="status" class="text-sm text-content-muted">Loading calendar…</p>
          <div v-else-if="attendance.errors.calendar" role="alert" class="text-sm text-danger">{{ attendance.errors.calendar.message }} <button type="button" class="underline" @click="attendance.loadCalendar(month)">Retry</button></div>
          <template v-else>
            <div class="grid grid-cols-7 gap-1.5 text-center text-2xs font-medium text-content-muted"><span v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">{{ day }}</span></div>
            <div class="mt-1.5 grid grid-cols-7 gap-1.5"><div v-for="(cell, index) in calendarCells" :key="cell.date ?? `empty-${index}`" class="flex min-h-16 flex-col rounded-md border p-1 text-xs sm:p-1.5" :class="cell.count ? 'border-primary/30 bg-primary-subtle' : cell.day ? 'border-line bg-surface' : 'border-transparent'"><span v-if="cell.day" class="num text-content-secondary">{{ cell.day }}</span><span v-if="cell.count" class="mt-auto text-2xs font-medium">{{ cell.count }} session{{ cell.count === 1 ? '' : 's' }}</span></div></div>
            <p class="mt-4 border-t border-line pt-3 text-xs text-content-muted">Only recorded sessions appear. Empty days are not classified as absence or leave. Overnight sessions belong to their server work date.</p>
          </template>
        </div>
      </Panel>

      <div v-else id="attendance-panel-corrections" role="tabpanel" aria-labelledby="attendance-tab-corrections" class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Request a Correction" class="lg:col-span-1">
          <div class="space-y-3 p-4">
            <p v-if="!attendance.canRequestCorrection" class="text-sm text-content-muted">Correction requests are not permitted in this company.</p>
            <template v-else>
              <label class="block"><span class="label-caps">Closed session</span><select :value="selectedSession?.id ?? ''" class="field mt-1.5" @change="chooseCorrectionSession"><option value="">Select a session</option><option v-for="session in (attendance.history?.data ?? []).filter(item => item.state === 'CLOCKED_OUT')" :key="session.id" :value="session.id">{{ session.work_date }} · {{ session.id.slice(0, 8) }}</option></select></label>
              <p v-if="attendance.loading.detail" role="status" class="text-sm text-content-muted">Loading session evidence…</p>
              <p v-if="attendance.errors.detail" role="alert" class="text-sm text-danger">{{ attendance.errors.detail.message }}</p>
              <form v-if="canCorrect" class="space-y-3" @submit.prevent="sendCorrection">
                <p class="text-xs text-content-muted">Edit complete timestamps with an explicit UTC offset (for example +05:00). The original punches remain preserved.</p>
                <Field v-model="form.clock_in_at" label="Requested check-in (ISO timestamp with offset)" required :error="attendance.errors.mutation?.fields.clock_in_at" />
                <Field v-model="form.clock_out_at" label="Requested check-out (ISO timestamp with offset)" required :error="attendance.errors.mutation?.fields.clock_out_at" />
                <div v-for="(item, index) in form.breaks" :key="index" class="space-y-2 rounded-md border border-line p-2"><p class="label-caps">Unpaid break {{ index + 1 }}</p><Field v-model="item.started_at" label="Break start (ISO timestamp with offset)" required /><Field v-model="item.ended_at" label="Break end (ISO timestamp with offset)" required /><button type="button" class="text-xs text-content-brand underline" @click="form.breaks.splice(index, 1)">Remove break</button></div>
                <button v-if="form.breaks.length < 50" type="button" class="text-sm text-content-brand underline" @click="form.breaks.push({ started_at: '', ended_at: '' })">Add break</button>
                <label class="block"><span class="label-caps">Reason</span><textarea v-model="form.reason" class="field mt-1.5" rows="3" minlength="5" maxlength="2000" required :aria-invalid="attendance.errors.mutation?.fields.reason ? 'true' : undefined" /><span v-if="attendance.errors.mutation?.fields.reason" role="alert" class="text-xs text-danger">{{ attendance.errors.mutation.fields.reason }}</span></label>
                <p v-if="attendance.errors.mutation" role="alert" class="text-sm text-danger">{{ attendance.errors.mutation.message }}</p>
                <ZButton type="submit" class="w-full justify-center" :disabled="attendance.loading.mutation">{{ attendance.loading.mutation ? 'Submitting…' : 'Submit request' }}</ZButton>
              </form>
              <p v-else class="text-sm text-content-muted">Select a closed session from this history page to request a correction. Earlier sessions can be found by changing the History work-date range.</p>
            </template>
          </div>
        </Panel>
        <Panel title="Correction Requests" class="lg:col-span-2">
          <p v-if="attendance.loading.corrections" class="p-4 text-sm text-content-muted" role="status">Loading correction requests…</p>
          <div v-else-if="attendance.errors.corrections" class="p-4 text-sm text-danger" role="alert">{{ attendance.errors.corrections.message }} <button type="button" class="underline" @click="attendance.loadCorrections()">Retry</button></div>
          <DataTable v-else :columns="correctionColumns" :rows="attendance.corrections?.data ?? []" :min-width="620" empty="No correction requests in this company.">
            <template #submitted="{ row }">{{ formatInstant(row.submitted_at) }} UTC</template>
            <template #change="{ row }">{{ formatInstant(row.proposed.clock_in_at) }} → {{ formatInstant(row.proposed.clock_out_at) }} UTC</template>
            <template #reason="{ row }">{{ row.reason }}</template>
            <template #status="{ row }"><StatusBadge :status="row.status" /></template>
          </DataTable>
          <div v-if="attendance.corrections && attendance.corrections.meta.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><span>Page {{ attendance.corrections.meta.current_page }} of {{ attendance.corrections.meta.last_page }}</span><div class="flex gap-2"><ZButton variant="outline" :disabled="attendance.loading.corrections || attendance.corrections.meta.current_page <= 1" @click="attendance.loadCorrections(attendance.corrections.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="attendance.loading.corrections || attendance.corrections.meta.current_page >= attendance.corrections.meta.last_page" @click="attendance.loadCorrections(attendance.corrections.meta.current_page + 1)">Next</ZButton></div></div>
        </Panel>
      </div>
    </template>
  </PortalShell>
</template>
