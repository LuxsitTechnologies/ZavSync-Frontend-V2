<script setup lang="ts">
/** Responsive centered dialog used for create/edit/view flows. */
import { nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{ open: boolean; title: string; description?: string; width?: "md" | "lg" }>(),
  { description: undefined, width: "md" },
);

const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement | null>(null);
const titleId = useId();
let previousFocus: HTMLElement | null = null;

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !panel.value) return;
  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) {
    event.preventDefault();
    panel.value.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      const first = panel.value?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (first ?? panel.value)?.focus();
    } else {
      window.removeEventListener("keydown", onKeydown);
      previousFocus?.focus();
      previousFocus = null;
    }
  },
);

onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <button type="button" class="absolute inset-0 bg-black/40" tabindex="-1" aria-label="Close panel" @click="$emit('close')" />
      <aside
        ref="panel"
        tabindex="-1"
        class="relative flex max-h-[calc(100dvh-1rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        :class="width === 'lg' ? 'max-w-3xl' : 'max-w-xl'"
      >
        <header class="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 :id="titleId" class="text-sm font-semibold text-content">{{ title }}</h2>
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
          class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3"
        >
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
