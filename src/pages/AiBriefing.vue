<script setup lang="ts">
import { ref } from "vue";
import { RefreshCw, Sparkles } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Management Briefing", "Permission-filtered intelligence from authoritative operational signals.");
const company = useCompanyStore();
const period = ref("TODAY");
const withAi = ref(false);
const state = useAsyncData(() => aiRepository.briefing(company.activeCompanyId, period.value, withAi.value), { watch: [() => company.activeCompanyId] });
async function load(next?: string) { if (next) period.value = next; await state.refresh(); }
</script>

<template>
  <AppShell>
    <PageHeader title="Management Briefing" description="A permission-filtered briefing generated from current authoritative signals">
      <template #actions><ZButton variant="outline" @click="load()"><RefreshCw class="size-4"/>Refresh</ZButton></template>
    </PageHeader>
    <div class="mb-4 flex flex-wrap items-center gap-2"><ZButton v-for="option in ['TODAY','THIS_WEEK','THIS_MONTH']" :key="option" :variant="period===option?'primary':'outline'" @click="load(option)">{{option.replaceAll('_',' ')}}</ZButton><label class="ml-auto flex items-center gap-2 text-xs text-content-secondary"><input v-model="withAi" type="checkbox" @change="load()"/>Add configured AI explanation</label></div>
    <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="false" @retry="state.refresh">
      <Panel v-if="state.data.value?.narrative" class="mb-4" title="AI explanation" description="Generated only from the structured signal data shown below."><div class="flex gap-3 p-5 text-sm leading-6 text-content-secondary"><Sparkles class="mt-1 size-4 shrink-0 text-content-brand"/>{{state.data.value.narrative}}</div></Panel>
      <div class="mb-4 flex items-center gap-2"><StatusBadge :status="state.data.value?.status ?? 'DETERMINISTIC'"/><span class="text-2xs text-content-muted">{{state.data.value?.structured_data.from}}–{{state.data.value?.structured_data.to}} · AUTHORITATIVE SIGNALS</span></div>
      <div class="grid gap-4 xl:grid-cols-2"><Panel v-for="section in state.data.value?.structured_data.sections ?? []" :key="section.category" :title="section.category" :description="`${section.count} current item${section.count===1?'':'s'}`"><div class="divide-y divide-line"><div v-for="signal in section.signals" :key="signal.id" class="p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-medium text-content">{{signal.title}}</p><p class="mt-1 text-xs leading-5 text-content-secondary">{{signal.description}}</p></div><StatusBadge :status="signal.severity"/></div><p class="num mt-2 text-2xs text-content-muted">Priority score {{signal.priority_score}}</p></div></div></Panel></div>
      <Panel v-if="!(state.data.value?.structured_data.sections.length)" title="No current priorities"><p class="p-6 text-sm text-content-secondary">No authorized signals fall within this briefing period. No AI content was fabricated.</p></Panel>
    </AsyncSection>
  </AppShell>
</template>
