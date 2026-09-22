<script setup lang="ts">
import { Download } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import { ledger, type LedgerLine } from "@/lib/mock-modules";
import { money, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Ledger", "Account ledger with dated debits, credits and running balance.");

const debit = ledger.reduce((s, l) => s + l.debit, 0);
const credit = ledger.reduce((s, l) => s + l.credit, 0);
const closing = ledger[ledger.length - 1]?.balance ?? 0;

const columns: Column[] = [
  { key: "date", header: "Date", class: "num" },
  { key: "ref", header: "Reference", class: "num" },
  { key: "narration", header: "Narration" },
  { key: "debit", header: "Debit", align: "right", class: "num" },
  { key: "credit", header: "Credit", align: "right", class: "num" },
  { key: "balance", header: "Balance", align: "right", class: "num font-medium" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Ledger" description="1020 · Bank — Habib Metro 0142 · August 2026">
      <template #actions>
        <ZButton variant="outline">
          <Download class="size-4" /> Export statement
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Opening balance" :value="money(24120000)" />
      <StatCard label="Total debits" :value="money(debit)" tone="success" />
      <StatCard label="Total credits" :value="money(credit)" tone="danger" />
      <StatCard label="Closing balance" :value="money(closing)" tone="brand" />
    </div>

    <Panel>
      <Toolbar>
        <select class="field w-64" aria-label="Select account" value="1020">
          <option value="1020">1020 · Bank — Habib Metro 0142</option>
          <option value="1010">1010 · Cash in Hand</option>
          <option value="1100">1100 · Accounts Receivable</option>
        </select>
        <input type="date" class="field w-40" aria-label="From date" value="2026-08-01" />
        <input type="date" class="field w-40" aria-label="To date" value="2026-08-31" />
      </Toolbar>
      <DataTable :columns="columns" :rows="ledger" :min-width="960">
        <template #date="{ row }: { row: LedgerLine }">{{ shortDate(row.date) }}</template>
        <template #ref="{ row }: { row: LedgerLine }">{{ row.reference }}</template>
        <template #narration="{ row }: { row: LedgerLine }">
          <span class="text-content">{{ row.narration }}</span>
        </template>
        <template #debit="{ row }: { row: LedgerLine }">{{ row.debit ? money(row.debit) : "—" }}</template>
        <template #credit="{ row }: { row: LedgerLine }">{{ row.credit ? money(row.credit) : "—" }}</template>
        <template #balance="{ row }: { row: LedgerLine }">{{ money(row.balance) }}</template>
        <template #footer><span>{{ ledger.length }} entries · balanced</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
