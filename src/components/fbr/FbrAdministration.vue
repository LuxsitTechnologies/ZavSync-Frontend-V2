<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { fbrRepository } from "@/services/fbr/repository";
import { useFbrContext } from "./context";
import type { FbrException } from "@/types/fbr";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ZButton from "@/components/zs/ZButton.vue";
import Field from "@/components/zs/Field.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import FbrError from "./FbrError.vue";
const { company, companyId, current } = useFbrContext();
const runId = typeof useRoute().params.run === "string" ? String(useRoute().params.run) : null;
const runs = useAsyncData(() => runId ? Promise.resolve([]) : fbrRepository.migrations(companyId));
const run = useAsyncData(() => runId ? fbrRepository.migration(companyId, runId) : Promise.resolve(null));
const exceptions = useAsyncData(() => runId ? fbrRepository.exceptions(companyId, runId) : Promise.resolve([]));
const selected = ref<FbrException | null>(null);
const note = ref("");
const resolution = ref<"RESOLVED" | "IGNORED">("RESOLVED");
const confirmOpen = ref(false);
const mutation = useMutation(async () => {
  if (!current() || !selected.value || !company.hasPermission("migration.manage")) return;
  await fbrRepository.resolve(companyId, selected.value.id, resolution.value, note.value);
  if (current()) { confirmOpen.value = false; selected.value = null; note.value = ""; await exceptions.refresh(); await run.refresh(); }
});
function resolve() { if (!mutation.saving.value && note.value.trim() && current()) void mutation.run(); }
</script>
<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Migration administration</h2>
    <p class="text-sm text-content-muted">Review saved reconciliation and resolve documented exceptions. Import execution is not available here. A completed run does not imply certification or resolved discrepancies.</p>
    <AsyncSection v-if="!runId" :loading="runs.loading.value" :error="runs.error.value" :empty="!runs.data.value?.length" empty-title="No migration runs" @retry="runs.refresh">
      <Panel v-for="item in runs.data.value" :key="item.id" :title="item.source_system" body-class="p-4 text-sm">
        <RouterLink :to="`/fbr-invoicing/migrations/${item.id}`" class="text-content-brand">{{ item.id }}</RouterLink><p>{{ item.status }} · {{ item.mode }} · {{ item.source_filename }}</p>
      </Panel>
    </AsyncSection>
    <template v-else>
      <AsyncSection :loading="run.loading.value" :error="run.error.value" @retry="run.refresh">
        <Panel v-if="run.data.value" title="Migration run and saved reconciliation" body-class="space-y-3 p-4 text-sm">
          <p>{{ run.data.value.source_system }} · {{ run.data.value.status }} · {{ run.data.value.mode }}</p>
          <p>Source company: {{ run.data.value.source_company_id }} · {{ run.data.value.source_filename }}</p>
          <p v-if="run.data.value.failure_message" class="text-danger">{{ run.data.value.failure_message }}</p>
          <details v-for="key in (['progress', 'reconciliation', 'source_manifest'] as const)" :key="key" :open="key === 'reconciliation'"><summary class="cursor-pointer">{{ key }}</summary><pre class="whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(run.data.value[key], null, 2) }}</pre></details>
        </Panel>
      </AsyncSection>
      <Panel title="Exceptions" body-class="space-y-4 p-4">
        <AsyncSection :loading="exceptions.loading.value" :error="exceptions.error.value" :empty="!exceptions.data.value?.length" empty-title="No exceptions returned" @retry="exceptions.refresh">
          <article v-for="item in exceptions.data.value" :key="item.id" class="space-y-2 border-b border-line pb-3 text-sm">
            <h3 class="font-semibold">{{ item.exception_code }} · {{ item.severity }}</h3>
            <p>{{ item.source_entity_type }} / {{ item.source_id }} · {{ item.resolution_state }}</p><p v-if="item.resolution_note">{{ item.resolution_note }}</p>
            <details><summary class="cursor-pointer">Exception evidence</summary><pre class="whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(item.safe_metadata, null, 2) }}</pre></details>
            <ZButton v-if="company.hasPermission('migration.manage')" variant="outline" :disabled="mutation.saving.value" @click="selected = item; note = ''; resolution = 'RESOLVED'">Review exception</ZButton>
          </article>
        </AsyncSection>
      </Panel>
      <form v-if="selected" class="panel space-y-3 p-4" @submit.prevent="confirmOpen = true">
        <h3 class="font-semibold">Resolve {{ selected.exception_code }}</h3>
        <FbrError :error="mutation.error.value" />
        <label><span class="label-caps">Resolution</span><select v-model="resolution" class="field" :disabled="mutation.saving.value"><option>RESOLVED</option><option>IGNORED</option></select></label>
        <Field v-model="note" label="Resolution note" aria-label="Resolution note" required maxlength="4000" :disabled="mutation.saving.value" />
        <ZButton type="submit" :disabled="mutation.saving.value || !note.trim()">Save resolution</ZButton>
      </form>
    </template>
    <ConfirmDialog :open="confirmOpen" title="Record exception resolution?" message="This records the chosen resolution and note. It does not change historical invoice amounts or certify the migration." confirm-label="Confirm resolution" :busy="mutation.saving.value" @cancel="confirmOpen = false" @confirm="resolve"><FbrError :error="mutation.error.value" /></ConfirmDialog>
  </div>
</template>
