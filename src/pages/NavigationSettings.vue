<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import NavigationVisibility from "@/components/settings/NavigationVisibility.vue";
import { useCompanyStore } from "@/stores/company";
import { setPageMeta } from "@/lib/page-meta";
const company = useCompanyStore();
setPageMeta("Navigation Visibility", "Company presentation preferences; access remains separately controlled.");
</script>
<template>
  <AppShell>
    <PageHeader title="Navigation Visibility" description="Choose what appears in your company's navigation. This does not grant access or change your subscription." />
    <p class="mb-2 text-sm">Company: <strong>{{ company.activeCompany?.name ?? 'No company selected' }}</strong></p>
    <RouterLink v-if="company.hasPermission('platform.settings.view')" to="/settings" class="mb-4 inline-block text-sm text-content-brand">Company Settings</RouterLink>
    <p v-if="company.switching" role="status">Switching company…</p>
    <NavigationVisibility v-else :key="company.contextVersion" />
  </AppShell>
</template>
