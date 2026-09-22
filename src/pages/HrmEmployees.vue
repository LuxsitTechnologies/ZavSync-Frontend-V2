<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, Filter, Plus, Search } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { employees, type EmployeeStatus } from "@/lib/mock-data";
import { initials, labelize, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta(
  "Employees",
  "Search, filter and manage the employee directory across departments, employment types and statuses.",
);

const STATUSES: (EmployeeStatus | "all")[] = [
  "all",
  "active",
  "probation",
  "on_leave",
  "notice_period",
  "resigned",
  "terminated",
];

const query = ref("");
const status = ref<EmployeeStatus | "all">("all");
const department = ref("all");

const departments = computed(() => [
  "all",
  ...Array.from(new Set(employees.map((e) => e.department))),
]);

const rows = computed(() =>
  employees.filter((e) => {
    const q = query.value.trim().toLowerCase();
    const matchesQuery =
      !q ||
      e.full_name.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q);
    const matchesStatus = status.value === "all" || e.status === status.value;
    const matchesDept = department.value === "all" || e.department === department.value;
    return matchesQuery && matchesStatus && matchesDept;
  }),
);
</script>

<template>
  <AppShell>
    <PageHeader
      title="Employees"
      :description="`${employees.length} people across ${departments.length - 1} departments`"
    >
      <template #actions>
        <ZButton variant="outline">
          <Download class="size-4" /> Export
        </ZButton>
        <ZButton>
          <Plus class="size-4" /> Add employee
        </ZButton>
      </template>
    </PageHeader>

    <div class="panel overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div class="relative min-w-56 flex-1">
          <Search
            class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-muted"
          />
          <input
            v-model="query"
            placeholder="Search name, code or email"
            class="field pl-8"
            aria-label="Search employees"
          />
        </div>
        <select v-model="department" class="field w-44" aria-label="Filter by department">
          <option v-for="d in departments" :key="d" :value="d">
            {{ d === "all" ? "All departments" : d }}
          </option>
        </select>
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option v-for="s in STATUSES" :key="s" :value="s">
            {{ s === "all" ? "All statuses" : labelize(s) }}
          </option>
        </select>
        <ZButton variant="ghost">
          <Filter class="size-4" /> More filters
        </ZButton>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead>
            <tr class="table-head">
              <th class="px-4 py-2.5 text-left">Employee</th>
              <th class="px-4 py-2.5 text-left">Code</th>
              <th class="px-4 py-2.5 text-left">Department</th>
              <th class="px-4 py-2.5 text-left">Designation</th>
              <th class="px-4 py-2.5 text-left">Type</th>
              <th class="px-4 py-2.5 text-left">Joined</th>
              <th class="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in rows" :key="e.id" class="table-row-zs cursor-pointer">
              <td class="px-4">
                <div class="flex items-center gap-2.5">
                  <span
                    class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-subtle text-2xs font-semibold text-primary-subtle-fg"
                  >
                    {{ initials(e.full_name) }}
                  </span>
                  <div class="leading-tight">
                    <p class="font-medium text-content">{{ e.full_name }}</p>
                    <p class="text-2xs text-content-muted">{{ e.email }}</p>
                  </div>
                </div>
              </td>
              <td class="num px-4 text-content-secondary">{{ e.employee_code }}</td>
              <td class="px-4 text-content-secondary">{{ e.department }}</td>
              <td class="px-4 text-content-secondary">{{ e.designation }}</td>
              <td class="px-4 text-content-secondary">{{ labelize(e.employment_type) }}</td>
              <td class="num px-4 text-content-muted">{{ shortDate(e.joining_date) }}</td>
              <td class="px-4">
                <StatusBadge :status="e.status" />
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="7" class="p-10 text-center text-sm text-content-muted">
                No employees match these filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-content-muted"
      >
        <span>Showing {{ rows.length }} of {{ employees.length }} employees</span>
        <div class="flex items-center gap-1">
          <ZButton variant="outline" disabled>Previous</ZButton>
          <ZButton variant="outline" disabled>Next</ZButton>
        </div>
      </div>
    </div>
  </AppShell>
</template>
