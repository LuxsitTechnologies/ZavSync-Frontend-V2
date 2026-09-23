<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { formatMoney, toMinor } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { planningRepository } from "@/services/accounting/planning.repository";
import { useCompanyStore } from "@/stores/company";
import type { BudgetActualRow } from "@/types/planning";

interface DisplayBudgetRow extends BudgetActualRow { id:string }

setPageMeta("Budgets & Forecasts", "Budget, posted actual and deterministic forecast comparison.");
const company = useCompanyStore();
const selectedYear = ref("");
const selectedBudget = ref("");
const selectedForecast = ref("");
const budgetName = ref("Operating Budget");
const accountId = ref("");
const annualAmount = ref("0");
const forecastName = ref("Rolling Forecast");

const state = useAsyncData(async () => {
  const [fiscalYears, budgets, forecasts, accounts] = await Promise.all([
    planningRepository.fiscalYears(company.activeCompanyId), planningRepository.budgets(company.activeCompanyId),
    planningRepository.forecasts(company.activeCompanyId), planningRepository.accounts(company.activeCompanyId),
  ]);
  if (!selectedYear.value) selectedYear.value = fiscalYears[0]?.id ?? "";
  if (!selectedBudget.value) selectedBudget.value = budgets.find((x) => x.is_active)?.id ?? budgets[0]?.id ?? "";
  if (!selectedForecast.value) selectedForecast.value = forecasts.find((x) => x.is_active)?.id ?? forecasts[0]?.id ?? "";
  return { fiscalYears, budgets, forecasts, accounts: accounts.filter((x) => x.type === "revenue" || x.type === "expense") };
}, { watch: [() => company.activeCompanyId] });

const report = useAsyncData(async () => selectedBudget.value ? planningRepository.budgetActual(company.activeCompanyId, selectedBudget.value) : { budget_id:"",from:"",to:"",rows:[],profit_and_loss:{} }, { watch: [() => company.activeCompanyId, () => selectedBudget.value] });
const budgetDetail = useAsyncData(async () => selectedBudget.value ? planningRepository.budget(company.activeCompanyId, selectedBudget.value) : null, { watch: [() => company.activeCompanyId, () => selectedBudget.value], isEmpty:(value)=>value===null });
const projection = useAsyncData(async () => selectedForecast.value ? planningRepository.forecastProjection(company.activeCompanyId, selectedForecast.value) : { forecast_id:"",actuals_through:"",rows:[],profit_and_loss:{} }, { watch: [() => company.activeCompanyId, () => selectedForecast.value] });
const createBudgetMutation = useMutation(planningRepository.createBudget);
const budgetActionMutation = useMutation(planningRepository.budgetAction);
const forecastMutation = useMutation(planningRepository.createForecast);
const activateForecastMutation = useMutation(planningRepository.activateForecast);

const activeYear = computed(() => state.data.value?.fiscalYears.find((x) => x.id === selectedYear.value));
const currentBudget = computed(() => state.data.value?.budgets.find((x) => x.id === selectedBudget.value));
const currentForecast = computed(() => state.data.value?.forecasts.find((x) => x.id === selectedForecast.value));
const rows = computed<DisplayBudgetRow[]>(() => (report.data.value?.rows ?? []).map((row)=>({...row,id:row.account_id})));
const budgetTotal = computed(() => rows.value.reduce((sum,x)=>sum+x.budget,0));
const actualTotal = computed(() => rows.value.reduce((sum,x)=>sum+x.actual,0));
const projectedTotal = computed(() => (projection.data.value?.rows ?? []).reduce((sum,x)=>sum+x.full_year_projection,0));
const allocationRows = computed(() => (budgetDetail.data.value?.lines ?? []).map((line)=>({...line,id:line.id,account_name:`${line.account.code} · ${line.account.name}`,period_name:line.period.name})));
const forecastRows = computed(() => (projection.data.value?.rows ?? []).map((row)=>({...row,id:row.account_id})));
const columns:Column[]=[{key:"account_name",header:"Account"},{key:"type",header:"Category"},{key:"budget",header:"Budget",align:"right",class:"num"},{key:"actual",header:"Actual",align:"right",class:"num"},{key:"variance",header:"Variance",align:"right",class:"num"},{key:"variance_percentage_bps",header:"Variance %",align:"right",class:"num"},{key:"favorable",header:"Performance"}];
const allocationColumns:Column[]=[{key:"account_name",header:"Account"},{key:"period_name",header:"Fiscal period"},{key:"amount",header:"Monthly allocation",align:"right",class:"num"}];
const forecastColumns:Column[]=[{key:"account_name",header:"Account"},{key:"actual_completed",header:"Actual completed",align:"right",class:"num"},{key:"remaining_forecast",header:"Remaining forecast",align:"right",class:"num"},{key:"full_year_projection",header:"Full-year projection",align:"right",class:"num"}];

watch(selectedYear, () => { const match=state.data.value?.budgets.find((x)=>x.fiscal_year_id===selectedYear.value); selectedBudget.value=match?.id??""; });
async function createBudget(){const year=activeYear.value;if(!year||!accountId.value)return;const result=await createBudgetMutation.run(company.activeCompanyId,{fiscal_year_id:year.id,name:budgetName.value,currency:year.currency,lines:[{account_id:accountId.value,annual_amount:toMinor(Number(annualAmount.value)),distribution:"equal"}]});if(result){showToast("Budget created","Annual amount was allocated deterministically across fiscal periods.","success");selectedBudget.value=result.id;await state.refresh();}}
async function budgetAction(action:"submit"|"approve"|"activate"|"revise"){if(!selectedBudget.value)return;const result=await budgetActionMutation.run(company.activeCompanyId,selectedBudget.value,action);if(result){selectedBudget.value=result.id;showToast("Budget updated",`Budget is now ${result.status}.`,"success");await state.refresh();await report.refresh();}}
async function createForecast(){const year=activeYear.value;if(!year||!selectedBudget.value)return;const result=await forecastMutation.run(company.activeCompanyId,{fiscal_year_id:year.id,name:forecastName.value,currency:year.currency,based_on_budget_id:selectedBudget.value,actuals_through:new Date().toISOString().slice(0,10)});if(result){selectedForecast.value=result.id;showToast("Forecast created","The active budget was copied as a planning baseline.","success");await state.refresh();}}
async function activateForecast(){if(!selectedForecast.value)return;const result=await activateForecastMutation.run(company.activeCompanyId,selectedForecast.value);if(result){showToast("Forecast activated","Prior versions remain available in history.","success");await state.refresh();await projection.refresh();}}
</script>

<template>
  <AppShell>
    <PageHeader title="Budgets & Forecasts" description="Plan by fiscal year and GL account, then compare against posted actuals" />
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Selected budget" :value="formatMoney(budgetTotal)" tone="brand" />
      <StatCard label="Posted actual" :value="formatMoney(actualTotal)" />
      <StatCard label="Raw variance" :value="formatMoney(actualTotal-budgetTotal)" :tone="actualTotal<=budgetTotal?'success':'danger'" />
      <StatCard label="Full-year forecast" :value="formatMoney(projectedTotal)" tone="warning" hint="Planning data · not posted" />
    </div>
    <Panel>
      <Toolbar>
        <select v-model="selectedYear" class="field w-44"><option v-for="year in state.data.value?.fiscalYears" :key="year.id" :value="year.id">{{year.name}}</option></select>
        <select v-model="selectedBudget" class="field w-56"><option value="">No budget</option><option v-for="budget in state.data.value?.budgets.filter(x=>x.fiscal_year_id===selectedYear)" :key="budget.id" :value="budget.id">{{budget.name}} · v{{budget.version}} · {{budget.status}}</option></select>
        <select v-model="selectedForecast" class="field w-56"><option value="">No forecast</option><option v-for="forecast in state.data.value?.forecasts.filter(x=>x.fiscal_year_id===selectedYear)" :key="forecast.id" :value="forecast.id">{{forecast.name}} · v{{forecast.version}}</option></select>
        <template #actions><StatusBadge v-if="currentBudget" :status="currentBudget.status" :label="currentBudget.status" /></template>
      </Toolbar>
      <AsyncSection :loading="report.loading.value" :error="report.error.value" :empty="rows.length===0" empty-title="No budget lines" empty-message="Create a draft budget to begin planning." @retry="report.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="880">
          <template #account_name="{row}:{row:DisplayBudgetRow}"><span class="font-medium text-content">{{row.account_code}} · {{row.account_name}}</span></template>
          <template #budget="{row}:{row:DisplayBudgetRow}">{{formatMoney(row.budget)}}</template><template #actual="{row}:{row:DisplayBudgetRow}">{{formatMoney(row.actual)}}</template><template #variance="{row}:{row:DisplayBudgetRow}">{{formatMoney(row.variance)}}</template>
          <template #variance_percentage_bps="{row}:{row:DisplayBudgetRow}">{{row.variance_percentage_bps===null?'N/A':`${(row.variance_percentage_bps/100).toFixed(2)}%`}}</template>
          <template #favorable="{row}:{row:DisplayBudgetRow}"><StatusBadge :status="row.favorable?'on_track':'over_budget'" :label="row.favorable?'Favorable':'Unfavorable'" /></template>
        </DataTable>
      </AsyncSection>
      <div v-if="currentBudget" class="flex flex-wrap gap-2 border-t border-line p-4"><ZButton v-if="currentBudget.status==='draft'" @click="budgetAction('submit')">Submit</ZButton><ZButton v-if="currentBudget.status==='submitted'" @click="budgetAction('approve')">Approve</ZButton><ZButton v-if="currentBudget.status==='approved'" @click="budgetAction('activate')">Activate</ZButton><ZButton v-if="['approved','active','archived'].includes(currentBudget.status)" variant="outline" @click="budgetAction('revise')">Create revision</ZButton></div>
    </Panel>
    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title="Monthly allocation" description="Budget planning data by existing accounting period">
        <DataTable :columns="allocationColumns" :rows="allocationRows" :min-width="620"><template #amount="{row}">{{formatMoney(row.amount)}}</template></DataTable>
      </Panel>
      <Panel title="Forecast projection" description="Posted completed-period actuals plus remaining planning values">
        <DataTable :columns="forecastColumns" :rows="forecastRows" :min-width="720"><template #actual_completed="{row}">{{formatMoney(row.actual_completed)}}</template><template #remaining_forecast="{row}">{{formatMoney(row.remaining_forecast)}}</template><template #full_year_projection="{row}">{{formatMoney(row.full_year_projection)}}</template></DataTable>
      </Panel>
    </div>
    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title="Create budget" description="Enter an annual amount; minor-unit remainders are distributed deterministically.">
        <div class="grid gap-3 p-4 sm:grid-cols-2"><input v-model="budgetName" class="field" placeholder="Budget name"/><select v-model="accountId" class="field"><option value="">Select GL account</option><option v-for="account in state.data.value?.accounts" :key="account.id" :value="account.id">{{account.code}} · {{account.name}}</option></select><input v-model="annualAmount" class="field" inputmode="decimal" placeholder="Annual amount"/><ZButton :disabled="!activeYear||!accountId" @click="createBudget">Create draft</ZButton><ValidationMessage class="sm:col-span-2" :message="createBudgetMutation.error.value?.message??null"/></div>
      </Panel>
      <Panel title="Rolling forecast" description="Actual completed periods plus remaining forecast values.">
        <div class="grid gap-3 p-4 sm:grid-cols-2"><input v-model="forecastName" class="field" placeholder="Forecast name"/><ZButton :disabled="!selectedBudget" @click="createForecast">Create from budget</ZButton><div v-if="currentForecast" class="text-sm text-content-secondary">{{currentForecast.name}} · {{currentForecast.status}} · actuals through {{projection.data.value?.actuals_through||'—'}}</div><ZButton v-if="currentForecast?.status==='draft'" variant="outline" @click="activateForecast">Activate forecast</ZButton><ValidationMessage class="sm:col-span-2" :message="forecastMutation.error.value?.message??activateForecastMutation.error.value?.message??null"/></div>
      </Panel>
    </div>
  </AppShell>
</template>
