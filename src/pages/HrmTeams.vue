<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Teams", "Team management is not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Teams"
      description="Teams, reporting lines and workforce organization"
      capability="Team management"
    />
  </AppShell>
</template>
