<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Leave", "Leave management is not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Leave"
      description="Leave requests, balances and approval workflow"
      capability="Leave management"
    />
  </AppShell>
</template>
