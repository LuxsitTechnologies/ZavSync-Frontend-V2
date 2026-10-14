<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";

import NavLeaf from "./NavLeaf.vue";
import { activeNavigationPath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const props = defineProps<{ item: NavItem }>();
const route = useRoute();

function isActive(item: NavItem, pathname: string): boolean {
  const active = activeNavigationPath(pathname);
  return item.to === active || Boolean(item.children?.some(child => child.to === active));
}

const open = ref(isActive(props.item, route.path));
watch(() => route.path, path => { if (isActive(props.item, path)) open.value = true; });
</script>

<template>
  <div>
    <button
      type="button"
      class="nav-item w-full"
      :aria-expanded="open"
      @click="open = !open"
    >
      <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
      <span class="truncate">{{ item.label }}</span>
      <ChevronDown :class="cn('ml-auto size-3.5 transition-transform', open && 'rotate-180')" />
    </button>
    <div v-if="open" class="mt-0.5 ml-4 space-y-0.5 border-l border-line pl-2">
      <NavLeaf v-for="child in item.children" :key="child.label" :item="child" />
    </div>
  </div>
</template>
