<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Upload, Check } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Tabs from "@/components/zs/Tabs.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useCrmData } from "@/composables/useCrmData";
import { useMutation } from "@/composables/useAsyncData";
import { crmRepository } from "@/services/crm/repository";
import type { CrmImport } from "@/types/crm";
import { parseMoneyInput } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Lead Capture", "Create leads manually or import reviewed CSV data.");
const data = useCrmData();
const mode = ref("Manual entry");
const submitted = ref(false);
const form = reactive({ first_name:"", last_name:"", company_name:"", job_title:"", email:"", phone:"", website:"", source:"Website", owner_id:"", notes:"", estimated_value:"0.00" });
const valid = computed(() => !!form.first_name && /^\S+@\S+\.\S+$/.test(form.email));
const createMutation = useMutation(() => crmRepository.createLead(data.activeCompanyId.value, { ...form, owner_id:form.owner_id?Number(form.owner_id):null, estimated_value:parseMoneyInput(form.estimated_value)??-1, status:"NEW", currency:"PKR" }));
async function create() { const saved=await createMutation.run(); if(!saved)return; submitted.value=true; await Promise.all([data.leads.refresh(),data.dashboard.refresh()]); }

const step = ref(1);
const entityType = ref<"LEAD"|"CONTACT"|"ACCOUNT">("LEAD");
const filename = ref("");
const csv = ref("");
const headers = ref<string[]>([]);
const sample = ref<string[][]>([]);
const mapping = ref<Record<string,string>>({});
const preview = ref<CrmImport|null>(null);
const decisions = reactive<Record<string,"CREATE"|"SKIP"|undefined>>({});
const allowedFields = computed(() => entityType.value==="LEAD"?["first_name","last_name","company_name","email","phone","website","source","estimated_value","currency","interest"]:entityType.value==="CONTACT"?["first_name","last_name","email","phone","mobile","job_title","department","account_id"]:["name","legal_name","email","phone","website","ntn","registration_number","industry","source","city","country"]);
const duplicateRows = computed(() => preview.value?.rows.filter((row)=>row.state==="POSSIBLE_DUPLICATE")??[]);
const canConfirm = computed(() => duplicateRows.value.every((row)=>!!decisions[String(row.rowNumber)]));
const importedRows = computed(() => preview.value?.rows.filter((row)=>row.state==="IMPORTED").length??0);
const skippedRows = computed(() => preview.value?.rows.filter((row)=>row.state==="SKIP").length??0);
const invalidRows = computed(() => preview.value?.rows.filter((row)=>row.state==="INVALID").length??0);
function defaultTarget(header:string){const normalized=header.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_");const aliases:Record<string,string>={first:"first_name",firstname:"first_name",last:"last_name",lastname:"last_name",company:"company_name",value:"estimated_value"};const target=aliases[normalized]??normalized;return allowedFields.value.includes(target)?target:"";}
async function fileSelected(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;filename.value=file.name;csv.value=await file.text();const lines=csv.value.split(/\r?\n/).filter(Boolean).slice(0,6);headers.value=(lines.shift()??"").split(",").map((cell)=>cell.replace(/^"|"$/g,"").trim());sample.value=lines.map((line)=>line.split(",").map((cell)=>cell.replace(/^"|"$/g,"").trim()));mapping.value=Object.fromEntries(headers.value.map((header)=>[header,defaultTarget(header)]));step.value=2;}
const previewMutation=useMutation(()=>crmRepository.previewImport(data.activeCompanyId.value,{entity_type:entityType.value,filename:filename.value,csv:csv.value,mapping:Object.fromEntries(Object.entries(mapping.value).filter(([,target])=>target))}));
async function review(){const result=await previewMutation.run();if(!result)return;preview.value=result;for(const key of Object.keys(decisions))delete decisions[key];step.value=4;}
const confirmMutation=useMutation((input:Record<string,"CREATE"|"SKIP">)=>crmRepository.confirmImport(data.activeCompanyId.value,preview.value!.id,input));
async function confirm(){if(!preview.value||!canConfirm.value)return;const input=Object.fromEntries(Object.entries(decisions).filter((entry):entry is [string,"CREATE"|"SKIP"]=>!!entry[1]));const result=await confirmMutation.run(input);if(!result)return;preview.value=result;step.value=5;await data.refresh();}
</script>

<template><AppShell><PageHeader title="Lead Capture" description="Add one lead or import reviewed CRM records"/><Panel><Tabs v-model="mode" :items="['Manual entry','CSV import']"/>
  <div v-if="mode==='Manual entry'" class="p-5">
    <div v-if="submitted" class="rounded-md border border-success/30 bg-success/10 p-6 text-center"><Check class="mx-auto size-6 text-success"/><p class="mt-2 text-sm font-semibold text-content">Lead created successfully</p><p class="mt-1 text-xs text-content-muted">The lead is available in the active company.</p><ZButton class="mt-4" @click="submitted=false;form.first_name='';form.last_name='';form.email=''">Add another</ZButton></div>
    <form v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" @submit.prevent="create"><Field v-model="form.first_name" label="First name" required/><Field v-model="form.last_name" label="Last name"/><Field v-model="form.company_name" label="Company"/><Field v-model="form.job_title" label="Job title"/><Field v-model="form.email" label="Email" type="email" required/><Field v-model="form.phone" label="Phone"/><Field v-model="form.website" label="Website"/><Field v-model="form.estimated_value" label="Estimated value (PKR)"/><label><span class="label-caps">Lead source</span><select v-model="form.source" class="field mt-1.5"><option>Website</option><option>Referral</option><option>Conference</option><option>Partner</option></select></label><label><span class="label-caps">Owner</span><select v-model="form.owner_id" class="field mt-1.5"><option value="">Unassigned</option><option v-for="owner in data.owners.data.value??[]" :key="owner.id" :value="owner.id">{{owner.name}}</option></select></label><label class="sm:col-span-2 xl:col-span-3"><span class="label-caps">Notes</span><textarea v-model="form.notes" class="field mt-1.5 min-h-24"/></label><div class="sm:col-span-2 xl:col-span-3"><ValidationMessage :message="createMutation.error.value?.message"/><ZButton type="submit" :disabled="!valid||createMutation.saving.value">Create lead</ZButton></div></form>
  </div>
  <div v-else class="p-5">
    <div class="mb-5 flex flex-wrap gap-2"><span v-for="number in 5" :key="number" :class="['zs-badge',step>=number?'badge-brand':'badge-neutral']">{{number}} {{['Upload','Preview','Map fields','Duplicates','Summary'][number-1]}}</span></div>
    <div v-if="step===1" class="rounded-md border border-dashed border-line-strong p-12 text-center"><Upload class="mx-auto size-7 text-content-muted"/><p class="mt-3 text-sm font-medium text-content">Select a CSV file</p><select v-model="entityType" class="field mx-auto mt-4 max-w-48"><option>LEAD</option><option>CONTACT</option><option>ACCOUNT</option></select><input class="mt-4 block w-full text-center text-xs" type="file" accept=".csv,text/csv" @change="fileSelected"/></div>
    <div v-else-if="step===2" class="overflow-x-auto"><table class="w-full min-w-[700px]"><thead><tr class="table-head"><th v-for="header in headers" :key="header" class="px-3 py-2 text-left">{{header}}</th></tr></thead><tbody><tr v-for="(row,index) in sample" :key="index" class="table-row-zs"><td v-for="(cell,cellIndex) in row" :key="cellIndex" class="px-3">{{cell}}</td></tr></tbody></table></div>
    <div v-else-if="step===3" class="grid gap-3 sm:grid-cols-2"><label v-for="header in headers" :key="header"><span class="label-caps">CSV: {{header}}</span><select v-model="mapping[header]" class="field mt-1.5"><option value="">Do not import</option><option v-for="field in allowedFields" :key="field" :value="field">{{field}}</option></select></label></div>
    <div v-else-if="step===4" class="space-y-3"><div v-for="row in preview?.rows??[]" :key="row.id" class="rounded-md border p-4" :class="row.state==='INVALID'?'border-danger/30 bg-danger/5':row.state==='POSSIBLE_DUPLICATE'?'border-warning/30 bg-warning/10':'border-line'"><p class="text-sm font-semibold text-content">Row {{row.rowNumber}} · {{row.state}}</p><p v-if="row.errors.length" class="mt-1 text-xs text-danger">{{JSON.stringify(row.errors)}}</p><p v-if="row.warnings.length" class="mt-1 text-xs text-content-muted">{{row.warnings.join(' ')}}</p><div v-if="row.state==='POSSIBLE_DUPLICATE'" class="mt-3 flex gap-4 text-xs"><label><input v-model="decisions[String(row.rowNumber)]" type="radio" :name="`decision-${row.rowNumber}`" value="SKIP"/> Skip</label><label><input v-model="decisions[String(row.rowNumber)]" type="radio" :name="`decision-${row.rowNumber}`" value="CREATE"/> Import anyway</label></div></div></div>
    <div v-else class="rounded-md bg-surface-sunken p-8 text-center"><Check class="mx-auto size-7 text-success"/><p class="mt-2 text-sm font-semibold text-content">Import complete</p><p class="mt-1 text-xs text-content-muted">{{importedRows}} created · {{skippedRows}} skipped · {{invalidRows}} invalid</p></div>
    <ValidationMessage :message="previewMutation.error.value?.message||confirmMutation.error.value?.message"/>
    <div class="mt-5 flex justify-between"><ZButton variant="outline" :disabled="step===1||step===5" @click="step--">Back</ZButton><ZButton v-if="step===2" @click="step=3">Continue</ZButton><ZButton v-else-if="step===3" :disabled="previewMutation.saving.value" @click="review">Review import</ZButton><ZButton v-else-if="step===4" :disabled="!canConfirm||confirmMutation.saving.value" @click="confirm">Confirm import</ZButton></div>
  </div>
</Panel></AppShell></template>
