<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Check, ExternalLink, RefreshCw, Sparkles, X } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";
import type { OperationalPrioritySignal } from "@/types/ai";

setPageMeta("AI Priority Workspace", "Deterministic operational priorities derived from authorized business data.");

const company = useCompanyStore();
const filters = reactive({ status: "OPEN", severity: "", source_module: "" });
const selected = ref<OperationalPrioritySignal | null>(null);
const action = ref<"ACKNOWLEDGE" | "RESOLVE" | "DISMISS" | null>(null);
const state = useAsyncData(() => aiRepository.priorities(company.activeCompanyId, Object.fromEntries(Object.entries(filters).filter(([, value]) => value))), { watch: [() => company.activeCompanyId], isEmpty: value => value.signals.data.length === 0 });
const rows = computed(() => state.data.value?.signals.data ?? []);
const transition = useMutation(() => aiRepository.updatePriority(company.activeCompanyId, selected.value!.id, { action: action.value }));
const refresh = useMutation(() => aiRepository.refreshIntelligence(company.activeCompanyId, crypto.randomUUID()));

async function applyFilters() { await state.refresh(); }
async function refreshSignals() {
  if (!await refresh.run()) return;
  showToast("Intelligence refresh queued", "The company-scoped job will update signals, anomalies and forecasts.", "success");
}
async function confirmTransition() {
  if (!selected.value || !action.value || !await transition.run()) return;
  showToast("Priority updated", `${selected.value.title} is now ${action.value.toLowerCase()}.`, "success");
  selected.value = null;
  action.value = null;
  await state.refresh();
}
function decide(signal: OperationalPrioritySignal, next: typeof action.value) { selected.value = signal; action.value = next; }
const scoreParts = (signal: OperationalPrioritySignal) => Object.entries(signal.score_breakdown ?? {});
</script>

<template>
  <AppShell>
    <PageHeader title="AI Priority Workspace" description="Explainable priorities from authoritative company data; no action is executed automatically">
      <template #actions><ZButton v-if="company.hasPermission('intelligence.manage')" variant="outline" :disabled="refresh.saving.value" @click="refreshSignals"><RefreshCw class="size-4"/>Refresh intelligence</ZButton></template>
    </PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Open" :value="String(rows.filter(row=>row.status==='OPEN').length)" tone="warning" />
      <StatCard label="Critical" :value="String(rows.filter(row=>row.severity==='CRITICAL').length)" tone="danger" />
      <StatCard label="Assigned" :value="String(rows.filter(row=>row.assigned_user_id).length)" tone="brand" />
    </div>
    <Panel class="mb-4" title="Filters">
      <form class="grid gap-3 p-4 sm:grid-cols-4" @submit.prevent="applyFilters">
        <label><span class="label-caps">Status</span><select v-model="filters.status" class="field mt-1.5 w-full"><option value="">All</option><option>OPEN</option><option>ACKNOWLEDGED</option><option>RESOLVED</option><option>DISMISSED</option></select></label>
        <label><span class="label-caps">Severity</span><select v-model="filters.severity" class="field mt-1.5 w-full"><option value="">All</option><option>CRITICAL</option><option>HIGH</option><option>WARNING</option><option>INFO</option></select></label>
        <label><span class="label-caps">Module</span><select v-model="filters.source_module" class="field mt-1.5 w-full"><option value="">All authorized</option><option v-for="module in ['accounting','receivables','payables','banking','inventory','payroll','crm','outreach','platform','ai']" :key="module">{{module}}</option></select></label>
        <div class="self-end"><ZButton type="submit" variant="outline">Apply filters</ZButton></div>
      </form>
    </Panel>
    <ValidationMessage :message="transition.error.value?.message ?? refresh.error.value?.message" />
    <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No operational priorities" empty-message="No authorized signals match the current filters." @retry="state.refresh">
      <div class="grid gap-3 xl:grid-cols-2">
        <Panel v-for="signal in rows" :key="signal.id">
          <div class="p-4">
            <div class="flex items-start justify-between gap-3"><div><p class="label-caps">{{signal.source_module}} · score {{signal.priority_score}}</p><h2 class="mt-1 text-sm font-semibold text-content">{{signal.title}}</h2></div><StatusBadge :status="signal.severity"/></div>
            <p class="mt-2 text-xs leading-5 text-content-secondary">{{signal.description}}</p>
            <div class="mt-3 grid grid-cols-2 gap-2 rounded-md bg-surface-sunken p-3 text-2xs text-content-secondary">
              <div v-for="[name,value] in scoreParts(signal)" :key="name" class="flex justify-between gap-2"><span>{{name.replaceAll('_',' ')}}</span><span class="num font-medium text-content">{{value}}</span></div>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2"><StatusBadge :status="signal.status"/><span v-if="signal.due_at" class="text-2xs text-content-muted">Due {{new Date(signal.due_at).toLocaleDateString()}}</span><span v-if="signal.assigned_user" class="text-2xs text-content-muted">Assigned to {{signal.assigned_user.name}}</span></div>
            <div class="mt-4 flex flex-wrap gap-2">
              <ZButton v-if="signal.status==='OPEN'&&company.hasPermission('intelligence.manage')" @click="decide(signal,'ACKNOWLEDGE')"><Check class="size-4"/>Acknowledge</ZButton>
              <ZButton v-if="['OPEN','ACKNOWLEDGED'].includes(signal.status)&&company.hasPermission('intelligence.manage')" variant="outline" @click="decide(signal,'RESOLVE')">Resolve</ZButton>
              <ZButton v-if="['OPEN','ACKNOWLEDGED'].includes(signal.status)&&company.hasPermission('intelligence.manage')" variant="ghost" @click="decide(signal,'DISMISS')"><X class="size-4"/>Dismiss</ZButton>
              <RouterLink :to="{path:'/knowledge/chat',query:{context:`Priority: ${signal.title}`}}"><ZButton variant="outline"><Sparkles class="size-4"/>Ask Copilot</ZButton></RouterLink>
              <RouterLink :to="{path:'/knowledge/chat',query:{context:`Prepare a draft action proposal for priority ${signal.id}: ${signal.title}`}}"><ZButton variant="outline">Prepare action</ZButton></RouterLink>
              <RouterLink v-if="signal.related_url" :to="signal.related_url"><ZButton variant="ghost"><ExternalLink class="size-4"/>Related record</ZButton></RouterLink>
            </div>
          </div>
        </Panel>
      </div>
    </AsyncSection>
    <ConfirmDialog :open="!!action" title="Update priority?" message="This records a reviewed lifecycle event. It does not mutate the source business record." :confirm-label="action?.toLowerCase() ?? 'Confirm'" :tone="action==='DISMISS'?'danger':'brand'" @cancel="selected=null;action=null" @confirm="confirmTransition" />
  </AppShell>
</template>
