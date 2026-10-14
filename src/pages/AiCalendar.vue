<script setup lang="ts">
import { CalendarClock } from "lucide-vue-next";

import InternalCalendar from "@/components/ai/InternalCalendar.vue";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Smart Agenda", "Provider-neutral calendar capability and synchronized events.");
const company = useCompanyStore();
const capability = useAsyncData(() => aiRepository.calendarCapability(company.activeCompanyId), { watch: [() => company.contextVersion] });
const events = useAsyncData(() => aiRepository.calendarEvents(company.activeCompanyId), { watch: [() => company.contextVersion] });
</script>

<template>
  <AppShell>
    <PageHeader title="Smart Agenda" description="Organize private internal events and inspect separately synchronized provider events."/>
    <div class="mb-4"><InternalCalendar title="My Internal Calendar" /></div>
    <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <Panel title="Connected Calendar Events"><AsyncSection :loading="events.loading.value" :error="events.error.value" :empty="!(events.data.value?.data.length)" empty-title="No connected calendar events" empty-message="Calendar integration not connected. Internal ZavSync events are still available." @retry="events.refresh"><div class="divide-y divide-line"><div v-for="event in events.data.value?.data ?? []" :key="String(event.id)" class="p-4"><p class="text-sm font-medium text-content">{{String(event.title)}}</p><p class="mt-1 text-xs text-content-secondary">{{new Date(String(event.starts_at)).toLocaleString()}}–{{new Date(String(event.ends_at)).toLocaleString()}}</p></div></div></AsyncSection></Panel>
      <Panel title="Calendar integration"><div class="p-4"><div class="flex items-center gap-2"><CalendarClock class="size-4 text-content-brand"/><StatusBadge :status="capability.data.value?.status ?? 'NOT_CONFIGURED'" :label="capability.data.value?.status === 'AVAILABLE' ? 'Connected' : 'Not connected'"/></div><p class="mt-3 text-sm text-content-secondary">{{ capability.data.value?.status === 'AVAILABLE' ? 'Connected calendar events appear here.' : 'Internal ZavSync events are still available.' }}</p></div></Panel>
    </div>
  </AppShell>
</template>
