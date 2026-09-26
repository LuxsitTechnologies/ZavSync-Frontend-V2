<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { NavItem } from "@/lib/nav";

const props = defineProps<{ item: NavItem }>();
const route = useRoute();
const active = computed(() => props.item.to === route.path);
</script>

<template>
  <span
    v-if="!item.to"
    class="nav-item cursor-not-allowed opacity-55"
    title="This capability is unavailable"
  >
    <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
    <span class="truncate">{{ item.label }}</span>
    <span v-if="item.badge" class="zs-badge badge-brand ml-auto">{{ item.badge }}</span>
  </span>
  <RouterLink
    v-else
    :to="item.to"
    class="nav-item"
    :aria-current="active ? 'page' : undefined"
  >
    <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
    <span class="truncate">{{ item.label }}</span>
    <span v-if="item.badge" class="zs-badge badge-brand ml-auto">{{ item.badge }}</span>
  </RouterLink>
</template>
