export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | "CONVERTED" | "LOST";
export type DealStatus = "OPEN" | "WON" | "LOST";
export type Heat = "Cold" | "Warm" | "Hot";
export type ActivityType = "Call" | "Meeting" | "Email" | "Task" | "Note";

export interface Paginated<T> { data: T[]; current_page?: number; last_page?: number; per_page?: number; total?: number; meta?: { current_page: number; last_page: number; per_page: number; total: number } }
export interface PageResult<T> { data: T[]; currentPage: number; lastPage: number; perPage: number; total: number }
export interface Owner { id: number; name: string; email: string }

export interface CrmCompany {
  id: string; companyId: string; name: string; legalName?: string | null; industry: string; website: string;
  primaryContact: string; phone: string; email: string; status: string; ownerId?: number | null; owner: string;
  lastActivity: string | null; address: string; city?: string | null; country?: string | null; postalCode?: string | null;
  source: string; accountType?: string; ntn?: string | null; cnic?: string | null; registrationNumber?: string | null;
  notes?: string | null; isArchived?: boolean; customerId?: string | null; contactsCount?: number; dealsCount?: number;
  createdAt?: string; updatedAt?: string; size?: string; revenue?: string;
}

export interface CrmContact {
  id: string; companyId: string; accountId: string | null; company: string; firstName: string; lastName: string;
  name: string; title: string; department?: string | null; email: string; phone: string; mobile?: string | null;
  isPrimary?: boolean; address?: string | null; notes?: string | null; ownerId?: number | null; owner: string;
  status: string; lastActivity: string | null; createdAt?: string; updatedAt?: string; linkedin?: string;
}

export interface LeadScore { fit: number; intent: number; total: number; heat: Heat }
export interface Enrichment { state: "not_enriched" | "processing" | "enriched" | "failed"; summary: string; industry: string; size: string; profile: string; painPoints: string[]; opportunities: string[]; valueProposition: string; sources: string[]; enrichedAt?: string }
export interface ScoreEvent { id: string; points: number; reason: string; details?: unknown; calculatedAt?: string }
export interface CrmLead {
  id: string; companyId: string; accountId: string | null; contactId?: string | null; ownerId?: number | null;
  firstName: string; lastName: string; name: string; company: string; title: string; email: string; phone: string;
  mobile?: string | null; website: string; source: string; status: string; stage: string; value: number; currency: string;
  expectedTimeframe?: string | null; interest?: string | null; notes: string; qualificationNotes?: string | null;
  score: LeadScore; owner: string; lastActivity: string | null; convertedAt?: string | null;
  convertedAccountId?: string | null; convertedContactId?: string | null; convertedDealId?: string | null;
  scoreEvents?: ScoreEvent[]; createdAt?: string; updatedAt?: string; linkedin?: string; industry: string; size: string; enrichment: Enrichment;
}

export interface CrmPipelineStage { id: string; pipelineId: string; name: string; position: number; probabilityBasisPoints: number; isWon: boolean; isLost: boolean; isActive: boolean }
export interface CrmPipeline { id: string; companyId: string; name: string; description?: string | null; isActive: boolean; isDefault: boolean; stages: CrmPipelineStage[]; dealsCount: number }

export interface CrmDeal {
  id: string; companyId: string; name: string; accountId: string; company: string | null;
  primaryContactId?: string | null; contact: string | null; leadOriginId?: string | null; pipelineId: string;
  pipelineStageId: string; pipeline: string; stage: string; ownerId?: number | null; owner: string;
  customerId?: string | null; value: number; currency: string; probabilityBasisPoints: number; probability: number;
  weightedValue: number; expectedClose: string | null; actualClose?: string | null; status: DealStatus; source: string;
  description?: string | null; lossReason?: string | null; closedAt?: string | null; lastActivity: string | null;
  createdAt?: string; updatedAt?: string; nextStep?: string;
}

export interface CrmActivity {
  id: string; companyId: string; type: ActivityType; subject: string; title: string; description?: string | null;
  detail: string; related?: { id: string; type: string; name: string } | null; accountId?: string | null; contactId?: string | null;
  leadId?: string | null; dealId?: string | null; ownerId?: number | null; owner: string | null; actor: string | null;
  dueAt?: string | null; completedAt?: string | null; status: "PENDING" | "COMPLETED" | "CANCELLED";
  priority: "Low" | "Medium" | "High"; outcome?: string | null; timestamp: string; isOverdue: boolean;
}

export interface CrmTask { id: string; companyId: string; title: string; relatedTo: string; owner: string; due: string; priority: "Low" | "Medium" | "High"; status: "Open" | "In progress" | "Completed" }
export interface CrmScoreRule { id: string; companyId: string; name: string; targetType: "LEAD" | "DEAL"; field: string; operator: "EQUALS" | "NOT_EMPTY" | "GREATER_OR_EQUAL" | "LESS_OR_EQUAL"; comparisonValue?: string | null; points: number; position: number; isActive: boolean }
export interface CrmImportRow { id: string; rowNumber: number; source: Record<string, string>; mapped: Record<string, unknown>; state: string; errors: string[]; warnings: string[]; createdRecordId?: string | null }
export interface CrmImport { id: string; companyId: string; entityType: "ACCOUNT" | "CONTACT" | "LEAD"; filename: string; status: string; mapping: Record<string, string>; summary: Record<string, number>; rows: CrmImportRow[]; confirmedAt?: string | null; createdAt: string }
export interface CrmDashboard {
  openLeads: number; qualifiedLeads: number; convertedLeads: number; leadConversionBasisPoints: number;
  openDeals: number; pipelineValue: number; weightedPipelineValue: number; wonDeals: number; wonDealValue: number;
  lostDeals: number; lostDealValue: number; activitiesDue: number; overdueActivities: number;
  dealsByStage: Array<{ pipelineId: string; pipeline: string; stageId: string; stage: string; deals: number; value: number; weightedValue: number }>;
  leadsBySource: Array<{ source: string; leads: number; converted: number }>;
}
export interface CustomerMatch { id: string; name: string; customerNumber?: string; email?: string; phone?: string; ntn?: string | null; cnic?: string | null }

export interface EmailEvent { id:string; companyId:string; leadId:string; date:string; subject:string; sequence:string; status:'Sent'|'Delivered'|'Opened'|'Replied'|'Follow-up pending'|'Follow-up sent'; sender:string; step:number; body:string }
export interface SequenceStep { id:string; subject:string; body:string; delayDays:number }
export interface Sequence { id:string; companyId:string; name:string; objective:string; tone:string; leadId:string; steps:SequenceStep[]; status:'Draft'|'Active'|'Paused'|'Completed'; enrolled:number; completed:number; replied:number; openRate:number; replyRate:number }
export interface EmailIntegration { id:string; companyId:string; provider:'Gmail'|'Microsoft Outlook'; email:string; status:'Not Connected'|'Connecting'|'Connected'|'Connection Error'|'Expired'; lastSync?:string }
