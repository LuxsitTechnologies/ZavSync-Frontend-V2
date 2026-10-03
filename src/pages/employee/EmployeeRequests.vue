<script setup lang="ts">
import PortalShell from '@/components/employee/PortalShell.vue';
import PageHeader from '@/components/zs/PageHeader.vue';
import PortalPreviews from '@/components/portal-final/PortalPreviews.vue';
</script>
<template><PortalShell><PageHeader title="Requests" description="Read-only previews of your requests. Each source keeps its own status and workflow; open that service for details or actions." /><PortalPreviews requests /></PortalShell></template>
