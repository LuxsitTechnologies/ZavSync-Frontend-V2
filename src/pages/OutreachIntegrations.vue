<script setup lang="ts">
import { reactive, ref } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import IntegrationCard from "@/components/crm/IntegrationCard.vue";
import DataTable from "@/components/zs/DataTable.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useOutreachData } from "@/composables/useOutreachData";
import { useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { outreachRepository } from "@/services/outreach/repository";
import { setPageMeta } from "@/lib/page-meta";
import type { OutreachConnection } from "@/types/outreach";

setPageMeta("Email Integrations", "Manage provider connections and verified sending identities.");
const data=useOutreachData();const providerOpen=ref(false),identityOpen=ref(false);
const provider=reactive({name:"",provider_type:"SMTP",host:"",port:587,encryption:"tls",username:"",password:""});
const identity=reactive({provider_connection_id:"",from_email:"",from_name:"",reply_to_email:"",is_default:false});
const providerMutation=useMutation(()=>outreachRepository.createConnection(data.activeCompanyId.value,{name:provider.name,provider_type:provider.provider_type,configuration:{host:provider.host,port:provider.port,encryption:provider.encryption,username:provider.username||null},credentials:{password:provider.password}}));
const identityMutation=useMutation(()=>outreachRepository.createIdentity(data.activeCompanyId.value,{...identity,reply_to_email:identity.reply_to_email||null}));
const actionMutation=useMutation(async(action:"verify"|"disconnect"|"sync",id:string):Promise<OutreachConnection|{synchronized:number}>=>action==="verify"?outreachRepository.verifyConnection(data.activeCompanyId.value,id):action==="disconnect"?outreachRepository.disconnectConnection(data.activeCompanyId.value,id):outreachRepository.syncReplies(data.activeCompanyId.value,id));
const columns=[{key:"from_email",header:"Sending address"},{key:"from_name",header:"Sender name"},{key:"connection_name",header:"Provider"},{key:"verification_status",header:"Verification"},{key:"is_default",header:"Default"},{key:"is_active",header:"Status"}];
async function saveProvider(){const saved=await providerMutation.run();if(!saved)return;providerOpen.value=false;await data.connections.refresh();showToast("Provider saved","Verify the connection before creating a sender.","success")}
async function saveIdentity(){const saved=await identityMutation.run();if(!saved)return;identityOpen.value=false;await data.identities.refresh();showToast("Sending identity saved",saved.from_email,"success")}
async function act(action:"verify"|"disconnect"|"sync",row:OutreachConnection){const result=await actionMutation.run(action,row.id);if(!result)return;await Promise.all([data.connections.refresh(),data.identities.refresh()]);showToast(action==="sync"?"Reply sync requested":`Provider ${action} complete`,row.name,"success")}
</script>

<template>
  <AppShell>
    <PageHeader title="Email Integrations" description="Provider connections, credentials and verified sender identities"><template #actions><ZButton variant="outline" @click="identityOpen=true">Add identity</ZButton><ZButton @click="providerOpen=true">Add provider</ZButton></template></PageHeader>
    <div class="space-y-3">
      <Panel title="Providers" description="Credentials and OAuth tokens are encrypted by the backend" body-class="p-0"><AsyncSection :loading="data.connections.loading.value" :error="data.connections.error.value" :empty="data.connections.isEmpty.value" empty-title="No email providers" empty-message="Add an SMTP or OAuth-capable provider connection." @retry="data.connections.refresh"><div class="grid gap-3 p-4 md:grid-cols-2"><IntegrationCard v-for="row in data.connections.data.value??[]" :key="row.id" :integration="row" :busy="actionMutation.saving.value" @connect="act('verify',row)" @disconnect="act('disconnect',row)" @sync="act('sync',row)"/></div></AsyncSection></Panel>
      <Panel title="Sending identities" description="Only verified active identities can activate sequences"><AsyncSection :loading="data.identities.loading.value" :error="data.identities.error.value" :empty="data.identities.isEmpty.value" empty-title="No sending identities" empty-message="Create a sender after connecting a provider." @retry="data.identities.refresh"><DataTable :columns="columns" :rows="data.identities.data.value??[]" :min-width="780"><template #verification_status="{row}"><StatusBadge :status="row.verification_status"/></template><template #is_default="{row}">{{row.is_default?'Default':'—'}}</template><template #is_active="{row}"><StatusBadge :status="row.is_active?'ACTIVE':'INACTIVE'"/></template></DataTable></AsyncSection></Panel>
    </div>
    <SidePanel :open="providerOpen" title="Add email provider" description="SMTP can be verified directly; OAuth providers require configured provider infrastructure." @close="providerOpen=false"><form class="space-y-4" @submit.prevent="saveProvider"><label><span class="label-caps">Connection name</span><input v-model="provider.name" class="field mt-1.5" required/></label><label><span class="label-caps">Provider type</span><select v-model="provider.provider_type" class="field mt-1.5"><option value="SMTP">SMTP</option><option value="GOOGLE">Google OAuth</option><option value="MICROSOFT">Microsoft OAuth</option></select></label><template v-if="provider.provider_type==='SMTP'"><label><span class="label-caps">SMTP host</span><input v-model="provider.host" class="field mt-1.5" required/></label><div class="grid grid-cols-2 gap-3"><label><span class="label-caps">Port</span><input v-model.number="provider.port" type="number" class="field mt-1.5" required/></label><label><span class="label-caps">Encryption</span><select v-model="provider.encryption" class="field mt-1.5"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></select></label></div><label><span class="label-caps">Username</span><input v-model="provider.username" class="field mt-1.5"/></label><label><span class="label-caps">Password</span><input v-model="provider.password" type="password" class="field mt-1.5" autocomplete="new-password"/></label></template><ValidationMessage :message="providerMutation.error.value?.message"/><ZButton type="submit" :disabled="providerMutation.saving.value">Save provider</ZButton></form></SidePanel>
    <SidePanel :open="identityOpen" title="Add sending identity" description="The provider must be connected before an identity can be created." @close="identityOpen=false"><form class="space-y-4" @submit.prevent="saveIdentity"><label><span class="label-caps">Provider</span><select v-model="identity.provider_connection_id" class="field mt-1.5" required><option value="">Select provider</option><option v-for="row in (data.connections.data.value??[]).filter(x=>x.status==='CONNECTED')" :key="row.id" :value="row.id">{{row.name}}</option></select></label><label><span class="label-caps">From email</span><input v-model="identity.from_email" type="email" class="field mt-1.5" required/></label><label><span class="label-caps">From name</span><input v-model="identity.from_name" class="field mt-1.5" required/></label><label><span class="label-caps">Reply-to email</span><input v-model="identity.reply_to_email" type="email" class="field mt-1.5"/></label><label class="flex items-center gap-2 text-sm"><input v-model="identity.is_default" type="checkbox"/>Make this the default sender</label><ValidationMessage :message="identityMutation.error.value?.message"/><ZButton type="submit" :disabled="identityMutation.saving.value">Save identity</ZButton></form></SidePanel>
  </AppShell>
</template>
