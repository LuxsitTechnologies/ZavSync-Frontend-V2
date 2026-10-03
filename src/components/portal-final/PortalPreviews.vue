<script setup lang="ts">
import { ref } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { portalFinalRepository } from '@/services/portalFinal.repository';
import { employeeLeaveRepository } from '@/services/employeeLeave.repository';
import { employeeWorkRepository } from '@/services/employeeWork.repository';
import { companyDate } from '@/lib/leave';
const props=defineProps<{requests?:boolean}>(),company=useCompanyStore();
type Preview={id:string;label:string;status?:string};
const values=ref<Record<string,{data:Preview[];total?:number}>>({});
const sources=props.requests?[
  {key:'leave',label:'Leave requests',permission:'employee.leave.view',to:'/employee/leaves'},
  {key:'tickets',label:'Tickets',permission:'employee.tickets.view',to:'/employee/tickets'},
  {key:'assets',label:'Equipment requests',permission:'employee.assets.view',to:'/employee/assets'},
  {key:'expenses',label:'Expense claims',permission:'employee.expenses.view',to:'/employee/expenses'},
  {key:'swaps',label:'Shift swaps',permission:'employee.schedule.view',to:'/employee/shift-swaps'},
]:[
  {key:'announcements',label:'Announcements',permission:'employee.announcements.view',to:'/employee/announcements'},
  {key:'documents',label:'Documents',permission:'employee.documents.view',to:'/employee/documents'},
  {key:'schedule',label:'Published schedule',permission:'employee.schedule.view',to:'/employee/schedule'},
];
const context=useWorkContext(()=>{values.value={};},load);
function read(key:string){const source=sources.find(s=>s.key===key)!;if(!company.hasModule('payroll')||!company.hasPermission(source.permission))return;delete values.value[key];void context.run(key,async(id,signal)=>{
  if(key==='leave'){const v=await employeeLeaveRepository.history(id,1,'',signal);return {data:v.data.map(r=>({id:r.id,label:`${r.type_name}: ${r.start_date}–${r.end_date}`,status:r.status})),total:v.meta.total};}
  if(key==='tickets'){const v=await employeeWorkRepository.list(id,'tickets',1,'','',signal);return {data:v.data.map(r=>({id:r.id,label:r.subject??'Ticket',status:r.status})),total:v.meta.total};}
  const domain=key as 'assets'|'expenses'|'swaps'|'documents'|'announcements'|'schedule';
  const today=companyDate(company.activeCompany?.timezone);
  if(domain==='schedule'&&!today)throw new Error('Company date unavailable.');
  const query:Record<string,string|number>=domain==='schedule'?{from_date:today,to_date:today}:{page:1,per_page:3};
  const v=await portalFinalRepository(domain).list(id,query,signal);
  return {data:v.data.map(r=>({id:r.id,label:r.title??r.original_filename??r.item_description??(r.shift_name?`${r.shift_name} ${r.shift_date} ${r.start_time}–${r.end_time} ${r.timezone}`:'Shift swap'),status:r.status})),total:v.meta?.total};
},v=>{values.value[key]={...v,data:v.data.slice(0,3)};});}
function load(){sources.forEach(s=>read(s.key));}load();
</script>
<template><div class="mt-4 grid gap-4 lg:grid-cols-3"><Panel v-for="source in sources" :key="source.key" :title="source.label" :description="source.key==='schedule'?'Today in the company timezone: at most three published assignments. Open Published schedule for other dates.':'Partial preview: at most three records from the first page. Open the domain to see its full history.'" body-class="space-y-3 p-4"><p v-if="!company.hasModule('payroll')||!company.hasPermission(source.permission)" class="text-sm">This source is unavailable in this company.</p><template v-else><p v-if="context.busy[source.key]" role="status">Loading…</p><p v-else-if="context.errors[source.key]" role="alert">{{ context.errors[source.key]?.message }} <button class="underline" @click="read(source.key)">Retry {{ source.label }}</button></p><template v-else-if="values[source.key]"><p v-if="values[source.key]?.total!==undefined" class="text-sm">Server total: {{ values[source.key]?.total }}</p><ul class="space-y-2"><li v-for="item in values[source.key]?.data" :key="item.id" class="break-words text-sm">{{ item.label }}<span v-if="item.status"> · {{ item.status }}</span></li></ul><p v-if="!values[source.key]?.data.length" class="text-sm">No records in this source.</p></template><RouterLink :to="source.to" class="inline-block text-sm underline">Open {{ source.label }}</RouterLink></template></Panel></div></template>
