<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PortalShell from '@/components/employee/PortalShell.vue';
import PortalDomain from '@/components/portal-final/PortalDomain.vue';
import { useEmployeePortalStore } from '@/stores/employeePortal';
import type { PortalDomain as Domain } from '@/types/portalFinal';
const route=useRoute(),portal=useEmployeePortalStore();
const domains:Record<string,Domain>={'documents':'documents','announcements':'announcements','directory':'directory','teams':'teams','schedule':'schedule','shift-swaps':'swaps','assets':'assets','expenses':'expenses'};
const domain=computed(()=>domains[route.path.split('/').at(-1)!]!);
const active=computed(()=>!!portal.employee?.linked&&!!portal.employee.employee&&!['resigned','terminated'].includes(portal.employee.employee.status.toLowerCase()));
</script>
<template><PortalShell><PortalDomain :key="domain" :domain="domain" :active-employee="active" :self-id="portal.employee?.employee?.id" /><PortalDomain v-if="domain==='teams'" domain="direct-reports" class="mt-6" /></PortalShell></template>
