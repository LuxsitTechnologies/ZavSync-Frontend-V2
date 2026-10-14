<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { dashboardRepository } from "@/services/platform/dashboard.repository";
import { useCompanyStore } from "@/stores/company";
import type { DashboardLayout, DashboardWidgetKey } from "@/types/dashboardLayout";

setPageMeta("Dashboard Customization", "Choose the selected company's authorized dashboard widgets.");
const company = useCompanyStore();
const canView = computed(() => !company.switching && !!company.activeCompanyId &&
  ["accounting.view", "platform.settings.view", "platform.settings.manage"].some(permission => company.hasPermission(permission)));
const canManage = computed(() => company.hasPermission("platform.settings.manage"));
const layout = ref<DashboardLayout | null>(null);
const draft = ref<Array<{ key: DashboardWidgetKey; visible: boolean }>>([]);
const columns = ref(4);
const loading = ref(false), saving = ref(false);
const error = ref<ApiError | null>(null), notice = ref("");
let generation = 0;
const catalogue = computed(() => new Map(layout.value?.catalog.map(item => [item.key, item]) ?? []));
const preview = computed(() => draft.value.filter(item => item.visible && catalogue.value.get(item.key)?.authorized && catalogue.value.get(item.key)?.entitled));

function current(id: string, version: number, token: number): boolean {
  return !company.switching && company.activeCompanyId === id && company.contextVersion === version && token === generation;
}
function accept(value: DashboardLayout): void {
  layout.value = value;
  columns.value = value.columns;
  draft.value = value.widgets.map(item => ({ key: item.key, visible: item.visible }));
}
async function load(): Promise<void> {
  const token = ++generation, id = company.activeCompanyId, version = company.contextVersion;
  layout.value = null; draft.value = []; notice.value = ""; error.value = null;
  if (!canView.value) { loading.value = false; return; }
  loading.value = true;
  try { const response = await dashboardRepository.get(id); if (current(id, version, token)) accept(response); }
  catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Could not load dashboard layout."); }
  finally { if (current(id, version, token)) loading.value = false; }
}
function move(index: number, step: number): void {
  const next = index + step;
  if (next < 0 || next >= draft.value.length) return;
  const items = [...draft.value];
  [items[index], items[next]] = [items[next], items[index]];
  draft.value = items;
}
async function persist(reset: boolean): Promise<void> {
  if (!canManage.value || saving.value || !layout.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  saving.value = true; error.value = null; notice.value = "";
  try {
    const response = reset
      ? await dashboardRepository.reset(id, layout.value.layout_version)
      : await dashboardRepository.save(id, layout.value.layout_version, columns.value, draft.value);
    if (current(id, version, token)) { accept(response); notice.value = reset ? "Dashboard layout reset." : "Dashboard layout saved."; }
  } catch (cause) {
    if (current(id, version, token)) {
      const failure = cause instanceof ApiError ? cause : new ApiError("Could not save dashboard layout.");
      error.value = failure;
      if (failure.errorCode === "DASHBOARD_LAYOUT_VERSION_STALE") {
        const message = failure.message;
        await load();
        if (!company.switching && company.activeCompanyId === id && company.contextVersion === version) {
          error.value = new ApiError(message, "conflict");
        }
      }
    }
  } finally { saving.value = false; }
}
watch([() => company.contextVersion, () => company.switching], () => { void load(); }, { flush: "sync", immediate: true });
onBeforeUnmount(() => { generation++; });
</script>

<template>
  <AppShell>
    <PageHeader title="Dashboard Customization" :description="`Selected company: ${company.activeCompany?.name ?? 'None'}`" />
    <p class="mb-4 text-sm text-content-secondary">Saved order and visibility belong to this company. A widget can appear only when its underlying permission and commercial entitlement also allow it.</p>
    <p v-if="!canView" role="status" class="panel p-4">Dashboard layout is unavailable for this membership.</p>
    <AsyncSection v-else :loading="loading" :error="error" :empty="!layout" empty-title="No Dashboard Layout" @retry="load">
      <div v-if="layout" class="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Panel title="Available Widgets" body-class="space-y-3 p-4">
          <p v-if="!canManage" class="text-sm text-content-secondary">This layout is read-only for your role.</p>
          <article v-for="(item, index) in draft" :key="item.key" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
            <div><p class="font-semibold">{{ catalogue.get(item.key)?.label ?? item.key }}</p><p v-if="!catalogue.get(item.key)?.authorized || !catalogue.get(item.key)?.entitled" class="text-xs text-content-muted">Unavailable for this membership or plan</p></div>
            <div class="flex items-center gap-2">
              <label class="text-sm"><input v-model="item.visible" type="checkbox" :disabled="!canManage || saving" /> Visible</label>
              <ZButton variant="outline" :disabled="!canManage || saving || index === 0" :aria-label="`Move ${catalogue.get(item.key)?.label ?? item.key} up`" @click="move(index, -1)">↑</ZButton>
              <ZButton variant="outline" :disabled="!canManage || saving || index === draft.length - 1" :aria-label="`Move ${catalogue.get(item.key)?.label ?? item.key} down`" @click="move(index, 1)">↓</ZButton>
            </div>
          </article>
          <label class="block text-sm">Desktop Columns
            <select v-model.number="columns" class="field mt-1 block" :disabled="!canManage || saving"><option v-for="n in 4" :key="n" :value="n">{{ n }}</option></select>
          </label>
          <div v-if="canManage" class="flex flex-wrap gap-2"><ZButton :disabled="saving" @click="persist(false)">Save Layout</ZButton><ZButton variant="outline" :disabled="saving" @click="persist(true)">Reset to Default</ZButton></div>
          <p v-if="notice" role="status" class="text-sm text-success">{{ notice }}</p>
        </Panel>
        <Panel title="Preview" body-class="space-y-2 p-4">
          <p class="text-xs text-content-secondary">{{ columns }} desktop columns · authorized, entitled widgets only</p>
          <p v-if="!preview.length" class="text-sm">No widgets available.</p>
          <div v-for="item in preview" :key="item.key" class="rounded-md border border-line bg-surface-sunken p-3 text-sm">{{ catalogue.get(item.key)?.label ?? item.key }}</div>
          <RouterLink to="/" class="inline-block text-sm text-content-brand underline">View Dashboard</RouterLink>
        </Panel>
      </div>
    </AsyncSection>
  </AppShell>
</template>
