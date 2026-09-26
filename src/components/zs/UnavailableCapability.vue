<script setup lang="ts">
import { CircleOff } from "lucide-vue-next";

import PageHeader from "./PageHeader.vue";
import Panel from "./Panel.vue";

defineProps<{
  title: string;
  description: string;
  capability: string;
}>();
</script>

<template>
  <PageHeader :title="title" :description="description" />
  <Panel>
    <div class="mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
      <span class="grid size-11 place-items-center rounded-full bg-surface-sunken text-content-muted">
        <CircleOff class="size-5" aria-hidden="true" />
      </span>
      <h2 class="mt-4 text-base font-semibold text-content">{{ capability }} is unavailable</h2>
      <p class="mt-2 text-sm leading-6 text-content-secondary">
        This workspace does not have a server-backed implementation for this capability. No data or
        actions are fabricated.
      </p>
    </div>
  </Panel>
</template>
