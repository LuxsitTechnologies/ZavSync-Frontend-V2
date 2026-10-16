<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Copy, Plus, ShieldCheck } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import Field from "@/components/zs/Field.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { platformRepository } from "@/services/platform/repository";
import { ApiError } from "@/services/api/client";
import { useCompanyStore } from "@/stores/company";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import type { PlatformRole } from "@/types/platform";

setPageMeta("Roles & Permissions", "Role definitions and effective company permissions.");
const company = useCompanyStore();
const empty = { roles: [] as PlatformRole[], permissions: [] as Array<{ id: number; name: string; description: string | null }> };
const state = useAsyncData(
  () => company.switching || !company.activeCompanyId ? Promise.resolve(empty) : platformRepository.roles(company.activeCompanyId),
  { watch: [() => company.activeCompanyId, () => company.contextVersion, () => company.switching] },
);
const roles = computed(() => company.switching ? [] : state.data.value?.roles ?? []);
const permissions = computed(() => company.switching ? [] : state.data.value?.permissions ?? []);
const canManage = computed(() => !company.switching && company.hasPermission("platform.roles.manage"));
const columns: Column[] = [
  { key: "name", header: "Role" }, { key: "users", header: "Users", align: "right" },
  { key: "permissions", header: "Permissions" }, { key: "actions", header: "" },
];
const open = ref(false), editing = ref<PlatformRole | null>(null), name = ref(""), selected = ref<number[]>([]);
const save = useMutation(() => editing.value
  ? platformRepository.updateRole(company.activeCompanyId, editing.value.id, { name: name.value, permission_ids: selected.value })
  : platformRepository.createRole(company.activeCompanyId, { name: name.value, permission_ids: selected.value }));
function edit(role?: PlatformRole) {
  editing.value = role ?? null;
  name.value = role?.name ?? "";
  selected.value = role?.permissions.map(permission => permission.id) ?? [];
  open.value = true;
}
async function submit() {
  if (!await save.run()) return;
  showToast(editing.value ? "Role updated" : "Role created");
  open.value = false;
  await state.refresh();
}
async function clone(role: PlatformRole) {
  await platformRepository.cloneRole(company.activeCompanyId, role.id, `${role.name} Copy`);
  showToast("Role cloned");
  await state.refresh();
}
async function archive(role: PlatformRole) {
  await platformRepository.archiveRole(company.activeCompanyId, role.id);
  showToast("Role archived");
  await state.refresh();
}

const deleteTarget = ref<PlatformRole | null>(null);
const deleteCompanyId = ref(""), deleteContextVersion = ref(0);
const deleteSaving = ref(false), deleteError = ref(""), pageError = ref("");
let deleteGeneration = 0;
function closeDelete() {
  if (deleteSaving.value) return;
  deleteTarget.value = null;
  deleteError.value = "";
}
function askDelete(role: PlatformRole) {
  if (!canManage.value || role.is_system || !role.archived_at || role.company_id !== company.activeCompanyId) return;
  deleteTarget.value = role;
  deleteCompanyId.value = company.activeCompanyId;
  deleteContextVersion.value = company.contextVersion;
  deleteError.value = "";
  pageError.value = "";
}
watch(() => [company.switching, company.activeCompanyId, company.contextVersion] as const, () => {
  deleteGeneration++;
  deleteTarget.value = null;
  deleteSaving.value = false;
  deleteError.value = "";
  pageError.value = "";
  open.value = false;
}, { flush: "sync" });
async function confirmDelete() {
  const role = deleteTarget.value, id = deleteCompanyId.value, version = deleteContextVersion.value;
  if (!role || deleteSaving.value || !canManage.value || company.activeCompanyId !== id || company.contextVersion !== version) return;
  const token = ++deleteGeneration;
  const current = () => token === deleteGeneration && !company.switching && company.activeCompanyId === id && company.contextVersion === version;
  deleteSaving.value = true;
  deleteError.value = "";
  try {
    await platformRepository.deleteRole(id, role.id);
    if (!current()) return;
    deleteTarget.value = null;
    showToast("Role deleted", `${role.name} was permanently deleted.`, "success");
    await state.refresh();
  } catch (cause) {
    if (!current()) return;
    const error = cause instanceof ApiError ? cause : new ApiError("Role deletion could not be completed.");
    if (error.status === 404) {
      deleteTarget.value = null;
      await state.refresh();
      if (current()) pageError.value = state.error.value
        ? "This role is no longer available. Company roles could not be reloaded; try again."
        : "This role is no longer available. The company roles have been reloaded.";
    } else if (error.status === 403) {
      deleteError.value = "Access denied. You cannot delete roles in this company.";
    } else if (error.status === 409 && error.errorCode === "ROLE_DELETE_BLOCKED") {
      deleteError.value = "This role cannot be deleted because it has existing assignments, invitations or historical references.";
    } else {
      deleteError.value = "Role deletion could not be completed. Check your connection and retry, or reload the roles before trying again.";
    }
  } finally {
    if (current()) deleteSaving.value = false;
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Roles & Permissions" description="Company-scoped access enforced by the authoritative backend">
      <template #actions><ZButton v-if="canManage" @click="edit()"><Plus class="size-4" />New role</ZButton></template>
    </PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Roles" :value="String(roles.length)" tone="brand" />
      <StatCard label="Users assigned" :value="String(roles.reduce((sum, role) => sum + (role.memberships_count ?? 0), 0))" />
      <StatCard label="Permissions" :value="String(permissions.length)" tone="success" />
    </div>
    <p v-if="company.switching || state.loading.value" role="status">Loading company roles…</p>
    <p v-if="pageError" role="alert" class="mb-4 text-danger">{{ pageError }}</p>
    <ValidationMessage :message="state.error.value?.message" />
    <Panel title="Roles">
      <DataTable :columns="columns" :rows="roles" :min-width="940">
        <template #name="{ row }: { row: PlatformRole }"><span class="inline-flex items-center gap-2 font-medium text-content"><ShieldCheck class="size-3.5 text-content-muted" />{{ row.name }}<span v-if="row.is_system" class="zs-badge badge-warning">System</span><span v-if="row.archived_at" class="zs-badge badge-neutral">Archived</span></span></template>
        <template #users="{ row }">{{ row.memberships_count ?? 0 }}</template>
        <template #permissions="{ row }: { row: PlatformRole }"><div class="flex max-w-xl flex-wrap gap-1"><span v-for="permission in row.permissions.slice(0, 8)" :key="permission.id" class="num zs-badge badge-neutral">{{ permission.name }}</span><span v-if="row.permissions.length > 8" class="zs-badge badge-neutral">+{{ row.permissions.length - 8 }}</span></div></template>
        <template #actions="{ row }: { row: PlatformRole }"><div v-if="canManage" class="flex justify-end gap-1"><ZButton v-if="!row.is_system" variant="ghost" @click="edit(row)">Edit</ZButton><ZButton variant="ghost" @click="clone(row)"><Copy class="size-3.5" />Clone</ZButton><ZButton v-if="!row.is_system && !row.archived_at" variant="ghost" @click="archive(row)">Archive</ZButton><ZButton v-if="!row.is_system && row.archived_at" variant="ghost" @click="askDelete(row)">Delete</ZButton></div></template>
      </DataTable>
    </Panel>
    <SidePanel :open="open" :title="editing ? 'Edit role' : 'Create role'" description="You can only grant permissions held by your own role." @close="open = false">
      <form class="space-y-4" @submit.prevent="submit"><Field v-model="name" label="Role name" required /><div><p class="label-caps">Permissions</p><div class="mt-2 max-h-[28rem] space-y-2 overflow-y-auto rounded-md border border-line p-3"><label v-for="permission in permissions" :key="permission.id" class="flex items-start gap-2 text-xs text-content-secondary"><input v-model="selected" type="checkbox" :value="permission.id" class="mt-0.5 accent-[var(--primary)]" /><span><span class="font-medium text-content">{{ permission.name }}</span><span v-if="permission.description" class="block text-content-muted">{{ permission.description }}</span></span></label></div></div><ValidationMessage :message="save.error.value?.message" /><ZButton type="submit" :disabled="save.saving.value">{{ save.saving.value ? 'Saving…' : 'Save role' }}</ZButton></form>
    </SidePanel>
    <SidePanel :open="!!deleteTarget" title="Delete archived role" @close="closeDelete">
      <div v-if="deleteTarget" class="space-y-4"><p>Delete this archived role permanently?</p><p class="font-medium">{{ deleteTarget.name }}</p><p>This action cannot be undone. Roles with existing assignments, invitations or historical references cannot be deleted.</p><p v-if="deleteError" role="alert" class="text-danger">{{ deleteError }}</p><div class="flex justify-end gap-2"><ZButton variant="outline" :disabled="deleteSaving" @click="closeDelete">Cancel</ZButton><ZButton :disabled="deleteSaving" @click="confirmDelete">{{ deleteSaving ? 'Deleting…' : 'Delete role permanently' }}</ZButton></div></div>
    </SidePanel>
  </AppShell>
</template>
