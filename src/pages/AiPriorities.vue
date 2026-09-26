<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, Clock3, Play, X } from "lucide-vue-next";

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
import type { AiActionProposal } from "@/types/ai";

setPageMeta("AI Action Review", "Review, approve, reject and separately execute Copilot proposals.");

type Decision = "approve" | "reject" | "execute";
const company = useCompanyStore();
const state = useAsyncData(() => aiRepository.actionProposals(company.activeCompanyId), { watch: [() => company.activeCompanyId], isEmpty: (value) => value.data.length === 0 });
const target = ref<{ proposal: AiActionProposal; decision: Decision } | null>(null);
const rows = computed(() => state.data.value?.data ?? []);
const mutation = useMutation(async ({ proposal, decision }: NonNullable<typeof target.value>) => {
  if (decision === "approve") return aiRepository.approveAction(company.activeCompanyId, proposal.id);
  if (decision === "reject") return aiRepository.rejectAction(company.activeCompanyId, proposal.id, "Rejected by reviewer");
  return aiRepository.executeAction(company.activeCompanyId, proposal.id, crypto.randomUUID());
});

async function decide() {
  if (!target.value) return;
  const decision = target.value.decision;
  if (!await mutation.run(target.value)) return;
  target.value = null;
  await state.refresh();
  showToast(decision === "approve" ? "Proposal approved" : decision === "reject" ? "Proposal rejected" : "Approved action executed", decision === "approve" ? "Execution still requires a separate explicit step." : "The backend recorded the final result.", "success");
}
</script>

<template>
  <AppShell>
    <PageHeader title="AI Action Review" description="Information, proposed actions and executed results remain visibly separate" />
    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Needs review" :value="String(rows.filter(row=>row.status==='PENDING').length)" tone="warning" />
      <StatCard label="Approved, not executed" :value="String(rows.filter(row=>row.status==='APPROVED').length)" tone="brand" />
      <StatCard label="Executed" :value="String(rows.filter(row=>row.status==='EXECUTED').length)" tone="success" />
    </div>
    <ValidationMessage :message="mutation.error.value?.message" />
    <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No AI action proposals" empty-message="Proposals created in Copilot will appear here for explicit review." @retry="state.refresh">
      <div class="grid gap-3 lg:grid-cols-2">
        <Panel v-for="proposal in rows" :key="proposal.id">
          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div><p class="label-caps">{{proposal.status==='EXECUTED'?'Executed action':proposal.status==='PENDING'?'Proposed action':'Reviewed action'}}</p><p class="mt-1 text-sm font-semibold text-content">{{proposal.action_type.replaceAll('_',' ')}}</p><p class="mt-1 text-xs leading-5 text-content-secondary">{{String(proposal.impact_preview.summary ?? 'Review the exact payload and expected effect.') }}</p></div>
              <StatusBadge :status="proposal.status" />
            </div>
            <div class="mt-3 flex items-center gap-2 text-2xs text-content-muted"><Clock3 class="size-3"/>Expires {{new Date(proposal.expires_at).toLocaleString()}}</div>
            <pre class="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-2xs text-content-secondary">{{JSON.stringify(proposal.payload,null,2)}}</pre>
            <div v-if="proposal.status==='PENDING'" class="mt-4 flex gap-2"><ZButton @click="target={proposal,decision:'approve'}"><Check class="size-4"/>Approve</ZButton><ZButton variant="outline" @click="target={proposal,decision:'reject'}"><X class="size-4"/>Reject</ZButton></div>
            <ZButton v-else-if="proposal.status==='APPROVED'" class="mt-4" @click="target={proposal,decision:'execute'}"><Play class="size-4"/>Execute through domain service</ZButton>
            <div v-if="proposal.execution" class="mt-4 rounded-md p-3" :class="proposal.execution.status==='COMPLETED'?'bg-success-subtle':'bg-danger-subtle'"><div class="flex items-center justify-between"><p class="label-caps">Execution result</p><StatusBadge :status="proposal.execution.status"/></div><p class="mt-2 text-xs text-content-secondary">{{proposal.execution.result_summary ?? proposal.execution.error_message ?? 'The backend recorded the execution outcome.'}}</p><p v-if="proposal.execution.result_id" class="num mt-1 text-2xs text-content-muted">Result {{proposal.execution.result_id}}</p></div>
            <p v-if="proposal.status==='REJECTED'" class="mt-3 text-xs text-danger">Rejected: {{proposal.rejection_reason ?? 'No reason supplied.'}}</p>
          </div>
        </Panel>
      </div>
    </AsyncSection>
    <ConfirmDialog :open="!!target" :title="target?.decision==='execute'?'Execute approved action?':target?.decision==='approve'?'Approve proposal?':'Reject proposal?'" :message="target?.decision==='approve'?'This records approval only. It does not execute the action.':target?.decision==='execute'?'Company, permission, entitlement, expiry and payload integrity will be rechecked before an existing domain service is called.':'No business records will be changed.'" :confirm-label="target?.decision==='execute'?'Execute':target?.decision==='approve'?'Approve':'Reject'" :tone="target?.decision==='reject'?'danger':'brand'" @cancel="target=null" @confirm="decide" />
  </AppShell>
</template>
