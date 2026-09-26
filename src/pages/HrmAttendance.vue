<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import UnavailableCapability from "@/components/zs/UnavailableCapability.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Attendance", "Attendance is not available in this workspace.");
</script>

<template>
  <AppShell>
    <UnavailableCapability
      title="Attendance"
      description="Daily attendance and exception tracking"
      capability="Attendance management"
    />
  </AppShell>
</template>
