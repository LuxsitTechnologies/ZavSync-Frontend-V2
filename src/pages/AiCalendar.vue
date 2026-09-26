<script setup lang="ts">
import { CalendarClock, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Smart Agenda", "Calendar automation requires a future provider integration.");
</script>

<template>
  <AppShell>
    <PageHeader title="Smart Agenda" description="Calendar suggestions are not fabricated when no calendar provider is connected" />
    <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <Panel title="Calendar integration required"><div class="p-10 text-center"><CalendarClock class="mx-auto size-10 text-content-brand"/><h2 class="mt-4 text-lg font-semibold text-content">No authoritative calendar source is connected</h2><p class="mx-auto mt-2 max-w-xl text-sm text-content-secondary">Stage 12 does not add calendar-provider access. Connect a future approved integration before conflict detection or scheduling can be shown here.</p></div></Panel>
      <Panel title="Safety boundary"><div class="flex gap-2 p-4 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>Copilot cannot create or change calendar events without an approved provider adapter.</div></Panel>
    </div>
  </AppShell>
</template>
