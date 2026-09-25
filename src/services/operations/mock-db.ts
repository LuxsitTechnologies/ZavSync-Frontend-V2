import { toMinor } from "@/lib/money";
import type {CopilotAction,ExpenseClaim,Recommendation } from "@/types/operations";
const cs=["c1","c2","c3"];
const map=<T extends {id:string;company_id:string}>(rows:Omit<T,"id"|"company_id">[]):T[]=>cs.flatMap((company_id,ci)=>rows.map((r,i)=>({...r,id:`${company_id}-${i+1}`,company_id,...("amount" in r?{amount:Math.round(Number((r as any).amount)*(ci?0.42:1))}:{})} as T)));
export const expenses=map<ExpenseClaim>([
 {reference:"EXP-0831",claimant:"Usman Tariq",category:"Client travel",date:"2026-09-18",amount:toMinor(42500),status:"pending",receipt:true,notes:"Islamabad client workshop"},
 {reference:"EXP-0830",claimant:"Ayesha Siddiqui",category:"Software",date:"2026-09-16",amount:toMinor(18900),status:"approved",receipt:true,notes:"Developer tooling"},
 {reference:"EXP-0829",claimant:"Sana Iqbal",category:"Meals",date:"2026-09-14",amount:toMinor(12800),status:"paid",receipt:true,notes:"Customer meeting"},
 {reference:"EXP-0828",claimant:"Danish Raza",category:"Travel",date:"2026-09-10",amount:toMinor(8600),status:"rejected",receipt:false,notes:"Receipt required"},
]);
export const recommendations=map<Recommendation>([
 {title:"Follow up on 3 high-intent leads",detail:"No activity has been recorded in 5 days despite scores above 80.",module:"CRM",impact:"high",status:"suggested",due:"Today"},
 {title:"Review cash gap projected for 18 October",detail:"Expected supplier payments exceed confirmed collections by PKR 2.1M.",module:"Cash flow",impact:"high",status:"pending",due:"This week"},
 {title:"Move payroll review before public holiday",detail:"The normal approval date conflicts with the announced bank holiday.",module:"Payroll",impact:"medium",status:"approved",due:"25 Sep"},
 {title:"Archive duplicate onboarding SOP",detail:"Two indexed documents share 94% of their content.",module:"Knowledge",impact:"low",status:"executed"},
]);
export const copilotActions:CopilotAction[]=[];
