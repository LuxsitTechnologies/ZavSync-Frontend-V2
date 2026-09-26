<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Lead Capture Forms", "Hosted CRM forms are not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Capture Form Builder"
      description="Hosted lead-capture forms and embeddable endpoints"
      capability="Hosted capture forms"
    />
  </AppShell>
</template>
