<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useCompanyStore } from "@/stores/company";
import { navigationRepository } from "@/services/platform/navigation.repository";
import { visibilityLabel, navigationReasonLabels, type EffectiveNavigation } from "@/types/navigation";
import ZButton from "@/components/zs/ZButton.vue";
const company = useCompanyStore();
const companyId = company.activeCompanyId, version = company.contextVersion;
const data = ref<EffectiveNavigation | null>(null), loading = ref(true), saving = ref(false);
const error = ref(""), notice = ref("");
let mounted = true;
onBeforeUnmount(() => { mounted = false; });
const current = () => mounted && !company.switching && company.activeCompanyId === companyId && company.contextVersion === version;
function accept(result: EffectiveNavigation) {
  if (!current()) return;
  data.value = result;
  company.updateNavigation(companyId, version, result);
}
async function load() {
  loading.value = true;
  try { accept(await navigationRepository.get(companyId)); }
  catch (cause) { if (current()) { data.value = null; error.value = cause instanceof Error ? cause.message : "Could not load navigation visibility."; } }
  finally { if (current()) loading.value = false; }
}
async function retryLoad() { error.value = ""; await load(); }
async function change(key: string, value: boolean | null) {
  if (!current() || saving.value || !company.hasPermission("platform.settings.manage")) return;
  saving.value = true; error.value = ""; notice.value = "";
  try {
    accept(await (value === null ? navigationRepository.reset(companyId, key) : navigationRepository.set(companyId, key, value)));
    if (current()) notice.value = "Navigation preference saved.";
  } catch (cause) {
    if (current()) {
      error.value = cause instanceof Error ? cause.message : "Could not save navigation preference.";
      // A failed response may follow a committed write. Reload rather than guessing.
      await load();
    }
  } finally { if (current()) saving.value = false; }
}
onMounted(load);
</script>
<template>
  <section class="space-y-4" aria-label="Company navigation preferences">
    <p class="text-sm text-content-secondary">Default inherits visible presentation. Platform availability, subscription and permissions still determine effective visibility.</p>
    <p v-if="!company.hasPermission('platform.settings.manage')" class="text-sm">Read-only navigation preferences.</p>
    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="loading" role="status">Loading navigation visibility…</p>
    <ZButton v-if="error" variant="outline" :disabled="loading || saving" @click="retryLoad">Reload visibility</ZButton>
    <template v-if="data && !loading">
      <p v-if="!data.items.length">No configurable presentation items.</p>
      <article v-for="item in data.items" :key="item.key" class="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between" :aria-label="item.label">
        <div class="min-w-0">
          <h2 class="font-semibold">{{ item.label }}</h2>
          <p class="text-sm">{{ visibilityLabel(item.visibility_override) }}</p>
          <p class="text-sm text-content-secondary">{{ item.effective_visible ? 'Visible in navigation' : item.unavailable_reason ? navigationReasonLabels[item.unavailable_reason] : 'Unavailable' }}</p>
        </div>
        <div v-if="company.hasPermission('platform.settings.manage')" class="flex flex-wrap gap-2">
          <ZButton variant="outline" :aria-label="`Show ${item.label}`" :disabled="saving || !item.platform_active || !item.entitled || !item.authorized || item.visibility_override === true" @click="change(item.key, true)">Show</ZButton>
          <ZButton variant="outline" :aria-label="`Hide ${item.label}`" :disabled="saving || item.visibility_override === false" @click="change(item.key, false)">Hide</ZButton>
          <ZButton variant="ghost" :aria-label="`Reset ${item.label} to default`" :disabled="saving || item.visibility_override === null" @click="change(item.key, null)">Reset to default</ZButton>
        </div>
      </article>
    </template>
  </section>
</template>
