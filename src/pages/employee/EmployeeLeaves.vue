<script setup lang="ts">
import { useNow } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PortalShell from '@/components/employee/PortalShell.vue';
import PageHeader from '@/components/zs/PageHeader.vue';
import Panel from '@/components/zs/Panel.vue';
import Field from '@/components/zs/Field.vue';
import ZButton from '@/components/zs/ZButton.vue';
import ConfirmDialog from '@/components/zs/ConfirmDialog.vue';
import LeaveDetail from '@/components/leave/LeaveDetail.vue';
import LeaveCalendar from '@/components/leave/LeaveCalendar.vue';
import { useCompanyStore } from '@/stores/company';
import { useEmployeePortalStore } from '@/stores/employeePortal';
import { useLeaveContext } from '@/composables/useLeaveContext';
import { employeeLeaveRepository as repository } from '@/services/employeeLeave.repository';
import { companyDate, leaveDays } from '@/lib/leave';
import { leaveStatuses, type Holiday, type LeaveInput, type LeavePage, type LeaveRequest, type LeaveStatus, type LeaveSummary, type LeaveType } from '@/types/leave';
import { setPageMeta } from '@/lib/page-meta';
setPageMeta('Leaves', 'Your company leave balances, requests and holidays.');
const now = useNow({ interval: 1000 });
const company = useCompanyStore(), portal = useEmployeePortalStore(), route = useRoute();
const canRead = computed(() => company.hasModule('payroll') && company.hasPermission('employee.leave.view'));
const activeEmployee = computed(() => !!portal.employee?.linked && !!portal.employee.employee && !['terminated','resigned'].includes(portal.employee.employee.status.toLowerCase()));
const canApply = computed(() => canRead.value && activeEmployee.value && company.hasPermission('employee.leave.request'));
const today = () => companyDate(company.activeCompany?.timezone, now.value);
const summary = ref<LeaveSummary | null>(null), history = ref<LeavePage<LeaveRequest> | null>(null), detail = ref<LeaveRequest | null>(null);
const types = ref<LeaveType[]>([]), holidays = ref<Holiday[] | null>(null), approved = ref<LeaveRequest[] | null>(null);
const status = ref<LeaveStatus | ''>(''), year = ref(''), showApply = ref(false), confirming = ref(false);
const tab = ref(route.path.endsWith('/calendar') ? 'calendar' : 'overview');
watch(() => route.path, path => { tab.value = path.endsWith('/calendar') ? 'calendar' : 'overview'; });
const emptyForm = (): LeaveInput => ({ leave_type_id: '', start_date: '', end_date: '', day_portion: 'FULL_DAY', reason: '' });
const form = ref(emptyForm());
const pending = ref<{ key: string; body: LeaveInput } | null>(null);
const localError = ref('');
function reset() { summary.value = null; history.value = null; detail.value = null; types.value = []; holidays.value = null; approved.value = null; form.value = emptyForm(); pending.value = null; confirming.value = false; showApply.value = false; year.value = ''; status.value = ''; localError.value = ''; }
const context = useLeaveContext(reset, load);
function loadHistory(page = 1) { if (canRead.value) { history.value = null; void context.run('history', (id, signal) => repository.history(id, page, status.value, signal), value => { history.value = value; }); } }
function loadSummary() { if (canRead.value) { summary.value = null; void context.run('summary', (id, signal) => repository.summary(id, Number(year.value), signal), value => { summary.value = value; }); } }
function loadCalendar() {
  if (!canRead.value) return;
  approved.value = null;
  void context.run('calendar', async (id, signal) => {
    const items: LeaveRequest[] = [];
    for (const state of ['APPROVED', 'CANCELLATION_PENDING'] as const) {
      let page = 1, last = 1;
      do { const response = await repository.history(id, page, state, signal); items.push(...response.data); last = response.meta.last_page; page += 1; } while (page <= last && !signal.aborted);
      if (signal.aborted) break;
    }
    return items;
  }, value => { approved.value = value; });
}
function load() {
  if (!canRead.value) return;
  year.value = (today() || new Date().toISOString()).slice(0,4);
  loadSummary(); loadHistory(); loadCalendar();
  void context.run('types', (id, signal) => repository.types(id, signal), value => { types.value = value.data; });
  void context.run('holidays', (id, signal) => repository.holidays(id, signal), value => { holidays.value = value.data; });
}
function openDetail(id: string) { detail.value = null; void context.run('detail', (companyId, signal) => repository.detail(companyId, id, signal), value => { detail.value = value; }); }
async function submit() {
  if (!canApply.value || context.busy.mutation) return;
  localError.value = '';
  if (!pending.value && form.value.day_portion !== 'FULL_DAY' && form.value.start_date !== form.value.end_date) { localError.value = 'Half-day leave must cover exactly one date.'; return; }
  pending.value ??= { key: crypto.randomUUID(), body: { ...form.value } };
  const attempt = pending.value;
  const succeeded = await context.run('mutation', (id, signal) => repository.create(id, attempt.body, attempt.key, signal), value => { detail.value = value; pending.value = null; form.value = emptyForm(); showApply.value = false; });
  if (succeeded) { loadSummary(); loadHistory(); }
  else if (context.errors.mutation && !['network','server'].includes(context.errors.mutation.kind)) pending.value = null;
}
const canCancel = computed(() => !!detail.value && activeEmployee.value && company.hasPermission('employee.leave.cancel') && (detail.value.status === 'PENDING' || (detail.value.status === 'APPROVED' && !!today() && detail.value.start_date > today())));
async function cancel() {
  if (!detail.value || !canCancel.value || context.busy.mutation) return;
  const id = detail.value.id;
  confirming.value = false;
  const succeeded = await context.run('mutation', (companyId, signal) => repository.cancel(companyId, id, signal), value => { detail.value = value; });
  if (succeeded) { loadSummary(); loadHistory(); loadCalendar(); }
  else if (context.errors.mutation) openDetail(id); // Reconcile authoritative state before offering another action.
}
load();
</script>
<template>
  <PortalShell>
    <PageHeader title="Leaves" description="Company leave balances, requests and holidays">
      <template #actions><ZButton v-if="canApply" :disabled="context.busy.mutation" @click="showApply = !showApply">Apply for leave</ZButton></template>
    </PageHeader>
    <p v-if="company.switching" class="panel p-4" role="status">Switching company…</p>
    <LeaveCalendar v-else-if="!canRead && route.path.endsWith('/calendar') && company.hasModule('payroll') && company.hasPermission('employee.schedule.view')" :holidays="[]" :requests="[]" :initial-month="today().slice(0,7)" />
    <p v-else-if="!canRead" class="panel p-4">Leave self-service is unavailable in this company.</p>
    <template v-else>
      <p v-if="context.errors.summary?.errorCode === 'EMPLOYEE_IDENTITY_NOT_LINKED'" class="panel p-4" role="status">No employee profile is linked to this company membership. Contact your administrator.</p>
      <template v-else>
        <p v-if="portal.employee?.linked && !activeEmployee" class="mb-4 text-sm">Historical leave remains readable. New requests, uploads and cancellations are unavailable for this employment record.</p>
        <p v-else-if="!portal.canViewEmployee || portal.employeeError" class="mb-4 text-sm">Employment status could not be verified. Request and cancellation controls are unavailable; leave history remains readable.</p>
        <nav class="mb-4 flex flex-wrap gap-2" aria-label="Leave views"><ZButton v-for="view in ['overview','calendar','holidays']" :key="view" :variant="tab === view ? 'primary' : 'outline'" :aria-pressed="tab === view" @click="tab = view">{{ view === 'overview' ? 'Overview' : view === 'calendar' ? 'Calendar' : 'Holidays' }}</ZButton></nav>
        <Panel v-if="showApply && canApply" title="Apply for leave" class="mb-4">
          <form class="space-y-4 p-4" @submit.prevent="submit">
            <p class="text-sm text-content-muted">Calendar dates count, including weekends and company holidays. The server calculates units and available entitlement. Paid leave must stay within one entitlement year.</p>
            <fieldset :disabled="!!pending || context.busy.mutation" class="grid gap-4 sm:grid-cols-2">
              <div class="block text-sm"><label for="leave-request-type">Leave type</label><select id="leave-request-type" v-model="form.leave_type_id" required class="field mt-1" :aria-invalid="!!context.errors.mutation?.fields.leave_type_id" aria-describedby="leave-type-error"><option value="">Select a type</option><option v-for="type in types" :key="type.id" :value="type.id">{{ type.name }} · {{ type.is_paid ? 'Paid' : 'Unpaid' }}</option></select><span id="leave-type-error" role="alert">{{ context.errors.mutation?.fields.leave_type_id }}</span></div>
              <div class="block text-sm"><label for="leave-day-portion">Day portion</label><select id="leave-day-portion" v-model="form.day_portion" class="field mt-1"><option value="FULL_DAY">Full day</option><option value="FIRST_HALF">First half</option><option value="SECOND_HALF">Second half</option></select></div>
              <Field v-model="form.start_date" label="Start date" type="date" required :error="context.errors.mutation?.fields.start_date" />
              <Field v-model="form.end_date" label="End date" type="date" required :error="context.errors.mutation?.fields.end_date" />
              <Field v-model="form.reason" label="Reason" required minlength="5" maxlength="2000" :error="context.errors.mutation?.fields.reason" class="sm:col-span-2" />
            </fieldset>
            <p v-if="context.errors.types" role="alert">{{ context.errors.types.message }}</p>
            <p v-if="localError" role="alert">{{ localError }}</p>
            <p v-if="pending && !context.busy.mutation" role="alert">The request outcome is uncertain. Retry the same request below; its original key and contents are retained only in this page.</p>
            <p v-if="context.errors.mutation" role="alert">{{ context.errors.mutation.message }}</p>
            <ZButton type="submit" :disabled="context.busy.mutation || !types.length">{{ context.busy.mutation ? 'Submitting…' : pending ? 'Retry same request' : 'Submit request' }}</ZButton>
          </form>
        </Panel>
        <template v-if="tab === 'overview'">
          <Panel title="Leave balances" description="Server-authoritative half-day units">
            <div class="p-4"><form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="loadSummary"><Field v-model="year" label="Entitlement year" type="number" min="2000" max="2200" required /><ZButton type="submit" variant="outline">Load balances</ZButton></form>
              <p v-if="context.busy.summary" role="status">Loading balances…</p><p v-else-if="context.errors.summary" role="alert">{{ context.errors.summary.message }}</p>
              <div v-else-if="summary?.data.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div v-for="balance in summary.data" :key="balance.leave_type_id" class="rounded-md border border-line p-4"><h3 class="font-semibold">{{ balance.type_name }}</h3><p class="num mt-2 text-xl">{{ leaveDays(balance.available_units) }} days available</p><p class="mt-2 text-xs">Allocated {{ leaveDays(balance.allocated_units) }} · Adjustments {{ leaveDays(balance.adjustment_units) }} · Reserved {{ leaveDays(balance.pending_units) }} · Approved {{ leaveDays(balance.approved_units) }}</p></div></div>
              <p v-else-if="summary">No paid leave allocations for {{ summary.year }}.</p>
            </div>
          </Panel>
          <Panel title="Request history" class="mt-4">
            <div class="p-4"><label class="block max-w-xs text-sm">Status<select v-model="status" class="field mt-1" @change="loadHistory()"><option value="">All statuses</option><option v-for="value in leaveStatuses" :key="value" :value="value">{{ value.replaceAll('_', ' ') }}</option></select></label></div>
            <p v-if="context.busy.history" class="p-4" role="status">Loading history…</p><p v-else-if="context.errors.history" class="p-4" role="alert">{{ context.errors.history.message }} <button class="underline" @click="loadHistory()">Retry</button></p>
            <ul v-else class="divide-y divide-line"><li v-for="item in history?.data ?? []" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 p-4"><div><p class="font-medium">{{ item.type_name }}</p><p class="text-sm">{{ item.start_date }} – {{ item.end_date }} · {{ leaveDays(item.units) }} days</p><span class="zs-badge badge-neutral">{{ item.status.replaceAll('_', ' ') }}</span></div><ZButton variant="outline" @click="openDetail(item.id)">View request</ZButton></li><li v-if="history && !history.data.length" class="p-4">No requests match this filter.</li></ul>
            <div v-if="history" class="flex flex-wrap items-center gap-3 border-t border-line p-4 text-sm"><span>Page {{ history.meta.current_page }} of {{ history.meta.last_page }} · {{ history.meta.total }} requests</span><ZButton variant="outline" :disabled="context.busy.history || history.meta.current_page <= 1" @click="loadHistory(history.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="context.busy.history || history.meta.current_page >= history.meta.last_page" @click="loadHistory(history.meta.current_page + 1)">Next</ZButton></div>
          </Panel>
          <p v-if="context.busy.detail" role="status">Loading request…</p><p v-if="context.errors.detail" role="alert">{{ context.errors.detail.message }}</p>
          <LeaveDetail v-if="detail" :key="detail.id" :request="detail" :can-upload="canApply"><ZButton v-if="canCancel" variant="outline" :disabled="context.busy.mutation" @click="confirming = true">{{ detail.status === 'PENDING' ? 'Cancel pending request' : 'Request cancellation' }}</ZButton><p v-if="context.errors.mutation && !showApply" role="alert">{{ context.errors.mutation.message }} The request is reloaded before any further action.</p></LeaveDetail>
        </template>
        <template v-else>
          <p v-if="context.busy.holidays || (tab === 'calendar' && context.busy.calendar)" role="status">Loading calendar sources…</p>
          <p v-else-if="context.errors.holidays || (tab === 'calendar' && context.errors.calendar)" role="alert">Calendar sources could not be loaded. <button class="underline" @click="load">Retry</button></p>
          <LeaveCalendar v-else-if="tab === 'calendar' && holidays && approved" :holidays="holidays" :requests="approved" :initial-month="today().slice(0,7)" />
          <Panel v-else-if="holidays" title="Company holidays"><ul class="divide-y divide-line"><li v-for="holiday in holidays" :key="holiday.id" class="p-4"><p class="font-medium">{{ holiday.name }}</p><p class="text-sm">{{ holiday.date }} · Company holiday</p><p v-if="holiday.description" class="mt-1 text-sm text-content-muted">{{ holiday.description }}</p></li><li v-if="!holidays.length" class="p-4">No company holidays published.</li></ul></Panel>
        </template>
      </template>
    </template>
    <ConfirmDialog :open="confirming" title="Confirm cancellation" :message="detail?.status === 'PENDING' ? 'Cancel this pending request? Its history and evidence will remain.' : 'Request cancellation of approved leave? An administrator must decide; the leave remains reserved until then.'" confirm-label="Confirm cancellation" :busy="context.busy.mutation" @cancel="confirming = false" @confirm="cancel" />
  </PortalShell>
</template>
