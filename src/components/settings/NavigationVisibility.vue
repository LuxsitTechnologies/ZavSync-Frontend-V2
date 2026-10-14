<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useCompanyStore } from "@/stores/company";
import { navigationRepository } from "@/services/platform/navigation.repository";
import { navigationReasonLabels, type EffectiveNavigation, type NavigationItem } from "@/types/navigation";
import ZButton from "@/components/zs/ZButton.vue";

const props = defineProps<{ targetCompanyId: string }>();
const company = useCompanyStore();
const initialContextVersion = company.contextVersion;
const data = ref<EffectiveNavigation | null>(null), loading = ref(false), saving = ref(false);
const error = ref(""), notice = ref("");
let generation = 0;
const target = computed(() => company.companies.find(item => item.id === props.targetCompanyId));
const canManage = computed(() => target.value?.permissions?.includes("*") || target.value?.permissions?.includes("platform.settings.manage"));
const groups = computed(() => {
  const source = data.value;
  if (!source) return [];
  const parents = new Map((source.parents ?? []).map(parent => [parent.key, parent]));
  const result = new Map<string, { key: string; label: string; items: NavigationItem[] }>();
  for (const item of source.items) {
    const key = item.parent_key || item.group;
    if (!result.has(key)) result.set(key, { key, label: parents.get(key)?.label ?? item.group, items: [] });
    result.get(key)!.items.push(item);
  }
  return [...result.values()].map(group => ({ ...group, items: group.items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)) }));
});
const label = (item: NavigationItem) => item.key === "fbr.invoicing" ? "FBR Invoice" : item.label;
const state = (value: boolean | null) => value === null ? "Default" : value ? "Shown" : "Hidden";
const current = (token: number, id: string) => token === generation && props.targetCompanyId === id && !company.switching && company.contextVersion === initialContextVersion;
function accept(result: EffectiveNavigation, id: string, token: number) {
  if (!current(token, id)) return;
  data.value = result;
  if (id === company.activeCompanyId) company.updateNavigation(id, initialContextVersion, result);
}
async function load() {
  const id = props.targetCompanyId, token = ++generation;
  data.value = null; error.value = ""; notice.value = ""; loading.value = true;
  try { accept(await navigationRepository.get(id), id, token); }
  catch (cause) { if (current(token, id)) error.value = cause instanceof Error ? cause.message : "Could not load navigation visibility."; }
  finally { if (current(token, id)) loading.value = false; }
}
async function change(keys: string[], value: boolean | null) {
  if (!canManage.value || saving.value || !data.value) return;
  const id = props.targetCompanyId, token = generation;
  saving.value = true; error.value = ""; notice.value = "";
  try {
    for (const key of keys) {
      if (!current(token, id)) return;
      const result = value === null ? await navigationRepository.reset(id, key) : await navigationRepository.set(id, key, value);
      accept(result, id, token);
    }
    if (current(token, id)) notice.value = "Navigation preferences saved.";
  } catch (cause) {
    if (current(token, id)) {
      const message = cause instanceof Error ? cause.message : "Could not save navigation preferences.";
      // A write can succeed before an error; reload the target instead of guessing.
      await load();
      if (props.targetCompanyId === id) error.value = message;
    }
  } finally { saving.value = false; }
}
watch(() => props.targetCompanyId, () => { void load(); }, { immediate: true });
onBeforeUnmount(() => { generation++; });
</script>
<template>
  <section class="space-y-4" aria-label="Company navigation preferences">
    <p class="text-sm text-content-secondary">Choose what appears in this company's menu. Permissions and plan access still apply.</p>
    <p v-if="!canManage" class="text-sm">Read-only navigation preferences.</p>
    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="loading" role="status">Loading navigation visibility…</p>
    <ZButton v-if="error" variant="outline" :disabled="loading || saving" @click="load">Reload visibility</ZButton>
    <template v-if="data && !loading">
      <p v-if="!groups.length">No configurable navigation entries.</p>
      <section v-for="group in groups" :key="group.key" class="panel p-4" :aria-label="`${group.label} navigation`">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 class="text-lg font-semibold">{{ group.label }}</h2>
          <div v-if="canManage && group.items.length > 1" class="flex flex-wrap gap-2">
            <ZButton variant="outline" :disabled="saving || !group.items.some(item => item.platform_active && item.entitled && item.authorized)" :aria-label="`Show all ${group.label}`" @click="change(group.items.filter(item => item.platform_active && item.entitled && item.authorized).map(item => item.key), true)">Show all</ZButton>
            <ZButton variant="outline" :disabled="saving" :aria-label="`Hide all ${group.label}`" @click="change(group.items.map(item => item.key), false)">Hide all</ZButton>
            <ZButton variant="ghost" :disabled="saving" :aria-label="`Reset all ${group.label}`" @click="change(group.items.map(item => item.key), null)">Reset all</ZButton>
          </div>
        </div>
        <div class="space-y-2">
          <article v-for="item in group.items" :key="item.key" class="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between" :aria-label="label(item)">
            <div class="min-w-0"><h3 class="font-medium">{{ label(item) }}</h3><p class="text-xs text-content-secondary"><span role="status" :aria-label="`${label(item)} visibility status`" class="inline-block rounded border border-line px-2 py-0.5">{{ state(item.visibility_override) }}</span><span v-if="item.unavailable_reason && item.unavailable_reason !== 'HIDDEN_BY_COMPANY'" class="ml-2">{{ navigationReasonLabels[item.unavailable_reason] }}</span></p></div>
            <div v-if="canManage" class="flex flex-wrap gap-2">
              <ZButton variant="outline" :aria-label="`Show ${label(item)}`" :disabled="saving || !item.platform_active || !item.entitled || !item.authorized || item.visibility_override === true" @click="change([item.key], true)">Show</ZButton>
              <ZButton variant="outline" :aria-label="`Hide ${label(item)}`" :disabled="saving || item.visibility_override === false" @click="change([item.key], false)">Hide</ZButton>
              <ZButton variant="ghost" :aria-label="`Reset ${label(item)} to default`" :disabled="saving || item.visibility_override === null" @click="change([item.key], null)">Default</ZButton>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>
