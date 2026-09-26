<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
onMounted(() => router.replace("/ai/actions"));
</script>

<template><div class="grid min-h-screen place-items-center bg-background text-sm text-content-muted">Opening AI action review…</div></template>
