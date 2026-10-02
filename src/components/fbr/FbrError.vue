<script setup lang="ts">
import type { ApiError } from "@/services/api/client";
defineProps<{ error: ApiError | null }>();
</script>
<template>
  <div v-if="error" class="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
    <p>{{ error.message }}</p>
    <ul v-if="Object.keys(error.fields).length" class="mt-2 list-inside list-disc">
      <li v-for="(message, field) in error.fields" :key="field">{{ field }}: {{ message }}</li>
    </ul>
    <p v-if="error.requestId" class="mt-1 text-xs">Support reference: {{ error.requestId }}</p>
  </div>
</template>
