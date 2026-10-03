<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PortalShell from '@/components/employee/PortalShell.vue';
import WorkSurface from '@/components/work/WorkSurface.vue';
import { useEmployeePortalStore } from '@/stores/employeePortal';
const route = useRoute(), portal = useEmployeePortalStore();
const active = computed(() => !!portal.employee?.linked && !!portal.employee.employee && !['resigned','terminated'].includes(portal.employee.employee.status.toLowerCase()));
const kind = computed(() => route.path.endsWith('/tickets') ? 'tickets' : 'tasks');
</script>
<template><PortalShell><WorkSurface :key="kind" :kind="kind" :active-employee="active" /></PortalShell></template>
