<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ActivityTimeline from "@/components/crm/ActivityTimeline.vue";
import ScoreBadge from "@/components/crm/ScoreBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useCrmData } from "@/composables/useCrmData";
import { formatMoneyCompact } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("CRM Overview", "Sales pipeline, activity and tasks in one workspace.");
const router = useRouter();
const data = useCrmData();
const dashboard = computed(() => data.dashboard.data.value);
const leads = computed(() => data.leads.data.value ?? []);
const activities = computed(() => data.activities.data.value ?? []);
const tasks = computed(() => data.tasks.data.value ?? []);
function formatBasisPoints(value: number) {
  const digits = String(Math.max(0, Math.trunc(value))).padStart(3, "0");
  return `${digits.slice(0, -2)}.${digits.slice(-2)}%`;
}
</script>

<template>
  <AppShell>
    <PageHeader title="CRM Overview" description="Lead capture, qualification, conversion and sales activity">
      <template #actions><ZButton @click="router.push('/crm/capture')">Capture leads</ZButton><ZButton variant="outline" @click="router.push('/crm/deals')">View deals</ZButton></template>
    </PageHeader>
    <AsyncSection :loading="data.dashboard.loading.value" :error="data.dashboard.error.value" @retry="data.dashboard.refresh">
      <template v-if="dashboard">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open leads" :value="String(dashboard.openLeads)" tone="brand"/>
          <StatCard label="Lead conversion" :value="formatBasisPoints(dashboard.leadConversionBasisPoints)"/>
          <StatCard label="Open deals" :value="String(dashboard.openDeals)" tone="success"/>
          <StatCard label="Pipeline value" :value="formatMoneyCompact(dashboard.pipelineValue)" tone="warning"/>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Qualified leads" :value="String(dashboard.qualifiedLeads)"/>
          <StatCard label="Weighted pipeline" :value="formatMoneyCompact(dashboard.weightedPipelineValue)"/>
          <StatCard label="Won value" :value="formatMoneyCompact(dashboard.wonDealValue)" tone="success"/>
          <StatCard label="Overdue activities" :value="String(dashboard.overdueActivities)" tone="warning"/>
        </div>
        <div class="mt-3 grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
          <Panel title="Pipeline overview" description="Current opportunity distribution"><div class="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4"><button v-for="stage in dashboard.dealsByStage" :key="stage.stageId" class="bg-surface p-4 text-left hover:bg-surface-hover" @click="router.push('/crm/pipeline')"><p class="label-caps">{{stage.stage}}</p><p class="num mt-2 text-xl font-semibold text-content">{{stage.deals}}</p><p class="mt-1 text-2xs text-content-muted">{{formatMoneyCompact(stage.value)}}</p></button></div></Panel>
          <Panel title="Tasks due" description="Follow-ups requiring attention"><ul class="divide-y divide-line px-4"><li v-for="task in tasks.filter((item)=>item.status==='PENDING').slice(0,5)" :key="task.id" class="flex items-center justify-between gap-3 py-3"><div><p class="text-xs font-medium text-content">{{task.title}}</p><p class="text-2xs text-content-muted">{{task.related?.name||'General'}} · {{task.owner||'Unassigned'}}</p></div><span class="num text-2xs" :class="task.isOverdue?'text-danger':'text-content-muted'">{{task.dueAt?.slice(0,10)||'No due date'}}</span></li></ul></Panel>
        </div>
        <div class="mt-3 grid gap-3 xl:grid-cols-[1.3fr_.7fr]">
          <Panel title="Recent activity" body-class="p-4"><ActivityTimeline :items="activities.slice(0,7)"/></Panel>
          <Panel title="Highest-scoring leads"><ul class="divide-y divide-line px-4"><li v-for="lead in [...leads].sort((a,b)=>b.score.total-a.score.total).slice(0,6)" :key="lead.id" class="flex items-center justify-between gap-3 py-3"><button class="text-left" @click="router.push(`/crm/leads/${lead.id}`)"><p class="text-xs font-medium text-content">{{lead.name}}</p><p class="text-2xs text-content-muted">{{lead.company}}</p></button><ScoreBadge :score="lead.score.total"/></li></ul></Panel>
        </div>
      </template>
    </AsyncSection>
  </AppShell>
</template>
