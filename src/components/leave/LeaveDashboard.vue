<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Panel from '@/components/zs/Panel.vue';
import { useCompanyStore } from '@/stores/company';
import { useLeaveContext } from '@/composables/useLeaveContext';
import { employeeLeaveRepository as repository } from '@/services/employeeLeave.repository';
import { companyDate, leaveDays } from '@/lib/leave';
import type { Holiday, LeaveSummary } from '@/types/leave';
const company = useCompanyStore();
const available = computed(() => company.hasModule('payroll') && company.hasPermission('employee.leave.view'));
const summary = ref<LeaveSummary | null>(null), pending = ref<number | null>(null), holiday = ref<Holiday | null>(null), holidaysLoaded = ref(false);
const context = useLeaveContext(() => { summary.value = null; pending.value = null; holiday.value = null; holidaysLoaded.value = false; }, load);
function load() {
  if (!available.value) return;
  const today = companyDate(company.activeCompany?.timezone);
  void context.run('summary', (id, signal) => repository.summary(id, Number((today || new Date().toISOString()).slice(0,4)), signal), value => { summary.value = value; });
  void context.run('pending', (id, signal) => repository.history(id, 1, 'PENDING', signal), value => { pending.value = value.meta.total; });
  if (today) void context.run('holiday', (id, signal) => repository.holidays(id, signal), value => { holiday.value = value.data.find(item => item.date >= today) ?? null; holidaysLoaded.value = true; });
}
load();
</script>
<template>
  <Panel title="Leave & holidays" class="mt-4">
    <template #actions><RouterLink v-if="available" to="/employee/leaves" class="text-sm underline">View leave</RouterLink></template>
    <div class="space-y-3 p-4 text-sm">
      <p v-if="company.switching" role="status">Switching company…</p><p v-else-if="!available">Leave self-service is unavailable in this company.</p>
      <template v-else>
        <p v-if="context.errors.summary?.errorCode === 'EMPLOYEE_IDENTITY_NOT_LINKED'">No employee identity is linked to this company membership.</p>
        <template v-else><p v-if="context.busy.summary" role="status">Loading leave balances…</p><p v-else-if="context.errors.summary" role="alert">Leave balances unavailable. <button class="underline" @click="load">Retry</button></p><ul v-else-if="summary"><li v-for="item in summary.data" :key="item.leave_type_id">{{ item.type_name }}: {{ leaveDays(item.available_units) }} days available</li><li v-if="!summary.data.length">No paid leave allocations for {{ summary.year }}.</li></ul>
          <p>Pending requests: {{ pending === null ? 'Unavailable' : pending }}</p><p v-if="holiday">Next company holiday: {{ holiday.name }} · {{ holiday.date }}</p><p v-else>{{ holidaysLoaded ? 'No upcoming company holidays published.' : 'Next company holiday unavailable.' }}</p>
        </template>
      </template>
    </div>
  </Panel>
</template>
