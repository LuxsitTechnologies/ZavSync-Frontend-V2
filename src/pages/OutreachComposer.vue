<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Sparkles } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ScoreBadge from "@/components/crm/ScoreBadge.vue";
import SequenceBuilder from "@/components/crm/SequenceBuilder.vue";
import { useCrmData } from "@/composables/useCrmData";
import { useOutreachData } from "@/composables/useOutreachData";
import { useMutation } from "@/composables/useAsyncData";
import { outreachRepository } from "@/services/outreach/repository";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import type { OutreachStep } from "@/types/outreach";

setPageMeta("Outreach Composer", "Author templates and review every sequence before activation.");
const crm=useCrmData(),outreach=useOutreachData(),route=useRoute(),router=useRouter();const selected=ref(String(route.query.lead??""));
const name=ref("Operational efficiency"),identityId=ref(""),ownerId=ref(""),timezone=ref("Asia/Karachi"),startsAt=ref(""),steps=ref<OutreachStep[]>([]),templateOpen=ref(false);
const template=reactive({name:"",category:"GENERAL",subject:"",body_text:"",body_html:""});
const lead=computed(()=>(crm.leads.data.value??[]).find(row=>row.id===selected.value));
const saveMutation=useMutation(()=>outreachRepository.createSequence(outreach.activeCompanyId.value,{name:name.value,sending_identity_id:identityId.value,owner_id:ownerId.value?Number(ownerId.value):null,timezone:timezone.value,starts_at:startsAt.value?new Date(startsAt.value).toISOString():null,allowed_weekdays:[1,2,3,4,5],send_window_start:"09:00",send_window_end:"17:00",track_opens:true,track_clicks:true,stop_on_reply:true,steps:steps.value}));
const aiMutation=useMutation(()=>outreachRepository.aiDraft(outreach.activeCompanyId.value,"Write a concise, compliant first-touch email using only the supplied CRM facts.",{lead_id:selected.value,lead_name:lead.value?.name,company_name:lead.value?.company,industry:lead.value?.industry}));
const templateMutation=useMutation(()=>outreachRepository.createTemplate(outreach.activeCompanyId.value,{...template,body_html:template.body_html||null,is_active:true}));
const archiveMutation=useMutation((id:string)=>outreachRepository.updateTemplate(outreach.activeCompanyId.value,id,{is_active:false}));
function startManual(){steps.value=[{type:"EMAIL",template_id:null,subject:"",body_text:"",body_html:null,wait_minutes:0}]}
function useTemplate(id:string){const selectedTemplate=outreach.templates.data.value?.find(row=>row.id===id);if(!selectedTemplate)return;steps.value=[{type:"EMAIL",template_id:selectedTemplate.id,subject:selectedTemplate.subject,body_text:selectedTemplate.body_text,body_html:selectedTemplate.body_html,wait_minutes:0}]}
async function generate(){const draft=await aiMutation.run();if(!draft)return;steps.value=[{type:"EMAIL",template_id:null,subject:draft.subject,body_text:draft.body_text,body_html:draft.body_html,wait_minutes:0}];showToast("AI draft ready","Review and edit it before saving.","success")}
async function save(){const saved=await saveMutation.run();if(!saved)return;await outreach.sequences.refresh();showToast("Draft sequence saved",saved.name,"success");await router.push(`/outreach/automations/${saved.id}`)}
async function saveTemplate(){const saved=await templateMutation.run();if(!saved)return;templateOpen.value=false;await outreach.templates.refresh();showToast("Template saved",saved.name,"success")}
async function archiveTemplate(id:string){const saved=await archiveMutation.run(id);if(!saved)return;await outreach.templates.refresh();showToast("Template archived",saved.name,"success")}
</script>

<template>
  <AppShell>
    <PageHeader title="Outreach Composer" description="Build an auditable draft from CRM facts; AI never sends or activates"><template #actions><ZButton variant="outline" @click="templateOpen=true">New template</ZButton><ZButton variant="outline" @click="router.push('/outreach/automations')">View automations</ZButton></template></PageHeader>
    <div class="grid gap-3 xl:grid-cols-[360px_1fr]">
      <div class="space-y-3">
        <Panel title="Recipient context" body-class="p-4"><label><span class="label-caps">Lead</span><select v-model="selected" class="field mt-1.5"><option value="">Select a lead</option><option v-for="row in crm.leads.data.value??[]" :key="row.id" :value="row.id">{{row.name}} — {{row.company}}</option></select></label><div v-if="lead" class="mt-4 flex items-center justify-between"><div><p class="text-sm font-semibold text-content">{{lead.name}}</p><p class="text-xs text-content-muted">{{lead.title}} · {{lead.company}}</p></div><ScoreBadge :score="lead.score.total"/></div></Panel>
        <Panel title="Sequence settings" body-class="space-y-4 p-4"><Field v-model="name" label="Sequence name"/><label><span class="label-caps">Sending identity</span><select v-model="identityId" class="field mt-1.5"><option value="">Select verified sender</option><option v-for="row in (outreach.identities.data.value??[]).filter(x=>x.is_active&&x.verification_status==='VERIFIED')" :key="row.id" :value="row.id">{{row.from_name}} · {{row.from_email}}</option></select></label><label><span class="label-caps">Owner</span><select v-model="ownerId" class="field mt-1.5"><option value="">Current user</option><option v-for="row in crm.owners.data.value??[]" :key="row.id" :value="row.id">{{row.name}}</option></select></label><Field v-model="timezone" label="Timezone"/><Field v-model="startsAt" label="Optional start date/time" type="datetime-local"/><label><span class="label-caps">Start from template</span><select class="field mt-1.5" @change="useTemplate(($event.target as HTMLSelectElement).value)"><option value="">Choose template</option><option v-for="row in (outreach.templates.data.value??[]).filter(x=>x.is_active)" :key="row.id" :value="row.id">{{row.name}}</option></select></label><div class="grid gap-2"><ZButton variant="outline" @click="startManual">Start manual draft</ZButton><ZButton :disabled="!lead||aiMutation.saving.value" @click="generate"><Sparkles class="size-3.5"/>AI-assisted draft</ZButton></div><ValidationMessage :message="aiMutation.error.value?.message"/></Panel>
        <Panel title="Reusable templates" body-class="space-y-2 p-4"><div v-for="row in outreach.templates.data.value??[]" :key="row.id" class="flex items-center justify-between gap-2 rounded-md border border-line p-2"><div class="min-w-0"><p class="truncate text-xs font-medium text-content">{{row.name}}</p><p class="text-2xs text-content-muted">{{row.category}} · {{row.is_active?'Active':'Archived'}}</p></div><div class="flex"><ZButton v-if="row.is_active" variant="ghost" @click="useTemplate(row.id)">Use</ZButton><ZButton v-if="row.is_active" variant="ghost" @click="archiveTemplate(row.id)">Archive</ZButton></div></div><p v-if="!(outreach.templates.data.value??[]).length" class="text-xs text-content-muted">No templates yet.</p><ValidationMessage :message="archiveMutation.error.value?.message"/></Panel>
      </div>
      <div><div v-if="steps.length" class="mb-3 flex justify-end"><ZButton :disabled="!identityId||saveMutation.saving.value" @click="save">Save draft sequence</ZButton></div><SequenceBuilder v-if="steps.length" v-model="steps"/><Panel v-else body-class="p-16 text-center"><Sparkles class="mx-auto size-8 text-content-muted"/><p class="mt-3 text-sm font-semibold text-content">Start a manual draft, choose a template, or request an AI draft</p><p class="mt-1 text-xs text-content-muted">All content remains editable and requires explicit activation.</p></Panel><ValidationMessage class="mt-3" :message="saveMutation.error.value?.message"/></div>
    </div>
    <SidePanel :open="templateOpen" title="New reusable template" description="Use only the allowlisted CRM variables documented by the backend." @close="templateOpen=false"><form class="space-y-4" @submit.prevent="saveTemplate"><Field v-model="template.name" label="Template name" required/><Field v-model="template.category" label="Category" required/><Field v-model="template.subject" label="Subject" required/><label><span class="label-caps">Plain-text body</span><textarea v-model="template.body_text" class="field mt-1.5 min-h-40" required/></label><label><span class="label-caps">Optional HTML body</span><textarea v-model="template.body_html" class="field mt-1.5 min-h-32"/></label><p class="text-2xs text-content-muted">Allowed examples: <code v-pre>{{contact.first_name}}</code>, <code v-pre>{{account.name}}</code>, <code v-pre>{{sender.name}}</code>, <code v-pre>{{company.name}}</code>.</p><ValidationMessage :message="templateMutation.error.value?.message"/><ZButton type="submit" :disabled="templateMutation.saving.value">Save template</ZButton></form></SidePanel>
  </AppShell>
</template>
