import { toMinor } from "@/lib/money";
import type { AuditEvent,CopilotAction,ExpenseClaim,KnowledgeDocument,Recommendation } from "@/types/operations";
const cs=["c1","c2","c3"];
const map=<T extends {id:string;company_id:string}>(rows:Omit<T,"id"|"company_id">[]):T[]=>cs.flatMap((company_id,ci)=>rows.map((r,i)=>({...r,id:`${company_id}-${i+1}`,company_id,...("amount" in r?{amount:Math.round(Number((r as any).amount)*(ci?0.42:1))}:{})} as T)));
export const expenses=map<ExpenseClaim>([
 {reference:"EXP-0831",claimant:"Usman Tariq",category:"Client travel",date:"2026-09-18",amount:toMinor(42500),status:"pending",receipt:true,notes:"Islamabad client workshop"},
 {reference:"EXP-0830",claimant:"Ayesha Siddiqui",category:"Software",date:"2026-09-16",amount:toMinor(18900),status:"approved",receipt:true,notes:"Developer tooling"},
 {reference:"EXP-0829",claimant:"Sana Iqbal",category:"Meals",date:"2026-09-14",amount:toMinor(12800),status:"paid",receipt:true,notes:"Customer meeting"},
 {reference:"EXP-0828",claimant:"Danish Raza",category:"Travel",date:"2026-09-10",amount:toMinor(8600),status:"rejected",receipt:false,notes:"Receipt required"},
]);
export const auditEvents=map<AuditEvent>([
 {timestamp:"2026-09-22T05:42:00Z",user:"Fatima Noor",module:"Accounting",action:"Posted journal",record:"JE-2026-00984",result:"success",before:"Draft · PKR 1,450,000",after:"Posted · balanced"},
 {timestamp:"2026-09-22T04:18:00Z",user:"Usman Tariq",module:"Purchases",action:"Approved purchase order",record:"PO-2026-0194",result:"success",before:"Pending approval",after:"Approved"},
 {timestamp:"2026-09-21T15:08:00Z",user:"Sana Iqbal",module:"CRM",action:"Exported leads",record:"Lead register",result:"success",after:"42 filtered records"},
 {timestamp:"2026-09-21T11:31:00Z",user:"Bilal Ahmed Khan",module:"Payroll",action:"Attempted reopen",record:"August 2026",result:"denied",before:"Locked",after:"No change"},
]);
export const recommendations=map<Recommendation>([
 {title:"Follow up on 3 high-intent leads",detail:"No activity has been recorded in 5 days despite scores above 80.",module:"CRM",impact:"high",status:"suggested",due:"Today"},
 {title:"Review cash gap projected for 18 October",detail:"Expected supplier payments exceed confirmed collections by PKR 2.1M.",module:"Cash flow",impact:"high",status:"pending",due:"This week"},
 {title:"Move payroll review before public holiday",detail:"The normal approval date conflicts with the announced bank holiday.",module:"Payroll",impact:"medium",status:"approved",due:"25 Sep"},
 {title:"Archive duplicate onboarding SOP",detail:"Two indexed documents share 94% of their content.",module:"Knowledge",impact:"low",status:"executed"},
]);
export const knowledgeDocuments=map<KnowledgeDocument>([
 {name:"Employee Handbook 2026.pdf",type:"PDF",owner:"People Ops",uploaded_at:"2026-09-18",size:"2.4 MB",status:"indexed",access:"All employees"},
 {name:"Finance Month-End SOP.docx",type:"SOP",owner:"Finance",uploaded_at:"2026-09-16",size:"840 KB",status:"indexed",access:"Finance only"},
 {name:"Client Pricing Matrix.xlsx",type:"Excel",owner:"Sales",uploaded_at:"2026-09-14",size:"1.1 MB",status:"processing",access:"Sales leadership"},
 {name:"Security Response Guide.pdf",type:"PDF",owner:"IT",uploaded_at:"2026-09-09",size:"3.7 MB",status:"failed",access:"IT administrators"},
]);
export const copilotActions:CopilotAction[]=[];
