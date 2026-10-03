<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/zs/AppShell.vue';
import WorkSurface from '@/components/work/WorkSurface.vue';
const route = useRoute();
const kind = computed(() => route.path.endsWith('/tickets') ? 'tickets' : 'tasks');
</script>
<template><AppShell><WorkSurface :key="kind" :kind="kind" admin /></AppShell></template>
