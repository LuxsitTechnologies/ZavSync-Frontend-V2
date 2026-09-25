<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute,useRouter } from "vue-router";
import { ChevronRight, Menu, Moon, Search, Sun } from "lucide-vue-next";

import { breadcrumbFor,moduleForPath } from "@/lib/nav";
import { useCompanyStore } from "@/stores/company";
import { initials } from "@/lib/format";
import NotificationCenter from "./NotificationCenter.vue";
import {showToast} from "@/composables/useToast";

defineEmits<{ openNav: [] }>();

const route = useRoute();
const router=useRouter();
const trail = computed(() => breadcrumbFor(route.path));
const dark = ref(false);
const companyStore = useCompanyStore();
const currentUser = computed(() => companyStore.currentUser);

function toggleTheme() {
  dark.value = !dark.value;
  document.documentElement.classList.toggle("dark", dark.value);
}
async function changeCompany(id:string){try{await companyStore.setCompany(id);const module=moduleForPath(route.path);if(module&&!companyStore.hasModule(module))await router.push('/')}catch(error){showToast('Company switch failed',error instanceof Error?error.message:'Could not switch company.','danger')}}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-header shrink-0 items-center gap-3 border-b border-line bg-surface px-4"
  >
    <button
      type="button"
      class="grid size-8 place-items-center rounded-md text-content-secondary hover:bg-surface-hover lg:hidden"
      aria-label="Open navigation"
      @click="$emit('openNav')"
    >
      <Menu class="size-4" />
    </button>

    <nav aria-label="Breadcrumb" class="hidden items-center gap-1.5 text-sm sm:flex">
      <template v-for="(crumb, i) in trail" :key="`${crumb.label}-${i}`">
        <ChevronRight v-if="i > 0" class="size-3.5 text-content-muted" />
        <RouterLink v-if="crumb.to" :to="crumb.to" class="text-content hover:text-content-brand">
          {{ crumb.label }}
        </RouterLink>
        <span v-else class="text-content-muted">{{ crumb.label }}</span>
      </template>
    </nav>

    <div class="ml-auto flex items-center gap-2">
      <div class="relative hidden md:block">
        <Search
          class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-muted"
        />
        <input
          type="search"
          placeholder="Search employees, invoices…"
          class="field w-64 pl-8"
          aria-label="Global search"
        />
      </div>

      <select
        :value="companyStore.activeCompanyId"
        class="field w-44"
        aria-label="Active company"
        @change="changeCompany(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="c in companyStore.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <button
        type="button"
        class="grid size-8 place-items-center rounded-md text-content-secondary hover:bg-surface-hover"
        aria-label="Toggle theme"
        @click="toggleTheme"
      >
        <Sun v-if="dark" class="size-4" />
        <Moon v-else class="size-4" />
      </button>

      <NotificationCenter/>

      <div class="flex items-center gap-2 border-l border-line pl-3">
        <span
          class="grid size-7 place-items-center rounded-full bg-primary-subtle text-2xs font-semibold text-primary-subtle-fg"
        >
          {{ initials(currentUser.name) }}
        </span>
        <div class="hidden leading-tight lg:block">
          <p class="text-xs font-semibold text-content">{{ currentUser.name }}</p>
          <p class="text-2xs text-content-muted">{{ currentUser.role }}</p>
        </div>
      </div>
    </div>
  </header>
</template>
