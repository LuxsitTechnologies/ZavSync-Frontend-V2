<script setup lang="ts">
import { computed } from "vue";

import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    as?: "button" | "span";
    variant?: "primary" | "ghost" | "outline";
    class?: string;
    type?: "button" | "submit";
  }>(),
  { as: "button", variant: "primary", class: "", type: "button" },
);

const VARIANTS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border border-line-strong bg-surface text-content hover:bg-surface-hover",
  ghost: "text-content-secondary hover:bg-surface-hover hover:text-content",
};

const classes = computed(() =>
  cn(
    "inline-flex h-control items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-60",
    VARIANTS[props.variant],
    props.class,
  ),
);
</script>

<template>
  <component :is="props.as" :type="props.as === 'button' ? props.type : undefined" :class="classes">
    <slot />
  </component>
</template>
