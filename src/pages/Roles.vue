<script setup lang="ts">
import { Plus, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import { permissionMatrix, roles } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Roles & Permissions", "Role definitions, tenant scope and the module permission matrix.");

const columns: Column[] = [
  { key: "name", header: "Role" },
  { key: "scope", header: "Scope" },
  { key: "users", header: "Users", align: "right", class: "num" },
  { key: "perms", header: "Permissions" },
];

const usersAssigned = roles.reduce((s, r) => s + r.users, 0);
</script>

<template>
  <AppShell>
    <PageHeader
      title="Roles & Permissions"
      description="Access control applies per company, enforced server-side once connected"
    >
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New role
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Roles" :value="String(roles.length)" tone="brand" />
      <StatCard label="Users assigned" :value="String(usersAssigned)" />
      <StatCard label="Super admins" value="2" hint="Cross-company access" tone="warning" />
      <StatCard label="Self-service users" value="611" hint="Employee role" tone="success" />
    </div>

    <Panel title="Roles">
      <DataTable :columns="columns" :rows="roles" :min-width="940">
        <template #name="{ row }">
          <span class="inline-flex items-center gap-2 font-medium text-content">
            <ShieldCheck class="size-3.5 text-content-muted" /> {{ row.name }}
          </span>
        </template>
        <template #scope="{ row }">{{ row.scope }}</template>
        <template #users="{ row }">{{ row.users }}</template>
        <template #perms="{ row }">
          <div class="flex flex-wrap gap-1">
            <span v-for="p in row.permissions" :key="p" class="num zs-badge badge-neutral">
              {{ p }}
            </span>
          </div>
        </template>
        <template #footer>{{ roles.length }} roles</template>
      </DataTable>
    </Panel>

    <Panel class="mt-4" title="Permission matrix" description="Which roles can act on each module">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px]">
          <thead>
            <tr class="table-head">
              <th class="px-4 py-2.5 text-left">Module</th>
              <th class="px-4 py-2.5 text-left">View</th>
              <th class="px-4 py-2.5 text-left">Create / edit</th>
              <th class="px-4 py-2.5 text-left">Approve</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in permissionMatrix" :key="m.module" class="table-row-zs">
              <td class="px-4 font-medium text-content">{{ m.module }}</td>
              <td v-for="(list, i) in [m.view, m.create, m.approve]" :key="i" class="px-4">
                <div class="flex flex-wrap gap-1">
                  <span v-for="role in list" :key="role" class="zs-badge badge-brand">
                    {{ role }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </AppShell>
</template>
