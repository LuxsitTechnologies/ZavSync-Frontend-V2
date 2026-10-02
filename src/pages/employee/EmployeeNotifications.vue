<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Bell, BellOff, Check, CheckCheck } from "lucide-vue-next";

import PortalShell from "@/components/employee/PortalShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePortalStore } from "@/stores/employeePortal";
import type { NotificationPreference } from "@/types/platform";

setPageMeta("Notifications", "Messages addressed to you in your active company.");
const company = useCompanyStore();
const portal = useEmployeePortalStore();
const unreadOnly = ref(false);
const saving = ref(false);
const actionError = ref("");
const actionNotice = ref("");
const draft = ref<NotificationPreference[]>([]);
const rows = computed(() => portal.inbox?.notifications.data.filter(item => !unreadOnly.value || !item.read_at) ?? []);
const loadedCount = computed(() => portal.inbox?.notifications.data.length ?? 0);
const totalCount = computed(() => portal.inbox?.notifications.total ?? 0);

watch(() => portal.preferences, value => { draft.value = value?.map(item => ({ ...item })) ?? []; }, { immediate: true });
watch(() => [company.switching, company.contextVersion] as const, () => {
  actionError.value = "";
  actionNotice.value = "";
  draft.value = [];
  if (!company.switching && company.activeCompanyId) void portal.loadPreferences();
}, { flush: "sync" });
onMounted(() => { if (company.activeCompanyId) void portal.loadPreferences(); });

async function act(action: () => Promise<void>, notice: string): Promise<void> {
  const id = company.activeCompanyId;
  const version = company.contextVersion;
  actionError.value = "";
  actionNotice.value = "";
  try {
    await action();
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version) actionNotice.value = notice;
  } catch (error) {
    if (!company.switching && company.activeCompanyId === id && company.contextVersion === version) actionError.value = error instanceof ApiError ? error.message : "The action could not be completed.";
  }
}

async function savePreferences(): Promise<void> {
  saving.value = true;
  await act(() => portal.savePreferences(draft.value.map(item => ({ ...item }))), "Notification preferences saved.");
  saving.value = false;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
</script>

<template>
  <PortalShell>
    <PageHeader title="Notifications" :description="portal.inbox ? `You have ${portal.inbox.unread_count} unread notification${portal.inbox.unread_count === 1 ? '' : 's'}.` : 'Messages for your active company.'">
      <template #actions><ZButton variant="outline" :disabled="!portal.inbox?.unread_count || portal.notificationsLoading" @click="act(() => portal.readAllNotifications(), 'All notifications marked as read.')"><CheckCheck class="size-4" />Mark all as read</ZButton></template>
    </PageHeader>
    <p v-if="company.switching" class="panel p-4" role="status">Switching company…</p>
    <p v-else-if="actionError" class="mb-4 rounded-md border border-danger/30 p-3 text-sm text-danger" role="alert">{{ actionError }}</p>
    <p v-if="actionNotice" class="mb-4 rounded-md border border-line p-3 text-sm text-content" role="status">{{ actionNotice }}</p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="panel p-4"><p class="label-caps">Total Notifications</p><p class="num mt-2 text-xl font-semibold text-content">{{ portal.inbox ? totalCount : '—' }}</p></div>
      <div class="panel p-4"><p class="label-caps">Unread</p><p class="num mt-2 text-xl font-semibold text-content-brand">{{ portal.inbox?.unread_count ?? '—' }}</p></div>
      <div class="panel p-4"><p class="label-caps">Loaded</p><p class="num mt-2 text-xl font-semibold text-content">{{ portal.inbox ? loadedCount : '—' }}</p></div>
    </div>
    <Panel title="All Notifications" class="mt-4">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <span class="zs-badge badge-brand">All</span>
        <label class="ml-auto flex items-center gap-2 text-xs font-medium text-content-secondary"><input v-model="unreadOnly" type="checkbox" class="size-3.5 accent-primary" />Unread only</label>
      </div>
      <p v-if="portal.notificationsLoading && !portal.inbox" class="p-6 text-sm text-content-muted" role="status">Loading notifications…</p>
      <div v-else-if="portal.notificationsError" class="p-6 text-sm text-danger" role="alert">{{ portal.notificationsError.message }} <button type="button" class="underline" @click="portal.loadNotifications">Retry</button></div>
      <div v-else class="divide-y divide-line">
        <div v-for="item in rows" :key="item.id" class="flex flex-wrap items-start justify-between gap-3 p-4" :class="item.read_at ? '' : 'bg-primary-subtle/40'">
          <div class="flex min-w-0 items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-content-secondary"><Bell class="size-4" /></span><div class="min-w-0"><div class="flex items-center gap-2"><span v-if="!item.read_at" class="size-1.5 shrink-0 rounded-full bg-primary" /><p class="text-sm font-medium text-content">{{ item.title }}</p></div><p class="mt-0.5 text-sm text-content-secondary">{{ item.message }}</p><p class="mt-1.5 text-xs text-content-muted">{{ item.type }} · {{ formatTime(item.created_at) }}</p></div></div>
          <button v-if="!item.read_at" type="button" class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-content-brand hover:underline" @click="act(() => portal.readNotification(item.id), 'Notification marked as read.')"><Check class="size-3.5" />Mark as read</button>
        </div>
        <div v-if="!rows.length" class="flex flex-col items-center gap-2 p-12 text-center text-sm text-content-muted"><BellOff class="size-6" /><span>{{ unreadOnly ? 'No unread notifications in the loaded results.' : 'No notifications for this company.' }}</span></div>
      </div>
      <div v-if="portal.inbox && portal.inbox.notifications.current_page < portal.inbox.notifications.last_page" class="border-t border-line p-4 text-center"><ZButton variant="outline" :disabled="portal.notificationsLoading" @click="portal.loadMoreNotifications">{{ portal.notificationsLoading ? 'Loading…' : 'Load more' }}</ZButton></div>
    </Panel>
    <Panel title="Notification preferences" description="Your preferences for this company" class="mt-4" body-class="p-4">
      <p v-if="portal.preferencesLoading" class="text-sm text-content-muted" role="status">Loading preferences…</p>
      <div v-else-if="portal.preferencesError" class="text-sm text-danger" role="alert">{{ portal.preferencesError.message }} <button type="button" class="underline" @click="portal.loadPreferences">Retry</button></div>
      <p v-else-if="!draft.length" class="text-sm text-content-muted">No configurable notification preferences are available.</p>
      <form v-else class="space-y-4" @submit.prevent="savePreferences">
        <div v-for="item in draft" :key="item.type" class="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 text-sm"><span class="font-medium text-content">{{ item.type }}</span><div class="flex gap-4"><label class="flex items-center gap-2"><input v-model="item.in_app_enabled" type="checkbox" />In app</label><label class="flex items-center gap-2"><input v-model="item.email_enabled" type="checkbox" />Email</label></div></div>
        <ZButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save preferences' }}</ZButton>
      </form>
    </Panel>
  </PortalShell>
</template>
