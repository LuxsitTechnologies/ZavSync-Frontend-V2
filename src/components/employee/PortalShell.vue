<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { X } from "lucide-vue-next";

import PortalSidebar from "./PortalSidebar.vue";
import PortalTopbar from "./PortalTopbar.vue";
import { useEmployeePortalStore } from "@/stores/employeePortal";

const portal = useEmployeePortalStore();
const route = useRoute();
const navOpen = ref(false);
const topbar = ref<InstanceType<typeof PortalTopbar> | null>(null);
const closeButton = ref<HTMLElement | null>(null);

watch(() => route.path, () => { navOpen.value = false; });
async function openNavigation(): Promise<void> {
  navOpen.value = true;
  await nextTick();
  closeButton.value?.focus();
}
function closeNavigation(): void {
  navOpen.value = false;
  topbar.value?.focusMenu();
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <div class="hidden lg:block"><PortalSidebar class="fixed inset-y-0 left-0" /></div>
    <div class="hidden w-sidebar shrink-0 lg:block" aria-hidden="true" />

    <div v-if="navOpen" class="fixed inset-0 z-40 lg:hidden" @keydown.esc="closeNavigation">
      <button type="button" aria-label="Close navigation" class="absolute inset-0 bg-black/40" @click="closeNavigation" />
      <div class="relative h-full w-sidebar">
        <PortalSidebar @navigate="closeNavigation" />
        <button ref="closeButton" type="button" class="absolute top-3.5 -right-9 grid size-8 place-items-center rounded-md bg-surface text-content-secondary" aria-label="Close navigation" @click="closeNavigation"><X class="size-4" /></button>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col overflow-x-hidden">
      <PortalTopbar ref="topbar" @open-nav="openNavigation" />
      <main class="mx-auto w-full min-w-0 max-w-content flex-1 animate-fade-in p-4 lg:p-6">
        <p v-if="portal.employeeError" class="mb-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{{ portal.employeeError.message }} <button type="button" class="underline" @click="portal.loadEmployee">Retry</button></p>
        <slot />
      </main>
    </div>
  </div>
</template>
