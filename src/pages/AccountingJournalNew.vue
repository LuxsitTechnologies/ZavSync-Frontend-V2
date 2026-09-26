<script setup lang="ts">
/** A6 — manual journal entry: draft, then post through the central posting engine. */
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import JournalLinesEditor from "@/components/accounting/JournalLinesEditor.vue";

import { useMutation } from "@/composables/useAsyncData";
import { journalsRepository, journalTotals } from "@/services/accounting/journals.repository";
import { periodsRepository } from "@/services/accounting/periods.repository";
import { useCompanyStore } from "@/stores/company";
import { setPageMeta } from "@/lib/page-meta";
import type { AccountingPeriod, JournalInput, JournalLineInput } from "@/types/accounting";

setPageMeta("New manual journal", "Record a manual double-entry journal, then post it once it balances.");

const company = useCompanyStore();
const router = useRouter();

function newLine(): JournalLineInput {
  return { id: `line-${crypto.randomUUID()}`, account_id: null, description: "", debit: 0, credit: 0 };
}

const postingDate = ref("2026-09-21");
const reference = ref("");
const description = ref("");
const lines = ref<JournalLineInput[]>([newLine(), newLine()]);

const totals = computed(() => journalTotals(lines.value));

const input = computed<JournalInput>(() => ({
  posting_date: postingDate.value,
  reference: reference.value,
  description: description.value,
  lines: lines.value,
}));

/* ---- live period state for the chosen posting date ---- */
const period = ref<AccountingPeriod | null>(null);
const periodLoading = ref(false);
async function loadPeriod() {
  if (!postingDate.value) {
    period.value = null;
    return;
  }
  periodLoading.value = true;
  try {
    period.value = await periodsRepository.periodFor(company.activeCompanyId, postingDate.value);
  } finally {
    periodLoading.value = false;
  }
}
watch([() => company.activeCompanyId, postingDate], loadPeriod, { immediate: true });

const periodClosed = computed(() => period.value?.status === "closed");

/* ---- save draft / post ---- */
const draftMutation = useMutation(journalsRepository.saveDraft);
const postMutation = useMutation(journalsRepository.post);

const serverError = computed(() => draftMutation.error.value?.message ?? postMutation.error.value?.message ?? null);
const fieldErrors = computed(() => ({ ...draftMutation.fieldErrors.value, ...postMutation.fieldErrors.value }));

const canPost = computed(() => totals.value.postable && !periodClosed.value);

async function saveDraft() {
  postMutation.reset();
  const result = await draftMutation.run(company.activeCompanyId, input.value);
  if (result) router.push(`/accounting/journals/${result.id}`);
}

const confirmOpen = ref(false);
async function confirmPost() {
  draftMutation.reset();
  const result = await postMutation.run(company.activeCompanyId, input.value);
  if (result) {
    confirmOpen.value = false;
    router.push(`/accounting/journals/${result.id}`);
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="New manual journal" description="Manual entries flow through the same posting engine as every other module." />

    <Panel title="Journal header">
      <div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block">
          <span class="label-caps">Journal number</span>
          <input class="field mt-1.5 text-content-muted" disabled value="Assigned automatically by the server on save" />
        </label>
        <label class="block">
          <span class="label-caps">Posting date</span>
          <input v-model="postingDate" type="date" class="field mt-1.5" :class="fieldErrors['posting_date'] ? 'border-danger' : ''" />
          <ValidationMessage :message="fieldErrors['posting_date'] ?? null" />
        </label>
        <label class="block">
          <span class="label-caps">Reference</span>
          <input v-model="reference" class="field mt-1.5" placeholder="Optional reference" />
        </label>
        <label class="block sm:col-span-2 lg:col-span-1">
          <span class="label-caps">Description</span>
          <input v-model="description" class="field mt-1.5" placeholder="Describe this journal" :class="fieldErrors['description'] ? 'border-danger' : ''" />
          <ValidationMessage :message="fieldErrors['description'] ?? null" />
        </label>
      </div>

      <div v-if="!periodLoading && period" class="mx-4 mb-4">
        <p
          v-if="periodClosed"
          class="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
          role="alert"
        >
          {{ period.name }} is a closed accounting period. Posting is disabled for {{ postingDate }} — choose a date in an open period.
        </p>
        <p v-else class="text-2xs text-content-muted">
          Posting date falls in {{ period.name }} ({{ period.status }}).
        </p>
      </div>
    </Panel>

    <Panel title="Lines" description="A journal needs at least two lines and must balance before it can be posted." class="mt-4" body-class="p-4">
      <JournalLinesEditor v-model:lines="lines" :errors="fieldErrors" />
      <ValidationMessage :message="fieldErrors['lines'] ?? fieldErrors['balance'] ?? null" />
    </Panel>

    <ValidationMessage v-if="serverError" :message="serverError" class="mt-3" />

    <div class="mt-4 flex justify-end gap-2">
      <ZButton variant="outline" :disabled="draftMutation.saving.value || postMutation.saving.value" @click="saveDraft">
        {{ draftMutation.saving.value ? "Saving…" : "Save draft" }}
      </ZButton>
      <ZButton :disabled="!canPost || draftMutation.saving.value || postMutation.saving.value" @click="confirmOpen = true">
        Post journal
      </ZButton>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="Post this journal?"
      message="Posting is permanent. Posted journals cannot be edited or deleted — corrections require a reversing journal."
      confirm-label="Post journal"
      :busy="postMutation.saving.value"
      @confirm="confirmPost"
      @cancel="confirmOpen = false"
    >
      <ValidationMessage :message="postMutation.error.value?.message ?? null" />
    </ConfirmDialog>
  </AppShell>
</template>
