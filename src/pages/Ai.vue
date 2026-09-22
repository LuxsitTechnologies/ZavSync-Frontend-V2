<script setup lang="ts">
import { ref } from "vue";
import { Send, Sparkles } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import { aiConversation, aiSuggestions } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta(
  "ZavSync AI",
  "Ask questions across HR, payroll, accounting and CRM data in natural language.",
);

const draft = ref("");

function onSubmit() {
  draft.value = "";
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="ZavSync AI"
      description="Answers grounded in your company data — read-only in this preview"
    />

    <div class="grid gap-4 xl:grid-cols-3">
      <Panel class="xl:col-span-2" body-class="flex h-[30rem] flex-col">
        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <div
            v-for="m in aiConversation"
            :key="m.id"
            :class="m.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'"
          >
            <span
              v-if="m.role === 'assistant'"
              class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-subtle-fg"
            >
              <Sparkles class="size-3.5" />
            </span>
            <p
              :class="
                m.role === 'user'
                  ? 'max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                  : 'max-w-[80%] rounded-lg bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-content-secondary'
              "
            >
              {{ m.text }}
            </p>
          </div>
        </div>

        <form class="flex items-center gap-2 border-t border-line p-3" @submit.prevent="onSubmit">
          <input
            v-model="draft"
            class="field flex-1"
            placeholder="Ask about payroll, invoices, attendance…"
            aria-label="Ask ZavSync AI"
          />
          <ZButton type="submit">
            <Send class="size-4" /> Ask
          </ZButton>
        </form>
      </Panel>

      <div class="space-y-4">
        <Panel title="Suggested prompts">
          <ul class="divide-y divide-line">
            <li v-for="s in aiSuggestions" :key="s">
              <button
                type="button"
                class="w-full px-4 py-3 text-left text-sm text-content-secondary hover:bg-surface-hover"
                @click="draft = s"
              >
                {{ s }}
              </button>
            </li>
          </ul>
        </Panel>

        <Panel title="Data sources" description="Scoped to your active company">
          <ul class="space-y-2 p-4 text-sm text-content-secondary">
            <li>Employees, attendance and leave</li>
            <li>Payroll batches and payslips</li>
            <li>Invoices, ledger and FBR submissions</li>
            <li>CRM clients, contacts and leads</li>
          </ul>
        </Panel>
      </div>
    </div>
  </AppShell>
</template>
