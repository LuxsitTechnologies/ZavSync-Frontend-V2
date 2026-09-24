<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, PlayCircle } from "lucide-vue-next";
import { RouterLink, useRouter } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Payroll Dashboard", "Payroll cost, headcount and batch status for the active company.");

const company = useCompanyStore();
const router = useRouter();
const summaryState = useAsyncData(() => payrollRepository.summary(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const liabilityState = useAsyncData(() => payrollRepository.liabilities(company.activeCompanyId), { watch: [() => company.activeCompanyId] });

const totals = computed(() => summaryState.data.value?.totals);
const cycleBatches = computed(() => (summaryState.data.value?.batches ?? []).slice(0, 5));
const trend = computed(() => [...(summaryState.data.value?.batches ?? [])].slice(0, 6).reverse().map((batch) => ({ month: batch.period?.name ?? batch.accounting_date, gross: batch.gross_earnings, net: batch.net_pay })));
const trendSeries = [
  { key: "gross", color: "var(--chart-1)", id: "gPayrollGross" },
  { key: "net", color: "var(--chart-2)", id: "gPayrollNet" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Dashboard" :description="`${company.activeCompany?.name ?? 'Active company'} · authoritative payroll register`">
      <template #actions>
        <ZButton @click="router.push('/payroll/batches')"><PlayCircle class="size-4" /> Start payroll run</ZButton>
      </template>
    </PageHeader>

    <AsyncSection :loading="summaryState.loading.value" :error="summaryState.error.value" :empty="summaryState.isEmpty.value" empty-title="No payroll yet" empty-message="Create a payroll period and batch to begin." @retry="summaryState.refresh">
      <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross cost" :value="formatMoney(totals?.gross_earnings ?? 0)" hint="Before deductions" tone="brand" />
        <StatCard label="Net payable" :value="formatMoney(totals?.net_pay ?? 0)" hint="Across payroll batches" tone="success" />
        <StatCard label="Employees processed" :value="String(totals?.employees ?? 0)" hint="Authoritative batch count" />
        <StatCard label="Outstanding liabilities" :value="formatMoney(liabilityState.data.value?.outstanding_total ?? 0)" hint="Net pay and statutory dues" tone="warning" />
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <Panel class="xl:col-span-2" title="Payroll cost trend" description="Gross vs net · integer minor-unit source" body-class="p-4">
          <div class="h-64"><AreaChart :data="trend" x-key="month" :series="trendSeries" :height="256" /></div>
        </Panel>

        <Panel title="Recent batches" description="Status comes from the payroll lifecycle">
          <template #actions><RouterLink to="/payroll/batches" class="text-xs text-content-brand hover:underline">View all</RouterLink></template>
          <ul class="divide-y divide-line">
            <li v-for="batch in cycleBatches" :key="batch.id" class="px-4 py-3">
              <div class="flex items-center justify-between gap-2"><p class="num text-sm font-medium text-content">{{ batch.number }}</p><StatusBadge :status="batch.status.toLowerCase()" /></div>
              <p class="mt-1 text-xs text-content-muted">{{ batch.period?.name ?? batch.accounting_date }} · {{ batch.employee_count }} staff · {{ formatMoney(batch.net_pay) }} net</p>
            </li>
          </ul>
          <div class="border-t border-line p-3"><RouterLink to="/payroll/runs" class="inline-flex items-center gap-1 text-xs text-content-brand hover:underline">Open payslip register <ArrowRight class="size-3" /></RouterLink></div>
        </Panel>
      </div>
    </AsyncSection>
  </AppShell>
</template>
