<script setup lang="ts">
import { useRoute } from "vue-router";
import { useCompanyStore } from "@/stores/company";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import EmployeeLinkAdmin from "@/components/identity/EmployeeLinkAdmin.vue";
import { setPageMeta } from "@/lib/page-meta";
const company=useCompanyStore(), route=useRoute();
setPageMeta('Employee identity link','Manage the employee identity for this company membership.');
</script>
<template><AppShell><PageHeader title="Employee identity link" description="Explicit company membership-to-employee association" /><RouterLink v-if="company.hasPermission('platform.users.view')" to="/users" class="mb-4 inline-block text-sm text-content-brand">Back to users</RouterLink><p v-if="company.switching" role="status">Switching company…</p><p v-else-if="!company.hasPermission('employee.links.manage')" role="alert">You do not have permission to manage employee links.</p><EmployeeLinkAdmin v-else :key="`${company.contextVersion}:${route.params.membership}`" /></AppShell></template>
