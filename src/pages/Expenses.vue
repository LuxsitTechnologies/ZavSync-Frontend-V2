<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Expenses", "Expense claims are not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Expenses"
      description="Employee claims, receipts, approvals and reimbursements"
      capability="Expense claims"
    />
  </AppShell>
</template>
