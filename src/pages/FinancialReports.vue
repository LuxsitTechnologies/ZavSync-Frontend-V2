<script setup lang="ts">
import { computed, ref } from "vue";
import { Download } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Tabs from "@/components/zs/Tabs.vue";
import ZButton from "@/components/zs/ZButton.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/composables/useToast";
import { useAsyncData } from "@/composables/useAsyncData";
import { useCompanyStore } from "@/stores/company";
import { reportsRepository, type ReportRow } from "@/services/accounting/reports.repository";
import { setPageMeta } from "@/lib/page-meta";
import { localDateInput } from "@/lib/format";

setPageMeta("Financial Reports", "Trial balance, profitability, financial position and cash flow for the active company.");

type ReportTab = "Profit & Loss" | "Balance Sheet" | "Trial Balance" | "Cash Flow";
type Comparison = "Prior period" | "Prior year" | "No comparison";
interface DisplayRow extends ReportRow { previous: number | null; variance: number | null }

const company = useCompanyStore();
const tab = ref<ReportTab>("Profit & Loss");
const period = ref("Year to date");
const comparison = ref<Comparison>("Prior period");

function iso(date: Date): string { return localDateInput(date); }
function rangeFor(value: string): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  if (value === "This month") start.setUTCDate(1);
  else if (value === "This quarter") start.setUTCMonth(Math.floor(today.getUTCMonth() / 3) * 3, 1);
  else start.setUTCMonth(0, 1);
  return { from: iso(start), to: iso(today) };
}
function comparisonRange(from: string, to: string, value: Comparison): { from: string; to: string } | null {
  if (value === "No comparison") return null;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (value === "Prior year") {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    end.setUTCFullYear(end.getUTCFullYear() - 1);
  } else {
    const duration = end.getTime() - start.getTime() + 86_400_000;
    end.setTime(start.getTime() - 86_400_000);
    start.setTime(end.getTime() - duration + 86_400_000);
  }
  return { from: iso(start), to: iso(end) };
}

async function loadReports() {
  const range = rangeFor(period.value);
  const prior = comparisonRange(range.from, range.to, comparison.value);
  const [profitAndLoss, balanceSheet, trialBalance, priorProfitAndLoss, priorBalanceSheet, priorTrialBalance] = await Promise.all([
    reportsRepository.profitAndLoss(company.activeCompanyId, range.from, range.to),
    reportsRepository.balanceSheet(company.activeCompanyId, range.to),
    reportsRepository.trialBalance(company.activeCompanyId, range.from, range.to),
    prior ? reportsRepository.profitAndLoss(company.activeCompanyId, prior.from, prior.to) : null,
    prior ? reportsRepository.balanceSheet(company.activeCompanyId, prior.to) : null,
    prior ? reportsRepository.trialBalance(company.activeCompanyId, prior.from, prior.to) : null,
  ]);
  return { profitAndLoss, balanceSheet, trialBalance, priorProfitAndLoss, priorBalanceSheet, priorTrialBalance };
}

const state = useAsyncData(loadReports, { watch: [() => company.activeCompanyId, () => period.value, () => comparison.value] });

const rows = computed<DisplayRow[]>(() => {
  const data = state.data.value;
  if (!data || tab.value === "Cash Flow") return [];
  let current: ReportRow[] = [];
  let previous: ReportRow[] = [];
  if (tab.value === "Profit & Loss") {
    current = [
      { id: "revenue", label: "Revenue", amount: data.profitAndLoss.revenue },
      { id: "cost_of_sales", label: "Cost of goods sold", amount: -data.profitAndLoss.cost_of_sales },
      { id: "gross_profit", label: "Gross profit", amount: data.profitAndLoss.gross_profit },
      { id: "operating_expenses", label: "Operating expenses", amount: -data.profitAndLoss.operating_expenses },
      { id: "net_profit", label: "Net profit", amount: data.profitAndLoss.net_profit },
    ];
    if (data.priorProfitAndLoss) previous = [
      { id: "revenue", label: "Revenue", amount: data.priorProfitAndLoss.revenue },
      { id: "cost_of_sales", label: "Cost of goods sold", amount: -data.priorProfitAndLoss.cost_of_sales },
      { id: "gross_profit", label: "Gross profit", amount: data.priorProfitAndLoss.gross_profit },
      { id: "operating_expenses", label: "Operating expenses", amount: -data.priorProfitAndLoss.operating_expenses },
      { id: "net_profit", label: "Net profit", amount: data.priorProfitAndLoss.net_profit },
    ];
  } else if (tab.value === "Balance Sheet") {
    current = [
      { id: "assets", label: "Total assets", amount: data.balanceSheet.assets },
      { id: "liabilities", label: "Liabilities", amount: data.balanceSheet.liabilities },
      { id: "equity", label: "Equity", amount: data.balanceSheet.equity },
      { id: "current_earnings", label: "Current earnings", amount: data.balanceSheet.current_earnings },
      { id: "equity_total", label: "Equity including current earnings", amount: data.balanceSheet.equity_including_current_earnings },
    ];
    if (data.priorBalanceSheet) previous = [
      { id: "assets", label: "Total assets", amount: data.priorBalanceSheet.assets },
      { id: "liabilities", label: "Liabilities", amount: data.priorBalanceSheet.liabilities },
      { id: "equity", label: "Equity", amount: data.priorBalanceSheet.equity },
      { id: "current_earnings", label: "Current earnings", amount: data.priorBalanceSheet.current_earnings },
      { id: "equity_total", label: "Equity including current earnings", amount: data.priorBalanceSheet.equity_including_current_earnings },
    ];
  } else {
    current = [
      { id: "debit", label: "Debits", amount: data.trialBalance.debit },
      { id: "credit", label: "Credits", amount: -data.trialBalance.credit },
      { id: "difference", label: "Difference", amount: data.trialBalance.debit - data.trialBalance.credit },
    ];
    if (data.priorTrialBalance) previous = [
      { id: "debit", label: "Debits", amount: data.priorTrialBalance.debit },
      { id: "credit", label: "Credits", amount: -data.priorTrialBalance.credit },
      { id: "difference", label: "Difference", amount: data.priorTrialBalance.debit - data.priorTrialBalance.credit },
    ];
  }
  return current.map((row) => {
    const previousAmount = previous.find((candidate) => candidate.id === row.id)?.amount ?? null;
    return { ...row, previous: previousAmount, variance: previousAmount === null ? null : row.amount - previousAmount };
  });
});

const columns: Column[] = [
  { key: "label", header: "Line item" },
  { key: "previous", header: "Comparison", align: "right", class: "num" },
  { key: "amount", header: "Current", align: "right", class: "num" },
  { key: "variance", header: "Variance", align: "right", class: "num" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Financial Reports" description="Backend-authoritative statements with comparison and drill-through ready views">
      <template #actions><ZButton variant="outline" @click="showToast('Export unavailable', 'Report export is not part of the core accounting stage yet.', 'info')"><Download class="size-4" />Export</ZButton></template>
    </PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Revenue YTD" :value="state.data.value ? formatMoney(state.data.value.profitAndLoss.revenue) : '—'" tone="brand" />
      <StatCard label="Net profit" :value="state.data.value ? formatMoney(state.data.value.profitAndLoss.net_profit) : '—'" tone="success" />
      <StatCard label="Total assets" :value="state.data.value ? formatMoney(state.data.value.balanceSheet.assets) : '—'" />
      <StatCard label="Closing cash" value="—" tone="warning" hint="Available in the banking stage" />
    </div>
    <Panel>
      <Tabs v-model="tab" :items="['Profit & Loss', 'Balance Sheet', 'Trial Balance', 'Cash Flow']" />
      <div class="flex flex-wrap gap-2 border-b border-line p-3">
        <select v-model="period" class="field w-44"><option>Year to date</option><option>This quarter</option><option>This month</option></select>
        <select v-model="comparison" class="field w-44"><option>Prior period</option><option>Prior year</option><option>No comparison</option></select>
      </div>
      <div v-if="tab === 'Cash Flow'" class="p-10 text-center text-sm text-content-muted">Cash-flow reporting is available from the banking workspace, where it is sourced from authoritative banking data.</div>
      <AsyncSection v-else :loading="state.loading.value" :error="state.error.value" :empty="rows.length === 0" empty-title="No accounting activity" empty-message="No posted journal activity exists for this report period." @retry="state.refresh">
        <div class="grid xl:grid-cols-[1fr_22rem]">
          <DataTable :columns="columns" :rows="rows" :min-width="680">
            <template #label="{ row }: { row: DisplayRow }"><span class="font-medium text-content">{{ row.label }}</span></template>
            <template #previous="{ row }: { row: DisplayRow }">{{ row.previous === null ? '—' : formatMoney(row.previous) }}</template>
            <template #amount="{ row }: { row: DisplayRow }">{{ formatMoney(row.amount) }}</template>
            <template #variance="{ row }: { row: DisplayRow }"><span v-if="row.variance !== null" :class="row.variance >= 0 ? 'text-success' : 'text-danger'">{{ formatMoney(row.variance) }}</span><span v-else>—</span></template>
          </DataTable>
          <div class="border-l border-line p-4">
            <p class="label-caps">Six-month trend</p>
            <AreaChart class="mt-4" :data="state.data.value?.profitAndLoss.trend ?? []" x-key="month" :series="[{ key: 'actual', color: 'var(--chart-1)', id: 'report-actual' }, { key: 'comparison', color: 'var(--chart-2)', id: 'report-compare' }]" :height="230" />
          </div>
        </div>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
