<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import Panel from "@/components/zs/Panel.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { ApiError } from "@/services/api/client";
import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";
import type { InternalCalendarEvent, InternalCalendarInput, InternalCalendarPage } from "@/types/internalCalendar";

defineProps<{ title?: string }>();
const company = useCompanyStore();
const today = new Date().toISOString().slice(0, 10);
const from = ref(today.slice(0, 7) + "-01");
const to = ref(today);
const appliedFrom = ref(from.value);
const appliedTo = ref(to.value);
const page = ref(1);
const result = ref<InternalCalendarPage | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<ApiError | null>(null);
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});
const selected = ref<InternalCalendarEvent | null>(null);
const detailOpen = ref(false), detailLoading = ref(false), detailError = ref<ApiError | null>(null);
const editing = ref(false);
const confirmingCancel = ref(false);
const form = ref<InternalCalendarInput>({ title: "", description: "", starts_at: "", ends_at: "" });
let generation = 0;
let controller: AbortController | null = null;
const timezone = computed(() => company.activeCompany?.timezone ?? "UTC");
const allowed = computed(() => !company.switching && !!company.activeCompanyId && company.hasModule("ai") && company.hasPermission("intelligence.calendar.manage"));
const validRange = computed(() => !!appliedFrom.value && !!appliedTo.value && appliedFrom.value <= appliedTo.value);

function asError(cause: unknown): ApiError {
  return cause instanceof ApiError ? cause : new ApiError(cause instanceof Error ? cause.message : "Could not load events.");
}
function current(companyId: string, version: number, token: number): boolean {
  return token === generation && !company.switching && company.activeCompanyId === companyId && company.contextVersion === version;
}
async function load(): Promise<void> {
  controller?.abort();
  const token = ++generation;
  result.value = null;
  error.value = null;
  if (!allowed.value || !validRange.value) { loading.value = false; return; }
  const companyId = company.activeCompanyId;
  const version = company.contextVersion;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  try {
    const response = await aiRepository.internalEvents(companyId, {
      from: `${appliedFrom.value}T00:00:00Z`, to: `${appliedTo.value}T23:59:59Z`, page: page.value, per_page: 25,
    }, request.signal);
    if (current(companyId, version, token)) result.value = response;
  } catch (cause) {
    if (current(companyId, version, token)) error.value = asError(cause);
  } finally {
    if (current(companyId, version, token)) loading.value = false;
  }
}
function applyRange(): void {
  if (!from.value || !to.value || from.value > to.value) { formError.value = "Choose a valid date range."; return; }
  formError.value = "";
  appliedFrom.value = from.value;
  appliedTo.value = to.value;
  page.value = 1;
  void load();
}
function openCreate(): void {
  selected.value = null;
  editing.value = true;
  formError.value = ""; fieldErrors.value = {};
  form.value = { title: "", description: "", starts_at: "", ends_at: "" };
}
function openEdit(event: InternalCalendarEvent): void {
  selected.value = event;
  detailOpen.value = false;
  editing.value = true;
  formError.value = ""; fieldErrors.value = {};
  form.value = { title: event.title, description: event.description ?? "", starts_at: event.starts_at, ends_at: event.ends_at };
}
async function openDetail(event: InternalCalendarEvent): Promise<void> {
  if (!allowed.value) return;
  const companyId = company.activeCompanyId, version = company.contextVersion, token = generation;
  detailLoading.value = true; detailError.value = null;
  try {
    const authoritative = await aiRepository.internalEvent(companyId, event.id);
    if (current(companyId, version, token)) { selected.value = authoritative; detailOpen.value = true; }
  } catch (cause) { if (current(companyId, version, token)) detailError.value = asError(cause); }
  finally { if (current(companyId, version, token)) detailLoading.value = false; }
}
function closeEdit(): void { if (!saving.value) editing.value = false; }
async function save(): Promise<void> {
  if (saving.value || !allowed.value) return;
  const input = { ...form.value, title: form.value.title.trim(), description: form.value.description?.trim() || null };
  if (!input.title || !Number.isFinite(Date.parse(input.starts_at)) || !Number.isFinite(Date.parse(input.ends_at)) ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(input.starts_at) || !/(Z|[+-]\d{2}:\d{2})$/.test(input.ends_at) ||
      Date.parse(input.ends_at) <= Date.parse(input.starts_at)) {
    formError.value = "Enter a title and a valid start/end interval with an explicit UTC offset.";
    return;
  }
  const companyId = company.activeCompanyId, version = company.contextVersion, token = generation;
  saving.value = true; formError.value = ""; fieldErrors.value = {};
  try {
    const saved = selected.value
      ? await aiRepository.updateInternalEvent(companyId, selected.value.id, selected.value.version, input)
      : await aiRepository.createInternalEvent(companyId, input);
    if (!current(companyId, version, token)) return;
    selected.value = saved;
    editing.value = false;
    await load();
  } catch (cause) {
    if (!current(companyId, version, token)) return;
    const failure = asError(cause);
    formError.value = failure.message;
    fieldErrors.value = failure.fields;
    if (failure.errorCode === "CALENDAR_EVENT_VERSION_STALE" || failure.errorCode === "CALENDAR_EVENT_CANCELLED") {
      editing.value = false;
      selected.value = null;
      await load();
    }
  } finally { saving.value = false; }
}
async function cancel(): Promise<void> {
  if (!selected.value || saving.value || !allowed.value) return;
  const event = selected.value, companyId = company.activeCompanyId, version = company.contextVersion, token = generation;
  saving.value = true; formError.value = "";
  try {
    const cancelled = await aiRepository.cancelInternalEvent(companyId, event.id, event.version);
    if (!current(companyId, version, token)) return;
    selected.value = cancelled;
    confirmingCancel.value = false;
    await load();
  } catch (cause) {
    if (!current(companyId, version, token)) return;
    formError.value = asError(cause).message;
    confirmingCancel.value = false;
    await load();
  } finally { saving.value = false; }
}
function formatDate(value: string, zone = timezone.value): string {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(new Date(value)); }
  catch { return value; }
}
watch([() => company.contextVersion, () => company.switching], () => {
  selected.value = null; editing.value = false; detailOpen.value = false; detailLoading.value = false; detailError.value = null; confirmingCancel.value = false;
  formError.value = ""; fieldErrors.value = {};
  void load();
}, { flush: "sync", immediate: true });
onBeforeUnmount(() => { generation++; controller?.abort(); });
</script>

<template>
  <Panel :title="title ?? 'Internal Calendar'">
    <div class="space-y-4 p-4">
      <p class="text-sm text-content-secondary">Private to you in {{ company.activeCompany?.name ?? 'the selected company' }}. Event times display in the company timezone ({{ timezone }}). This calendar does not send invitations or synchronize a provider.</p>
      <p v-if="!allowed" role="status" class="text-sm">Internal calendar access is unavailable for this membership or plan.</p>
      <template v-else>
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="applyRange">
          <label class="text-sm">From<input v-model="from" type="date" class="field mt-1 block" required /></label>
          <label class="text-sm">To<input v-model="to" type="date" class="field mt-1 block" required /></label>
          <ZButton type="submit">Show Events</ZButton>
          <ZButton variant="outline" @click="openCreate">Schedule Event</ZButton>
        </form>
        <p v-if="formError" role="alert" class="text-sm text-danger">{{ formError }}</p>
        <AsyncSection :loading="loading" :error="error" :empty="!result?.data.length" empty-title="No Internal Events" empty-message="No events were returned for this date range." @retry="load">
          <div class="divide-y divide-line rounded-md border border-line">
            <article v-for="event in result?.data ?? []" :key="event.id" class="space-y-1 p-3">
              <div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">{{ event.title }}</h3><span class="text-xs text-content-muted">{{ event.status }}</span></div>
              <p class="text-sm">{{ formatDate(event.starts_at, event.timezone) }} – {{ formatDate(event.ends_at, event.timezone) }} ({{ event.timezone }})</p>
              <p v-if="event.description" class="whitespace-pre-wrap text-sm text-content-secondary">{{ event.description }}</p>
              <div class="flex flex-wrap gap-2 pt-1">
                <ZButton variant="ghost" :aria-label="`View ${event.title}`" @click="openDetail(event)">View Details</ZButton>
                <ZButton v-if="event.status === 'ACTIVE'" variant="outline" :aria-label="`Edit ${event.title}`" @click="openEdit(event)">Edit</ZButton>
                <ZButton v-if="event.status === 'ACTIVE'" variant="ghost" :aria-label="`Cancel ${event.title}`" @click="selected=event; confirmingCancel=true">Cancel Event</ZButton>
              </div>
            </article>
          </div>
          <p v-if="detailLoading" role="status">Loading event details…</p>
          <p v-if="detailError" role="alert">{{ detailError.message }}</p>
          <div v-if="result && result.last_page > 1" class="mt-3 flex items-center gap-3">
            <ZButton variant="outline" :disabled="page <= 1" @click="page--; load()">Previous</ZButton>
            <span class="text-sm">Page {{ result.current_page }} of {{ result.last_page }}</span>
            <ZButton variant="outline" :disabled="page >= result.last_page" @click="page++; load()">Next</ZButton>
          </div>
        </AsyncSection>
      </template>
    </div>
  </Panel>
  <SidePanel :open="detailOpen" title="Internal Event Details" :description="`Organizer-private event in ${timezone}`" @close="detailOpen = false">
    <div v-if="selected" class="space-y-3 text-sm">
      <h3 class="text-lg font-semibold">{{ selected.title }}</h3>
      <p>Status: {{ selected.status }} · Version {{ selected.version }}</p>
      <p>Starts: {{ formatDate(selected.starts_at, selected.timezone) }}</p>
      <p>Ends: {{ formatDate(selected.ends_at, selected.timezone) }}</p>
      <p v-if="selected.description" class="whitespace-pre-wrap">{{ selected.description }}</p>
      <p v-if="selected.cancelled_at">Cancelled: {{ formatDate(selected.cancelled_at, selected.timezone) }}</p>
    </div>
    <template #footer><ZButton variant="outline" @click="detailOpen = false">Close</ZButton><ZButton v-if="selected?.status === 'ACTIVE'" @click="openEdit(selected!)">Edit Event</ZButton></template>
  </SidePanel>
  <SidePanel :open="editing" :title="selected ? 'Edit Internal Event' : 'Schedule Internal Event'" :description="`Company timezone: ${timezone}. Enter date-times with explicit UTC offsets.`" @close="closeEdit">
    <form id="internal-event-form" class="space-y-3" @submit.prevent="save">
      <label class="block text-sm">Title<input v-model="form.title" class="field mt-1 w-full" maxlength="255" required /><span v-if="fieldErrors.title" class="text-danger">{{ fieldErrors.title }}</span></label>
      <label class="block text-sm">Description<textarea v-model="form.description" class="field mt-1 w-full" maxlength="10000" /><span v-if="fieldErrors.description" class="text-danger">{{ fieldErrors.description }}</span></label>
      <label class="block text-sm">Starts At (ISO date-time with offset)<input v-model="form.starts_at" class="field mt-1 w-full" placeholder="2026-10-14T10:00:00+05:00" required /><span v-if="fieldErrors.starts_at" class="text-danger">{{ fieldErrors.starts_at }}</span></label>
      <label class="block text-sm">Ends At (ISO date-time with offset)<input v-model="form.ends_at" class="field mt-1 w-full" placeholder="2026-10-14T11:00:00+05:00" required /><span v-if="fieldErrors.ends_at" class="text-danger">{{ fieldErrors.ends_at }}</span></label>
      <p class="text-xs text-content-secondary">Use the intended offset for the event date; the backend stores UTC and validates the interval. No invitation is sent.</p>
      <p v-if="formError" role="alert" class="text-sm text-danger">{{ formError }}</p>
    </form>
    <template #footer><ZButton variant="outline" :disabled="saving" @click="closeEdit">Close</ZButton><ZButton type="submit" form="internal-event-form" :disabled="saving">{{ saving ? 'Saving…' : selected ? 'Save Event' : 'Schedule Event' }}</ZButton></template>
  </SidePanel>
  <ConfirmDialog :open="confirmingCancel" title="Cancel Internal Event" :message="`Cancel ${selected?.title ?? 'this event'}? The event remains visible as cancelled.`" confirm-label="Cancel Event" tone="danger" :busy="saving" @confirm="cancel" @cancel="confirmingCancel=false" />
</template>
