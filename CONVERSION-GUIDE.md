# React → Vue conversion conventions (ZavSync)

Source of truth: the React app in `/dev-server/src/routes/*.tsx`.
Target: `/mnt/documents/zavsync-vue/src/pages/*.vue` (Vue 3 `<script setup lang="ts">`).

## Rules

1. **Keep markup, classes, copy, columns, mock data usage and logic identical.**
   Only the framework syntax changes. Do not simplify or drop sections.
2. Imports:
   - `@/components/zs/AppShell` → `AppShell from "@/components/zs/AppShell.vue"` (slot-based, no props)
   - `PageHeader` → `PageHeader.vue` (props `title`, `description`; `<template #actions>` slot)
   - `Button` → `ZButton.vue` (props `variant`, `class`, `type`)
   - `Panel` → `Panel.vue` (props `title`, `description`, `class`, `bodyClass`; `#actions` slot)
   - `StatCard`, `Toolbar`, `SearchInput`, `StatusBadge`, `DataTable` → same names `.vue`
   - `lucide-react` → `lucide-vue-next`
   - `Link to="/x"` → `<RouterLink to="/x">` from `vue-router`
3. `DataTable.vue` API: `:columns="[{ key, header, align?, class? }]"` and `:rows`.
   Each cell body becomes a named slot matching the column key:
   ```vue
   <DataTable :columns="columns" :rows="rows">
     <template #name="{ row }">{{ row.name }}</template>
     <template #footer>Showing …</template>
   </DataTable>
   ```
   Column definitions live in `<script setup>` as `const columns = [...]` (no `render`).
4. `SearchInput` uses `v-model`. React `useState` → `ref`, `useMemo` → `computed`.
5. Page metadata: replace the route `head()`/`pageMeta(...)` with
   ```ts
   import { setPageMeta } from "@/lib/page-meta";
   setPageMeta("Employees", "…same description…");
   ```
   called at the top level of `<script setup>`.
6. Recharts usage (dashboard only) → `AreaChart.vue`
   (`:data`, `x-key`, `:series="[{ key, color: 'var(--chart-1)', id: 'gInvoiced' }]"`).
7. Conditional JSX (`cond ? <a/> : null`) → `v-if`; `.map()` → `v-for` with `:key`.
8. Template class strings that were template literals become `:class` bindings, or use
   `cn()` from `@/lib/utils`.
9. No `export const Route`; a page is a plain SFC with a default export.
