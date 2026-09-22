<script setup lang="ts">
/**
 * Company-scoped account selector shared by GL, AR, AP, inventory, payroll and
 * manual journals. Accounts are loaded through the repository, so it always
 * reflects the active company and never leaks another company's chart.
 */
import { computed, watch } from "vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { accountsRepository } from "@/services/accounting/accounts.repository";
import { useCompanyStore } from "@/stores/company";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import type { AccountType } from "@/types/accounting";

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    types?: AccountType[];
    /** Hide header/parent accounts that only group children. */
    postableOnly?: boolean;
    includeInactive?: boolean;
    disabled?: boolean;
    error?: string | null;
    placeholder?: string;
  }>(),
  {
    label: undefined,
    types: undefined,
    postableOnly: true,
    includeInactive: false,
    disabled: false,
    error: null,
    placeholder: "Select an account",
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

const company = useCompanyStore();
const { data, loading, error, refresh } = useAsyncData(
  () => accountsRepository.selectable(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const options = computed(() =>
  (data.value ?? []).filter((a) => {
    if (props.postableOnly && a.has_children) return false;
    if (!props.includeInactive && !a.is_active) return false;
    if (props.types?.length && !props.types.includes(a.type)) return false;
    return true;
  }),
);

/** Clear a selection that no longer belongs to the active company. */
watch(options, (list) => {
  if (props.modelValue && list.length && !list.some((a) => a.id === props.modelValue)) {
    emit("update:modelValue", null);
  }
});

const message = computed(() =>
  props.error ?? (error.value ? "Accounts could not be loaded. Retry to continue." : null),
);
</script>

<template>
  <label class="block">
    <span v-if="label" class="label-caps">{{ label }}</span>
    <select
      class="field mt-1.5"
      :class="message ? 'border-danger' : ''"
      :value="modelValue ?? ''"
      :disabled="disabled || loading"
      :aria-label="label ?? placeholder"
      :aria-invalid="Boolean(message)"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">{{ loading ? "Loading accounts…" : placeholder }}</option>
      <option v-for="account in options" :key="account.id" :value="account.id">
        {{ account.code }} · {{ account.name }}{{ account.is_active ? "" : " (inactive)" }}
      </option>
    </select>
    <ValidationMessage :message="message" />
    <button
      v-if="error"
      type="button"
      class="mt-1 text-2xs text-content-brand underline"
      @click="refresh()"
    >
      Reload accounts
    </button>
  </label>
</template>
