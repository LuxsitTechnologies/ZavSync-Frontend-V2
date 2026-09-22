<script setup lang="ts">
import { CalendarRange, Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import { rota, rotaDays } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Rotas", "Weekly shift planner for field teams with coverage and hour totals.");

function shiftTone(shift: string) {
  if (shift.startsWith("06")) return "bg-info-subtle text-info-strong";
  if (shift.startsWith("14")) return "bg-warning-subtle text-warning-strong";
  return "bg-primary-subtle text-primary-subtle-fg";
}

const totalHours = rota.reduce((s, r) => s + r.hours, 0);
</script>

<template>
  <AppShell>
    <PageHeader title="Rotas" description="Week of 24–30 August 2026">
      <template #actions>
        <ZButton variant="outline">
          <CalendarRange class="size-4" /> Copy last week
        </ZButton>
        <ZButton>
          <Plus class="size-4" /> Add shift
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Scheduled staff" :value="String(rota.length)" hint="Across 5 sites" tone="brand" />
      <StatCard label="Planned hours" :value="String(totalHours)" hint="This week" />
      <StatCard label="Uncovered shifts" value="3" hint="Night shift, Sun 30" tone="danger" />
      <StatCard label="Overtime risk" value="2 staff" hint="Above 48h contract cap" tone="warning" />
    </div>

    <Panel title="Weekly planner" description="Colour indicates shift band: morning, evening, night">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px]">
          <thead>
            <tr class="table-head">
              <th class="px-4 py-2.5 text-left">Employee</th>
              <th v-for="d in rotaDays" :key="d" class="px-3 py-2.5 text-left">
                {{ d }}
              </th>
              <th class="px-4 py-2.5 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rota" :key="r.id" class="table-row-zs">
              <td class="px-4">
                <p class="font-medium text-content">{{ r.employee }}</p>
                <p class="text-2xs text-content-muted">{{ r.site }}</p>
              </td>
              <td v-for="(s, i) in r.shifts" :key="i" class="px-3">
                <span
                  v-if="s"
                  :class="`num inline-block rounded-md px-2 py-1 text-2xs font-medium ${shiftTone(s)}`"
                >
                  {{ s }}
                </span>
                <span v-else class="text-2xs text-content-muted">Off</span>
              </td>
              <td class="num px-4 text-right text-content-secondary">{{ r.hours }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </AppShell>
</template>
