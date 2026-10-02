<script setup lang="ts">
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import ProfileContent from "@/components/identity/ProfileContent.vue";
import { useCompanyStore } from "@/stores/company";
import { setPageMeta } from "@/lib/page-meta";
const company = useCompanyStore();
setPageMeta('Your profile','Account, employee identity and security.');
</script>
<template><AppShell><PageHeader title="Your profile" description="Your account and active-company employee identity" /><p v-if="company.switching" role="status">Switching company…</p><ProfileContent v-else :key="`${company.currentUser.id}:${company.contextVersion}`" /></AppShell></template>
