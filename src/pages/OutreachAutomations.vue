<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable from "@/components/zs/DataTable.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useMutation } from "@/composables/useAsyncData";
import { useOutreachData } from "@/composables/useOutreachData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { outreachRepository } from "@/services/outreach/repository";
import type { OutreachSequence, SequenceStatus } from "@/types/outreach";

setPageMeta("Outreach Automations", "Manage sequence enrollment and lifecycle state.");

const outreach = useOutreachData();
const router = useRouter();
const rows = computed(() => outreach.sequences.data.value ?? []);
const columns = [
  { key: "name", header: "Sequence" },
  { key: "sender", header: "Sender" },
  { key: "enrollments", header: "Enrollments", align: "right" as const },
  { key: "messages", header: "Messages", align: "right" as const },
  { key: "status", header: "Status" },
  { key: "actions", header: "", align: "right" as const },
];

const transitionMutation = useMutation((sequence: OutreachSequence, status: SequenceStatus) =>
  outreachRepository.transitionSequence(outreach.activeCompanyId.value, sequence.id, status),
);

function nextAction(sequence: OutreachSequence): { label: string; status: SequenceStatus } | null {
  if (sequence.status === "DRAFT") return { label: "Activate", status: "ACTIVE" };
  if (sequence.status === "ACTIVE") return { label: "Pause", status: "PAUSED" };
  if (sequence.status === "PAUSED") return { label: "Resume", status: "ACTIVE" };
  return null;
}

async function transition(sequence: OutreachSequence) {
  const action = nextAction(sequence);
  if (!action) return;
  const saved = await transitionMutation.run(sequence, action.status);
  if (!saved) return;
  await outreach.sequences.refresh();
  showToast("Sequence updated", `${saved.name} is now ${saved.status.toLowerCase()}.`, "success");
}
</script>

<template>
  <AppShell>
    <PageHeader title="Outreach Automations" description="Create, activate, pause and monitor real outreach sequences">
      <template #actions><ZButton @click="router.push('/outreach/compose')">New sequence</ZButton></template>
    </PageHeader>
    <Panel>
      <ValidationMessage class="m-4" :message="transitionMutation.error.value?.message" />
      <AsyncSection
        :loading="outreach.sequences.loading.value"
        :error="outreach.sequences.error.value"
        :empty="outreach.sequences.isEmpty.value"
        empty-title="No sequences yet"
        empty-message="Create a draft sequence, review it, then activate it when the sender is verified."
        @retry="outreach.sequences.refresh"
      >
        <template #empty-action><ZButton @click="router.push('/outreach/compose')">Create sequence</ZButton></template>
        <DataTable :columns="columns" :rows="rows" :min-width="920">
          <template #name="{ row }"><button class="font-medium text-primary hover:underline" @click="router.push(`/outreach/automations/${row.id}`)">{{ row.name }}</button></template>
          <template #sender="{ row }"><span class="text-xs">{{ row.sending_identity?.from_email ?? "—" }}</span></template>
          <template #enrollments="{ row }"><span class="num">{{ row.enrollments_count ?? 0 }}</span></template>
          <template #messages="{ row }"><span class="num">{{ row.messages_count ?? 0 }}</span></template>
          <template #status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #actions="{ row }">
            <div class="flex justify-end gap-1">
              <ZButton variant="ghost" @click="router.push(`/outreach/automations/${row.id}`)">View</ZButton>
              <ZButton v-if="nextAction(row)" variant="ghost" :disabled="transitionMutation.saving.value" @click="transition(row)">{{ nextAction(row)?.label }}</ZButton>
            </div>
          </template>
        </DataTable>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
