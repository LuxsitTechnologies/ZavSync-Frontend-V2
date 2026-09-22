import { apiRequest,isApiConfigured,previewDelay,validationError } from '@/services/api/client'
import { crmActivities,crmCompanies,crmContacts,crmDeals,crmLeads,crmTasks,emailEvents,integrations,sequences } from './mock-db'
import type { CrmActivity,CrmCompany,CrmContact,CrmDeal,CrmLead,CrmTask,EmailEvent,EmailIntegration,Sequence } from '@/types/crm'
const scoped=<T extends {companyId:string}>(rows:T[],companyId:string)=>rows.filter(r=>r.companyId===companyId)
async function list<T extends {companyId:string}>(companyId:string,path:string,rows:T[]){return isApiConfigured()?apiRequest<T[]>(path,{companyId}):previewDelay(scoped(rows,companyId))}
export const crmRepository={
 deals:(id:string)=>list<CrmDeal>(id,'/crm/deals',crmDeals),companies:(id:string)=>list<CrmCompany>(id,'/crm/companies',crmCompanies),contacts:(id:string)=>list<CrmContact>(id,'/crm/contacts',crmContacts),leads:(id:string)=>list<CrmLead>(id,'/crm/leads',crmLeads),activities:(id:string)=>list<CrmActivity>(id,'/crm/activities',crmActivities),tasks:(id:string)=>list<CrmTask>(id,'/crm/tasks',crmTasks),emails:(id:string)=>list<EmailEvent>(id,'/crm/emails',emailEvents),sequences:(id:string)=>list<Sequence>(id,'/crm/sequences',sequences),integrations:(id:string)=>list<EmailIntegration>(id,'/crm/integrations',integrations),
 async lead(companyId:string,id:string){const rows=await this.leads(companyId);return rows.find(r=>r.id===id)??null}, async updateLeadStage(companyId:string,id:string,stage:CrmLead['stage']){if(isApiConfigured())return apiRequest<CrmLead>(`/crm/leads/${id}`,{method:'PATCH',companyId,body:{stage}});const row=crmLeads.find(x=>x.id===id&&x.companyId===companyId);if(!row)throw validationError('This lead is unavailable in the active company.');row.stage=stage;return previewDelay({...row})}
}
