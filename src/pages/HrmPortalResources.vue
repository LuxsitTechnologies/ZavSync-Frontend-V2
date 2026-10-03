<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/zs/AppShell.vue';
import PortalDomain from '@/components/portal-final/PortalDomain.vue';
import EmployeeManager from '@/components/portal-final/EmployeeManager.vue';
import type { PortalDomain as Domain } from '@/types/portalFinal';
const route=useRoute();
const domains:Record<string,Domain>={'employee-documents':'documents','announcements':'announcements','teams':'teams','shifts':'shifts','rotas':'rotas','shift-swaps':'swaps','asset-requests':'assets','expenses':'expenses','expense-categories':'categories'};
const domain=computed(()=>domains[route.path.split('/').at(-1)!]!);
</script>
<template><AppShell><PortalDomain :key="domain" :domain="domain" admin /><EmployeeManager v-if="domain==='teams'" class="mt-6" /></AppShell></template>
