import { apiRequest } from "@/services/api/client";
import type { EmailTemplate, EnrollmentResult, OutreachConnection, OutreachEnrollment, OutreachMessage, OutreachReport, OutreachSequence, OutreachSuppression, Paginated, SendingIdentity } from "@/types/outreach";

type Query=Record<string,string|number|boolean|null|undefined>;
async function list<T>(path:string,companyId:string,query:Query={}):Promise<T[]>{const response=await apiRequest<T[]|Paginated<T>>(path,{companyId,query:{per_page:100,...query}});return Array.isArray(response)?response:response.data}

export const outreachRepository={
  connections:(companyId:string)=>list<OutreachConnection>("/outreach/providers",companyId),
  createConnection:(companyId:string,input:Record<string,unknown>)=>apiRequest<OutreachConnection>("/outreach/providers",{method:"POST",companyId,body:input}),
  updateConnection:(companyId:string,id:string,input:Record<string,unknown>)=>apiRequest<OutreachConnection>(`/outreach/providers/${id}`,{method:"PATCH",companyId,body:input}),
  verifyConnection:(companyId:string,id:string)=>apiRequest<OutreachConnection>(`/outreach/providers/${id}/verify`,{method:"POST",companyId,body:{}}),
  disconnectConnection:(companyId:string,id:string)=>apiRequest<OutreachConnection>(`/outreach/providers/${id}/disconnect`,{method:"POST",companyId,body:{}}),
  syncReplies:(companyId:string,id:string)=>apiRequest<{synchronized:number}>(`/outreach/providers/${id}/sync-replies`,{method:"POST",companyId,body:{}}),
  identities:(companyId:string)=>list<SendingIdentity>("/outreach/identities",companyId),
  createIdentity:(companyId:string,input:Record<string,unknown>)=>apiRequest<SendingIdentity>("/outreach/identities",{method:"POST",companyId,body:input}),
  updateIdentity:(companyId:string,id:string,input:Record<string,unknown>)=>apiRequest<SendingIdentity>(`/outreach/identities/${id}`,{method:"PATCH",companyId,body:input}),
  templates:(companyId:string)=>list<EmailTemplate>("/outreach/templates",companyId),
  createTemplate:(companyId:string,input:Record<string,unknown>)=>apiRequest<EmailTemplate>("/outreach/templates",{method:"POST",companyId,body:input}),
  updateTemplate:(companyId:string,id:string,input:Record<string,unknown>)=>apiRequest<EmailTemplate>(`/outreach/templates/${id}`,{method:"PATCH",companyId,body:input}),
  previewTemplate:(companyId:string,id:string,contactId:string)=>apiRequest<{subject:string;body_text:string;body_html:string|null}>(`/outreach/templates/${id}/preview`,{method:"POST",companyId,body:{contact_id:contactId}}),
  sequences:(companyId:string)=>list<OutreachSequence>("/outreach/sequences",companyId),
  sequence:(companyId:string,id:string)=>apiRequest<OutreachSequence>(`/outreach/sequences/${id}`,{companyId}),
  createSequence:(companyId:string,input:Record<string,unknown>)=>apiRequest<OutreachSequence>("/outreach/sequences",{method:"POST",companyId,body:input}),
  updateSequence:(companyId:string,id:string,input:Record<string,unknown>)=>apiRequest<OutreachSequence>(`/outreach/sequences/${id}`,{method:"PUT",companyId,body:input}),
  transitionSequence:(companyId:string,id:string,status:string)=>apiRequest<OutreachSequence>(`/outreach/sequences/${id}/transition`,{method:"POST",companyId,body:{status}}),
  enroll:(companyId:string,id:string,input:Record<string,unknown>)=>apiRequest<EnrollmentResult>(`/outreach/sequences/${id}/enrollments`,{method:"POST",companyId,body:{...input,idempotency_key:crypto.randomUUID()}}),
  enrollments:(companyId:string,query:Query={})=>list<OutreachEnrollment>("/outreach/enrollments",companyId,query),
  transitionEnrollment:(companyId:string,id:string,status:string)=>apiRequest<OutreachEnrollment>(`/outreach/enrollments/${id}/transition`,{method:"POST",companyId,body:{status}}),
  messages:(companyId:string,query:Query={})=>list<OutreachMessage>("/outreach/messages",companyId,query),
  message:(companyId:string,id:string)=>apiRequest<OutreachMessage>(`/outreach/messages/${id}`,{companyId}),
  retryMessage:(companyId:string,id:string)=>apiRequest<OutreachMessage>(`/outreach/messages/${id}/retry`,{method:"POST",companyId,body:{}}),
  suppressions:(companyId:string)=>list<OutreachSuppression>("/outreach/suppressions",companyId),
  createSuppression:(companyId:string,input:Record<string,unknown>)=>apiRequest<OutreachSuppression>("/outreach/suppressions",{method:"POST",companyId,body:input}),
  removeSuppression:(companyId:string,id:string)=>apiRequest<OutreachSuppression>(`/outreach/suppressions/${id}`,{method:"DELETE",companyId}),
  report:async(companyId:string)=>(await apiRequest<{data:OutreachReport}>("/outreach/reports",{companyId})).data,
  aiDraft:async(companyId:string,prompt:string,context:Record<string,unknown>)=>(await apiRequest<{data:{subject:string;body_text:string;body_html:string|null}}>("/outreach/ai/draft",{method:"POST",companyId,body:{prompt,context}})).data,
};
