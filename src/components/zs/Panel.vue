<script setup lang="ts">
import { cn } from "@/lib/utils";

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    class?: string;
    bodyClass?: string;
  }>(),
  { title: undefined, description: undefined, class: "", bodyClass: "" },
);
</script>

<template>
  <section :class="cn('panel overflow-hidden', $props.class)">
    <header
      v-if="title"
      class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3"
    >
      <div>
        <h2 class="text-sm font-semibold text-content">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-xs text-content-muted">{{ description }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
