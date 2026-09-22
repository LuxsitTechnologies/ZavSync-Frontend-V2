<script setup lang="ts">
/** Confirmation for consequential accounting actions (post, reverse, close period). */
import { AlertTriangle } from "lucide-vue-next";

import ZButton from "./ZButton.vue";

withDefaults(
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

defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button type="button" class="absolute inset-0 bg-black/40" aria-label="Cancel" @click="$emit('cancel')" />
      <div class="panel relative w-full max-w-md p-5">
        <div class="flex gap-3">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-full"
            :class="tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary-subtle text-primary-subtle-fg'"
          >
            <AlertTriangle class="size-4" />
          </span>
          <div>
            <h2 class="text-sm font-semibold text-content">{{ title }}</h2>
            <p class="mt-1 text-xs text-content-secondary">{{ message }}</p>
          </div>
        </div>
        <div v-if="$slots.default" class="mt-4">
          <slot />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <ZButton variant="outline" :disabled="busy" @click="$emit('cancel')">{{ cancelLabel }}</ZButton>
          <ZButton :disabled="busy" @click="$emit('confirm')">
            {{ busy ? "Working…" : confirmLabel }}
          </ZButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
