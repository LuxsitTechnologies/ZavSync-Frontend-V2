<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import DataTable from "@/components/zs/DataTable.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import Pagination from "@/components/crm/Pagination.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useCrmData } from "@/composables/useCrmData";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { crmRepository } from "@/services/crm/repository";
import type { CrmCompany } from "@/types/crm";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Companies", "CRM company accounts and relationship status.");
const data = useCrmData();
const router = useRouter();
const search = ref("");
const status = ref("All statuses");
const page = ref(1);
const panelOpen = ref(false);
const editingId = ref<string | null>(null);
const remove = ref<CrmCompany | null>(null);
const listing = useAsyncData(() => crmRepository.companiesPage(data.activeCompanyId.value, { search: search.value, status: status.value === "All statuses" ? undefined : status.value, page: page.value, per_page: 10 }), { watch: [data.activeCompanyId, search, status, page] });
const rows = computed(() => listing.data.value?.data ?? []);
const form = reactive({ name: "", website: "", industry: "", phone: "", email: "", owner_id: "", address: "", city: "", country: "PK", source: "", status: "PROSPECT", account_type: "BUSINESS", ntn: "", cnic: "", notes: "" });
const columns = [{key:"name",header:"Company"},{key:"industry",header:"Industry"},{key:"website",header:"Website"},{key:"primaryContact",header:"Primary contact"},{key:"phone",header:"Phone"},{key:"status",header:"Status"},{key:"owner",header:"Owner"},{key:"lastActivity",header:"Last activity"},{key:"actions",header:"",align:"right" as const}];
function edit(item?: CrmCompany) {
  editingId.value = item?.id ?? null;
  Object.assign(form, { name:item?.name??"", website:item?.website??"", industry:item?.industry??"", phone:item?.phone??"", email:item?.email??"", owner_id:item?.ownerId?String(item.ownerId):"", address:item?.address??"", city:item?.city??"", country:item?.country??"PK", source:item?.source??"", status:item?.status??"PROSPECT", account_type:item?.accountType??"BUSINESS", ntn:item?.ntn??"", cnic:item?.cnic??"", notes:item?.notes??"" });
  panelOpen.value = true;
}
const saveMutation = useMutation(() => {
  const input = { ...form, owner_id: form.owner_id ? Number(form.owner_id) : null };
  return editingId.value ? crmRepository.updateCompany(data.activeCompanyId.value, editingId.value, input) : crmRepository.createCompany(data.activeCompanyId.value, input);
});
const archiveMutation = useMutation((id: string) => crmRepository.archiveCompany(data.activeCompanyId.value, id));
async function save() { const saved=await saveMutation.run(); if(!saved)return; panelOpen.value=false; await Promise.all([listing.refresh(),data.companies.refresh()]); showToast("Company saved",`${saved.name} is up to date.`,"success"); }
async function archive() { if(!remove.value)return; const name=remove.value.name; const result=await archiveMutation.run(remove.value.id); if(result===null)return; remove.value=null; await Promise.all([listing.refresh(),data.companies.refresh()]); showToast("Company archived",`${name} was archived.`,"success"); }
</script>

<template>
  <AppShell>
    <PageHeader title="Companies" :description="`${listing.data.value?.total ?? 0} accounts in this company`"><template #actions><ZButton @click="edit()">Add company</ZButton></template></PageHeader>
    <Panel>
      <Toolbar><SearchInput v-model="search" placeholder="Search company, email, phone or NTN"/><select v-model="status" class="field max-w-44"><option>All statuses</option><option v-for="value in ['PROSPECT','ACTIVE','CUSTOMER','INACTIVE']" :key="value">{{ value }}</option></select></Toolbar>
      <AsyncSection :loading="listing.loading.value" :error="listing.error.value" :empty="listing.data.value?.total===0" @retry="listing.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="1200">
          <template #name="{row}"><button class="font-medium text-primary hover:underline" @click="router.push(`/crm/companies/${row.id}`)">{{ row.name }}</button></template>
          <template #website="{row}"><span class="text-xs">{{ row.website?.replace('https://','') }}</span></template>
          <template #status="{row}"><StatusBadge :status="row.status"/></template>
          <template #actions="{row}"><div class="flex justify-end gap-1"><ZButton variant="ghost" @click="router.push(`/crm/companies/${row.id}`)">View</ZButton><ZButton variant="ghost" @click="edit(row)">Edit</ZButton><ZButton variant="ghost" @click="remove=row">Archive</ZButton></div></template>
          <template #footer><Pagination :page="listing.data.value?.currentPage??1" :pages="listing.data.value?.lastPage??1" :total="listing.data.value?.total??0" @change="page=$event"/></template>
        </DataTable>
      </AsyncSection>
    </Panel>
    <SidePanel :open="panelOpen" :title="editingId?'Edit company':'Add company'" description="Account details are saved to the active company." @close="panelOpen=false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <Field v-model="form.name" label="Company name" required/><Field v-model="form.website" label="Website"/><Field v-model="form.industry" label="Industry"/><Field v-model="form.phone" label="Phone"/><Field v-model="form.email" label="Email" type="email"/>
        <label><span class="label-caps">Owner</span><select v-model="form.owner_id" class="field mt-1.5"><option value="">Unassigned</option><option v-for="owner in data.owners.data.value??[]" :key="owner.id" :value="owner.id">{{owner.name}}</option></select></label>
        <Field v-model="form.ntn" label="NTN"/><Field v-model="form.cnic" label="CNIC"/><Field v-model="form.city" label="City"/><Field v-model="form.source" label="Source"/>
        <label><span class="label-caps">Status</span><select v-model="form.status" class="field mt-1.5"><option v-for="value in ['PROSPECT','ACTIVE','CUSTOMER','INACTIVE']" :key="value">{{value}}</option></select></label>
        <label><span class="label-caps">Account type</span><select v-model="form.account_type" class="field mt-1.5"><option v-for="value in ['BUSINESS','INDIVIDUAL','GOVERNMENT','PARTNER']" :key="value">{{value}}</option></select></label>
        <label class="sm:col-span-2"><span class="label-caps">Address</span><textarea v-model="form.address" class="field mt-1.5 min-h-20"/></label><ValidationMessage class="sm:col-span-2" :message="saveMutation.error.value?.message"/><ZButton type="submit" :disabled="saveMutation.saving.value">Save company</ZButton>
      </form>
    </SidePanel>
    <ConfirmDialog :open="!!remove" title="Archive company?" message="The account will be hidden from active CRM lists; its history remains available." confirm-label="Archive" tone="danger" @cancel="remove=null" @confirm="archive"/>
  </AppShell>
</template>
