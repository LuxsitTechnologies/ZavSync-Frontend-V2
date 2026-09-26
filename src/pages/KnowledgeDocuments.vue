<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Download, FileText, RefreshCw, Trash2, Upload } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { aiRepository } from "@/services/ai/repository";
import { platformRepository } from "@/services/platform/repository";
import { useCompanyStore } from "@/stores/company";
import type { KnowledgeSource } from "@/types/ai";
import type { PlatformDocument } from "@/types/platform";

setPageMeta("Knowledge Base", "Private documents and permission-scoped sources indexed for ZavSync Copilot.");

const company = useCompanyStore();
const documents = useAsyncData(() => platformRepository.documents(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const sources = useAsyncData(() => aiRepository.knowledgeSources(company.activeCompanyId), { watch: [() => company.activeCompanyId], isEmpty: (value) => value.data.length === 0 });
const query = ref("");
const uploadOpen = ref(false);
const noteOpen = ref(false);
const uploadType = ref("customer");
const recordId = ref("");
const category = ref("general");
const file = ref<File | null>(null);
const note = reactive({ title: "", content: "", access_permission: "ai.knowledge.view" });

const documentRows = computed(() => (documents.data.value?.data ?? []).filter((row) => row.original_filename.toLowerCase().includes(query.value.toLowerCase())));
const sourceRows = computed(() => sources.data.value?.data ?? []);
const sourceColumns: Column[] = [{ key: "source", header: "Source" }, { key: "access", header: "Access" }, { key: "index", header: "Index" }, { key: "updated", header: "Last indexed" }, { key: "actions", header: "" }];
const documentColumns: Column[] = [{ key: "name", header: "Document" }, { key: "owner", header: "Related record" }, { key: "category", header: "Category" }, { key: "size", header: "Size" }, { key: "actions", header: "" }];

const upload = useMutation(() => {
  if (!file.value) throw new Error("Select a file.");
  return platformRepository.uploadDocument(company.activeCompanyId, { type: uploadType.value, id: recordId.value, category: category.value, file: file.value });
});
const sourceMutation = useMutation((input: Record<string, unknown>) => aiRepository.createKnowledgeSource(company.activeCompanyId, input, crypto.randomUUID()));
const reindexMutation = useMutation((source: KnowledgeSource) => aiRepository.reindexKnowledgeSource(company.activeCompanyId, source.id, crypto.randomUUID()));

function inheritedPermission(document: PlatformDocument): string {
  const type = document.documentable_type.split("\\").pop() ?? "";
  if (["Customer", "Invoice"].includes(type)) return "accounting.view";
  if (["Supplier", "SupplierBill"].includes(type)) return "payables.view";
  if (type === "PurchaseOrder") return "purchase_orders.view";
  if (type === "InventoryItem") return "inventory.view";
  if (["Employee", "PayrollBatch"].includes(type)) return "payroll.view";
  if (["CrmAccount", "CrmLead", "CrmDeal"].includes(type)) return "crm.view";
  return "platform.documents.view";
}

async function uploadDocument() {
  if (!await upload.run()) return;
  uploadOpen.value = false;
  file.value = null;
  recordId.value = "";
  await documents.refresh();
  showToast("Document uploaded", "Add it to the knowledge index when ready.", "success");
}

async function addNote() {
  const saved = await sourceMutation.run({ source_type: "NOTE", ...note });
  if (!saved) return;
  noteOpen.value = false;
  Object.assign(note, { title: "", content: "", access_permission: "ai.knowledge.view" });
  await sources.refresh();
  showToast("Knowledge source queued", "A background worker will index the note.", "success");
}

async function indexDocument(document: PlatformDocument) {
  const saved = await sourceMutation.run({ source_type: "DOCUMENT", title: document.original_filename, document_id: document.id, access_permission: inheritedPermission(document) });
  if (!saved) return;
  await sources.refresh();
  showToast("Document queued for indexing", "Access continues to inherit from the related record.", "success");
}

async function reindex(source: KnowledgeSource) {
  if (!await reindexMutation.run(source)) return;
  await sources.refresh();
  showToast("Re-index queued", source.title, "success");
}

async function removeSource(source: KnowledgeSource) {
  await aiRepository.removeKnowledgeSource(company.activeCompanyId, source.id);
  await sources.refresh();
  showToast("Knowledge source removed", "The underlying private document was not deleted.", "success");
}

async function removeDocument(document: PlatformDocument) {
  await platformRepository.deleteDocument(company.activeCompanyId, document.id);
  await documents.refresh();
  showToast("Document deleted");
}

const size = (bytes: number) => bytes < 1_048_576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
</script>

<template>
  <AppShell>
    <PageHeader title="Knowledge Base" description="Private documents and notes indexed with company, role and source authorization">
      <template #actions><ZButton variant="outline" @click="noteOpen=true">Add note</ZButton><ZButton v-if="company.hasPermission('platform.documents.manage')" @click="uploadOpen=true"><Upload class="size-4" />Upload document</ZButton></template>
    </PageHeader>
    <ValidationMessage :message="sourceMutation.error.value?.message ?? reindexMutation.error.value?.message" />
    <Panel title="Indexed sources" description="Ingestion and embedding work runs asynchronously on the existing queue.">
      <AsyncSection :loading="sources.loading.value" :error="sources.error.value" :empty="sources.isEmpty.value" empty-title="No knowledge sources" empty-message="Add a note or index an authorized private document." @retry="sources.refresh">
        <DataTable :columns="sourceColumns" :rows="sourceRows" :min-width="900">
          <template #source="{row}:{row:KnowledgeSource}"><div><p class="font-medium text-content">{{row.title}}</p><p class="text-2xs text-content-muted">{{row.source_type}} · version {{row.version}}</p></div></template>
          <template #access="{row}"><span class="text-xs">{{row.access_permission}}</span></template>
          <template #index="{row}"><div class="flex items-center gap-2"><StatusBadge :status="row.status"/><span class="text-2xs text-content-muted">{{row.chunk_count}} chunks</span></div><p v-if="row.status==='FAILED'" class="mt-1 text-2xs text-danger">{{row.ingestion_runs?.[0]?.failure_message ?? 'Indexing failed'}}</p></template>
          <template #updated="{row}"><span class="text-xs">{{row.indexed_at?new Date(row.indexed_at).toLocaleString():'Not indexed'}}</span></template>
          <template #actions="{row}:{row:KnowledgeSource}"><div class="flex justify-end gap-1"><ZButton variant="ghost" @click="reindex(row)"><RefreshCw class="size-4"/>Re-index</ZButton><ZButton variant="ghost" @click="removeSource(row)"><Trash2 class="size-4"/></ZButton></div></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <Panel class="mt-4" title="Private documents" description="Stage 10 storage remains authoritative; indexing creates only a derived knowledge source.">
      <Toolbar><SearchInput v-model="query" placeholder="Search documents" /></Toolbar>
      <AsyncSection :loading="documents.loading.value" :error="documents.error.value" @retry="documents.refresh">
        <DataTable :columns="documentColumns" :rows="documentRows" :min-width="950">
          <template #name="{row}:{row:PlatformDocument}"><div class="flex items-center gap-2"><FileText class="size-4 text-content-brand"/><div><p class="font-medium text-content">{{row.original_filename}}</p><p class="text-2xs text-content-muted">{{row.mime_type}}</p></div></div></template>
          <template #owner="{row}:{row:PlatformDocument}"><p class="text-xs text-content">{{row.documentable_type.split('\\').pop()}}</p><p class="num text-2xs text-content-muted">{{row.documentable_id}}</p></template>
          <template #category="{row}">{{row.category}}</template>
          <template #size="{row}">{{size(row.size_bytes)}}</template>
          <template #actions="{row}:{row:PlatformDocument}"><div class="flex justify-end gap-1"><ZButton v-if="company.hasPermission('ai.knowledge.manage')" variant="ghost" @click="indexDocument(row)">Index</ZButton><ZButton variant="ghost" @click="platformRepository.downloadDocument(company.activeCompanyId,row.id,row.original_filename)"><Download class="size-4"/></ZButton><ZButton v-if="company.hasPermission('platform.documents.manage')" variant="ghost" @click="removeDocument(row)"><Trash2 class="size-4"/></ZButton></div></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <SidePanel :open="noteOpen" title="Add knowledge note" description="The source is encrypted, permission-scoped and queued for indexing." @close="noteOpen=false">
      <form class="space-y-4" @submit.prevent="addNote"><Field v-model="note.title" label="Title" required/><label><span class="label-caps">Access permission</span><select v-model="note.access_permission" class="field mt-1.5 w-full"><option v-for="permission in company.activePermissions" :key="permission" :value="permission">{{permission}}</option></select></label><label><span class="label-caps">Content</span><textarea v-model="note.content" class="field mt-1.5 min-h-56 w-full" required/></label><ValidationMessage :message="sourceMutation.error.value?.message"/><ZButton type="submit" :disabled="sourceMutation.saving.value">Queue indexing</ZButton></form>
    </SidePanel>

    <SidePanel :open="uploadOpen" title="Upload document" description="The document remains in Stage 10 private storage until separately indexed." @close="uploadOpen=false">
      <form class="space-y-4" @submit.prevent="uploadDocument"><label><span class="label-caps">Related record type</span><select v-model="uploadType" class="field mt-1.5 w-full"><option v-for="item in ['customer','invoice','supplier','purchase_order','supplier_bill','inventory_item','employee','payroll_batch','crm_account','crm_lead','crm_deal']" :key="item">{{item}}</option></select></label><Field v-model="recordId" label="Related record ID" required/><Field v-model="category" label="Category"/><label><span class="label-caps">File</span><input type="file" class="field mt-1.5 w-full" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json" required @change="file=($event.target as HTMLInputElement).files?.[0]??null"/></label><ValidationMessage :message="upload.error.value?.message"/><ZButton type="submit" :disabled="upload.saving.value">Upload securely</ZButton></form>
    </SidePanel>
  </AppShell>
</template>
