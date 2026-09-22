<script setup lang="ts">
/**
 * ZavSync wordmark. `tone="dark"` renders the variant made for dark surfaces
 * (teal "Zav" + white "Sync") — use it on the brand panel and dark headers.
 */
import { computed } from "vue";

import logoLight from "@/assets/zavsync-logo.png";
import logoDark from "@/assets/zavsync-logo-dark.png";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<{ class?: string; tone?: "light" | "dark" }>(), {
  class: "",
  tone: "light",
});

const src = computed(() => (props.tone === "dark" ? logoDark : logoLight));
</script>

<template>
  <img
    :src="src"
    alt="ZavSync"
    :class="cn('h-6 w-auto select-none', props.class)"
    :draggable="false"
  />
</template>
