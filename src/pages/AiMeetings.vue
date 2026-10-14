<script setup lang="ts">
import { ref, watch } from "vue";
import { FileText } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import InternalCalendar from "@/components/ai/InternalCalendar.vue";
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
const events = useAsyncData(() => aiRepository.calendarEvents(company.activeCompanyId), { watch: [() => company.contextVersion] });
const context = ref<Record<string, unknown> | null>(null);
watch(() => company.contextVersion, () => { context.value = null; }, { flush: "sync" });
const prepare = useMutation(async (id: string) => {
  const companyId = company.activeCompanyId, version = company.contextVersion;
  const value = await aiRepository.meetingContext(companyId, id);
  if (!company.switching && company.activeCompanyId === companyId && company.contextVersion === version) context.value = value;
  return value;
});
</script>

<template>
  <AppShell>
    <PageHeader title="Meeting Assistant" description="Prepare for upcoming meetings with the information available to you."/>
    <div class="mb-4"><InternalCalendar title="My Internal Meetings" /></div>
    <ValidationMessage :message="prepare.error.value?.message"/>
    <div class="grid gap-4 xl:grid-cols-[22rem_1fr]">
      <Panel title="Meeting preparation"><div v-if="context" class="p-4"><pre class="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-4 text-xs text-content-secondary">{{JSON.stringify(context,null,2)}}</pre></div><div v-else class="p-8 text-center"><FileText class="mx-auto size-10 text-content-brand"/><h2 class="mt-4 text-lg font-semibold text-content">Select a connected event</h2><p class="mt-2 text-sm text-content-secondary">Your meeting notes will appear here.</p></div></Panel>
    </div>
  </AppShell>
</template>
