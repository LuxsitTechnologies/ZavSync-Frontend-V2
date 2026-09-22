<script setup lang="ts">
/** Compact from/to date filter with quick presets, shared by all ledgers. */
import { computed } from "vue";

const props = defineProps<{ from: string; to: string }>();
const emit = defineEmits<{ "update:from": [value: string]; "update:to": [value: string] }>();

const PRESETS: { label: string; from: string; to: string }[] = [
  { label: "This month", from: "2026-09-01", to: "2026-09-30" },
  { label: "Last month", from: "2026-08-01", to: "2026-08-31" },
  { label: "Quarter", from: "2026-07-01", to: "2026-09-30" },
  { label: "Year to date", from: "2026-01-01", to: "2026-12-31" },
];

const invalid = computed(() => Boolean(props.from && props.to && props.from > props.to));
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <input
      type="date"
      class="field w-36"
      aria-label="From date"
      :value="from"
      :class="invalid ? 'border-danger' : ''"
      @change="emit('update:from', ($event.target as HTMLInputElement).value)"
    />
    <span class="text-xs text-content-muted">to</span>
    <input
      type="date"
      class="field w-36"
      aria-label="To date"
      :value="to"
      :class="invalid ? 'border-danger' : ''"
      @change="emit('update:to', ($event.target as HTMLInputElement).value)"
    />
    <div class="flex flex-wrap gap-1">
      <button
        v-for="preset in PRESETS"
        :key="preset.label"
        type="button"
        class="rounded-md border border-line px-2 py-1 text-2xs text-content-secondary hover:bg-surface-hover"
        @click="
          emit('update:from', preset.from);
          emit('update:to', preset.to);
        "
      >
        {{ preset.label }}
      </button>
    </div>
    <p v-if="invalid" class="text-2xs text-danger">The start date must be on or before the end date.</p>
  </div>
</template>
