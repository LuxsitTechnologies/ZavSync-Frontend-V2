import { toMinor } from "@/lib/money";
import type { ExpenseClaim } from "@/types/operations";
const cs=["c1","c2","c3"];
const map=<T extends {id:string;company_id:string}>(rows:Omit<T,"id"|"company_id">[]):T[]=>cs.flatMap((company_id,ci)=>rows.map((r,i)=>({...r,id:`${company_id}-${i+1}`,company_id,...("amount" in r?{amount:Math.round(Number((r as any).amount)*(ci?0.42:1))}:{})} as T)));
export const expenses=map<ExpenseClaim>([
 {reference:"EXP-0831",claimant:"Usman Tariq",category:"Client travel",date:"2026-09-18",amount:toMinor(42500),status:"pending",receipt:true,notes:"Islamabad client workshop"},
 {reference:"EXP-0830",claimant:"Ayesha Siddiqui",category:"Software",date:"2026-09-16",amount:toMinor(18900),status:"approved",receipt:true,notes:"Developer tooling"},
 {reference:"EXP-0829",claimant:"Sana Iqbal",category:"Meals",date:"2026-09-14",amount:toMinor(12800),status:"paid",receipt:true,notes:"Customer meeting"},
 {reference:"EXP-0828",claimant:"Danish Raza",category:"Travel",date:"2026-09-10",amount:toMinor(8600),status:"rejected",receipt:false,notes:"Receipt required"},
]);
