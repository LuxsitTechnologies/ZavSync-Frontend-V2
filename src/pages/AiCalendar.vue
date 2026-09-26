<script setup lang="ts">
import { CalendarClock, ShieldCheck } from "lucide-vue-next";

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
const capability = useAsyncData(() => aiRepository.calendarCapability(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const events = useAsyncData(() => aiRepository.calendarEvents(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
</script>

<template>
  <AppShell>
    <PageHeader title="Smart Agenda" description="Calendar data is displayed only when an approved provider is genuinely connected"/>
    <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <Panel title="Calendar events"><AsyncSection :loading="events.loading.value" :error="events.error.value" :empty="!(events.data.value?.data.length)" empty-title="No synchronized calendar events" :empty-message="capability.data.value?.message ?? 'No authoritative calendar source is connected.'" @retry="events.refresh"><div class="divide-y divide-line"><div v-for="event in events.data.value?.data ?? []" :key="String(event.id)" class="p-4"><p class="text-sm font-medium text-content">{{String(event.title)}}</p><p class="mt-1 text-xs text-content-secondary">{{new Date(String(event.starts_at)).toLocaleString()}}–{{new Date(String(event.ends_at)).toLocaleString()}}</p></div></div></AsyncSection></Panel>
      <div class="space-y-4"><Panel title="Provider capability"><div class="p-4"><div class="flex items-center gap-2"><CalendarClock class="size-4 text-content-brand"/><StatusBadge :status="capability.data.value?.status ?? 'NOT_CONFIGURED'"/></div><p class="mt-3 text-xs leading-5 text-content-secondary">{{capability.data.value?.message ?? 'Checking provider capability…'}}</p><p class="mt-2 text-2xs text-content-muted">Provider: {{capability.data.value?.provider ?? 'None'}}</p></div></Panel><Panel title="Safety boundary"><div class="flex gap-2 p-4 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>ZavSync does not fabricate events or claim synchronization when OAuth/provider infrastructure is absent.</div></Panel></div>
    </div>
  </AppShell>
</template>
