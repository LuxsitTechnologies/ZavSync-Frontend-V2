<script setup lang="ts">
import type { ApiError } from "@/services/api/client";
defineProps<{ error: ApiError | null }>();
</script>
<template><div v-if="error" role="alert" class="rounded border border-danger/30 p-3 text-sm text-danger"><p>{{ error.message }}</p><ul class="list-inside list-disc"><li v-for="(message, key) in error.fields" :key="key">{{ message }}</li></ul></div></template>
