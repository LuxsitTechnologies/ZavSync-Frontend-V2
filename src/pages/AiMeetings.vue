<script setup lang="ts">
import { ref } from "vue";
import { FileText, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Meeting Assistant", "Permission-aware meeting preparation from synchronized calendar and CRM data.");
const company = useCompanyStore();
const events = useAsyncData(() => aiRepository.calendarEvents(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const context = ref<Record<string, unknown> | null>(null);
const prepare = useMutation(async (id: string) => {
  const value = await aiRepository.meetingContext(company.activeCompanyId, id);
  context.value = value;
  return value;
});
</script>

<template>
  <AppShell>
    <PageHeader title="Meeting Assistant" description="Meeting preparation respects CRM and underlying financial permissions"/>
    <ValidationMessage :message="prepare.error.value?.message"/>
    <div class="grid gap-4 xl:grid-cols-[22rem_1fr]">
      <Panel title="Upcoming synchronized events"><AsyncSection :loading="events.loading.value" :error="events.error.value" :empty="!(events.data.value?.data.length)" empty-title="No authoritative meetings" empty-message="Connect and synchronize an approved calendar provider before meeting context can be prepared." @retry="events.refresh"><div class="divide-y divide-line"><div v-for="event in events.data.value?.data ?? []" :key="String(event.id)" class="p-4"><p class="text-sm font-medium text-content">{{String(event.title)}}</p><p class="mt-1 text-2xs text-content-muted">{{new Date(String(event.starts_at)).toLocaleString()}}</p><ZButton class="mt-3" variant="outline" @click="prepare.run(String(event.id))"><FileText class="size-4"/>Prepare context</ZButton></div></div></AsyncSection></Panel>
      <Panel title="Permission-filtered meeting context"><div v-if="context" class="p-4"><pre class="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-4 text-xs text-content-secondary">{{JSON.stringify(context,null,2)}}</pre></div><div v-else class="p-8 text-center"><FileText class="mx-auto size-10 text-content-brand"/><h2 class="mt-4 text-lg font-semibold text-content">Select a synchronized event</h2><p class="mt-2 text-sm text-content-secondary">Financial context is omitted unless your active-company permissions allow it.</p></div></Panel>
    </div>
    <div class="mt-4 flex gap-2 rounded-md bg-surface-sunken p-4 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>Meeting preparation cannot create tasks, send outreach, change calendars, or expose unauthorized financial data.</div>
  </AppShell>
</template>
