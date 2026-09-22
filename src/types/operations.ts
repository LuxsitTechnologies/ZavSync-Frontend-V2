import type { Money } from "@/types/accounting";
export type WorkflowStatus = "draft"|"pending"|"approved"|"rejected"|"executed"|"paid"|"partially_received"|"received"|"matched"|"unmatched"|"processing"|"indexed"|"failed";
export interface CompanyRecord { id:string; company_id:string }
export interface PurchaseOrder extends CompanyRecord { number:string; supplier:string; date:string; expected_date:string; owner:string; status:WorkflowStatus; total:Money; received:number; lines:{description:string;quantity:number;unit_cost:Money}[] }
export interface ExpenseClaim extends CompanyRecord { reference:string; claimant:string; category:string; date:string; amount:Money; status:WorkflowStatus; receipt:boolean; notes:string }
export interface BankAccount extends CompanyRecord { name:string; institution:string; masked_number:string; type:"bank"|"cash"|"wallet"|"processor"; currency:string; balance:Money; available:Money; is_default:boolean; status:"active"|"disconnected" }
export interface BankTransaction extends CompanyRecord { date:string; description:string; reference:string; amount:Money; direction:"in"|"out"; status:"matched"|"suggested"|"unmatched"; match_reference?:string; confidence?:number }
export interface Settlement extends CompanyRecord { provider:"JazzCash"|"Easypaisa"|"Stripe"|"Card terminal"; reference:string; date:string; gross:Money; fees:Money; net:Money; status:"pending"|"settled"; bank_account:string }
export interface BudgetLine extends CompanyRecord { account:string; department:string; category:string; month:string; budget:Money; actual:Money; forecast:Money }
export interface AuditEvent extends CompanyRecord { timestamp:string; user:string; module:string; action:string; record:string; result:"success"|"denied"; before?:string; after?:string }
export interface Recommendation extends CompanyRecord { title:string; detail:string; module:string; impact:"low"|"medium"|"high"; status:"suggested"|"pending"|"approved"|"executed"|"rejected"; due?:string }
export interface KnowledgeDocument extends CompanyRecord { name:string; type:"PDF"|"Word"|"Excel"|"SOP"; owner:string; uploaded_at:string; size:string; status:"uploading"|"processing"|"indexed"|"failed"; access:string }
export interface CopilotAction extends CompanyRecord { command:string; intent:"record_revenue"|"create_invoice"|"add_employee"; summary:string; status:"preview"|"approved"|"executed"|"rejected"; amount?:Money; warnings:string[]; fields:Record<string,string>; created_at:string }
