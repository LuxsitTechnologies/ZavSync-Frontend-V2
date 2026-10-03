<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import ZButton from '@/components/zs/ZButton.vue';
import ConfirmDialog from '@/components/zs/ConfirmDialog.vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { portalFinalRepository } from '@/services/portalFinal.repository';
import { portalDefinition, decimalToMinor, minorToDecimal, type PortalAction, type FormField } from '@/lib/portalFinal';
import type { PortalDomain, PortalRecord, PortalList, PortalDetail } from '@/types/portalFinal';
const props=withDefaults(defineProps<{domain:PortalDomain;admin?:boolean;activeEmployee?:boolean;selfId?:string}>(),{admin:false,activeEmployee:false,selfId:''});
const company=useCompanyStore(), definition=portalDefinition(props.domain,props.admin), api=portalFinalRepository(props.domain,props.admin);
const canRead=computed(()=>company.hasModule('payroll')&&company.hasPermission(definition.permission));
const list=ref<PortalList|null>(null),detail=ref<PortalDetail|null>(null),selected=ref('');
const query=ref<Record<string,string>>({}), form=ref<Record<string,string>>({}), chosenFile=ref<File|null>(null),formEpoch=ref(0);
const action=ref<PortalAction|null>(null),confirming=ref(false),notice=ref(''),localError=ref('');
const metadata=ref<PortalRecord[]>([]),trigger=ref<HTMLElement|null>(null),formHeading=ref<HTMLElement|null>(null);
interface Attempt { action:PortalAction; id:string; child:string; body:Record<string,unknown>; file:File|null; key?:string }
const pending=ref<Attempt|null>(null);
const row=computed<PortalRecord|null>(()=>detail.value?.team??detail.value?.rota??detail.value);
const detailPage=ref(1);
function reset(){list.value=null;detail.value=null;selected.value='';query.value={};clearForm();notice.value='';localError.value='';metadata.value=[];detailPage.value=1;}
function clearForm(){action.value=null;form.value={};chosenFile.value=null;pending.value=null;confirming.value=false;formEpoch.value++;}
const context=useWorkContext(reset,load);
function allowed(a:PortalAction,item:PortalRecord|null=row.value){
  if(!canRead.value||company.switching||!company.hasPermission(a.permission)||(!props.admin&&!props.activeEmployee))return false;
  if(a.states&&(!item?.status||!a.states.includes(item.status)))return false;
  if(a.targetOnly&&(!props.selfId||item?.target_employee_id!==props.selfId))return false;
  if(a.command==='release'&&(!item||item.released_at||item.category!=='ISSUED'))return false;
  if(a.command==='receipt'&&item?.receipt)return false;
  if(a.command==='submit'&&!item?.receipt)return false;
  return !a.versioned||Number.isSafeInteger(item?.version);
}
const actions=computed(()=>definition.actions.filter(a=>allowed(a)));
function listQuery(page:number):Record<string,string|number>{return {...query.value,page};}
function load(page=1){
  if(!canRead.value)return;
  if(props.admin&&props.domain==='documents'&&!query.value.employee_id)return;
  if(props.domain==='schedule'&&(!query.value.from_date||!query.value.to_date))return;
  list.value=null;
  void context.run('list',(id,signal)=>api.list(id,listQuery(page),signal),v=>{list.value=v;});
}
function filter(){context.invalidate('detail');context.invalidate('download');detail.value=null;selected.value='';clearForm();load();}
function open(id:string,page=1,reconcile=false){
  if(!reconcile&&(pending.value||context.busy.mutation))return;
  context.invalidate('download');detail.value=null;selected.value=id;detailPage.value=page;clearForm();
  void context.run('detail',(companyId,signal)=>api.detail(companyId,id,page,signal),v=>{detail.value=v;});
}
function selectInline(item:PortalRecord){if(pending.value||context.busy.mutation)return;detail.value=item;selected.value=item.id;clearForm();}
function restoreFocus(){void nextTick(()=>trigger.value?.isConnected&&trigger.value.focus());}
function closeForm(){if(pending.value||context.busy.mutation)return;clearForm();restoreFocus();}
function start(a:PortalAction,event:Event){
  if(!allowed(a)||pending.value||context.busy.mutation)return;
  trigger.value=event.currentTarget as HTMLElement;action.value=a;localError.value='';notice.value='';context.invalidate('mutation');
  form.value={};chosenFile.value=null;formEpoch.value++;
  for(const field of a.fields){const value=a.command==='edit'?row.value?.[field.key as keyof PortalRecord]:undefined;form.value[field.key]=field.type==='money'&&typeof value==='number'?minorToDecimal(value):value===null||value===undefined?'':String(value);}
  if(props.domain==='expenses'&&!props.admin){metadata.value=[];void context.run('metadata',(id,signal)=>portalFinalRepository('categories').list(id,{},signal),v=>{metadata.value=v.data;});}
  void nextTick(()=>formHeading.value?.focus());
}
function choices(field:FormField){
  if(field.options)return field.options.map(value=>({value,label:value}));
  if(field.key==='category_id')return metadata.value.map(item=>({value:item.id,label:item.name??'Unnamed category'}));
  if(props.domain==='teams')return (detail.value?.data??[]).map(item=>({value:item.id,label:item.full_name??item.id}));
  if(props.domain==='rotas'&&field.key==='child_id')return (detail.value?.slots??[]).map(item=>({value:item.id,label:`${item.shift_date} ${item.start_time}–${item.end_time}`}));
  return [];
}
function buildAttempt():Attempt {
  if(!action.value)throw new Error('Choose an action.');
  const a=action.value,body:Record<string,unknown>={};
  for(const field of a.fields){
    const value=form.value[field.key]??'';
    if(field.type==='file'){if(!chosenFile.value)throw new Error('Choose a file.');continue;}
    if(field.key==='child_id')continue;
    if(!field.optional&&!value.trim())throw new Error(`${field.label} is required.`);
    body[field.key]=field.type==='money'?decimalToMinor(value):field.type==='integer'?Number(value):field.key==='is_active'?value==='true':value||null;
    if(field.type==='integer'&&(!Number.isSafeInteger(body[field.key])||Number(body[field.key])<1||Number(body[field.key])>1000))throw new Error('Required coverage must be an integer from 1 to 1000.');
  }
  if(a.versioned)body.version=row.value?.version;
  if(props.domain==='assets'&&a.command==='create')body.type='NEW_EQUIPMENT';
  if(a.command==='assignment'||a.command==='remove-member'){if(!form.value.child_id)throw new Error('Select the related record.');}
  return {action:a,id:a.command==='create'?'':selected.value,child:form.value.child_id??'',body,file:chosenFile.value,key:a.keyed?crypto.randomUUID():undefined};
}
function requestSubmit(){
  if(!action.value||!allowed(action.value)||context.busy.mutation)return;
  localError.value='';
  try{if(!pending.value)pending.value=buildAttempt();confirming.value=true;}catch(e){localError.value=e instanceof Error?e.message:'Check the form.';}
}
function cancelConfirmation(){confirming.value=false;if(!context.errors.mutation)pending.value=null;}
function submit(){
  const attempt=pending.value;if(!attempt||context.busy.mutation||!allowed(attempt.action))return;
  confirming.value=false;
  let body:Record<string,unknown>|FormData=attempt.body;
  if(attempt.file){const data=new FormData();for(const [key,value] of Object.entries(attempt.body))if(value!==undefined&&value!==null)data.append(key,String(value));data.append('file',attempt.file);body=data;}
  void context.run('mutation',(id,signal)=>api.mutate(id,attempt.action.command,attempt.id,body,attempt.key,signal,attempt.child),()=>{
    const recordId=attempt.id;clearForm();notice.value='Server confirmed the operation. Reloading authoritative records.';
    detail.value=null;load();if(recordId&&definition.detail&&attempt.action.command!=='remove')open(recordId,1,true);restoreFocus();
  },error=>{
    if(attempt.key&&['network','server'].includes(error.kind)){notice.value='Outcome uncertain. Retry preserves the original payload, file and key.';return;}
    pending.value=null;action.value=null;chosenFile.value=null;form.value={};formEpoch.value++;
    notice.value='The operation was not confirmed. Review refreshed server state before another action.';
    detail.value=null;load();if(attempt.id&&definition.detail&&attempt.action.command!=='remove')open(attempt.id,1,true);restoreFocus();
  });
}
function download(){const item=row.value;if(!item||!canRead.value)return;const filename=item.original_filename??item.attachment?.original_filename??item.receipt?.original_filename;if(!filename)return;void context.run('download',(id,signal)=>api.download(id,item.id,filename,signal),()=>{});}
const fileName=computed(()=>row.value?.original_filename??row.value?.attachment?.original_filename??row.value?.receipt?.original_filename);
function text(item:PortalRecord,key:keyof PortalRecord){const value=item[key];if(key==='amount_minor'&&typeof value==='number')return minorToDecimal(value);if(typeof value==='boolean')return value?'Yes':'No';return typeof value==='string'||typeof value==='number'?String(value):'—';}
const title=(item:PortalRecord)=>item.title??item.name??item.full_name??item.original_filename??item.item_description??item.shift_name??'Request';
load();
</script>
<template>
  <section class="min-w-0 space-y-4" :aria-label="definition.title">
    <header class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-xl font-semibold">{{ definition.title }}</h2><p class="mt-1 max-w-3xl text-sm text-content-secondary">{{ definition.description }}</p></div><ZButton v-if="definition.create && allowed(definition.create)" :disabled="!!pending || context.busy.mutation" @click="start(definition.create,$event)">{{ definition.create.label }}</ZButton></header>
    <p v-if="company.switching" role="status">Switching company…</p><p v-else-if="!canRead" role="status">This service is unavailable in this company. Its permission and payroll entitlement are required.</p>
    <template v-else>
      <p v-if="!admin && !activeEmployee && definition.create" class="text-sm">New changes are unavailable for an unlinked, former or unverified employee. Authorized history remains readable.</p>
      <form v-if="domain==='directory'||domain==='schedule'||(admin&&domain==='documents')" class="panel flex flex-wrap items-end gap-3 p-4" @submit.prevent="filter">
        <label v-if="domain==='directory'" class="block text-sm">Search colleagues<input v-model="query.search" class="field" maxlength="100" /></label>
        <label v-if="admin&&domain==='documents'" class="block text-sm">Employee UUID<input v-model="query.employee_id" class="field" required /></label>
        <template v-if="domain==='schedule'"><label class="block text-sm">From date<input v-model="query.from_date" type="date" class="field" required /></label><label class="block text-sm">To date<input v-model="query.to_date" type="date" class="field" required /></label></template>
        <ZButton type="submit" :disabled="!!pending||context.busy.mutation">Load records</ZButton>
      </form>
      <p v-if="domain==='swaps'&&!admin" class="text-sm"><RouterLink class="underline" to="/employee/schedule">Find your assignment reference in Published schedule</RouterLink>. A colleague must share their target assignment reference explicitly; their private schedule is not searched.</p>
      <p v-if="!list && !context.busy.list && !context.errors.list && (domain==='schedule'||(admin&&domain==='documents'))" class="text-sm">Choose the filters above and load records.</p>
      <p v-if="notice" role="status" class="panel p-3">{{ notice }}</p>
      <p v-for="(error,channel) in context.errors" v-show="error" :key="channel" role="alert" class="break-words text-sm text-danger">{{ error?.message }}<span v-if="error?.errorCode==='EMPLOYEE_IDENTITY_NOT_LINKED'"> No employee profile is linked to this membership.</span></p>
      <Panel v-if="action" :key="formEpoch" class="p-4">
        <h3 ref="formHeading" tabindex="-1" class="font-semibold">{{ action.label }}</h3>
        <form class="mt-3 space-y-4" @submit.prevent="requestSubmit" @keydown.esc="closeForm">
          <fieldset :disabled="!!pending||context.busy.mutation" class="grid gap-4 sm:grid-cols-2">
            <div v-for="field in action.fields" :key="field.key" class="min-w-0"><label :for="`${domain}-${field.key}`" class="text-sm">{{ field.label }}</label>
              <textarea v-if="field.type==='textarea'" :id="`${domain}-${field.key}`" v-model="form[field.key]" class="field mt-1 h-auto" rows="4" :required="!field.optional" />
              <select v-else-if="field.type==='select'" :id="`${domain}-${field.key}`" v-model="form[field.key]" class="field mt-1" :required="!field.optional"><option value="">{{ field.optional?'None':'Select an option' }}</option><option v-for="option in choices(field)" :key="option.value" :value="option.value">{{ option.label }}</option></select>
              <input v-else-if="field.type==='file'" :id="`${domain}-${field.key}`" type="file" class="field mt-1 min-w-0" required @change="chosenFile=($event.target as HTMLInputElement).files?.[0]??null" />
              <input v-else :id="`${domain}-${field.key}`" v-model="form[field.key]" :type="field.type==='date'||field.type==='time'?field.type:'text'" :inputmode="field.type==='money'?'decimal':field.type==='integer'?'numeric':undefined" class="field mt-1" :required="!field.optional" />
              <p v-if="context.errors.mutation?.fields[field.key]" class="text-sm text-danger">{{ context.errors.mutation.fields[field.key] }}</p>
            </div>
          </fieldset>
          <p v-if="action.fields.some(f=>f.type==='file')" class="text-xs">Private upload. The server validates configured file types and size limits.</p>
          <button v-if="context.errors.metadata" type="button" class="underline" @click="start(action,$event)">Retry categories</button>
          <p v-if="localError" role="alert">{{ localError }}</p><p v-if="pending&&!context.busy.mutation&&!confirming" role="alert">Retry uses the unchanged original submission.</p>
          <div class="flex flex-wrap gap-2"><ZButton type="submit" :disabled="context.busy.mutation||context.busy.metadata">{{ context.busy.mutation?'Working…':pending?'Retry same submission':'Review submission' }}</ZButton><ZButton variant="outline" :disabled="!!pending||context.busy.mutation" @click="closeForm">Cancel</ZButton></div>
        </form>
      </Panel>
      <Panel title="Records">
        <p v-if="context.busy.list" role="status" class="p-4">Loading records…</p>
        <div v-else-if="context.errors.list" class="p-4"><ZButton variant="outline" @click="load()">Retry list</ZButton></div>
        <template v-else-if="list">
          <div v-if="domain==='teams'&&!admin" class="border-b border-line p-4 text-sm"><p>Manager: {{ list.manager?.full_name??'No current manager assigned' }}</p><p v-if="list.manager">{{ list.manager.designation }} · {{ list.manager.department }} · {{ list.manager.location }}</p><p>Direct reports: {{ list.direct_report_count }}</p></div>
          <div class="grid gap-3 p-4 sm:grid-cols-2"><article v-for="item in list.data" :key="item.id" class="min-w-0 rounded-md border border-line p-4"><h3 class="break-words font-semibold">{{ title(item) }}</h3><dl class="mt-2 space-y-2 text-sm"><div v-for="[key,label] in definition.fields" :key="key"><dt class="text-content-muted">{{ label }}</dt><dd class="whitespace-pre-wrap break-words">{{ text(item,key) }}</dd></div></dl><ZButton v-if="definition.detail||definition.actions.length" variant="outline" class="mt-3" :disabled="!!pending||context.busy.mutation" @click="definition.detail?open(item.id):selectInline(item)">View details</ZButton></article><p v-if="!list.data.length">No records returned.</p></div>
          <div v-if="list.meta" class="flex flex-wrap items-center gap-3 border-t border-line p-4 text-sm"><span>Page {{ list.meta.current_page }} of {{ list.meta.last_page }} · {{ list.meta.total }} records</span><ZButton variant="outline" :disabled="list.meta.current_page<=1||!!pending||context.busy.mutation" @click="load(list.meta.current_page-1)">Previous page</ZButton><ZButton variant="outline" :disabled="list.meta.current_page>=list.meta.last_page||!!pending||context.busy.mutation" @click="load(list.meta.current_page+1)">Next page</ZButton></div>
        </template>
      </Panel>
      <p v-if="context.busy.detail" role="status">Loading details…</p><ZButton v-if="context.errors.detail" variant="outline" @click="open(selected,detailPage)">Retry detail</ZButton>
      <Panel v-if="row" title="Details" body-class="space-y-4 p-4">
        <dl class="grid gap-3 text-sm sm:grid-cols-2"><div v-for="[key,label] in definition.fields" :key="key" class="min-w-0"><dt class="text-content-muted">{{ label }}</dt><dd class="whitespace-pre-wrap break-words">{{ text(row,key) }}</dd></div></dl>
        <p v-if="row.lead" class="text-sm">Team lead: {{ row.lead.full_name }}</p>
        <ZButton v-if="fileName" variant="outline" :disabled="context.busy.download" @click="download">Download {{ fileName }}</ZButton>
        <div v-if="detail?.data" class="space-y-2"><h3 class="font-semibold">Members</h3><p v-for="member in detail.data" :key="member.id" class="break-words text-sm">{{ member.full_name }} · {{ member.department }} · {{ member.designation }} · {{ member.location }}</p><div v-if="detail.meta" class="flex flex-wrap gap-2 text-sm"><span>{{ detail.meta.total }} members · Page {{ detail.meta.current_page }}</span><ZButton variant="outline" :disabled="detail.meta.current_page<=1||!!pending" @click="open(selected,detailPage-1)">Previous members</ZButton><ZButton variant="outline" :disabled="detail.meta.current_page>=detail.meta.last_page||!!pending" @click="open(selected,detailPage+1)">Next members</ZButton></div></div>
        <div v-if="detail?.slots" class="space-y-3"><h3 class="font-semibold">Slots and assignments</h3><article v-for="slot in detail.slots" :key="slot.id" class="rounded border border-line p-3 text-sm"><p>{{ slot.shift_date }} · {{ slot.start_time }}–{{ slot.end_time }}</p><p>Required coverage {{ slot.required_coverage }} · Assigned {{ slot.assigned_count }} · Gap {{ slot.coverage_gap }}</p><p v-for="assignment in slot.assignments" :key="assignment.id" class="break-all">Employee {{ assignment.employee_id }} · Assignment {{ assignment.id }}</p></article></div>
        <div v-if="row.events?.length" class="space-y-2"><h3 class="font-semibold">Recorded history</h3><p v-for="event in row.events" :key="event.id" class="break-words text-sm">{{ event.type }} · {{ event.occurred_at }} · {{ event.reason }}</p></div>
        <div class="flex flex-wrap gap-2"><ZButton v-for="a in actions" :key="a.command" variant="outline" :disabled="!!pending||context.busy.mutation" @click="start(a,$event)">{{ a.label }}</ZButton></div>
      </Panel>
      <ConfirmDialog :open="confirming" :title="action?.label??'Confirm operation'" message="Send this operation to the server? The server validates permission, version and lifecycle. No change is final until confirmed." confirm-label="Confirm operation" :busy="context.busy.mutation" @confirm="submit" @cancel="cancelConfirmation" />
    </template>
  </section>
</template>
