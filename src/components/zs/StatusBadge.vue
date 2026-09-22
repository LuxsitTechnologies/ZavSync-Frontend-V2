<script setup lang="ts">
import { computed } from "vue";

import { cn } from "@/lib/utils";
import { labelize, statusTone } from "@/lib/format";

const props = withDefaults(
  defineProps<{ status: string; label?: string; class?: string }>(),
  { label: undefined, class: "" },
);

const TONE_CLASS: Record<string, string> = {
  neutral: "badge-neutral",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
  brand: "badge-brand",
};

const classes = computed(() =>
  cn("zs-badge", TONE_CLASS[statusTone(props.status)], props.class),
);
const text = computed(() => props.label ?? labelize(props.status));
</script>

<template>
  <span :class="classes">{{ text }}</span>
</template>
