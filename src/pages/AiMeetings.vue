<script setup lang="ts">
import { FileText, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Meeting Assistant", "Meeting capture requires an authoritative provider connection.");
</script>

<template>
  <AppShell>
    <PageHeader title="Meeting Assistant" description="Meeting content is unavailable until an approved source is connected" />
    <div class="grid gap-4 lg:grid-cols-2">
      <Panel title="Meeting source required"><div class="p-8 text-center"><FileText class="mx-auto size-10 text-content-brand"/><h2 class="mt-4 text-lg font-semibold text-content">No meeting transcript or calendar provider is connected</h2><p class="mt-2 text-sm text-content-secondary">ZavSync will not invent agendas, minutes, attendees or action items without authoritative source data.</p></div></Panel>
      <Panel title="Safety boundary"><div class="flex gap-2 p-5 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>This screen cannot send notifications, create tasks, deliver outreach, or change calendars.</div></Panel>
    </div>
  </AppShell>
</template>
