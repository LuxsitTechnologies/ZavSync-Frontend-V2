<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import ZButton from '@/components/zs/ZButton.vue';
import ConfirmDialog from '@/components/zs/ConfirmDialog.vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { employeeManagerRepository, type EmployeeManager } from '@/services/employeeManager.repository';

const company = useCompanyStore();
const employee = ref(''), manager = ref(''), relationship = ref<EmployeeManager | null>(null);
const notice = ref('');
const intent = ref<EmployeeManager | null>(null);
const canRead = computed(() => company.hasModule('payroll') && company.hasPermission('teams.view'));
const canWrite = computed(() => canRead.value && company.hasPermission('teams.manage'));
function clearRelationship() { relationship.value = null; manager.value = ''; intent.value = null; }
const context = useWorkContext(() => { employee.value = ''; clearRelationship(); notice.value = ''; }, () => {});
watch(employee, () => { context.invalidate('read'); clearRelationship(); notice.value = ''; }, { flush: 'sync' });
function accept(value: EmployeeManager) { relationship.value = value; manager.value = value.manager_employee_id ?? ''; }
function load() {
  if (!canRead.value || !employee.value.trim() || context.busy.mutation) return;
  notice.value = ''; context.invalidate('mutation'); read();
}
function read() {
  const selected = employee.value.trim();
  clearRelationship();
  void context.run('read', (id, signal) => employeeManagerRepository.read(id, selected, signal), accept);
}
function review() {
  if (!canWrite.value || !relationship.value || context.busy.mutation || context.busy.read) return;
  intent.value = { ...relationship.value, manager_employee_id: manager.value.trim() || null };
}
function save() {
  const snapshot = intent.value;
  if (!snapshot || !canWrite.value || context.busy.mutation) return;
  intent.value = null; notice.value = '';
  void context.run('mutation', (id, signal) => employeeManagerRepository.save(id, snapshot.employee_id, snapshot.manager_employee_id, snapshot.version, signal), value => {
    accept(value); notice.value = 'Manager relationship saved.';
  }, error => {
    notice.value = error.errorCode === 'TEAM_VERSION_STALE'
      ? 'The manager relationship changed. Reloading the current relationship. Review it and submit a new change explicitly.'
      : 'The update was not confirmed. Reloading the current relationship. Review it before submitting another change.';
    read();
  });
}
</script>

<template>
  <Panel title="Reporting manager" body-class="space-y-4 p-4">
    <p class="text-sm">Reporting manager and team lead are separate relationships. Enter explicit employee references; names are unavailable in this relationship view.</p>
    <p v-if="!canRead" role="status">Manager relationships require Teams read permission and the payroll entitlement.</p>
    <template v-else>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="load">
        <label for="manager-subject" class="min-w-0 flex-1 text-sm">Employee UUID<input id="manager-subject" v-model="employee" class="field mt-1" required :disabled="context.busy.mutation || !!intent" /></label>
        <ZButton type="submit" :disabled="context.busy.read || context.busy.mutation || !!intent">Load manager</ZButton>
      </form>
      <p v-if="context.busy.read" role="status">Loading manager relationship…</p>
      <p v-for="(error, channel) in context.errors" v-show="error" :key="channel" role="alert" class="break-words text-sm text-danger">{{ error?.message }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <dl v-if="relationship" class="space-y-2 text-sm" aria-label="Current manager relationship">
        <div><dt>Employee reference</dt><dd class="break-all">{{ relationship.employee_id }}</dd></div>
        <div><dt>Current manager reference</dt><dd class="break-all">{{ relationship.manager_employee_id ?? 'No manager assigned' }}</dd></div>
        <div><dt>Relationship version</dt><dd>{{ relationship.version }}</dd></div>
      </dl>
      <form v-if="relationship && canWrite" class="space-y-3" @submit.prevent="review">
        <label for="manager-target" class="block text-sm">Manager employee UUID (blank clears manager)</label>
        <input id="manager-target" v-model="manager" class="field" :disabled="context.busy.mutation || !!intent" />
        <ZButton type="submit" :disabled="context.busy.mutation || context.busy.read || !!intent">{{ context.busy.mutation ? 'Saving manager…' : 'Review manager change' }}</ZButton>
      </form>
      <p v-else-if="relationship" class="text-sm">Read-only: Teams manage permission is required to change this relationship.</p>
    </template>
    <ConfirmDialog :open="!!intent" title="Change reporting manager" message="Submit this manager relationship change? The server validates the current version and reporting-line rules." confirm-label="Confirm manager change" :busy="context.busy.mutation" @confirm="save" @cancel="intent = null" />
  </Panel>
</template>
