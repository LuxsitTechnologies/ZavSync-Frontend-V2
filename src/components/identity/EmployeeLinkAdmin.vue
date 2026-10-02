<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { ApiError } from "@/services/api/client";
import { identityRepository as api } from "@/services/identity.repository";
import type { EmployeeLink, EmployeeOptions } from "@/types/identity";
import { useIdentityContext } from "./context";
import IdentityError from "./IdentityError.vue";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import Pagination from "@/components/zs/Pagination.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
const {company, companyId, signal, current}=useIdentityContext();
const membership=String(useRoute().params.membership);
const link=ref<EmployeeLink|null>(null), options=ref<EmployeeOptions|null>(null);
const search=ref(''), appliedSearch=ref(''), page=ref(1), perPage=ref(25), selected=ref('');
const loading=ref(true), candidatesLoading=ref(false), saving=ref(false), confirmOpen=ref(false);
const error=ref<ApiError|null>(null), optionError=ref<ApiError|null>(null), notice=ref('');
let requestVersion=0;
const asError=(cause:unknown)=>cause instanceof ApiError?cause:new ApiError('The request could not be completed.');
async function loadLink() {
  loading.value=true;link.value=null;
  try {const value=await api.link(companyId,membership,signal);if(current())link.value=value;}
  catch(cause){if(current())error.value=asError(cause);}
  finally{if(current())loading.value=false;}
}
async function loadOptions() {
  const version=++requestVersion;
  selected.value=''; options.value=null; candidatesLoading.value=true;optionError.value=null;
  try{const value=await api.options(companyId,appliedSearch.value,page.value,perPage.value,signal);if(current()&&version===requestVersion)options.value=value;}
  catch(cause){if(current()&&version===requestVersion)optionError.value=asError(cause);}
  finally{if(current()&&version===requestVersion)candidatesLoading.value=false;}
}
async function reload() {error.value=null;await loadLink();if(current())await loadOptions();}
async function filter() {appliedSearch.value=search.value.trim();page.value=1;await loadOptions();}
async function move(value:number){page.value=value;await loadOptions();}
async function mutate(unlink=false) {
  if(!current()||saving.value||!company.hasPermission('employee.links.manage')||!link.value)return;
  if(!unlink&&(link.value.linked||!options.value?.data.some(row=>row.id===selected.value&&row.available)))return;
  saving.value=true;error.value=null;notice.value='';
  try {
    const value=await(unlink?api.unlink(companyId,membership,signal):api.setLink(companyId,membership,selected.value,signal));
    if(current()){link.value=value;confirmOpen.value=false;notice.value=unlink?'Employee unlinked.':'Employee linked.';await loadOptions();}
  } catch(cause) {
    if(current()){error.value=asError(cause);confirmOpen.value=false;await loadLink();if(current())await loadOptions();}
  } finally{if(current())saving.value=false;}
}
onMounted(reload);
</script>
<template>
  <div class="space-y-4">
    <IdentityError :error="error" /><p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="loading" role="status">Loading employee link…</p>
    <ZButton v-if="error" variant="outline" :disabled="saving || loading" @click="reload">Reload link state</ZButton>
    <Panel v-if="link" title="Current employee link" body-class="space-y-3 p-4">
      <p>{{ link.linked ? 'An employee is linked to this membership.' : 'No employee profile linked.' }}</p>
      <p v-if="link.linked" class="text-sm">Unlink explicitly before linking another employee. This does not disable the account or change employment status.</p>
      <ZButton v-if="link.linked" variant="outline" :disabled="saving" @click="confirmOpen=true">Unlink employee</ZButton>
    </Panel>
    <Panel title="Select an employee" body-class="space-y-4 p-4">
      <p class="text-sm">Choose a same-company employee by code and name. Already-linked records cannot be reassigned here. Employment status does not determine account access.</p>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="filter">
        <Field v-model="search" label="Employee code or name" aria-label="Employee code or name" maxlength="100" :disabled="saving" />
        <label><span class="label-caps">Employees per page</span><select v-model.number="perPage" class="field mt-1.5" :disabled="saving" @change="filter"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label>
        <ZButton type="submit" :disabled="saving">Search employees</ZButton>
      </form>
      <IdentityError :error="optionError" />
      <ZButton v-if="optionError" variant="outline" :disabled="saving" @click="loadOptions">Retry employee options</ZButton>
      <p v-if="candidatesLoading" role="status">Loading employee options…</p>
      <fieldset v-else-if="options" :disabled="saving || loading || !link || link.linked" class="space-y-3">
        <legend class="sr-only">Employee candidates</legend>
        <p v-if="!options.data.length">No employees match this search.</p>
        <label v-for="candidate in options.data" :key="candidate.id" class="flex items-start gap-3 rounded border border-line p-3">
          <input v-model="selected" type="radio" name="employee-candidate" :value="candidate.id" :disabled="!candidate.available" class="mt-1" />
          <span class="min-w-0 break-words text-sm"><span class="font-semibold">{{ candidate.employee_code }} · {{ candidate.full_name }}</span><span class="block">{{ candidate.status }} · {{ candidate.linked ? 'Already linked' : 'Available' }}<span v-if="link?.employee_id===candidate.id"> · Current link</span></span></span>
        </label>
      </fieldset>
      <Pagination v-if="options && !saving" :page="options.meta.current_page" :pages="options.meta.last_page" :total="options.meta.total" @change="move" />
      <ZButton :disabled="saving || loading || !link || link.linked || !selected" @click="mutate()">{{ saving ? 'Saving…' : 'Link selected employee' }}</ZButton>
    </Panel>
    <ConfirmDialog :open="confirmOpen" title="Unlink employee?" message="This removes the membership's employee identity link. It does not delete the employee, change employment status or disable the account." confirm-label="Confirm unlink" :busy="saving" @cancel="confirmOpen=false" @confirm="mutate(true)" />
  </div>
</template>
