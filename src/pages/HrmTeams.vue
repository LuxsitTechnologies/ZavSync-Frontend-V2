<script setup lang="ts">
import { Plus, Users } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import { teams } from "@/lib/mock-modules";
import { initials } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Teams", "Team structure, leads, headcount and utilisation across departments.");

const headcount = teams.reduce((s, t) => s + t.members, 0);
const openRoles = teams.reduce((s, t) => s + t.open_roles, 0);
</script>

<template>
  <AppShell>
    <PageHeader
      title="Teams"
      :description="`${teams.length} teams · ${headcount} people · ${openRoles} open roles`"
    >
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New team
        </ZButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="t in teams" :key="t.id" class="panel p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-content">{{ t.name }}</h2>
            <p class="mt-0.5 text-xs text-content-muted">{{ t.department }}</p>
          </div>
          <span class="zs-badge badge-neutral">
            <Users class="mr-1 size-3" /> {{ t.members }}
          </span>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <span
            class="grid size-7 place-items-center rounded-full bg-primary-subtle text-2xs font-semibold text-primary-subtle-fg"
          >
            {{ initials(t.lead) }}
          </span>
          <div class="leading-tight">
            <p class="text-xs font-medium text-content">{{ t.lead }}</p>
            <p class="text-2xs text-content-muted">Team lead</p>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-2xs text-content-muted">
            <span>Utilisation</span>
            <span class="num">{{ t.utilisation }}%</span>
          </div>
          <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span
              :class="t.utilisation > 90 ? 'block h-full bg-warning' : 'block h-full bg-primary'"
              :style="{ width: `${t.utilisation}%` }"
            />
          </div>
        </div>

        <p class="mt-3 border-t border-line pt-3 text-2xs text-content-muted">
          {{ t.open_roles > 0 ? `${t.open_roles} open role(s) in hiring` : "Fully staffed" }}
        </p>
      </article>
    </div>

    <Panel class="mt-4" title="Hiring pipeline" description="Roles open against approved budget">
      <ul class="divide-y divide-line">
        <li
          v-for="t in teams.filter((t) => t.open_roles > 0)"
          :key="t.id"
          class="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span class="text-content">{{ t.name }}</span>
          <span class="num text-content-secondary">{{ t.open_roles }} open</span>
        </li>
      </ul>
    </Panel>
  </AppShell>
</template>
