<script setup lang="ts">
import { Mail, RefreshCw, Unplug } from "lucide-vue-next";
import ZButton from "@/components/zs/ZButton.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import type { OutreachConnection } from "@/types/outreach";

defineProps<{ integration: OutreachConnection; busy?: boolean }>();
defineEmits<{ connect: []; disconnect: []; sync: [] }>();
</script>

<template>
  <article class="panel p-4">
    <div class="flex items-start gap-3">
      <span class="grid size-10 place-items-center rounded-md bg-surface-sunken text-content"><Mail class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-sm font-semibold text-content">{{ integration.name }}</h3><StatusBadge :status="integration.status" /></div>
        <p class="mt-1 text-xs text-content-secondary">{{ integration.provider_type }} · {{ integration.identities_count ?? 0 }} identities</p>
        <p v-if="integration.last_verified_at" class="mt-1 text-2xs text-content-muted">Last verified {{ new Date(integration.last_verified_at).toLocaleString('en-GB') }}</p>
        <p v-if="integration.last_error" class="mt-1 text-2xs text-danger">{{ integration.last_error }}</p>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <ZButton v-if="integration.status !== 'CONNECTED'" :disabled="busy" @click="$emit('connect')"><RefreshCw class="size-3.5" />Verify</ZButton>
      <template v-else><ZButton variant="outline" :disabled="busy" @click="$emit('sync')"><RefreshCw class="size-3.5" />Sync replies</ZButton><ZButton variant="outline" :disabled="busy" @click="$emit('disconnect')"><Unplug class="size-3.5" />Disconnect</ZButton></template>
    </div>
  </article>
</template>
