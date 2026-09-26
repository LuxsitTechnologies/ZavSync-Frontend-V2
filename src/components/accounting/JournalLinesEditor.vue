<script setup lang="ts">
/**
 * Reusable double-entry line editor. Enforces the core rule visually
 * (total debit = total credit) but never decides on its own that a journal is
 * posted — that is the backend's call via the journals repository.
 */
import { computed } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";

import AccountSelect from "./AccountSelect.vue";
import MoneyInput from "./MoneyInput.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { formatMoney } from "@/lib/money";
import { journalTotals } from "@/services/accounting/journals.repository";
import type { JournalLineInput } from "@/types/accounting";

const props = withDefaults(
  defineProps<{ lines: JournalLineInput[]; errors?: Record<string, string>; disabled?: boolean }>(),
  { errors: () => ({}), disabled: false },
);

const emit = defineEmits<{ "update:lines": [value: JournalLineInput[]] }>();

const totals = computed(() => journalTotals(props.lines));

function newLine(): JournalLineInput {
  return {
    id: `line-${crypto.randomUUID()}`,
    account_id: null,
    description: "",
    debit: 0,
    credit: 0,
  };
}

function addLine() {
  emit("update:lines", [...props.lines, newLine()]);
}

function removeLine(id: string) {
  emit("update:lines", props.lines.filter((l) => l.id !== id));
}

function patch(id: string, changes: Partial<JournalLineInput>) {
  emit(
    "update:lines",
    props.lines.map((l) => (l.id === id ? { ...l, ...changes } : l)),
  );
}

/** A line carries a debit or a credit, never both. */
function setDebit(id: string, value: number) {
  patch(id, { debit: value, credit: value > 0 ? 0 : (props.lines.find((l) => l.id === id)?.credit ?? 0) });
}
function setCredit(id: string, value: number) {
  patch(id, { credit: value, debit: value > 0 ? 0 : (props.lines.find((l) => l.id === id)?.debit ?? 0) });
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto">
      <table class="w-full" style="min-width: 900px">
        <thead>
          <tr class="table-head">
            <th class="px-3 py-2.5 text-left">Account</th>
            <th class="px-3 py-2.5 text-left">Line description</th>
            <th class="px-3 py-2.5 text-right">Debit</th>
            <th class="px-3 py-2.5 text-right">Credit</th>
            <th class="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in lines" :key="line.id" class="border-b border-line align-top">
            <td class="px-3 py-2">
              <AccountSelect
                :model-value="line.account_id"
                :disabled="disabled"
                :error="errors[`lines.${index}.account_id`] ?? null"
                @update:model-value="patch(line.id, { account_id: $event })"
              />
            </td>
            <td class="px-3 py-2">
              <input
                class="field"
                :disabled="disabled"
                placeholder="Optional narration"
                aria-label="Line description"
                :value="line.description"
                @input="patch(line.id, { description: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-3 py-2">
              <MoneyInput
                :model-value="line.debit"
                :disabled="disabled"
                :error="errors[`lines.${index}.amount`] ?? null"
                @update:model-value="setDebit(line.id, $event)"
              />
            </td>
            <td class="px-3 py-2">
              <MoneyInput
                :model-value="line.credit"
                :disabled="disabled"
                @update:model-value="setCredit(line.id, $event)"
              />
            </td>
            <td class="px-3 py-2 text-right">
              <button
                type="button"
                class="grid size-8 place-items-center rounded-md text-content-muted hover:bg-surface-hover hover:text-danger disabled:opacity-40"
                :disabled="disabled || lines.length <= 2"
                aria-label="Remove line"
                @click="removeLine(line.id)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <ZButton variant="outline" :disabled="disabled" @click="addLine">
        <Plus class="size-3.5" /> Add line
      </ZButton>

      <dl class="flex flex-wrap items-center gap-4 text-xs">
        <div class="text-right">
          <dt class="label-caps">Total debit</dt>
          <dd class="num text-sm font-semibold text-content">{{ formatMoney(totals.debit) }}</dd>
        </div>
        <div class="text-right">
          <dt class="label-caps">Total credit</dt>
          <dd class="num text-sm font-semibold text-content">{{ formatMoney(totals.credit) }}</dd>
        </div>
        <div class="text-right">
          <dt class="label-caps">Difference</dt>
          <dd
            class="num text-sm font-semibold"
            :class="totals.balanced ? 'text-success' : 'text-danger'"
          >
            {{ formatMoney(totals.difference) }}
          </dd>
        </div>
        <span class="zs-badge" :class="totals.postable ? 'badge-success' : 'badge-warning'">
          {{ totals.postable ? "Balanced" : "Not balanced" }}
        </span>
      </dl>
    </div>
  </div>
</template>
