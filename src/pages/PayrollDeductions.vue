<script setup lang="ts">
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import { deductions } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Deductions", "Statutory and voluntary deduction components used in payroll runs.");

const columns: Column[] = [
  { key: "code", header: "Code", class: "num" },
  { key: "name", header: "Deduction" },
  { key: "basis", header: "Basis" },
  { key: "value", header: "Value", class: "num" },
  { key: "applies", header: "Applies to" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Deductions" description="Statutory contributions and recoveries">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New deduction
        </ZButton>
      </template>
    </PageHeader>
    <Panel>
      <DataTable :columns="columns" :rows="deductions" :min-width="860">
        <template #code="{ row }">{{ row.code }}</template>
        <template #name="{ row }"><span class="font-medium text-content">{{ row.name }}</span></template>
        <template #basis="{ row }">{{ row.basis }}</template>
        <template #value="{ row }">{{ row.value }}</template>
        <template #applies="{ row }">{{ row.applies_to }}</template>
        <template #footer><span>{{ deductions.length }} components</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
