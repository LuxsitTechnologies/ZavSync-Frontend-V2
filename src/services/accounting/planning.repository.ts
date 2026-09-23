import { apiRequest } from "@/services/api/client";
import type { AccountNode } from "@/types/accounting";
import type { AccountingCloseRecord, Budget, BudgetActual, FiscalYear, Forecast, ForecastProjection, YearEndPreview } from "@/types/planning";

export const planningRepository = {
  fiscalYears:(companyId:string)=>apiRequest<FiscalYear[]>("/planning/fiscal-years",{companyId}),
  createFiscalYear:(companyId:string,input:{name:string;start_date:string;end_date:string;currency:string})=>apiRequest<FiscalYear>("/planning/fiscal-years",{method:"POST",companyId,body:input}),
  accounts:(companyId:string)=>apiRequest<AccountNode[]>("/accounting/accounts/selectable",{companyId}),
  budgets:(companyId:string)=>apiRequest<Budget[]>("/planning/budgets",{companyId}),
  budget:(companyId:string,id:string)=>apiRequest<Budget>(`/planning/budgets/${id}`,{companyId}),
  createBudget:(companyId:string,input:{fiscal_year_id:string;name:string;currency:string;description?:string|null;lines:Array<{account_id:string;annual_amount:number;distribution:"equal"}>})=>apiRequest<Budget>("/planning/budgets",{method:"POST",companyId,body:input}),
  budgetAction:(companyId:string,id:string,action:"submit"|"approve"|"activate"|"revise")=>apiRequest<Budget>(`/planning/budgets/${id}/${action}`,{method:"POST",companyId,body:{}}),
  budgetActual:(companyId:string,id:string,from?:string,to?:string)=>apiRequest<BudgetActual>(`/planning/budgets/${id}/actual`,{companyId,query:{from,to}}),
  forecasts:(companyId:string)=>apiRequest<Forecast[]>("/planning/forecasts",{companyId}),
  forecast:(companyId:string,id:string)=>apiRequest<Forecast>(`/planning/forecasts/${id}`,{companyId}),
  createForecast:(companyId:string,input:{fiscal_year_id:string;name:string;currency:string;actuals_through?:string|null;based_on_budget_id?:string|null;based_on_forecast_id?:string|null})=>apiRequest<Forecast>("/planning/forecasts",{method:"POST",companyId,body:input}),
  activateForecast:(companyId:string,id:string)=>apiRequest<Forecast>(`/planning/forecasts/${id}/activate`,{method:"POST",companyId,body:{}}),
  forecastProjection:(companyId:string,id:string,asOf?:string)=>apiRequest<ForecastProjection>(`/planning/forecasts/${id}/projection`,{companyId,query:{as_of:asOf}}),
  yearEndPreview:(companyId:string,fiscalYearId:string)=>apiRequest<YearEndPreview>(`/accounting/fiscal-years/${fiscalYearId}/year-end-preview`,{companyId}),
  closeFiscalYear:(companyId:string,fiscalYearId:string,confirmation:string)=>apiRequest<AccountingCloseRecord>(`/accounting/fiscal-years/${fiscalYearId}/close`,{method:"POST",companyId,body:{idempotency_key:crypto.randomUUID(),confirmation}}),
  reopenFiscalYear:(companyId:string,fiscalYearId:string,reason:string)=>apiRequest<AccountingCloseRecord>(`/accounting/fiscal-years/${fiscalYearId}/reopen`,{method:"POST",companyId,body:{reason}}),
};
