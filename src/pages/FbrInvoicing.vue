<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import { useCompanyStore } from "@/stores/company";
import { permissionForPath } from "@/lib/nav";
import { setPageMeta } from "@/lib/page-meta";
import FbrRegister from "@/components/fbr/FbrRegister.vue";
import FbrEditor from "@/components/fbr/FbrEditor.vue";
import FbrDetail from "@/components/fbr/FbrDetail.vue";
import FbrConfiguration from "@/components/fbr/FbrConfiguration.vue";
import FbrAdministration from "@/components/fbr/FbrAdministration.vue";
const route = useRoute();
const company = useCompanyStore();
setPageMeta("FBR Invoicing", "Company-scoped FBR invoice drafts, submissions and historical evidence.");
const allowed = computed(() => company.hasModule("invoicing") && company.hasPermission(permissionForPath(route.path) ?? "pakistan_fbr.view"));
const screen = computed(() => route.path.endsWith("/configuration") ? FbrConfiguration : route.path.includes("/migrations") ? FbrAdministration : route.path.endsWith("/new") || route.path.endsWith("/edit") ? FbrEditor : route.params.id ? FbrDetail : FbrRegister);
</script>
<template>
  <AppShell>
    <PageHeader title="FBR Invoicing" description="Dedicated FBR documents, drafts and submission evidence." />
    <nav class="mb-4 flex flex-wrap gap-4 text-sm text-content-brand" aria-label="FBR Invoicing">
      <RouterLink v-if="company.hasPermission('pakistan_fbr.view')" to="/fbr-invoicing">Invoice register</RouterLink>
      <RouterLink v-if="company.hasPermission('fbr.configuration.view')" to="/fbr-invoicing/configuration">FBR configuration</RouterLink>
      <RouterLink v-if="company.hasPermission('migration.view')" to="/fbr-invoicing/migrations">Migration administration</RouterLink>
    </nav>
    <p v-if="company.switching" role="status">Switching company…</p>
    <div v-else-if="!allowed" class="panel p-6" role="alert">FBR Invoicing requires the invoicing entitlement and permission for this view in the selected company.</div>
    <component :is="screen" v-else :key="`${company.contextVersion}:${route.fullPath}`" />
  </AppShell>
</template>
