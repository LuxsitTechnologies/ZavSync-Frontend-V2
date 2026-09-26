<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Calculator, ShieldCheck, Sparkles } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Predictive Analytics", "Explainable anomalies, operational forecasts and non-posting scenarios.");
const company = useCompanyStore();
const tab = ref<"anomalies" | "forecasts" | "scenarios">("anomalies");
const anomalies = useAsyncData(() => aiRepository.anomalies(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const forecasts = useAsyncData(() => aiRepository.forecasts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const scenarios = useAsyncData(() => aiRepository.scenarios(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const form = reactive({ name: "", scenario_type: "REVENUE_CHANGE", change_bps: "-1000", amount_minor: "0", delay_days: "15" });
const createScenario = useMutation(() => aiRepository.createScenario(company.activeCompanyId, {
  name: form.name,
  scenario_type: form.scenario_type,
  assumptions: {
    change_bps: Number(form.change_bps),
    amount_minor: Number(form.amount_minor),
    delay_days: Number(form.delay_days),
  },
}, crypto.randomUUID()));
const latestScenario = computed(() => scenarios.data.value?.data[0]);
async function saveScenario() {
  if (!await createScenario.run()) return;
  form.name = "";
  await scenarios.refresh();
  showToast("Simulation saved", "No accounting, budget or forecast record was changed.", "success");
}
const formatValue = (key: string, value: unknown) => key.endsWith("_minor") && typeof value === "number" ? formatMoney(value) : String(value ?? "—");
</script>

<template>
  <AppShell>
    <PageHeader title="Predictive Analytics" description="Deterministic analysis remains separate from posted and authoritative accounting data"/>
    <div class="mb-4 flex flex-wrap gap-2"><ZButton v-for="name in ['anomalies','forecasts','scenarios'] as const" :key="name" :variant="tab===name?'primary':'outline'" @click="tab=name">{{name[0].toUpperCase()+name.slice(1)}}</ZButton></div>

    <AsyncSection v-if="tab==='anomalies'" :loading="anomalies.loading.value" :error="anomalies.error.value" :empty="!(anomalies.data.value?.data.length)" empty-title="No active anomalies" empty-message="No authorized explainable anomaly result is available." @retry="anomalies.refresh">
      <div class="grid gap-3 xl:grid-cols-2"><Panel v-for="row in anomalies.data.value?.data ?? []" :key="row.id"><div class="p-4"><div class="flex justify-between gap-3"><div><p class="label-caps">{{row.source_module}} · {{row.method.replaceAll('_',' ')}}</p><h2 class="mt-1 text-sm font-semibold text-content">{{row.metric.replaceAll('_',' ')}}</h2></div><StatusBadge :status="row.status"/></div><p class="mt-2 text-xs text-content-secondary">{{row.explanation}}</p><dl class="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt class="text-content-muted">Observed</dt><dd class="num mt-1 text-content">{{formatMoney(row.observed_value)}}</dd></div><div><dt class="text-content-muted">Baseline</dt><dd class="num mt-1 text-content">{{formatMoney(row.expected_value)}}</dd></div><div><dt class="text-content-muted">Deviation</dt><dd class="num mt-1 text-content">{{row.deviation_bps ?? '—'}} bps</dd></div><div><dt class="text-content-muted">Threshold</dt><dd class="num mt-1 text-content">{{row.threshold_bps}} bps</dd></div><div><dt class="text-content-muted">Sample</dt><dd class="num mt-1 text-content">{{row.sample_size}} periods</dd></div><div><dt class="text-content-muted">Window</dt><dd class="mt-1 text-content">{{row.window_start}}–{{row.window_end}}</dd></div></dl></div></Panel></div>
    </AsyncSection>

    <AsyncSection v-if="tab==='forecasts'" :loading="forecasts.loading.value" :error="forecasts.error.value" :empty="!(forecasts.data.value?.data.length)" empty-title="No forecast result" empty-message="The backend returns INSUFFICIENT_DATA rather than fabricating a projection." @retry="forecasts.refresh">
      <div class="grid gap-3 xl:grid-cols-2"><Panel v-for="row in forecasts.data.value?.data ?? []" :key="row.id"><div class="p-4"><div class="flex justify-between gap-3"><div><p class="label-caps">{{row.source_module}} · {{row.horizon_days}} day horizon</p><h2 class="mt-1 text-sm font-semibold text-content">{{row.metric.replaceAll('_',' ')}}</h2></div><StatusBadge :status="row.status"/></div><p class="mt-3 text-xs text-content-secondary">Method: {{row.method.replaceAll('_',' ')}}</p><div class="mt-3 rounded-md bg-surface-sunken p-3"><div v-for="(point,index) in row.projection_points" :key="index" class="flex justify-between gap-3 text-xs"><span>{{String(point.date ?? point.period ?? point.day ?? `Point ${index+1}`)}}</span><span class="num text-content">{{formatValue('value_minor',point.value_minor ?? point.value)}}</span></div><p v-if="!row.projection_points.length" class="text-xs text-content-muted">No projection points are available.</p></div><p class="mt-3 text-2xs text-content-muted">{{row.limitations ?? 'No additional limitations recorded.'}}</p></div></Panel></div>
    </AsyncSection>

    <div v-if="tab==='scenarios'" class="grid gap-4 xl:grid-cols-[22rem_1fr]">
      <Panel title="New simulation" description="Integer inputs only; this never posts or mutates accounting data."><form class="grid gap-3 p-4" @submit.prevent="saveScenario"><Field v-model="form.name" label="Scenario name" required/><label><span class="label-caps">Scenario type</span><select v-model="form.scenario_type" class="field mt-1.5 w-full"><option>REVENUE_CHANGE</option><option>EXPENSE_CHANGE</option><option>COLLECTION_DELAY</option><option>CUSTOMER_NON_PAYMENT</option><option>INVENTORY_PURCHASE_CHANGE</option><option>PAYROLL_CHANGE</option></select></label><Field v-model="form.change_bps" type="number" label="Change (basis points)"/><Field v-model="form.amount_minor" type="number" label="Amount (minor units)"/><Field v-model="form.delay_days" type="number" label="Delay (days)"/><ValidationMessage :message="createScenario.error.value?.message"/><ZButton type="submit" :disabled="createScenario.saving.value"><Calculator class="size-4"/>Save simulation</ZButton></form></Panel>
      <AsyncSection :loading="scenarios.loading.value" :error="scenarios.error.value" :empty="!latestScenario" empty-title="No saved scenarios" empty-message="Create an explainable, non-posting simulation." @retry="scenarios.refresh"><Panel v-if="latestScenario" :title="latestScenario.name"><div class="p-4"><div class="mb-3 flex items-center gap-2"><StatusBadge status="SIMULATION"/><span class="text-2xs text-content-muted">{{latestScenario.scenario_type.replaceAll('_',' ')}}</span></div><div class="grid gap-3 md:grid-cols-3"><div v-for="(values,label) in {BASELINE:latestScenario.baseline,SCENARIO:latestScenario.scenario,DELTA:latestScenario.delta}" :key="label" class="rounded-md bg-surface-sunken p-3"><p class="label-caps">{{label}}</p><div v-for="(value,key) in values" :key="key" class="mt-2 flex justify-between gap-2 text-xs"><span class="text-content-muted">{{String(key).replaceAll('_',' ')}}</span><span class="num text-content">{{formatValue(String(key),value)}}</span></div></div></div><div class="mt-4 flex gap-2 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>Simulation only. It did not create a journal or alter an authoritative forecast.</div><RouterLink :to="{path:'/knowledge/chat',query:{context:`Explain intelligence scenario ${latestScenario.id}`}}"><ZButton as="span" class="mt-4" variant="outline"><Sparkles class="size-4"/>Ask Copilot to explain</ZButton></RouterLink></div></Panel></AsyncSection>
    </div>
  </AppShell>
</template>
