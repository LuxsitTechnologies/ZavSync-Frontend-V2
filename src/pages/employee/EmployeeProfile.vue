<script setup lang="ts">
import { computed } from "vue";

import PortalShell from "@/components/employee/PortalShell.vue";
import ProfileContent from "@/components/identity/ProfileContent.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { initials } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePortalStore } from "@/stores/employeePortal";

setPageMeta("My Profile", "Your account and read-only employee identity.");
const company = useCompanyStore();
const portal = useEmployeePortalStore();
const identity = computed(() => portal.employee?.employee);
</script>

<template>
  <PortalShell>
    <PageHeader title="My Profile" description="Review your account and employee details on record." />
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel class="xl:col-span-1" body-class="p-5">
        <div class="flex flex-col items-center text-center">
          <div class="grid size-20 place-items-center rounded-full bg-primary-subtle text-xl font-semibold text-primary-subtle-fg">{{ initials(identity?.full_name ?? company.currentUser.name) }}</div>
          <h2 class="mt-3 text-base font-semibold text-content">{{ identity?.full_name ?? company.currentUser.name }}</h2>
          <p class="text-sm text-content-secondary">{{ identity?.designation ?? company.activeCompany?.name ?? 'Account profile' }}</p>
          <p v-if="identity" class="num mt-1 text-xs text-content-muted">Employee ID: {{ identity.employee_code }}</p>
          <StatusBadge v-if="identity" :status="identity.status" class="mt-3" />
          <p class="mt-3 text-xs text-content-muted">Employee details are read-only. Account name and password are managed separately below.</p>
        </div>
      </Panel>
      <div class="xl:col-span-2"><p v-if="company.switching" class="panel p-5" role="status">Switching company…</p><ProfileContent v-else :key="`${company.currentUser.id}:${company.contextVersion}`" /></div>
    </div>
  </PortalShell>
</template>
