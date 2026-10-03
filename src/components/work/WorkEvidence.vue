<script setup lang="ts">
import { ref, watch } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import ZButton from '@/components/zs/ZButton.vue';
import { apiDownload } from '@/services/api/client';
import { useWorkContext } from '@/composables/useWorkContext';
import type { WorkKind, WorkReader, WorkComment, WorkFile } from '@/types/work';
const props = defineProps<{ kind: WorkKind; id: string; repository: WorkReader; writable: boolean }>();
const emit = defineEmits<{ conflict: [] }>();
const comments = ref<WorkComment[] | null>(null), files = ref<WorkFile[] | null>(null);
const body = ref(''), file = ref<File | null>(null), fileInput = ref<HTMLInputElement | null>(null), notice = ref('');
const pendingComment = ref<{body: string; key: string} | null>(null), pendingFile = ref<{file: File; key: string} | null>(null);
function clear() { comments.value = null; files.value = null; body.value = ''; file.value = null; pendingComment.value = null; pendingFile.value = null; notice.value = ''; if (fileInput.value) fileInput.value.value = ''; }
const context = useWorkContext(clear, load);
function loadComments() { void context.run('comments', (company,signal) => props.repository.comments(company,props.kind,props.id,signal), value => { comments.value = value.data; }); }
function loadFiles() { void context.run('files', (company,signal) => props.repository.files(company,props.kind,props.id,signal), value => { files.value = value.data; }); }
function load() { loadComments(); loadFiles(); }
function comment() {
  if (!props.writable || context.busy.mutation || pendingFile.value || (!body.value.trim() && !pendingComment.value)) return;
  pendingComment.value ??= {body: body.value, key: crypto.randomUUID()};
  const attempt = pendingComment.value;
  void context.run('mutation', (company,signal) => props.repository.comment(company,props.kind,props.id,attempt.body,attempt.key,signal), () => {
    pendingComment.value = null; body.value = ''; notice.value = 'Comment recorded.'; loadComments();
  }, error => { if (error.kind !== 'network' && error.kind !== 'server') pendingComment.value = null; if (error.status === 409) emit('conflict'); });
}
function upload() {
  if (!props.writable || context.busy.mutation || pendingComment.value || (!file.value && !pendingFile.value)) return;
  pendingFile.value ??= {file: file.value!, key: crypto.randomUUID()};
  const attempt = pendingFile.value;
  void context.run('mutation', (company,signal) => props.repository.upload(company,props.kind,props.id,attempt.file,attempt.key,signal), () => {
    pendingFile.value = null; file.value = null; if (fileInput.value) fileInput.value.value = ''; notice.value = 'Attachment uploaded.'; loadFiles();
  }, error => { if (error.kind !== 'network' && error.kind !== 'server') pendingFile.value = null; if (error.status === 409) emit('conflict'); });
}
function download(item: WorkFile) { void context.run('download', (company,signal) => apiDownload(props.repository.downloadPath(props.kind,props.id,item.id),company,item.original_filename,signal), () => {}); }
watch(() => props.writable, value => { if (!value) { body.value = ''; file.value = null; pendingComment.value = null; pendingFile.value = null; if (fileInput.value) fileInput.value.value = ''; } });
load();
</script>
<template>
  <div class="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
    <Panel title="Comments" description="Shared with the employee · append-only" body-class="space-y-3 p-4">
      <p v-if="context.busy.comments" role="status">Loading comments…</p>
      <p v-else-if="context.errors.comments" role="alert">{{ context.errors.comments.message }} <button class="underline" @click="loadComments">Retry comments</button></p>
      <ul v-else-if="comments?.length" class="space-y-3"><li v-for="item in comments" :key="item.id" class="break-words rounded-md bg-surface-sunken p-3"><p class="text-xs text-content-muted">{{ item.author }} · {{ item.created_at }}</p><p class="whitespace-pre-wrap text-sm">{{ item.body }}</p></li></ul>
      <p v-else>No comments yet.</p>
      <form v-if="writable" class="space-y-2" @submit.prevent="comment"><label for="work-comment" class="label-caps">Comment</label><textarea id="work-comment" v-model="body" class="field" required maxlength="5000" :disabled="context.busy.mutation || !!pendingComment || !!pendingFile" /><ZButton type="submit" :disabled="context.busy.mutation || !!pendingFile">{{ pendingComment ? 'Retry same comment' : 'Add comment' }}</ZButton></form>
    </Panel>
    <Panel title="Private attachments" description="Available only through authorized work-item access" body-class="space-y-3 p-4">
      <p v-if="context.busy.files" role="status">Loading attachments…</p>
      <p v-else-if="context.errors.files" role="alert">{{ context.errors.files.message }} <button class="underline" @click="loadFiles">Retry attachments</button></p>
      <ul v-else-if="files?.length" class="space-y-2"><li v-for="item in files" :key="item.id" class="break-words"><button class="text-content-brand underline" :disabled="context.busy.download" @click="download(item)">{{ item.original_filename }}</button><p class="text-xs text-content-muted">{{ item.size_bytes }} bytes · {{ item.created_at }}</p></li></ul><p v-else>No attachments.</p>
      <form v-if="writable" class="space-y-2" @submit.prevent="upload"><label for="work-file" class="label-caps">Attachment file</label><input id="work-file" ref="fileInput" type="file" class="field min-w-0 max-w-full" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt" :disabled="context.busy.mutation || !!pendingFile || !!pendingComment" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" /><p class="text-xs text-content-muted">Default limit 10 MiB. The server validates the configured size and file type.</p><ZButton type="submit" :disabled="context.busy.mutation || !!pendingComment || (!file && !pendingFile)">{{ pendingFile ? 'Retry same upload' : 'Upload attachment' }}</ZButton></form>
    </Panel>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="pendingComment || pendingFile" class="text-sm">The original content and retry key are retained until the outcome is confirmed.</p>
    <p v-if="context.errors.mutation" role="alert">{{ context.errors.mutation.message }}</p><p v-if="context.errors.download" role="alert">{{ context.errors.download.message }}</p>
  </div>
</template>
