<script setup lang="ts">
/**
 * A7 — company accounting configuration. Every posting integration (AR, AP,
 * inventory, payroll) reads its accounts from these mappings; nothing here is
 * jurisdiction-specific or hard-coded.
 */
import { computed, reactive } from "vue";
import { AlertTriangle, CheckCircle2 } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { accountMappingsRepository } from "@/services/accounting/account-mappings.repository";
import { useCompanyStore } from "@/stores/company";
import { setPageMeta } from "@/lib/page-meta";
import type { AccountMapping } from "@/types/accounting";

setPageMeta(
  "Accounting Setup",
  "Configure the account mappings that drive AR, AP, inventory and payroll postings.",
);

const company = useCompanyStore();

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => accountMappingsRepository.list(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const mappings = computed<AccountMapping[]>(() => data.value ?? []);
const missingRequired = computed(() =>
  mappings.value.filter((m) => m.required && !m.account_id),
);

const saveMutation = useMutation(accountMappingsRepository.save);
const rowState = reactive<Record<string, { saving: boolean; error: string | null; savedAt: number | null }>>({});

function stateFor(key: string) {
  if (!rowState[key]) rowState[key] = { saving: false, error: null, savedAt: null };
  return rowState[key];
}

async function onChange(mapping: AccountMapping, accountId: string | null) {
  const state = stateFor(mapping.key);
  state.saving = true;
  state.error = null;
  const result = await saveMutation.run(company.activeCompanyId, mapping.key, accountId);
  state.saving = false;
  if (result) {
    state.savedAt = Date.now();
    await refresh();
  } else {
    state.error = saveMutation.error.value?.message ?? "Could not save this mapping.";
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Accounting Setup"
      description="Map company accounts to the postings the system generates automatically."
    />

    <Panel
      class="mb-4"
      title="Why this matters"
      description="These mappings drive receivables, payables, inventory and payroll postings across the whole system."
    >
      <p class="p-4 pt-0 text-xs text-content-secondary">
        No jurisdiction-specific account is hard-coded anywhere in the application. Every automatic journal —
        an invoice, a supplier bill, an inventory movement or a payroll run — resolves its accounts from the
        mappings below. Update them here whenever your chart of accounts changes.
      </p>
    </Panel>

    <div
      v-if="!loading && !error && missingRequired.length"
      class="panel mb-4 flex items-start gap-2.5 border-warning/40 bg-warning/5 p-3.5"
    >
      <AlertTriangle class="mt-0.5 size-4 shrink-0 text-warning" />
      <div class="text-xs text-content-secondary">
        <p class="font-medium text-content">Required mappings still empty</p>
        <ul class="mt-1 list-disc space-y-0.5 pl-4">
          <li v-for="m in missingRequired" :key="m.key">{{ m.label }}</li>
        </ul>
        <p class="mt-1 text-content-muted">
          Postings that depend on these mappings will be rejected until an account is set.
        </p>
      </div>
    </div>

    <Panel>
      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No mappings configured"
        empty-message="Account mappings will appear here once defined for this company."
        @retry="refresh"
      >
        <div class="divide-y divide-line">
          <div v-for="mapping in mappings" :key="mapping.key" class="grid gap-3 p-4 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <p class="flex items-center gap-2 text-sm font-medium text-content">
                {{ mapping.label }}
                <span v-if="mapping.required" class="zs-badge badge-warning">Required</span>
              </p>
              <p class="mt-1 text-xs text-content-muted">{{ mapping.description }}</p>
            </div>
            <div>
              <AccountSelect
                :model-value="mapping.account_id"
                :postable-only="true"
                :disabled="stateFor(mapping.key).saving"
                :error="stateFor(mapping.key).error"
                placeholder="Not mapped"
                @update:model-value="(id) => onChange(mapping, id)"
              />
              <p v-if="stateFor(mapping.key).saving" class="mt-1 text-2xs text-content-muted">Saving…</p>
              <p
                v-else-if="stateFor(mapping.key).savedAt"
                class="mt-1 flex items-center gap-1 text-2xs text-success"
              >
                <CheckCircle2 class="size-3" /> Saved
              </p>
              <ValidationMessage v-if="!stateFor(mapping.key).saving" :message="stateFor(mapping.key).error" />
            </div>
          </div>
        </div>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
