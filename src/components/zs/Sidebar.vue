<script setup lang="ts">
import { RouterLink } from "vue-router";

import Logo from "./Logo.vue";
import NavBranch from "./NavBranch.vue";
import NavLeaf from "./NavLeaf.vue";
import { navigation } from "@/lib/nav";
import { cn } from "@/lib/utils";

withDefaults(defineProps<{ class?: string }>(), { class: "" });
</script>

<template>
  <aside
    :class="
      cn(
        'flex h-full w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
        $props.class,
      )
    "
  >
    <div
      class="flex h-header shrink-0 items-center justify-center border-b border-sidebar-border px-4"
    >
      <RouterLink to="/" aria-label="ZavSync home" class="flex items-center">
        <Logo class="h-5" />
      </RouterLink>
    </div>

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      <div v-for="group in navigation" :key="group.label" class="space-y-0.5">
        <p class="label-caps px-2.5 pb-1.5 text-sidebar-label">{{ group.label }}</p>
        <template v-for="item in group.items" :key="item.label">
          <NavBranch v-if="item.children" :item="item" />
          <NavLeaf v-else :item="item" />
        </template>
      </div>
    </nav>

    <div class="border-t border-sidebar-border p-3">
      <div class="rounded-md bg-surface-sunken p-3">
        <p class="text-xs font-semibold text-content">ZavSync preview</p>
        <p class="mt-1 text-xs text-content-muted">Mock data only — no backend connected yet.</p>
      </div>
    </div>
  </aside>
</template>
