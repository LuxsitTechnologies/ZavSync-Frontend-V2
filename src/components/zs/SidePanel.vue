<script setup lang="ts">
/** Right-hand drawer used for create/edit/view flows across accounting. */
import { X } from "lucide-vue-next";

withDefaults(
  defineProps<{ open: boolean; title: string; description?: string; width?: "md" | "lg" }>(),
  { description: undefined, width: "md" },
);

defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" class="absolute inset-0 bg-black/40" aria-label="Close panel" @click="$emit('close')" />
      <aside
        class="relative flex h-full w-full flex-col border-l border-line bg-surface shadow-xl"
        :class="width === 'lg' ? 'sm:w-[42rem]' : 'sm:w-[28rem]'"
      >
        <header class="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 class="text-sm font-semibold text-content">{{ title }}</h2>
            <p v-if="description" class="mt-0.5 text-xs text-content-muted">{{ description }}</p>
          </div>
          <button
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-surface-hover"
            aria-label="Close panel"
            @click="$emit('close')"
          >
            <X class="size-4" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3"
        >
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
