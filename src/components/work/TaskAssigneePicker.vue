<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { adminWorkRepository } from '@/services/adminWork.repository';
import ZButton from '@/components/zs/ZButton.vue';

const props = defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [id: string] }>();
const company = useCompanyStore();
const radioName = useId();
const query = ref(''), search = ref(''), page = ref(1);
const result = ref<Awaited<ReturnType<typeof adminWorkRepository.assignees>> | null>(null);
const context = useWorkContext(() => {
  query.value = ''; search.value = ''; page.value = 1; result.value = null;
  emit('update:modelValue', '');
}, load);
function load() {
  if (!company.hasModule('payroll') || !company.hasPermission('tasks.assign')) return;
  result.value = null;
  emit('update:modelValue', '');
  void context.run('assignees', (id, signal) => adminWorkRepository.assignees(id, search.value, page.value, signal), value => { result.value = value; });
}
function find() { search.value = query.value.trim(); page.value = 1; load(); }
function move(next: number) { page.value = next; load(); }
watch(() => props.disabled, disabled => { if (disabled) context.invalidate('assignees'); });
load();
</script>

<template>
  <div class="min-w-0 space-y-2 sm:col-span-2">
    <p class="label-caps">Assignee</p>
    <p class="text-xs text-content-muted">Choose an eligible employee in the selected company. Search by name, code or exact employee UUID.</p>
    <div class="flex flex-wrap items-end gap-2">
      <label class="min-w-48 flex-1 text-sm">Search employees
        <input v-model="query" class="field mt-1 w-full" maxlength="100" :disabled="disabled" @keydown.enter.prevent="find" />
      </label>
      <ZButton type="button" variant="outline" :disabled="disabled || context.busy.assignees" @click="find">Search</ZButton>
    </div>
    <p v-if="context.busy.assignees" role="status">Loading eligible employees…</p>
    <p v-else-if="context.errors.assignees" role="alert">{{ context.errors.assignees.message }}
      <button type="button" class="underline" :disabled="disabled" @click="load">Retry employee search</button>
    </p>
    <template v-else-if="result">
      <p v-if="!result.data.length" role="status">No eligible employees match this search.</p>
      <fieldset v-else :disabled="disabled" class="max-h-56 space-y-1 overflow-y-auto rounded-md border border-line p-2">
        <legend class="sr-only">Eligible task assignees</legend>
        <label v-for="employee in result.data" :key="employee.id" class="flex items-start gap-2 rounded p-2 text-sm hover:bg-surface-hover">
          <input type="radio" :name="radioName" :checked="modelValue === employee.id" :value="employee.id" required @change="emit('update:modelValue', employee.id)" />
          <span>{{ employee.full_name }} · {{ employee.employee_code }}</span>
        </label>
      </fieldset>
      <div v-if="result.meta.last_page > 1" class="flex items-center gap-2 text-sm">
        <ZButton type="button" variant="outline" :disabled="disabled || result.meta.current_page <= 1" @click="move(page - 1)">Previous</ZButton>
        <span>Page {{ result.meta.current_page }} of {{ result.meta.last_page }}</span>
        <ZButton type="button" variant="outline" :disabled="disabled || result.meta.current_page >= result.meta.last_page" @click="move(page + 1)">Next</ZButton>
      </div>
    </template>
  </div>
</template>
