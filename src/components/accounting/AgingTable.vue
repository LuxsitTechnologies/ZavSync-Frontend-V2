<script setup lang="ts">
/** Shared AR/AP aging table: Current, 1–30, 31–60, 61–90, 90+. */
import { computed } from "vue";

import { formatMoney, formatMoneyOrDash } from "@/lib/money";
import { AGING_BUCKETS, type AgingRow } from "@/types/accounting";

const props = defineProps<{ rows: AgingRow[]; partyLabel: string }>();

const totals = computed(() => {
  const base = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
  for (const row of props.rows) {
    base.current += row.current;
    base.d1_30 += row.d1_30;
    base.d31_60 += row.d31_60;
    base.d61_90 += row.d61_90;
    base.d90_plus += row.d90_plus;
    base.total += row.total;
  }
  return base;
});
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full" style="min-width: 880px">
      <thead>
        <tr class="table-head">
          <th class="px-4 py-2.5 text-left">{{ partyLabel }}</th>
          <th v-for="bucket in AGING_BUCKETS" :key="bucket.key" class="px-4 py-2.5 text-right">
            {{ bucket.label }}
          </th>
          <th class="px-4 py-2.5 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.party_id" class="table-row-zs">
          <td class="px-4 font-medium text-content">{{ row.party_name }}</td>
          <td v-for="bucket in AGING_BUCKETS" :key="bucket.key" class="num px-4 text-right text-content-secondary">
            {{ formatMoneyOrDash(row[bucket.key]) }}
          </td>
          <td class="num px-4 text-right font-semibold text-content">{{ formatMoney(row.total) }}</td>
        </tr>
        <tr v-if="rows.length" class="border-t border-line-strong bg-surface-sunken">
          <td class="px-4 py-2.5 text-xs font-semibold text-content">Total outstanding</td>
          <td v-for="bucket in AGING_BUCKETS" :key="bucket.key" class="num px-4 py-2.5 text-right text-xs font-semibold text-content">
            {{ formatMoneyOrDash(totals[bucket.key]) }}
          </td>
          <td class="num px-4 py-2.5 text-right text-xs font-semibold text-content">{{ formatMoney(totals.total) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
