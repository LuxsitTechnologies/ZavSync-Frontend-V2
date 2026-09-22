<script setup lang="ts">
import { AlertCircle } from "lucide-vue-next";

withDefaults(defineProps<{ message?: string | null; tone?: "danger" | "warning" }>(), {
  message: null,
  tone: "danger",
});
</script>

<template>
  <p
    v-if="message"
    class="mt-1.5 flex items-start gap-1.5 text-2xs"
    :class="tone === 'warning' ? 'text-warning' : 'text-danger'"
    role="alert"
  >
    <AlertCircle class="mt-px size-3 shrink-0" />
    <span>{{ message }}</span>
  </p>
</template>
