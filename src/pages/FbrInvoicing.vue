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
import PortalSettings from "@/components/fbr/PortalSettings.vue";
import FbrPrint from "@/components/fbr/FbrPrint.vue";
import FbrCreditPrint from "@/components/fbr/FbrCreditPrint.vue";
const route = useRoute();
const company = useCompanyStore();
setPageMeta("FBR Invoice", "Company-scoped FBR invoice drafts, submissions and historical evidence.");
const allowed = computed(() => company.hasModule("invoicing") && company.hasPermission(permissionForPath(route.path) ?? "pakistan_fbr.view"));
const screen = computed(() => route.path.endsWith("/portal-settings") ? PortalSettings : route.path.endsWith("/configuration") ? FbrConfiguration : route.path.includes("/migrations") ? FbrAdministration : route.path.includes("/credit-notes/") && route.path.endsWith("/print") ? FbrCreditPrint : route.path.endsWith("/print") ? FbrPrint : route.path.endsWith("/new") || route.path.endsWith("/edit") ? FbrEditor : route.params.id ? FbrDetail : FbrRegister);
</script>
<template>
  <AppShell>
    <PageHeader class="print:hidden" title="FBR Invoice" description="Dedicated FBR documents, drafts and submission evidence." />
    <nav v-if="company.hasModule('invoicing')" class="mb-4 flex flex-wrap gap-4 text-sm text-content-brand print:hidden" aria-label="FBR Invoice">
      <RouterLink v-if="company.hasPermission('pakistan_fbr.view') && (!company.effectiveNavigation || company.effectiveNavigation.visible_keys.includes('fbr.invoicing'))" to="/fbr-invoicing">Invoice Register</RouterLink>
      <RouterLink v-if="company.hasPermission('pakistan_fbr.manage') && (!company.effectiveNavigation || company.effectiveNavigation.visible_keys.includes('fbr.invoicing'))" to="/fbr-invoicing/new">Create Invoice</RouterLink>
      <RouterLink v-if="company.hasPermission('portal.settings.view')" to="/fbr-invoicing/portal-settings">Portal Settings</RouterLink>
      <RouterLink v-if="company.hasPermission('migration.view') && (!company.effectiveNavigation || company.effectiveNavigation.visible_keys.includes('fbr.migrations'))" to="/fbr-invoicing/migrations">Migration Administration</RouterLink>
    </nav>
    <p v-if="company.switching" role="status">Switching company…</p>
    <div v-else-if="!allowed" class="panel p-6" role="alert">FBR Invoice requires the invoicing entitlement and permission for this view in the selected company.</div>
    <component :is="screen" v-else :key="`${company.contextVersion}:${route.fullPath}`" />
  </AppShell>
</template>
