<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import NavigationVisibility from "@/components/settings/NavigationVisibility.vue";
import { useCompanyStore } from "@/stores/company";
import { setPageMeta } from "@/lib/page-meta";
const company = useCompanyStore();
const targets = computed(() => company.companies.filter(item =>
  (item.approval_status === undefined || item.approval_status === "APPROVED") && item.is_active !== false &&
  (item.permissions?.includes("platform.settings.manage") || item.permissions?.includes("*"))));
const targetId = ref(company.activeCompanyId);
watch(() => company.contextVersion, () => {
  if (!targets.value.some(item => item.id === targetId.value)) targetId.value = targets.value[0]?.id ?? company.activeCompanyId;
}, { immediate: true });
const target = computed(() => company.companies.find(item => item.id === targetId.value));
setPageMeta("Navigation Visibility", "Company presentation preferences; access remains separately controlled.");
</script>
<template>
  <AppShell>
    <PageHeader title="Navigation Visibility" description="Choose which navigation entries appear for a company. Access and subscriptions remain unchanged." />
    <label v-if="targets.length" class="mb-4 block max-w-md text-sm font-medium">Company to configure
      <select v-model="targetId" class="field mt-1 block w-full" aria-label="Company to configure">
        <option v-for="item in targets" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <p class="mb-2 text-sm">Configuring <strong>{{ target?.name ?? 'No authorized company' }}</strong>. Active workspace: <strong>{{ company.activeCompany?.name ?? 'None' }}</strong>.</p>
    <RouterLink v-if="company.hasPermission('platform.settings.view')" to="/settings" class="mb-4 inline-block text-sm text-content-brand">Company Settings</RouterLink>
    <p v-if="company.switching" role="status">Switching company…</p>
    <NavigationVisibility v-if="!company.switching && targetId" :key="`${company.contextVersion}:${targetId}`" :target-company-id="targetId" />
    <p v-else-if="!company.switching" role="status">No company is available to configure.</p>
  </AppShell>
</template>
