<script setup lang="ts" generic="T extends { id: string | number }">
import { cn } from "@/lib/utils";

export interface Column {
  key: string;
  header: string;
  class?: string;
  align?: "left" | "right";
}

withDefaults(
  defineProps<{
    columns: Column[];
    rows: T[];
    minWidth?: number;
    empty?: string;
  }>(),
  { minWidth: 860, empty: "Nothing to show yet." },
);

defineSlots<
  {
    [key: string]: (props: { row: T }) => unknown;
  } & { footer?: () => unknown }
>();
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full" :style="{ minWidth: `${minWidth}px` }">
      <thead>
        <tr class="table-head">
          <th
            v-for="c in columns"
            :key="c.key"
            :class="cn('px-4 py-2.5', c.align === 'right' ? 'text-right' : 'text-left')"
          >
            {{ c.header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="table-row-zs">
          <td
            v-for="c in columns"
            :key="c.key"
            :class="cn('px-4 text-content-secondary', c.align === 'right' && 'text-right', c.class)"
          >
            <slot :name="c.key" :row="row" />
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="p-10 text-center text-sm text-content-muted">
            {{ empty }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div
    v-if="$slots.footer"
    class="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-content-muted"
  >
    <slot name="footer" />
  </div>
</template>
