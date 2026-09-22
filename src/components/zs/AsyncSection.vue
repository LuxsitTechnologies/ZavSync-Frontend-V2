<script setup lang="ts">
/**
 * Standard state machine wrapper for every API-driven accounting screen:
 * loading → error (server / permission / validation / offline) → empty → content.
 */
import { AlertTriangle, Inbox, Loader2, Lock, RefreshCw, WifiOff } from "lucide-vue-next";

import type { ApiError } from "@/services/api/client";
import ZButton from "./ZButton.vue";

withDefaults(
  defineProps<{
    loading: boolean;
    error?: ApiError | null;
    empty?: boolean;
    emptyTitle?: string;
    emptyMessage?: string;
    rows?: number;
  }>(),
  {
    error: null,
    empty: false,
    emptyTitle: "Nothing here yet",
    emptyMessage: "Records will appear here once they exist for this company.",
    rows: 5,
  },
);

defineEmits<{ retry: [] }>();

const TITLES: Record<string, string> = {
  permission: "You don't have access to this",
  validation: "We couldn't process that request",
  not_found: "Not found",
  conflict: "That action isn't allowed right now",
  network: "Can't reach the server",
  server: "Something went wrong",
};
</script>

<template>
  <div v-if="loading" class="p-4" role="status" aria-live="polite">
    <div class="flex items-center gap-2 text-xs text-content-muted">
      <Loader2 class="size-3.5 animate-spin" />
      Loading…
    </div>
    <div class="mt-3 space-y-2">
      <div v-for="n in rows" :key="n" class="h-8 rounded-md bg-surface-sunken" />
    </div>
  </div>

  <div v-else-if="error" class="p-8 text-center">
    <span
      class="mx-auto grid size-10 place-items-center rounded-full"
      :class="error.kind === 'permission' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'"
    >
      <Lock v-if="error.kind === 'permission'" class="size-4" />
      <WifiOff v-else-if="error.kind === 'network'" class="size-4" />
      <AlertTriangle v-else class="size-4" />
    </span>
    <p class="mt-3 text-sm font-semibold text-content">{{ TITLES[error.kind] ?? TITLES["server"] }}</p>
    <p class="mx-auto mt-1 max-w-md text-xs text-content-secondary">{{ error.message }}</p>
    <ZButton variant="outline" class="mt-4" @click="$emit('retry')">
      <RefreshCw class="size-3.5" /> Try again
    </ZButton>
  </div>

  <div v-else-if="empty" class="p-10 text-center">
    <span class="mx-auto grid size-10 place-items-center rounded-full bg-surface-sunken text-content-muted">
      <Inbox class="size-4" />
    </span>
    <p class="mt-3 text-sm font-semibold text-content">{{ emptyTitle }}</p>
    <p class="mx-auto mt-1 max-w-md text-xs text-content-secondary">{{ emptyMessage }}</p>
    <div class="mt-4 flex justify-center">
      <slot name="empty-action" />
    </div>
  </div>

  <slot v-else />
</template>
