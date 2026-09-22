export type LeadStage = 'New'|'Contacted'|'Qualified'|'Proposal'|'Negotiation'|'Won'|'Lost'
export type Heat = 'Cold'|'Warm'|'Hot'
export type EnrichmentState = 'not_enriched'|'processing'|'enriched'|'failed'
export type ActivityType = 'Email'|'Call'|'Note'|'Task'|'Meeting'|'Stage change'|'AI enrichment'|'Outreach'
export interface CrmCompany { id:string; companyId:string; name:string; industry:string; website:string; primaryContact:string; phone:string; email:string; status:string; owner:string; lastActivity:string; size:string; revenue:string; address:string; source:string }
export interface CrmContact { id:string; companyId:string; name:string; accountId:string; company:string; title:string; email:string; phone:string; linkedin:string; owner:string; status:string; lastActivity:string }
export interface LeadScore { fit:number; intent:number; total:number; heat:Heat }
export interface Enrichment { state:EnrichmentState; summary:string; industry:string; size:string; profile:string; painPoints:string[]; opportunities:string[]; valueProposition:string; sources:string[]; enrichedAt?:string }
export interface CrmLead { id:string; companyId:string; firstName:string; lastName:string; name:string; company:string; accountId:string; title:string; email:string; phone:string; website:string; linkedin:string; industry:string; size:string; source:string; stage:LeadStage; value:number; score:LeadScore; owner:string; lastActivity:string; notes:string; enrichment:Enrichment }
export interface CrmActivity { id:string; companyId:string; leadId?:string; accountId?:string; type:ActivityType; title:string; detail:string; actor:string; timestamp:string; status?:string }
export interface CrmTask { id:string; companyId:string; title:string; relatedTo:string; owner:string; due:string; priority:'Low'|'Medium'|'High'; status:'Open'|'In progress'|'Completed' }
export interface EmailEvent { id:string; companyId:string; leadId:string; date:string; subject:string; sequence:string; status:'Sent'|'Delivered'|'Opened'|'Replied'|'Follow-up pending'|'Follow-up sent'; sender:string; step:number; body:string }
export interface SequenceStep { id:string; subject:string; body:string; delayDays:number }
export interface Sequence { id:string; companyId:string; name:string; objective:string; tone:string; leadId:string; steps:SequenceStep[]; status:'Draft'|'Active'|'Paused'|'Completed'; enrolled:number; completed:number; replied:number; openRate:number; replyRate:number }
export interface EmailIntegration { id:string; companyId:string; provider:'Gmail'|'Microsoft Outlook'; email:string; status:'Not Connected'|'Connecting'|'Connected'|'Connection Error'|'Expired'; lastSync?:string }

export interface CrmDeal { id:string; companyId:string; name:string; accountId:string; company:string; contact:string; stage:LeadStage; value:number; probability:number; expectedClose:string; owner:string; source:string; nextStep:string; lastActivity:string }
