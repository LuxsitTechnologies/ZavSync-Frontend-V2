<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable from "@/components/zs/DataTable.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useMutation } from "@/composables/useAsyncData";
import { useOutreachData } from "@/composables/useOutreachData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { outreachRepository } from "@/services/outreach/repository";
import type { OutreachMessage, OutreachSuppression } from "@/types/outreach";

setPageMeta("Outreach Dashboard", "Delivery, engagement and compliance activity from the Stage 11 service.");

const outreach = useOutreachData();
const selected = ref<OutreachMessage | null>(null);
const suppressionOpen = ref(false);
const suppression = reactive({ email: "", reason: "MANUAL", details: "" });
const messages = computed(() => outreach.messages.data.value ?? []);
const stats = computed(() => outreach.report.data.value);
const messageColumns = [
  { key: "scheduled_at", header: "Scheduled" },
  { key: "subject", header: "Subject" },
  { key: "sequence", header: "Sequence" },
  { key: "recipient", header: "Recipient" },
  { key: "state", header: "State" },
  { key: "attempts", header: "Attempts", align: "right" as const },
  { key: "actions", header: "", align: "right" as const },
];
const suppressionColumns = [
  { key: "email", header: "Email" },
  { key: "reason", header: "Reason" },
  { key: "source", header: "Source" },
  { key: "suppressed_at", header: "Suppressed" },
  { key: "actions", header: "", align: "right" as const },
];

const retryMutation = useMutation((message: OutreachMessage) => outreachRepository.retryMessage(outreach.activeCompanyId.value, message.id));
const suppressionMutation = useMutation(() => outreachRepository.createSuppression(outreach.activeCompanyId.value, { email: suppression.email, reason: suppression.reason, details: suppression.details || null }));
const removeMutation = useMutation((row: OutreachSuppression) => outreachRepository.removeSuppression(outreach.activeCompanyId.value, row.id));
const rate = (basisPoints?: number) => `${((basisPoints ?? 0) / 100).toFixed(2)}%`;

async function openMessage(message: OutreachMessage) {
  selected.value = await outreachRepository.message(outreach.activeCompanyId.value, message.id);
}

async function retry(message: OutreachMessage) {
  const saved = await retryMutation.run(message);
  if (!saved) return;
  await Promise.all([outreach.messages.refresh(), outreach.report.refresh()]);
  showToast("Message queued", saved.subject, "success");
}

async function createSuppression() {
  const saved = await suppressionMutation.run();
  if (!saved) return;
  suppressionOpen.value = false;
  Object.assign(suppression, { email: "", reason: "MANUAL", details: "" });
  await outreach.suppressions.refresh();
  showToast("Address suppressed", saved.email, "success");
}

async function removeSuppression(row: OutreachSuppression) {
  const saved = await removeMutation.run(row);
  if (!saved) return;
  await outreach.suppressions.refresh();
  showToast("Suppression removed", saved.email, "success");
}
</script>

<template>
  <AppShell>
    <PageHeader title="Outreach Dashboard" description="Authoritative delivery, engagement, reply and suppression records">
      <template #actions><ZButton variant="outline" @click="suppressionOpen=true">Suppress address</ZButton></template>
    </PageHeader>
    <AsyncSection :loading="outreach.report.loading.value" :error="outreach.report.error.value" @retry="outreach.report.refresh">
      <div class="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Sent" :value="String(stats?.sent ?? 0)" />
        <StatCard label="Delivered" :value="String(stats?.delivered ?? 0)" tone="success" />
        <StatCard label="Opened" :value="String(stats?.opens ?? 0)" tone="brand" />
        <StatCard label="Replied" :value="String(stats?.replies ?? 0)" tone="warning" />
        <StatCard label="Reply rate" :value="rate(stats?.reply_rate_bps)" />
      </div>
      <div class="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Delivery rate" :value="rate(stats?.delivery_rate_bps)" />
        <StatCard label="Open rate" :value="rate(stats?.open_rate_bps)" />
        <StatCard label="Click rate" :value="rate(stats?.click_rate_bps)" />
        <StatCard label="Bounces / complaints" :value="`${stats?.bounced ?? 0} / ${stats?.complaints ?? 0}`" />
      </div>
    </AsyncSection>
    <Panel title="Message history">
      <ValidationMessage class="m-4" :message="retryMutation.error.value?.message" />
      <AsyncSection :loading="outreach.messages.loading.value" :error="outreach.messages.error.value" :empty="outreach.messages.isEmpty.value" empty-title="No outreach messages" empty-message="Messages appear after recipients are enrolled in an active sequence." @retry="outreach.messages.refresh">
        <DataTable :columns="messageColumns" :rows="messages" :min-width="1100">
          <template #scheduled_at="{ row }"><span class="text-xs">{{ new Date(row.scheduled_at).toLocaleString() }}</span></template>
          <template #subject="{ row }"><button class="font-medium text-primary hover:underline" @click="openMessage(row)">{{ row.subject }}</button></template>
          <template #sequence="{ row }"><span>{{ row.sequence_name ?? "—" }}</span></template>
          <template #recipient="{ row }"><div><p>{{ row.to_name }}</p><p class="text-2xs text-content-muted">{{ row.to_email }}</p></div></template>
          <template #state="{ row }"><StatusBadge :status="row.state" /></template>
          <template #attempts="{ row }"><span class="num">{{ row.attempts_count ?? 0 }}</span></template>
          <template #actions="{ row }"><ZButton v-if="row.state === 'FAILED'" variant="ghost" @click="retry(row)">Retry</ZButton></template>
        </DataTable>
      </AsyncSection>
    </Panel>
    <Panel class="mt-3" title="Suppression list" description="Suppressed recipients are rechecked before enrollment and immediately before send.">
      <ValidationMessage class="m-4" :message="removeMutation.error.value?.message" />
      <AsyncSection :loading="outreach.suppressions.loading.value" :error="outreach.suppressions.error.value" :empty="outreach.suppressions.isEmpty.value" empty-title="No suppressed addresses" empty-message="Unsubscribes, complaints and hard bounces will be recorded here automatically." @retry="outreach.suppressions.refresh">
        <template #empty-action><ZButton variant="outline" @click="suppressionOpen=true">Add suppression</ZButton></template>
        <DataTable :columns="suppressionColumns" :rows="outreach.suppressions.data.value ?? []" :min-width="900">
          <template #email="{ row }"><span class="font-medium text-content">{{ row.email }}</span></template>
          <template #reason="{ row }"><StatusBadge :status="row.reason" /></template>
          <template #source="{ row }"><span>{{ row.source }}</span></template>
          <template #suppressed_at="{ row }"><span class="text-xs">{{ new Date(row.suppressed_at).toLocaleString() }}</span></template>
          <template #actions="{ row }"><ZButton variant="ghost" @click="removeSuppression(row)">Remove</ZButton></template>
        </DataTable>
      </AsyncSection>
    </Panel>
    <SidePanel :open="!!selected" title="Email content" :description="selected?.subject" width="lg" @close="selected=null">
      <template v-if="selected">
        <div class="flex items-center justify-between"><StatusBadge :status="selected.state" /><span class="text-2xs text-content-muted">{{ selected.from_email }} → {{ selected.to_email }}</span></div>
        <pre class="mt-5 whitespace-pre-wrap font-sans text-sm leading-6 text-content-secondary">{{ selected.body_text }}</pre>
        <div class="mt-5 border-t border-line pt-4"><p class="label-caps">Event timeline</p><ol class="mt-3 space-y-3"><li v-for="event in selected.events ?? []" :key="event.id" class="flex items-center justify-between text-xs"><StatusBadge :status="event.type" /><span class="text-content-muted">{{ new Date(event.occurred_at).toLocaleString() }}</span></li><li v-if="!selected.events?.length" class="text-xs text-content-muted">No provider or engagement events recorded yet.</li></ol></div>
        <p v-if="selected.failure_message" class="mt-4 rounded-md bg-danger/10 p-3 text-xs text-danger">{{ selected.failure_message }}</p>
      </template>
    </SidePanel>
    <SidePanel :open="suppressionOpen" title="Suppress address" description="Prevents future enrollment and delivery for this company." @close="suppressionOpen=false">
      <form class="space-y-4" @submit.prevent="createSuppression"><Field v-model="suppression.email" label="Email" type="email" required /><label><span class="label-caps">Reason</span><select v-model="suppression.reason" class="field mt-1.5"><option value="MANUAL">Manual</option><option value="UNSUBSCRIBE">Unsubscribed</option><option value="HARD_BOUNCE">Hard bounce</option><option value="INVALID">Invalid address</option><option value="COMPLAINT">Complaint</option></select></label><label><span class="label-caps">Details</span><textarea v-model="suppression.details" class="field mt-1.5 min-h-24" /></label><ValidationMessage :message="suppressionMutation.error.value?.message" /><ZButton type="submit" :disabled="suppressionMutation.saving.value">Suppress address</ZButton></form>
    </SidePanel>
  </AppShell>
</template>
