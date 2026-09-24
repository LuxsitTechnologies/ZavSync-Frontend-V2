<script setup lang="ts">
import { ref } from "vue";
import { X } from "lucide-vue-next";

import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";

const navOpen = ref(false);
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <div class="hidden lg:block">
      <Sidebar class="fixed inset-y-0 left-0" />
    </div>
    <div class="hidden w-sidebar shrink-0 lg:block" aria-hidden="true" />

    <div v-if="navOpen" class="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        class="absolute inset-0 bg-black/40"
        @click="navOpen = false"
      />
      <div class="relative h-full w-sidebar">
        <Sidebar />
        <button
          type="button"
          class="absolute top-3.5 -right-9 grid size-8 place-items-center rounded-md bg-surface text-content-secondary"
          aria-label="Close navigation"
          @click="navOpen = false"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col overflow-x-hidden">
      <Topbar @open-nav="navOpen = true" />
      <main class="mx-auto min-w-0 w-full max-w-content flex-1 animate-fade-in p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
