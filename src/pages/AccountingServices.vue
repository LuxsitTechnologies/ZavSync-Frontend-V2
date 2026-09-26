<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Services", "A server-backed service catalogue is not available.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Services"
      description="Billable service catalogue and tax treatment"
      capability="Service catalogue"
    />
  </AppShell>
</template>
