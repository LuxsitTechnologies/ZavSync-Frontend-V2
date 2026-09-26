<script setup lang="ts">
import { BrainCircuit, ShieldCheck } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Predictive Analytics", "Predictive financial models are outside the Stage 12 boundary.");
</script>

<template>
  <AppShell>
    <PageHeader title="Predictive Analytics" description="No forecast is displayed without an authoritative model and verified source data" />
    <div class="grid gap-4 lg:grid-cols-2">
      <Panel title="No predictive model configured"><div class="p-8 text-center"><BrainCircuit class="mx-auto size-10 text-content-brand"/><h2 class="mt-4 text-lg font-semibold text-content">Predictive modelling is not enabled</h2><p class="mt-2 text-sm text-content-secondary">Stage 12 provides authorized retrieval, read-only business tools and citation-backed answers. It does not introduce probabilistic forecasting or automatic business decisions.</p></div></Panel>
      <Panel title="Financial boundary"><div class="flex gap-2 p-5 text-xs text-content-secondary"><ShieldCheck class="size-4 shrink-0 text-success"/>No forecast value is presented as posted, authoritative or available for automatic accounting action.</div></Panel>
    </div>
  </AppShell>
</template>
