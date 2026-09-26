<script setup lang="ts">
/** Confirmation for consequential accounting actions (post, reverse, close period). */
import { nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { AlertTriangle } from "lucide-vue-next";

import ZButton from "./ZButton.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "brand";
    busy?: boolean;
  }>(),
  { confirmLabel: "Confirm", cancelLabel: "Cancel", tone: "brand", busy: false },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLElement | null>(null);
const titleId = useId();
const messageId = useId();
let previousFocus: HTMLElement | null = null;

function cancel() {
  if (!props.busy) emit("cancel");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    cancel();
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) {
    event.preventDefault();
    dialog.value.focus();
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
      dialog.value?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
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
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="messageId">
      <button type="button" class="absolute inset-0 bg-black/40" tabindex="-1" aria-label="Cancel" @click="cancel" />
      <div ref="dialog" class="panel relative w-full max-w-md p-5" tabindex="-1">
        <div class="flex gap-3">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-full"
            :class="tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary-subtle text-primary-subtle-fg'"
          >
            <AlertTriangle class="size-4" />
          </span>
          <div>
            <h2 :id="titleId" class="text-sm font-semibold text-content">{{ title }}</h2>
            <p :id="messageId" class="mt-1 text-xs text-content-secondary">{{ message }}</p>
          </div>
        </div>
        <div v-if="$slots.default" class="mt-4">
          <slot />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <ZButton variant="outline" :disabled="busy" @click="cancel">{{ cancelLabel }}</ZButton>
          <ZButton :disabled="busy" @click="$emit('confirm')">
            {{ busy ? "Working…" : confirmLabel }}
          </ZButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
