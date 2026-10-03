<script setup lang="ts">
import { useNow } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import AppShell from '@/components/zs/AppShell.vue';
import PageHeader from '@/components/zs/PageHeader.vue';
import Panel from '@/components/zs/Panel.vue';
import Field from '@/components/zs/Field.vue';
import ZButton from '@/components/zs/ZButton.vue';
import ConfirmDialog from '@/components/zs/ConfirmDialog.vue';
import LeaveDetail from '@/components/leave/LeaveDetail.vue';
import { useCompanyStore } from '@/stores/company';
import { useLeaveContext } from '@/composables/useLeaveContext';
import { adminLeaveRepository as repository } from '@/services/adminLeave.repository';
import { companyDate, leaveDays, leaveDecisions } from '@/lib/leave';
import { leaveStatuses, type AdminLeaveRequest, type Holiday, type LeaveAllocation, type LeaveDecision, type LeavePage, type LeaveStatus, type LeaveType } from '@/types/leave';
import { setPageMeta } from '@/lib/page-meta';
setPageMeta('Leave administration', 'Company leave requests, entitlements and holidays.');
const now = useNow({ interval: 1000 });
const company = useCompanyStore();
const permitted = (permission: string) => company.hasModule('payroll') && company.hasPermission(permission);
const history = ref<LeavePage<AdminLeaveRequest> | null>(null), detail = ref<AdminLeaveRequest | null>(null);
const types = ref<LeaveType[]>([]), allocations = ref<LeaveAllocation[] | null>(null), holidays = ref<Holiday[] | null>(null);
const employee = ref(''), year = ref(''), status = ref<LeaveStatus | ''>('');
const decision = ref<LeaveDecision | null>(null), reason = ref(''), formError = ref(''), notice = ref('');
const typeForm = ref({ id: '', name: '', is_paid: true });
const allocationType = ref(''), units = ref(''), adjustmentId = ref(''), delta = ref(''), adjustmentReason = ref('');
const holidayForm = ref({ id: '', name: '', date: '', description: '' });
const pending = ref<{ id: string; key: string; body: { delta_units: number; reason: string } } | null>(null);
function reset() { history.value = null; detail.value = null; types.value = []; allocations.value = null; holidays.value = null; employee.value = ''; year.value = ''; status.value = ''; decision.value = null; reason.value = ''; formError.value = ''; notice.value = ''; typeForm.value = { id: '', name: '', is_paid: true }; allocationType.value = ''; units.value = ''; adjustmentId.value = ''; delta.value = ''; adjustmentReason.value = ''; holidayForm.value = { id: '', name: '', date: '', description: '' }; pending.value = null; }
const context = useLeaveContext(reset, load);
const actions = computed(() => detail.value ? leaveDecisions(detail.value, permitted('leave.approve'), companyDate(company.activeCompany?.timezone, now.value)) : []);
function loadHistory(page = 1) { if (permitted('leave.view')) { history.value = null; void context.run('history', (id, signal) => repository.history(id, page, status.value, employee.value, signal), value => { history.value = value; }); } }
function loadTypes() { if (permitted('leave.view')) void context.run('types', (id, signal) => repository.types(id, signal), value => { types.value = value.data; }); }
function loadHolidays() { if (permitted('holiday.view')) void context.run('holidays', (id, signal) => repository.holidays(id, signal), value => { holidays.value = value.data; }); }
function load() { year.value = (companyDate(company.activeCompany?.timezone, now.value) || new Date().toISOString()).slice(0,4); loadHistory(); loadTypes(); loadHolidays(); }
function openDetail(id: string) { detail.value = null; void context.run('detail', (companyId, signal) => repository.detail(companyId, id, signal), value => { detail.value = value; }); }
watch([employee, year], () => { if (!pending.value) { context.invalidate('allocations'); allocations.value = null; adjustmentId.value = ''; delta.value = ''; adjustmentReason.value = ''; } }, { flush: 'sync' });
function loadAllocations() { allocations.value = null; if (employee.value && permitted('leave.view')) void context.run('allocations', (id, signal) => repository.allocations(id, employee.value, Number(year.value), signal), value => { allocations.value = value.data; }); }
async function decide() {
  if (!detail.value || !decision.value || !actions.value.includes(decision.value) || context.busy.mutation) return;
  formError.value = '';
  if (decision.value.startsWith('reject') && reason.value.trim().length < 5) { formError.value = 'A rejection reason of at least five characters is required.'; return; }
  const requestId = detail.value.id, action = decision.value;
  const ok = await context.run('mutation', (id, signal) => repository.decide(id, requestId, action, reason.value, signal), value => { detail.value = value; });
  if (!ok && !context.errors.mutation) return;
  decision.value = null; reason.value = '';
  if (ok) loadHistory(); else openDetail(requestId);
}
async function saveType() {
  if (!permitted('leave.manage') || pending.value) return;
  const body = { ...typeForm.value };
  const ok = await context.run('mutation', (id, signal) => body.id ? repository.updateType(id, body.id, { name: body.name }, signal) : repository.createType(id, { name: body.name, is_paid: body.is_paid }, signal), () => { typeForm.value = { id: '', name: '', is_paid: true }; notice.value = 'Leave type saved.'; });
  if (ok) loadTypes();
}
async function toggleType(item: LeaveType) {
  if (!permitted('leave.manage') || pending.value) return;
  if (await context.run('mutation', (id, signal) => repository.updateType(id, item.id, { is_active: !item.is_active }, signal), () => {})) loadTypes();
}
async function allocate() {
  if (!permitted('leave.manage') || pending.value) return;
  if (await context.run('mutation', (id, signal) => repository.allocate(id, { employee_id: employee.value, leave_type_id: allocationType.value, year: Number(year.value), allocated_units: Number(units.value) }, signal), () => { notice.value = 'Allocation saved. Balances are reloaded from the server.'; })) loadAllocations();
}
async function adjust() {
  if (!permitted('leave.manage') || context.busy.mutation) return;
  pending.value ??= { id: adjustmentId.value, key: crypto.randomUUID(), body: { delta_units: Number(delta.value), reason: adjustmentReason.value } };
  const attempt = pending.value;
  const ok = await context.run('mutation', (id, signal) => repository.adjust(id, attempt.id, attempt.body, attempt.key, signal), () => { pending.value = null; delta.value = ''; adjustmentReason.value = ''; notice.value = 'Adjustment recorded. Balances are reloaded from the server.'; });
  if (ok) loadAllocations(); else if (context.errors.mutation && !['network','server'].includes(context.errors.mutation.kind)) pending.value = null;
}
async function saveHoliday() {
  if (!permitted('holiday.manage') || pending.value) return;
  const { id: holidayId, ...body } = holidayForm.value;
  if (await context.run('mutation', (id, signal) => holidayId ? repository.updateHoliday(id, holidayId, body, signal) : repository.createHoliday(id, body, signal), () => { holidayForm.value = { id: '', name: '', date: '', description: '' }; notice.value = 'Holiday saved.'; })) loadHolidays();
}
async function toggleHoliday(item: Holiday) {
  if (!permitted('holiday.manage') || pending.value) return;
  if (await context.run('mutation', (id, signal) => repository.updateHoliday(id, item.id, { is_active: !item.is_active }, signal), () => {})) loadHolidays();
}
load();
</script>
<template>
  <AppShell>
    <PageHeader title="Leave administration" description="Company requests, integer-unit entitlements and fixed-date holidays" />
    <p v-if="company.switching" role="status">Switching company…</p>
    <template v-else>
      <p v-if="notice" role="status" class="mb-4">{{ notice }}</p>
      <div v-for="(error, key) in context.errors" :key="key"><div v-if="error" role="alert" class="mb-3 text-sm text-danger"><p>{{ error.message }}</p><p v-for="(message, field) in error.fields" :key="field">{{ field }}: {{ message }}</p></div></div>
      <template v-if="permitted('leave.view')">
        <Panel title="Request register">
          <form class="flex flex-wrap items-end gap-3 p-4" @submit.prevent="loadHistory()"><Field v-model="employee" label="Employee ID (optional filter)" :disabled="!!pending || context.busy.mutation" hint="Exact company employee UUID; no self-identity inference" /><label class="block text-sm">Status<select v-model="status" class="field mt-1"><option value="">All statuses</option><option v-for="value in leaveStatuses" :key="value" :value="value">{{ value.replaceAll('_', ' ') }}</option></select></label><ZButton type="submit" variant="outline">Filter requests</ZButton></form>
          <p v-if="context.busy.history" class="p-4" role="status">Loading register…</p>
          <ul v-else class="divide-y divide-line"><li v-for="item in history?.data ?? []" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 p-4"><div class="min-w-0 break-words"><p>{{ item.type_name }} · {{ item.start_date }} – {{ item.end_date }}</p><p class="text-sm">Employee {{ item.employee_id }} · {{ leaveDays(item.units) }} days</p><span class="zs-badge badge-neutral">{{ item.status.replaceAll('_', ' ') }}</span><span v-if="item.is_own_request" class="ml-2 text-xs">Your own request</span></div><ZButton variant="outline" @click="openDetail(item.id)">Review request</ZButton></li><li v-if="history && !history.data.length" class="p-4">No matching requests.</li></ul>
          <div v-if="history" class="flex flex-wrap items-center gap-3 p-4"><span>Page {{ history.meta.current_page }} of {{ history.meta.last_page }} · {{ history.meta.total }} requests</span><ZButton variant="outline" :disabled="context.busy.history || history.meta.current_page <= 1" @click="loadHistory(history.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="context.busy.history || history.meta.current_page >= history.meta.last_page" @click="loadHistory(history.meta.current_page + 1)">Next</ZButton></div>
        </Panel>
        <p v-if="context.busy.detail" role="status">Loading request…</p>
        <LeaveDetail v-if="detail" :key="detail.id" :request="detail" admin><p v-if="detail.is_own_request">You cannot decide your own request.</p><div class="flex flex-wrap gap-2"><ZButton v-for="action in actions" :key="action" variant="outline" :disabled="context.busy.mutation || !!pending" @click="decision = action; reason = ''; formError = ''">{{ action.replaceAll('-', ' ') }}</ZButton></div></LeaveDetail>
        <Panel title="Leave types" class="mt-4"><div class="space-y-3 p-4"><ul class="space-y-2"><li v-for="item in types" :key="item.id" class="flex flex-wrap items-center gap-3"><span>{{ item.name }} · {{ item.is_paid ? 'Paid' : 'Unpaid' }} · {{ item.is_active ? 'Active' : 'Archived' }}</span><template v-if="permitted('leave.manage')"><ZButton variant="outline" :disabled="context.busy.mutation || !!pending" @click="typeForm = { id: item.id, name: item.name, is_paid: item.is_paid }">Rename</ZButton><ZButton variant="outline" :disabled="context.busy.mutation || !!pending" @click="toggleType(item)">{{ item.is_active ? 'Archive type' : 'Restore type' }}</ZButton></template></li></ul>
          <form v-if="permitted('leave.manage')" class="space-y-3" @submit.prevent="saveType"><fieldset :disabled="context.busy.mutation || !!pending" class="space-y-3"><Field v-model="typeForm.name" label="Type name" required maxlength="120" /><label v-if="!typeForm.id" class="flex gap-2 text-sm"><input v-model="typeForm.is_paid" type="checkbox" />Paid leave</label><ZButton type="submit">{{ typeForm.id ? 'Save type name' : 'Create type' }}</ZButton><ZButton v-if="typeForm.id" variant="outline" @click="typeForm = { id: '', name: '', is_paid: true }">Cancel edit</ZButton></fieldset></form>
        </div></Panel>
        <Panel title="Employee entitlements" description="Two integer units equal one day. Unpaid leave needs no allocation." class="mt-4"><div class="space-y-4 p-4">
          <form class="flex flex-wrap items-end gap-3" @submit.prevent="loadAllocations"><Field v-model="employee" label="Employee ID for entitlement" required :disabled="!!pending || context.busy.mutation" /><Field v-model="year" label="Entitlement year" type="number" min="2000" max="2200" required :disabled="!!pending || context.busy.mutation" /><ZButton type="submit" variant="outline" :disabled="!!pending || context.busy.mutation">Load entitlements</ZButton></form>
          <p v-if="context.busy.allocations" role="status">Loading entitlements…</p><ul class="space-y-2"><li v-for="item in allocations ?? []" :key="item.id" class="rounded-md bg-surface-sunken p-3 text-sm">{{ item.type_name }} · Allocated {{ item.allocated_units }} · Adjustment {{ item.adjustment_units }} · Reserved {{ item.pending_units }} · Approved {{ item.approved_units }} · Available {{ item.available_units }} units <ZButton v-if="permitted('leave.manage')" variant="outline" :disabled="!!pending || context.busy.mutation" @click="adjustmentId = item.id ?? ''">Adjust allocation</ZButton></li></ul><p v-if="allocations && !allocations.length">No entitlements for this employee and year.</p>
          <form v-if="permitted('leave.manage')" class="space-y-3" @submit.prevent="allocate"><fieldset :disabled="context.busy.mutation || !!pending" class="flex flex-wrap items-end gap-3"><div class="block text-sm"><label for="leave-allocation-type">Paid leave type</label><select id="leave-allocation-type" v-model="allocationType" class="field mt-1" required><option value="">Select type</option><option v-for="item in types.filter(type => type.is_paid)" :key="item.id" :value="item.id">{{ item.name }}</option></select></div><Field v-model="units" label="Initial allocation (units)" type="number" min="0" max="10000" step="1" required /><ZButton type="submit" :disabled="!employee">Allocate</ZButton></fieldset></form>
          <form v-if="permitted('leave.manage') && adjustmentId" class="space-y-3" @submit.prevent="adjust"><p class="text-sm break-all">Adjusting entitlement {{ adjustmentId }}</p><fieldset :disabled="context.busy.mutation || !!pending" class="space-y-3"><Field v-model="delta" label="Adjustment units (positive adds, negative removes)" type="number" min="-10000" max="10000" step="1" required /><Field v-model="adjustmentReason" label="Adjustment reason" minlength="5" maxlength="2000" required /></fieldset><p v-if="pending" role="status">The outcome is uncertain. Retry preserves the original adjustment key and payload.</p><ZButton type="submit" :disabled="context.busy.mutation">{{ pending ? 'Retry same adjustment' : 'Record adjustment' }}</ZButton></form>
        </div></Panel>
      </template>
      <p v-else class="panel p-4">Leave administration is unavailable in this company.</p>
      <Panel v-if="permitted('holiday.view')" title="Company holidays" class="mt-4"><div class="space-y-4 p-4"><p v-if="context.busy.holidays" role="status">Loading holidays…</p><ul class="space-y-3"><li v-for="item in holidays ?? []" :key="item.id" class="rounded-md border border-line p-3"><p>{{ item.name }} · {{ item.date }} · {{ item.is_active ? 'Active' : 'Archived' }}</p><p class="text-sm">{{ item.description }}</p><div v-if="permitted('holiday.manage')" class="mt-2 flex gap-2"><ZButton variant="outline" :disabled="context.busy.mutation || !!pending" @click="holidayForm = { id: item.id, name: item.name, date: item.date, description: item.description ?? '' }">Edit holiday</ZButton><ZButton variant="outline" :disabled="context.busy.mutation || !!pending" @click="toggleHoliday(item)">{{ item.is_active ? 'Archive holiday' : 'Restore holiday' }}</ZButton></div></li></ul><p v-if="holidays && !holidays.length">No company holidays.</p>
        <form v-if="permitted('holiday.manage')" @submit.prevent="saveHoliday"><fieldset :disabled="context.busy.mutation || !!pending" class="grid gap-3 sm:grid-cols-2"><Field v-model="holidayForm.name" label="Holiday name" maxlength="120" required /><Field v-model="holidayForm.date" label="Company-local date" type="date" required /><Field v-model="holidayForm.description" label="Holiday description" maxlength="2000" /><div class="flex items-end gap-2"><ZButton type="submit">{{ holidayForm.id ? 'Save holiday' : 'Create holiday' }}</ZButton><ZButton v-if="holidayForm.id" variant="outline" @click="holidayForm = { id: '', name: '', date: '', description: '' }">Cancel edit</ZButton></div></fieldset></form>
      </div></Panel>
    </template>
    <ConfirmDialog :open="!!decision" :title="decision?.replaceAll('-', ' ') ?? 'Decision'" message="Record this decision? The server will recheck ownership, permissions and request state." confirm-label="Record decision" :busy="context.busy.mutation" @cancel="decision = null" @confirm="decide"><Field v-if="decision?.startsWith('reject')" v-model="reason" label="Rejection reason" required minlength="5" maxlength="2000" :error="formError || context.errors.mutation?.fields.reason" /></ConfirmDialog>
  </AppShell>
</template>
