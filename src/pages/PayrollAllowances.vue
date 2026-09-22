<script setup lang="ts">
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import { allowances } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Allowances", "Allowance components, calculation basis and taxability rules.");

const columns: Column[] = [
  { key: "code", header: "Code", class: "num" },
  { key: "name", header: "Allowance" },
  { key: "basis", header: "Basis" },
  { key: "value", header: "Value", class: "num" },
  { key: "taxable", header: "Taxable" },
  { key: "applies", header: "Applies to" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Allowances" description="Earning components applied during payroll calculation">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New allowance
        </ZButton>
      </template>
    </PageHeader>
    <Panel>
      <DataTable :columns="columns" :rows="allowances" :min-width="880">
        <template #code="{ row }">{{ row.code }}</template>
        <template #name="{ row }"><span class="font-medium text-content">{{ row.name }}</span></template>
        <template #basis="{ row }">{{ row.basis }}</template>
        <template #value="{ row }">{{ row.value }}</template>
        <template #taxable="{ row }">
          <span :class="`zs-badge ${row.taxable ? 'badge-warning' : 'badge-neutral'}`">
            {{ row.taxable ? "Taxable" : "Exempt" }}
          </span>
        </template>
        <template #applies="{ row }">{{ row.applies_to }}</template>
        <template #footer><span>{{ allowances.length }} components</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
