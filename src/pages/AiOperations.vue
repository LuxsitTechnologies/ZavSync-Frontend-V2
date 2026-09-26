<script setup lang="ts">
import { computed } from "vue";
import { Database, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("AI Operations", "Company-scoped usage, retrieval, evaluation and provider reconciliation visibility.");
const company = useCompanyStore();
const observability = useAsyncData(() => aiRepository.intelligenceObservability(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const evaluations = useAsyncData(() => aiRepository.intelligenceEvaluations(company.activeCompanyId), { watch: [() => company.activeCompanyId], immediate: company.hasPermission("intelligence.evaluations.manage") });
const now = new Date();
const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
const monthEnd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()).padStart(2,"0")}`;
const billing = useAsyncData(() => aiRepository.providerReconciliations(company.activeCompanyId, monthStart, monthEnd), { watch: [() => company.activeCompanyId] });
const firstBilling = computed(() => billing.data.value?.data[0]);
</script>

<template>
  <AppShell>
    <PageHeader title="AI Operations" description="Usage, quality, retrieval capability and billing reconciliation without fabricated provider data"/>
    <AsyncSection :loading="observability.loading.value" :error="observability.error.value" :empty="false" @retry="observability.refresh">
      <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Requests" :value="String(observability.data.value?.requests ?? 0)"/><StatCard label="Tokens" :value="String((observability.data.value?.input_tokens ?? 0)+(observability.data.value?.output_tokens ?? 0))" tone="brand"/><StatCard label="Recorded cost" :value="formatMoney(observability.data.value?.cost_minor ?? 0)" tone="warning"/><StatCard label="Average latency" :value="`${observability.data.value?.average_latency_ms ?? 0} ms`"/></div>
      <div class="grid gap-4 xl:grid-cols-3"><Panel title="Grounding & tools"><dl class="space-y-3 p-4 text-xs"><div class="flex justify-between"><dt>Retrievals</dt><dd class="num">{{observability.data.value?.retrieval_count ?? 0}}</dd></div><div class="flex justify-between"><dt>Citations</dt><dd class="num">{{observability.data.value?.citation_count ?? 0}}</dd></div><div class="flex justify-between"><dt>Proposals</dt><dd class="num">{{observability.data.value?.proposal_count ?? 0}}</dd></div><div class="flex justify-between"><dt>Failures</dt><dd class="num">{{observability.data.value?.failures ?? 0}}</dd></div></dl></Panel><Panel title="Vector retrieval"><div class="p-4"><div class="flex items-center gap-2"><Database class="size-4 text-content-brand"/><StatusBadge :status="observability.data.value?.vector_store.available?'available':'unavailable'"/></div><p class="mt-3 text-xs text-content-secondary">Driver: {{observability.data.value?.vector_store.driver ?? '—'}}</p><p class="mt-2 text-2xs text-content-muted">{{observability.data.value?.vector_store.production_external?'External vector infrastructure verified.':'Bounded local retrieval is active; production external vector infrastructure is not configured.'}}</p></div></Panel><Panel title="Provider billing"><div class="p-4"><StatusBadge :status="firstBilling?.status ?? 'NOT_AVAILABLE'"/><dl class="mt-3 space-y-2 text-xs"><div class="flex justify-between"><dt>Internal total</dt><dd class="num">{{formatMoney(firstBilling?.internal_cost_minor ?? 0)}}</dd></div><div class="flex justify-between"><dt>Provider total</dt><dd class="num">{{firstBilling?.provider_cost_minor==null?'Not imported':formatMoney(firstBilling.provider_cost_minor)}}</dd></div><div class="flex justify-between"><dt>Difference</dt><dd class="num">{{firstBilling?.difference_minor==null?'—':formatMoney(firstBilling.difference_minor)}}</dd></div></dl></div></Panel></div>
    </AsyncSection>
    <Panel v-if="company.hasPermission('intelligence.evaluations.manage')" class="mt-4" title="Evaluation dashboard" description="Evaluation fixtures remain separate from production financial data."><AsyncSection :loading="evaluations.loading.value" :error="evaluations.error.value" :empty="false" @retry="evaluations.refresh"><div class="grid gap-3 p-4 sm:grid-cols-3"><StatCard label="Runs" :value="String(evaluations.data.value?.summary.total ?? 0)"/><StatCard label="Completed" :value="String(evaluations.data.value?.summary.completed ?? 0)"/><StatCard label="Average score" :value="evaluations.data.value?.summary.average_score_bps==null?'—':`${evaluations.data.value.summary.average_score_bps} bps`" tone="brand"/></div><div class="divide-y divide-line"><div v-for="check in evaluations.data.value?.summary.checks ?? []" :key="check.name" class="flex items-center justify-between gap-3 p-4 text-xs"><span>{{check.name.replaceAll('_',' ')}}</span><span class="num">{{check.passed}} / {{check.runs}} · {{check.pass_rate_bps}} bps</span></div></div></AsyncSection></Panel>
    <div class="mt-4 flex gap-2 rounded-md bg-surface-sunken p-4 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>Provider secrets are excluded from operational responses and sanitized error categories are aggregated company by company.</div>
  </AppShell>
</template>
