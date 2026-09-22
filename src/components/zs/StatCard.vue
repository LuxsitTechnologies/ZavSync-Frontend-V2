<script setup lang="ts">
import { computed } from "vue";

import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    hint?: string;
    tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  }>(),
  { hint: undefined, tone: "neutral" },
);

const BAR: Record<string, string> = {
  neutral: "bg-line-strong",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  brand: "bg-primary",
};

const barClass = computed(() => cn("absolute inset-y-0 left-0 w-0.5", BAR[props.tone]));
</script>

<template>
  <div class="panel relative overflow-hidden p-4">
    <span :class="barClass" />
    <p class="label-caps">{{ label }}</p>
    <p class="num mt-2 text-xl font-semibold tracking-tight text-content">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-content-muted">{{ hint }}</p>
  </div>
</template>
