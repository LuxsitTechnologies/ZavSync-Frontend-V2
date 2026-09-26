<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Rotas", "Work scheduling is not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Rotas"
      description="Shift planning and workforce schedules"
      capability="Work scheduling"
    />
  </AppShell>
</template>
