<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Bot, KeyRound, Play, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";
import type { AiEvaluationCase } from "@/types/ai";

setPageMeta("AI Governance", "Provider configuration, usage limits and deterministic evaluation visibility.");

const company = useCompanyStore();
const canViewUsage = computed(() => company.hasPermission("ai.usage.view"));
const canViewEvaluations = computed(() => company.hasPermission("ai.evaluations.view"));
const canManageProvider = computed(() => company.hasPermission("ai.providers.manage"));
const provider = useAsyncData(() => aiRepository.providerConfiguration(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const usage = useAsyncData(() => aiRepository.usage(company.activeCompanyId), { watch: [() => company.activeCompanyId], immediate: canViewUsage.value });
const evaluations = useAsyncData(() => aiRepository.evaluations(company.activeCompanyId), { watch: [() => company.activeCompanyId], immediate: canViewEvaluations.value });
const form = reactive({ provider: "openai", chat_model: "", embedding_model: "", api_key: "", is_enabled: false, timeout_seconds: "60", max_output_tokens: "2048", temperature: "0.2", input_rate: "0", output_rate: "0", embedding_rate: "0" });

watch(() => provider.data.value, (value) => {
  const configuration = value?.configuration;
  if (!configuration) return;
  Object.assign(form, {
    provider: configuration.provider,
    chat_model: configuration.chat_model,
    embedding_model: configuration.embedding_model,
    api_key: "",
    is_enabled: configuration.is_enabled,
    timeout_seconds: String(configuration.settings.timeout_seconds ?? 60),
    max_output_tokens: String(configuration.settings.max_output_tokens ?? 2048),
    temperature: String(configuration.settings.temperature ?? 0.2),
    input_rate: String(configuration.settings.input_cost_per_million_minor ?? 0),
    output_rate: String(configuration.settings.output_cost_per_million_minor ?? 0),
    embedding_rate: String(configuration.settings.embedding_cost_per_million_minor ?? 0),
  });
}, { immediate: true });

const saveProvider = useMutation(() => aiRepository.updateProviderConfiguration(company.activeCompanyId, {
  provider: form.provider,
  chat_model: form.chat_model,
  embedding_model: form.embedding_model,
  api_key: form.api_key || null,
  is_enabled: form.is_enabled,
  settings: {
    timeout_seconds: Number(form.timeout_seconds),
    max_output_tokens: Number(form.max_output_tokens),
    temperature: Number(form.temperature),
    input_cost_per_million_minor: Number(form.input_rate),
    output_cost_per_million_minor: Number(form.output_rate),
    embedding_cost_per_million_minor: Number(form.embedding_rate),
  },
}));
const runEvaluation = useMutation((evaluation: AiEvaluationCase) => aiRepository.runEvaluation(company.activeCompanyId, evaluation.id));

async function save() {
  if (!await saveProvider.run()) return;
  form.api_key = "";
  await provider.refresh();
  showToast("AI provider configuration saved", "Credentials remain encrypted and are never returned to this screen.", "success");
}

async function run(evaluation: AiEvaluationCase) {
  if (!await runEvaluation.run(evaluation)) return;
  await evaluations.refresh();
  showToast("Evaluation completed", evaluation.name, "success");
}

const limit = (key: string) => usage.data.value?.limits[key];
</script>

<template>
  <AppShell>
    <PageHeader title="AI Governance" description="Provider credentials, operational usage and deterministic safety evaluations" />
    <div v-if="canViewUsage" class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Requests this month" :value="`${usage.data.value?.summary.requests ?? 0} / ${limit('daily_ai_requests') ?? '—'} daily limit`" />
      <StatCard label="Input tokens" :value="String(usage.data.value?.summary.input_tokens ?? 0)" tone="brand" />
      <StatCard label="Output tokens" :value="String(usage.data.value?.summary.output_tokens ?? 0)" />
      <StatCard label="Estimated provider cost" :value="formatMoney(usage.data.value?.summary.cost_minor ?? 0)" tone="warning" />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Panel title="Provider configuration" description="Only configured OpenAI requests leave ZavSync; unavailable providers return a structured error.">
        <AsyncSection :loading="provider.loading.value" :error="provider.error.value" @retry="provider.refresh">
          <form class="grid gap-4 p-5 sm:grid-cols-2" @submit.prevent="save">
            <div class="sm:col-span-2 flex items-center justify-between rounded-md bg-surface-sunken p-3"><div class="flex items-center gap-2"><Bot class="size-4 text-content-brand"/><span class="text-sm text-content">Provider status</span></div><StatusBadge :status="provider.data.value?.configuration?.is_enabled?'active':'disabled'"/></div>
            <Field v-model="form.chat_model" label="Chat model" :disabled="!canManageProvider" required />
            <Field v-model="form.embedding_model" label="Embedding model" :disabled="!canManageProvider" required />
            <Field v-model="form.api_key" type="password" :label="provider.data.value?.has_api_key?'Replace API key (optional)':'API key'" :disabled="!canManageProvider" />
            <label><span class="label-caps">Provider</span><select v-model="form.provider" class="field mt-1.5 w-full" :disabled="!canManageProvider"><option value="openai">OpenAI</option></select></label>
            <Field v-model="form.input_rate" label="Input cost / 1M tokens (minor units)" type="number" :disabled="!canManageProvider" />
            <Field v-model="form.output_rate" label="Output cost / 1M tokens (minor units)" type="number" :disabled="!canManageProvider" />
            <Field v-model="form.embedding_rate" label="Embedding cost / 1M tokens (minor units)" type="number" :disabled="!canManageProvider" />
            <Field v-model="form.timeout_seconds" label="Timeout (seconds)" type="number" :disabled="!canManageProvider" />
            <Field v-model="form.max_output_tokens" label="Maximum output tokens" type="number" :disabled="!canManageProvider" />
            <Field v-model="form.temperature" label="Temperature" type="number" :disabled="!canManageProvider" />
            <label class="flex items-center gap-2 pt-6 text-sm text-content"><input v-model="form.is_enabled" type="checkbox" :disabled="!canManageProvider"/>Enabled</label>
            <div class="sm:col-span-2"><ValidationMessage :message="saveProvider.error.value?.message"/><ZButton v-if="canManageProvider" type="submit" :disabled="saveProvider.saving.value"><KeyRound class="size-4"/>Save configuration</ZButton></div>
          </form>
        </AsyncSection>
      </Panel>

      <Panel title="Enforced boundaries">
        <ul class="space-y-3 p-5 text-xs text-content-secondary">
          <li class="flex gap-2"><ShieldCheck class="size-4 shrink-0 text-success"/>Company, RBAC, entitlement and source checks happen before retrieval.</li>
          <li class="flex gap-2"><ShieldCheck class="size-4 shrink-0 text-success"/>Only the server allowlist can execute read-only tools.</li>
          <li class="flex gap-2"><ShieldCheck class="size-4 shrink-0 text-success"/>Every mutation is a proposal until separately approved and executed.</li>
          <li class="flex gap-2"><ShieldCheck class="size-4 shrink-0 text-success"/>Provider credentials and sensitive content are encrypted and omitted from APIs.</li>
        </ul>
      </Panel>
    </div>

    <Panel v-if="canViewEvaluations" class="mt-4" title="Evaluation cases" description="Runs use the configured provider in this environment; CI uses deterministic test providers.">
      <ValidationMessage class="m-4" :message="evaluations.error.value?.message ?? runEvaluation.error.value?.message"/>
      <div class="divide-y divide-line">
        <div v-for="evaluation in evaluations.data.value?.cases ?? []" :key="evaluation.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p class="text-sm font-medium text-content">{{evaluation.name}}</p><p class="mt-1 text-2xs text-content-muted">{{evaluation.runs_count ?? 0}} recorded runs · {{evaluation.is_active?'Active':'Disabled'}}</p></div>
          <ZButton v-if="company.hasPermission('ai.evaluations.manage')&&evaluation.is_active" variant="outline" @click="run(evaluation)"><Play class="size-4"/>Run</ZButton>
        </div>
        <p v-if="!(evaluations.data.value?.cases.length)" class="p-5 text-xs text-content-muted">No evaluation cases are configured.</p>
      </div>
    </Panel>
  </AppShell>
</template>
