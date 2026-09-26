<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { BookOpen, Check, Plus, Quote, Send, Sparkles, Trash2, Wrench, X } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";
import type { AiActionProposal } from "@/types/ai";

setPageMeta("ZavSync Copilot", "Permission-aware conversations grounded in company knowledge and read-only business tools.");

const route = useRoute();
const router = useRouter();
const company = useCompanyStore();
const draft = ref("");
const scroller = ref<HTMLElement | null>(null);
const pendingReview = ref<{ proposal: AiActionProposal; decision: "approve" | "reject" | "execute" } | null>(null);
const threadId = computed(() => String(route.params.threadId ?? ""));
const prompts = [
  "How much do customers currently owe us?",
  "Which inventory items are below reorder level?",
  "Summarize the month-end close policy.",
];

const conversations = useAsyncData(
  () => aiRepository.conversations(company.activeCompanyId),
  { watch: [() => company.activeCompanyId], isEmpty: (value) => value.data.length === 0 },
);
const active = useAsyncData(
  () => aiRepository.conversation(company.activeCompanyId, threadId.value),
  { watch: [() => company.activeCompanyId, threadId], immediate: threadId.value !== "" },
);
const sendMutation = useMutation((content: string) =>
  aiRepository.sendMessage(company.activeCompanyId, threadId.value, content, crypto.randomUUID()),
);
const reviewMutation = useMutation(async (review: NonNullable<typeof pendingReview.value>) => {
  if (review.decision === "approve") return aiRepository.approveAction(company.activeCompanyId, review.proposal.id);
  if (review.decision === "reject") return aiRepository.rejectAction(company.activeCompanyId, review.proposal.id, "Rejected by reviewer");
  return aiRepository.executeAction(company.activeCompanyId, review.proposal.id, crypto.randomUUID());
});

const messages = computed(() => active.data.value?.messages ?? []);

async function scrollToLatest() {
  await nextTick();
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: "smooth" });
}

async function createConversation() {
  const conversation = await aiRepository.createConversation(company.activeCompanyId);
  await conversations.refresh();
  await router.push(`/knowledge/chat/${conversation.id}`);
}

async function archiveConversation(id: string) {
  await aiRepository.archiveConversation(company.activeCompanyId, id);
  await conversations.refresh();
  const next = conversations.data.value?.data[0];
  if (next) await router.replace(`/knowledge/chat/${next.id}`);
  else await router.replace("/knowledge/chat");
}

async function send() {
  const content = draft.value.trim();
  if (!content || sendMutation.saving.value || !threadId.value) return;
  draft.value = "";
  const message = await sendMutation.run(content);
  if (!message) return;
  await Promise.all([active.refresh(), conversations.refresh()]);
  await scrollToLatest();
}

async function confirmReview() {
  const review = pendingReview.value;
  if (!review) return;
  const result = await reviewMutation.run(review);
  if (!result) return;
  showToast(
    review.decision === "execute" ? "Approved action executed" : review.decision === "approve" ? "Proposal approved" : "Proposal rejected",
    review.decision === "approve" ? "Execution remains a separate explicit step." : "The authoritative backend recorded the result.",
    "success",
  );
  pendingReview.value = null;
  await active.refresh();
}

watch(threadId, async (id) => {
  if (id) await active.refresh();
  await scrollToLatest();
});
</script>

<template>
  <AppShell>
    <PageHeader title="ZavSync Copilot" description="Company-scoped answers with citations, controlled tools and explicit action approval">
      <template #actions><ZButton @click="createConversation"><Plus class="size-4" />New conversation</ZButton></template>
    </PageHeader>
    <div class="grid h-[calc(100vh-9rem)] min-h-[34rem] gap-4 lg:grid-cols-[16rem_1fr]">
      <Panel class="hidden lg:block" body-class="h-full">
        <div class="border-b border-line p-3"><p class="label-caps">Conversations</p></div>
        <ValidationMessage class="px-3" :message="conversations.error.value?.message" />
        <div class="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
          <div v-for="conversation in conversations.data.value?.data ?? []" :key="conversation.id" class="group mb-1 flex items-center rounded-md" :class="conversation.id===threadId?'bg-surface-selected':''">
            <button class="min-w-0 flex-1 px-3 py-2 text-left" @click="router.push(`/knowledge/chat/${conversation.id}`)">
              <p class="truncate text-xs font-medium text-content">{{ conversation.title }}</p>
              <p class="mt-0.5 text-2xs text-content-muted">{{ conversation.messages_count ?? 0 }} messages</p>
            </button>
            <button class="mr-1 grid size-7 place-items-center rounded-md text-content-muted opacity-0 hover:bg-surface-hover group-hover:opacity-100" aria-label="Archive conversation" @click="archiveConversation(conversation.id)"><Trash2 class="size-3.5" /></button>
          </div>
          <p v-if="conversations.isEmpty.value" class="p-3 text-xs text-content-muted">No conversations yet.</p>
        </div>
      </Panel>

      <Panel body-class="flex h-full min-h-0 flex-col">
        <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <ValidationMessage :message="active.error.value?.message" />
          <div v-if="active.loading.value" class="grid h-full place-items-center text-sm text-content-muted">Loading conversation…</div>
          <div v-else-if="!threadId" class="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <span class="grid size-12 place-items-center rounded-md bg-primary-subtle text-primary-subtle-fg"><Sparkles class="size-6" /></span>
            <h2 class="mt-4 text-lg font-semibold text-content">Start a company-scoped conversation</h2>
            <p class="mt-2 text-sm text-content-secondary">Copilot uses only authorized knowledge and allowlisted read-only tools.</p>
            <ZButton class="mt-5" @click="createConversation"><Plus class="size-4" />New conversation</ZButton>
          </div>
          <div v-else-if="!messages.length" class="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <span class="grid size-12 place-items-center rounded-md bg-primary-subtle text-primary-subtle-fg"><BookOpen class="size-6" /></span>
            <h2 class="mt-4 text-lg font-semibold text-content">Ask your company knowledge</h2>
            <p class="mt-2 text-sm text-content-secondary">Questions can use indexed sources and business data available to your role.</p>
            <div class="mt-5 flex flex-wrap justify-center gap-2"><button v-for="prompt in prompts" :key="prompt" class="rounded-md border border-line px-3 py-2 text-xs text-content-secondary hover:bg-surface-hover" @click="draft=prompt">{{ prompt }}</button></div>
          </div>
          <div v-else class="mx-auto max-w-3xl space-y-5">
            <div v-for="message in messages" :key="message.id" :class="message.role==='USER'?'flex justify-end':'block'">
              <div :class="message.role==='USER'?'max-w-[85%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground':'text-sm leading-6 text-content'">
                <p class="whitespace-pre-wrap">{{ message.content }}</p>
                <div v-if="message.tool_runs?.length" class="mt-3 flex flex-wrap gap-2">
                  <span v-for="tool in message.tool_runs" :key="tool.id" class="zs-badge badge-info"><Wrench class="size-3" />{{ tool.tool_name }}</span>
                </div>
                <div v-for="citation in message.citations ?? []" :key="citation.id" class="mt-3 flex items-start gap-2 rounded-md border border-line bg-surface-sunken p-3">
                  <Quote class="mt-0.5 size-3.5 text-content-brand" />
                  <div><p class="text-xs font-medium text-content">[{{ citation.ordinal }}] {{ citation.source?.title ?? "Company source" }}</p><p class="mt-1 text-2xs text-content-muted">{{ citation.excerpt }}</p></div>
                </div>
                <div v-for="proposal in message.action_proposals ?? []" :key="proposal.id" class="mt-4 rounded-md border border-warning bg-warning-subtle p-4">
                  <div class="flex items-start justify-between gap-3"><div><p class="label-caps">Proposed action</p><p class="mt-1 font-semibold text-content">{{ proposal.action_type.replaceAll('_',' ') }}</p></div><StatusBadge :status="proposal.status" /></div>
                  <p class="mt-2 text-xs text-content-secondary">{{ String(proposal.impact_preview.summary ?? "Review the exact payload before approval.") }}</p>
                  <pre class="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-surface p-3 text-2xs text-content-secondary">{{ JSON.stringify(proposal.payload, null, 2) }}</pre>
                  <div v-if="proposal.status==='PENDING'" class="mt-3 flex gap-2"><ZButton @click="pendingReview={proposal,decision:'approve'}"><Check class="size-4" />Approve</ZButton><ZButton variant="outline" @click="pendingReview={proposal,decision:'reject'}"><X class="size-4" />Reject</ZButton></div>
                  <ZButton v-else-if="proposal.status==='APPROVED'" class="mt-3" @click="pendingReview={proposal,decision:'execute'}">Execute approved action</ZButton>
                  <p v-if="proposal.execution" class="mt-3 text-xs text-content-secondary">{{ proposal.execution.result_summary ?? proposal.execution.error_message }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form v-if="threadId" class="border-t border-line p-3" @submit.prevent="send">
          <ValidationMessage :message="sendMutation.error.value?.message" />
          <div class="rounded-md border border-line-strong bg-surface p-2 focus-within:ring-2 focus-within:ring-primary-subtle">
            <textarea v-model="draft" class="min-h-20 w-full resize-none bg-transparent px-2 py-1 text-sm text-content outline-none" placeholder="Ask company knowledge or prepare a supported draft action…" @keydown.enter.exact.prevent="send" />
            <div class="flex items-center justify-between"><span class="text-2xs text-content-muted">Permissions apply · mutations require dedicated approval and execution</span><ZButton type="submit" :disabled="!draft.trim()||sendMutation.saving.value"><Send class="size-4" />{{ sendMutation.saving.value ? "Working…" : "Send" }}</ZButton></div>
          </div>
        </form>
      </Panel>
    </div>
    <ConfirmDialog :open="!!pendingReview" :title="pendingReview?.decision==='execute'?'Execute approved action?':pendingReview?.decision==='approve'?'Approve proposal?':'Reject proposal?'" :message="pendingReview?.decision==='approve'?'Approval records your decision; execution remains a separate action.':pendingReview?.decision==='execute'?'The server will recheck company, permissions, entitlements and payload integrity before using the authoritative domain service.':'No business record will be changed.'" :confirm-label="pendingReview?.decision==='execute'?'Execute':pendingReview?.decision==='approve'?'Approve':'Reject'" :tone="pendingReview?.decision==='reject'?'danger':'brand'" @cancel="pendingReview=null" @confirm="confirmReview" />
  </AppShell>
</template>
