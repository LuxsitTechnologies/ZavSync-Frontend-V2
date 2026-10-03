<script setup lang="ts">
import { ref, watch } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import ZButton from '@/components/zs/ZButton.vue';
import { apiDownload } from '@/services/api/client';
import { adminLeaveRepository } from '@/services/adminLeave.repository';
import { employeeLeaveRepository } from '@/services/employeeLeave.repository';
import { useLeaveContext } from '@/composables/useLeaveContext';
import { leaveDays } from '@/lib/leave';
import type { LeaveEvidence, LeaveRequest } from '@/types/leave';
const props = defineProps<{ request: LeaveRequest; admin?: boolean; canUpload?: boolean }>();
const evidence = ref<LeaveEvidence[] | null>(null);
const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploaded = ref(false);
const repository = () => props.admin ? adminLeaveRepository : employeeLeaveRepository;
function reset() { evidence.value = null; file.value = null; uploaded.value = false; if (fileInput.value) fileInput.value.value = ''; }
const context = useLeaveContext(reset, load);
function load() { void context.run('evidence', (id, signal) => repository().evidence(id, props.request.id, signal), value => { evidence.value = value.data; }); }
async function upload() {
  if (!file.value || !props.canUpload || props.admin || props.request.status !== 'PENDING' || context.busy.mutation) return;
  const succeeded = await context.run('mutation', (id, signal) => employeeLeaveRepository.upload(id, props.request.id, file.value!, signal), () => { file.value = null; if (fileInput.value) fileInput.value.value = ''; uploaded.value = true; });
  if (succeeded) load();
}
function download(item: LeaveEvidence) { void context.run('download', (id, signal) => apiDownload(repository().downloadPath(props.request.id, item.id), id, item.original_filename, signal), () => {}); }
watch(() => props.request.id, () => { context.clear(); load(); }, { immediate: true });
</script>
<template>
  <Panel title="Request detail" :description="request.id" class="mt-4">
    <div class="space-y-3 p-4 text-sm break-words">
      <p><strong>{{ request.type_name }}</strong> · {{ request.status.replaceAll('_', ' ') }}</p>
      <p>{{ request.start_date }} – {{ request.end_date }} · {{ request.day_portion.replaceAll('_', ' ') }} · {{ leaveDays(request.units) }} days ({{ request.units }} units)</p>
      <p>{{ request.reason }}</p><p class="text-xs text-content-muted">Submitted {{ request.submitted_at }}</p>
      <slot />
      <h3 class="font-semibold">Decision and cancellation evidence</h3>
      <ul class="space-y-2"><li v-for="event in request.events ?? []" :key="event.id" class="rounded-md bg-surface-sunken p-3"><p>{{ event.action.replaceAll('_', ' ') }} · {{ event.to_status.replaceAll('_', ' ') }}</p><p v-if="event.reason">{{ event.reason }}</p><p class="text-xs text-content-muted">{{ event.created_at }}</p></li></ul>
      <h3 class="font-semibold">Private attachments</h3>
      <p v-if="context.busy.evidence" role="status">Loading attachments…</p>
      <p v-else-if="context.errors.evidence" role="alert">{{ context.errors.evidence.message }} <button class="underline" @click="load">Retry</button></p>
      <ul v-else-if="evidence?.length" class="space-y-2"><li v-for="item in evidence" :key="item.id"><button type="button" class="underline" :disabled="context.busy.download" @click="download(item)">{{ item.original_filename }}</button> · {{ item.size_bytes }} bytes · {{ item.mime_type }}</li></ul>
      <p v-else-if="evidence">No attachments.</p>
      <p v-if="context.errors.download" role="alert">The private attachment could not be downloaded.</p>
      <form v-if="canUpload && !admin && request.status === 'PENDING'" class="space-y-2" @submit.prevent="upload">
        <label class="block">Evidence file<input ref="fileInput" type="file" class="field mt-1" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt" :disabled="context.busy.mutation" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null; uploaded = false" /></label>
        <p class="text-xs text-content-muted">PDF, images (PNG/JPEG), Word, Excel, CSV or text. Default server limit: 10 MiB; the configured server limit is authoritative. Evidence cannot be removed here.</p>
        <ZButton type="submit" :disabled="!file || context.busy.mutation">{{ context.busy.mutation ? 'Uploading…' : 'Upload evidence' }}</ZButton>
        <p v-if="uploaded" role="status">Evidence uploaded.</p>
        <p v-if="context.errors.mutation" role="alert">{{ context.errors.mutation.message }} {{ context.errors.mutation.fields.file }} If the outcome is uncertain, refresh attachments before uploading again.</p>
      </form>
    </div>
  </Panel>
</template>
