<script setup lang="ts">
import { Search } from "lucide-vue-next";

withDefaults(defineProps<{ modelValue: string; placeholder?: string }>(), {
  placeholder: "Search…",
});
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div class="relative min-w-56 flex-1">
    <Search
      class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-muted"
    />
    <input
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="field pl-8"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
