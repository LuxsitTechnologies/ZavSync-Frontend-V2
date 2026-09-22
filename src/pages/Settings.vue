<script setup lang="ts">
import { ref } from "vue";
import { Building2, Save } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import { companies } from "@/lib/mock-data";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Settings", "Company profile, tax registration, fiscal calendar and integrations.");

const TABS = ["Company", "Tax & FBR", "Payroll", "Integrations"] as const;
const tab = ref<(typeof TABS)[number]>("Company");

const integrations = [
  { name: "FBR IRIS", state: "Connected", tone: "badge-success" },
  { name: "Habib Metro bank feed", state: "Connected", tone: "badge-success" },
  { name: "Biometric devices (ZKTeco)", state: "Connected", tone: "badge-success" },
  { name: "Email (SMTP relay)", state: "Not configured", tone: "badge-neutral" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Settings" description="Configuration for the active company workspace">
      <template #actions>
        <ZButton>
          <Save class="size-4" /> Save changes
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap gap-1 border-b border-line">
      <button
        v-for="t in TABS"
        :key="t"
        type="button"
        :class="
          t === tab
            ? '-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-content'
            : '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-content-secondary hover:text-content'
        "
        @click="tab = t"
      >
        {{ t }}
      </button>
    </div>

    <div v-if="tab === 'Company'" class="grid gap-4 lg:grid-cols-2">
      <Panel title="Company profile" body-class="space-y-4 p-4">
        <Field label="Legal name" model-value="Zavtech Solutions (Pvt) Ltd" />
        <Field label="Trading name" model-value="Zavtech" />
        <Field label="Registered address" model-value="12-C, Gulberg III, Lahore" />
        <Field label="Primary contact" type="email" model-value="finance@zavtech.io" />
      </Panel>
      <Panel title="Companies in workspace" body-class="divide-y divide-line">
        <div v-for="c in companies" :key="c.id" class="flex items-center gap-3 px-4 py-3">
          <span class="grid size-8 place-items-center rounded-md bg-surface-sunken text-content-secondary">
            <Building2 class="size-4" />
          </span>
          <div class="leading-tight">
            <p class="text-sm font-medium text-content">{{ c.name }}</p>
            <p class="text-2xs text-content-muted">Isolated ledger, payroll and rota data</p>
          </div>
        </div>
      </Panel>
    </div>

    <div v-if="tab === 'Tax & FBR'" class="grid gap-4 lg:grid-cols-2">
      <Panel title="Tax registration" body-class="space-y-4 p-4">
        <Field label="NTN" model-value="0712345-8" />
        <Field label="STRN" model-value="17-00-9911-004-55" />
        <Field label="Provincial authority" model-value="Punjab Revenue Authority" />
      </Panel>
      <Panel title="FBR digital invoicing" body-class="space-y-4 p-4">
        <Field label="IRIS endpoint" model-value="https://gw.fbr.gov.pk/di_data/v1" />
        <Field label="POS / integration ID" model-value="7000021" />
        <Field
          label="Submission schedule"
          model-value="Nightly 23:00 PKT"
          hint="Rejected documents are retried once, then flagged for review."
        />
      </Panel>
    </div>

    <div v-if="tab === 'Payroll'" class="grid gap-4 lg:grid-cols-2">
      <Panel title="Pay cycle" body-class="space-y-4 p-4">
        <Field label="Cycle" model-value="Monthly — 28th" />
        <Field label="Cut-off for attendance" model-value="25th of month" />
        <Field label="Overtime multiplier" model-value="2.0×" />
      </Panel>
      <Panel title="Statutory defaults" body-class="space-y-4 p-4">
        <Field label="EOBI contribution" model-value="PKR 370 per registered employee" />
        <Field label="Provident fund" model-value="8.33% of basic" />
        <Field label="Tax slabs" model-value="FBR 2026–27" />
      </Panel>
    </div>

    <Panel v-if="tab === 'Integrations'" title="Connected services" body-class="divide-y divide-line">
      <div v-for="i in integrations" :key="i.name" class="flex items-center justify-between px-4 py-3">
        <span class="text-sm text-content">{{ i.name }}</span>
        <span :class="`zs-badge ${i.tone}`">{{ i.state }}</span>
      </div>
    </Panel>
  </AppShell>
</template>
