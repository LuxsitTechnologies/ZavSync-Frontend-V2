<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Upload, Check, Link2 } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { operationsRepository } from "@/services/operations/repository";
import { accountsRepository } from "@/services/accounting/accounts.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";

type Candidate = { type: string; id: string; reference: string; date: string; amount: number; party: string | null; confidence: "exact" | "high" | "possible"; reason: string; score: number };
setPageMeta("Bank Reconciliation", "Import statements, review match suggestions and reconcile transactions.");
const company = useCompanyStore();
const state = useAsyncData(() => operationsRepository.bankTransactions(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const bankState = useAsyncData(() => operationsRepository.bankAccounts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const accountState = useAsyncData(() => accountsRepository.selectable(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const selected = ref<string | null>(null), selectedBank = ref(""), selectedCandidate = ref(""), counterpart = ref(""), fileInput = ref<HTMLInputElement | null>(null), preview = ref<{ id: string; row_count: number; preview_rows: Array<Record<string, unknown>> } | null>(null), candidates = ref<Candidate[]>([]), loadingSuggestions = ref(false), bankGl = ref<{ statement_balance: number | null; book_balance: number; difference: number | null; status: "balanced" | "unbalanced" } | null>(null);
const rows = computed(() => state.data.value ?? []);
const selectedRow = computed(() => rows.value.find((item) => item.id === selected.value));
const chosenCandidate = computed(() => candidates.value.find((item) => `${item.type}:${item.id}` === selectedCandidate.value));
const assetAccounts = computed(() => (accountState.data.value ?? []).filter((account) => account.is_active));

watch(selected, async (id) => {
  candidates.value = []; selectedCandidate.value = "";
  if (!id) return;
  loadingSuggestions.value = true;
  try {
    const result = await operationsRepository.transactionSuggestions(company.activeCompanyId, id);
    candidates.value = result.data;
    if (candidates.value[0]) selectedCandidate.value = `${candidates.value[0].type}:${candidates.value[0].id}`;
  } finally { loadingSuggestions.value = false; }
});
watch(selectedBank, async (id) => { bankGl.value = id ? await operationsRepository.bankGl(company.activeCompanyId, id) : null; });

async function match() {
  if (!selected.value || !chosenCandidate.value) return;
  await operationsRepository.matchTransaction(company.activeCompanyId, selected.value, chosenCandidate.value);
  await state.refresh(); showToast("Transaction matched", "The existing accounting event was linked without creating another journal.");
}
async function classify() {
  if (!selected.value || !counterpart.value || !selectedRow.value) return;
  await operationsRepository.classifyTransaction(company.activeCompanyId, selected.value, counterpart.value, selectedRow.value.description);
  await state.refresh(); showToast("Transaction classified", "A balanced journal was posted through the accounting engine.");
}
async function picked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !selectedBank.value) { showToast("Select a bank account", "Choose the statement account before importing a CSV.", "danger"); return; }
  preview.value = await operationsRepository.importStatement(company.activeCompanyId, selectedBank.value, file);
  showToast("Statement parsed", `${preview.value.row_count} rows are ready for confirmation.`, "info");
}
async function confirmImport() {
  if (!preview.value) return;
  await operationsRepository.confirmStatement(company.activeCompanyId, preview.value.id);
  preview.value = null; await state.refresh(); showToast("Statement imported", "Validated bank evidence is ready for matching.");
}
</script>

<template>
  <AppShell>
    <PageHeader title="Bank Reconciliation" description="Statement matching workspace for the active company"><template #actions><select v-model="selectedBank" class="field w-52"><option value="">Select bank account</option><option v-for="account in (bankState.data.value ?? []).filter((item) => item.type === 'bank')" :key="account.id" :value="account.id">{{ account.name }}</option></select><input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="picked" /><ZButton variant="outline" @click="fileInput?.click()"><Upload class="size-4" />Import CSV</ZButton><ZButton v-if="preview" @click="confirmImport"><Check class="size-4" />Confirm {{ preview.row_count }} rows</ZButton></template></PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Statement items" :value="String(rows.length)" /><StatCard label="Suggested matches" :value="String(rows.filter((item) => item.status === 'suggested').length)" tone="warning" /><StatCard label="Unmatched" :value="String(rows.filter((item) => item.status === 'unmatched').length)" tone="danger" /><StatCard label="Bank / GL difference" :value="bankGl?.difference === null || bankGl?.difference === undefined ? '—' : formatMoney(bankGl.difference)" :tone="bankGl?.status === 'balanced' ? 'success' : 'danger'" /></div>
    <div class="grid gap-4 xl:grid-cols-2">
      <Panel title="Bank statement" description="Select an item to review its authoritative matching candidates"><div class="divide-y divide-line"><button v-for="item in rows" :key="item.id" type="button" class="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-surface-hover" :class="selected === item.id ? 'bg-surface-selected' : ''" @click="selected = item.id"><div><p class="text-sm font-medium text-content">{{ item.description }}</p><p class="num mt-1 text-xs text-content-muted">{{ item.date }} · {{ item.reference }}</p></div><div class="text-right"><p class="num text-sm font-semibold" :class="item.direction === 'in' ? 'text-success' : 'text-content'">{{ item.direction === 'in' ? '+' : '−' }}{{ formatMoney(item.amount) }}</p><StatusBadge :status="item.status" /></div></button></div></Panel>
      <Panel title="Suggested book match" description="Suggestions require confirmation before reconciliation"><div v-if="selected" class="p-5"><p v-if="loadingSuggestions" class="text-sm text-content-muted">Loading deterministic candidates…</p><template v-else-if="candidates.length"><span class="grid size-10 place-items-center rounded-md bg-primary-subtle text-primary-subtle-fg"><Link2 class="size-5" /></span><label class="mt-4 block"><span class="label-caps">Suggested record</span><select v-model="selectedCandidate" class="field mt-1.5 w-full"><option v-for="candidate in candidates" :key="`${candidate.type}:${candidate.id}`" :value="`${candidate.type}:${candidate.id}`">{{ candidate.reference }} · {{ candidate.party ?? candidate.type }} · {{ candidate.confidence }}</option></select></label><p class="mt-2 text-sm text-content-secondary">{{ chosenCandidate?.reason }}</p><ZButton class="mt-5" @click="match"><Check class="size-4" />Confirm match</ZButton></template><template v-else><p class="text-sm text-content-muted">No existing accounting event matched. Classify this bank-originated item against an authorized GL account.</p><select v-model="counterpart" class="field mt-4 w-full"><option value="">Select counterpart account</option><option v-for="account in assetAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select><ZButton class="mt-3" :disabled="!counterpart" @click="classify">Post classification</ZButton></template></div><div v-else class="p-10 text-center text-sm text-content-muted">Select a statement item to compare it with company books.</div></Panel>
    </div>
  </AppShell>
</template>
