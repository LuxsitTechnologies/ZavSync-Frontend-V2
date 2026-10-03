<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Panel from '@/components/zs/Panel.vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { employeeWorkRepository } from '@/services/employeeWork.repository';
import type { WorkKind, WorkPage } from '@/types/work';
const company = useCompanyStore();
const tasks = ref<WorkPage | null>(null), tickets = ref<WorkPage | null>(null);
const permitted = (kind: WorkKind) => company.hasModule('payroll') && company.hasPermission(`employee.${kind}.view`);
const visible = (kind: WorkKind) => permitted(kind) && !!company.activeCompany?.effective_navigation?.visible_keys.includes(`employee.${kind}`);
const context = useWorkContext(() => { tasks.value = null; tickets.value = null; },load);
function load() {
  for (const kind of ['tasks','tickets'] as const) if (permitted(kind)) void context.run(kind,(id,signal) => employeeWorkRepository.list(id,kind,1,kind === 'tasks' ? 'ASSIGNED' : 'OPEN','',signal), value => { if (kind === 'tasks') tasks.value = value; else tickets.value = value; });
}
load();
</script>
<template><Panel title="Tasks & tickets" description="Assigned tasks and open tickets in this company" class="mt-4" body-class="grid gap-4 p-4 sm:grid-cols-2"><section v-for="kind in (['tasks','tickets'] as const)" :key="kind"><h3 class="font-semibold">{{ kind === 'tasks' ? 'Assigned tasks' : 'Open tickets' }}</h3><p v-if="!permitted(kind)">Not available in this company.</p><p v-else-if="context.busy[kind]" role="status">Loading…</p><p v-else-if="context.errors[kind]" role="alert">{{ context.errors[kind]?.message }} <button class="underline" @click="load">Retry work summary</button></p><template v-else-if="kind === 'tasks' ? tasks : tickets"><p>{{ (kind === 'tasks' ? tasks : tickets)?.meta.total }} matching records</p><ul class="mt-2 space-y-2"><li v-for="item in (kind === 'tasks' ? tasks : tickets)?.data.slice(0,3)" :key="item.id" class="break-words text-sm">{{ item.title ?? item.subject }}<span v-if="item.due_date"> · Due {{ item.due_date }}</span></li></ul><p class="text-xs text-content-muted">Up to three from the first returned page.</p></template><RouterLink v-if="visible(kind)" :to="`/employee/${kind}`" class="mt-2 inline-block text-content-brand underline">View {{ kind }}</RouterLink></section></Panel></template>
