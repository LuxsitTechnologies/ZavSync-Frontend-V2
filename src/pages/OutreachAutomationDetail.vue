<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable from "@/components/zs/DataTable.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import SequenceBuilder from "@/components/crm/SequenceBuilder.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { useCrmData } from "@/composables/useCrmData";
import { useOutreachData } from "@/composables/useOutreachData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { outreachRepository } from "@/services/outreach/repository";
import type { OutreachEnrollment, OutreachSequence, SequenceStatus } from "@/types/outreach";

setPageMeta("Automation Detail", "Review, enroll recipients and control an outreach workflow.");

const route = useRoute();
const outreach = useOutreachData();
const crm = useCrmData();
const sequenceId = computed(() => String(route.params.id));
const sequence = useAsyncData(() => outreachRepository.sequence(outreach.activeCompanyId.value, sequenceId.value), { watch: [outreach.activeCompanyId, sequenceId] });
const enrollments = useAsyncData(() => outreachRepository.enrollments(outreach.activeCompanyId.value, { sequence_id: sequenceId.value }), { watch: [outreach.activeCompanyId, sequenceId], isEmpty: rows => rows.length === 0 });
const enrollmentOpen = ref(false);
const enrollmentResult = ref<string[]>([]);
const enrollmentForm = reactive({ recipient_type: "CONTACT" as "CONTACT" | "LEAD", recipient_id: "" });
const recipients = computed(() => enrollmentForm.recipient_type === "CONTACT" ? (crm.contacts.data.value ?? []) : (crm.leads.data.value ?? []));
const columns = [
  { key: "recipient_name", header: "Recipient" },
  { key: "recipient_type", header: "Type" },
  { key: "progress", header: "Progress", align: "right" as const },
  { key: "next_action_at", header: "Next action" },
  { key: "status", header: "Status" },
  { key: "actions", header: "", align: "right" as const },
];

const transitionMutation = useMutation((status: SequenceStatus) => outreachRepository.transitionSequence(outreach.activeCompanyId.value, sequenceId.value, status));
const enrollMutation = useMutation(() => outreachRepository.enroll(outreach.activeCompanyId.value, sequenceId.value, { recipient_type: enrollmentForm.recipient_type, recipient_ids: [enrollmentForm.recipient_id] }));
const enrollmentMutation = useMutation((row: OutreachEnrollment, status: string) => outreachRepository.transitionEnrollment(outreach.activeCompanyId.value, row.id, status));

function nextAction(item: OutreachSequence): { label: string; status: SequenceStatus } | null {
  if (item.status === "DRAFT") return { label: "Activate", status: "ACTIVE" };
  if (item.status === "ACTIVE") return { label: "Pause", status: "PAUSED" };
  if (item.status === "PAUSED") return { label: "Resume", status: "ACTIVE" };
  return null;
}

async function transition(status: SequenceStatus) {
  const saved = await transitionMutation.run(status);
  if (!saved) return;
  await Promise.all([sequence.refresh(), outreach.sequences.refresh()]);
  showToast("Sequence updated", `Sequence is now ${saved.status.toLowerCase()}.`, "success");
}

async function enroll() {
  enrollmentResult.value = [];
  const result = await enrollMutation.run();
  if (!result) return;
  enrollmentResult.value = result.failures.map(failure => `${failure.recipient_id}: ${failure.message}`);
  await Promise.all([enrollments.refresh(), sequence.refresh()]);
  if (result.enrolled.length) {
    enrollmentOpen.value = false;
    showToast("Recipient enrolled", result.enrolled[0]?.recipient_email ?? "Enrollment created.", "success");
  }
}

async function transitionEnrollment(row: OutreachEnrollment, status: string) {
  const saved = await enrollmentMutation.run(row, status);
  if (!saved) return;
  await enrollments.refresh();
  showToast("Enrollment updated", saved.status, "success");
}
</script>

<template>
  <AppShell>
    <AsyncSection :loading="sequence.loading.value" :error="sequence.error.value" @retry="sequence.refresh">
      <template v-if="sequence.data.value">
        <PageHeader :title="sequence.data.value.name" :description="`${sequence.data.value.enrollments_count ?? 0} enrolled · ${sequence.data.value.messages_count ?? 0} messages`">
          <template #actions>
            <StatusBadge :status="sequence.data.value.status" />
            <ZButton v-if="sequence.data.value.status === 'ACTIVE'" variant="outline" @click="enrollmentOpen=true">Enroll recipient</ZButton>
            <ZButton v-if="nextAction(sequence.data.value)" :disabled="transitionMutation.saving.value" @click="transition(nextAction(sequence.data.value)!.status)">{{ nextAction(sequence.data.value)?.label }}</ZButton>
            <ZButton v-if="['ACTIVE','PAUSED'].includes(sequence.data.value.status)" variant="ghost" @click="transition('COMPLETED')">Complete</ZButton>
          </template>
        </PageHeader>
        <ValidationMessage class="mb-3" :message="transitionMutation.error.value?.message" />
        <div class="grid gap-3 xl:grid-cols-[1fr_320px]">
          <Panel title="Workflow" :description="sequence.data.value.status === 'DRAFT' ? 'Draft steps are editable from the composer until activation.' : 'Activated sequence steps are locked to preserve message history.'" body-class="p-5">
            <SequenceBuilder :model-value="sequence.data.value.steps" :locked="sequence.data.value.status !== 'DRAFT'" />
          </Panel>
          <Panel title="Delivery rules" body-class="space-y-4 p-4">
            <div v-for="[label,value] in [['Sender',sequence.data.value.sending_identity?.from_email ?? '—'],['Timezone',sequence.data.value.timezone],['Window',`${sequence.data.value.send_window_start}–${sequence.data.value.send_window_end}`],['Open tracking',sequence.data.value.track_opens?'Enabled':'Disabled'],['Click tracking',sequence.data.value.track_clicks?'Enabled':'Disabled'],['Stop on reply',sequence.data.value.stop_on_reply?'Enabled':'Disabled']]" :key="String(label)" class="flex items-center justify-between gap-3"><span class="text-xs text-content-muted">{{ label }}</span><strong class="text-right text-xs text-content">{{ value }}</strong></div>
          </Panel>
        </div>
        <Panel class="mt-3" title="Enrollments">
          <AsyncSection :loading="enrollments.loading.value" :error="enrollments.error.value || enrollmentMutation.error.value" :empty="enrollments.isEmpty.value" empty-title="No recipients enrolled" empty-message="Activate this sequence, then enroll an eligible CRM contact or lead." @retry="enrollments.refresh">
            <DataTable :columns="columns" :rows="enrollments.data.value ?? []" :min-width="940">
              <template #recipient_name="{ row }"><div><p class="font-medium text-content">{{ row.recipient_name }}</p><p class="text-2xs text-content-muted">{{ row.recipient_email }}</p></div></template>
              <template #recipient_type="{ row }"><span>{{ row.recipient_type }}</span></template>
              <template #progress="{ row }"><span class="num">Step {{ row.current_step_position }} · {{ row.messages_count ?? 0 }} emails</span></template>
              <template #next_action_at="{ row }"><span class="text-xs">{{ row.next_action_at ? new Date(row.next_action_at).toLocaleString() : "—" }}</span></template>
              <template #status="{ row }"><StatusBadge :status="row.status" /></template>
              <template #actions="{ row }"><div class="flex justify-end gap-1"><ZButton v-if="row.status === 'ACTIVE'" variant="ghost" @click="transitionEnrollment(row,'PAUSED')">Pause</ZButton><ZButton v-if="row.status === 'PAUSED'" variant="ghost" @click="transitionEnrollment(row,'ACTIVE')">Resume</ZButton><ZButton v-if="['ACTIVE','PAUSED'].includes(row.status)" variant="ghost" @click="transitionEnrollment(row,'CANCELLED')">Cancel</ZButton></div></template>
            </DataTable>
          </AsyncSection>
        </Panel>
      </template>
    </AsyncSection>
    <SidePanel :open="enrollmentOpen" title="Enroll CRM recipient" description="Suppression, consent and email validity are rechecked by the backend." @close="enrollmentOpen=false">
      <form class="space-y-4" @submit.prevent="enroll">
        <label><span class="label-caps">Recipient type</span><select v-model="enrollmentForm.recipient_type" class="field mt-1.5" @change="enrollmentForm.recipient_id='' "><option value="CONTACT">Contact</option><option value="LEAD">Lead</option></select></label>
        <label><span class="label-caps">Recipient</span><select v-model="enrollmentForm.recipient_id" class="field mt-1.5" required><option value="">Select recipient</option><option v-for="recipient in recipients" :key="recipient.id" :value="recipient.id">{{ recipient.name }} — {{ recipient.email || 'No email' }}</option></select></label>
        <ValidationMessage :message="enrollMutation.error.value?.message" />
        <ul v-if="enrollmentResult.length" class="space-y-1 text-xs text-danger"><li v-for="failure in enrollmentResult" :key="failure">{{ failure }}</li></ul>
        <ZButton type="submit" :disabled="enrollMutation.saving.value || !enrollmentForm.recipient_id">Enroll recipient</ZButton>
      </form>
    </SidePanel>
  </AppShell>
</template>
