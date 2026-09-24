import { apiRequest } from "@/services/api/client";
import type {
  Employee,
  EmployeeInput,
  EmployeePayrollProfile,
  FinancialAccountOption,
  PayrollBatch,
  PayrollComponent,
  PayrollEntry,
  PayrollLiabilityReport,
  PayrollPeriod,
  PayrollPostingLine,
  PayrollReconciliation,
  PayrollSummary,
  Payslip,
} from "@/types/payroll";

type DataPayload<T> = { data: T };

export const payrollRepository = {
  employees: (companyId: string) => apiRequest<Employee[]>("/payroll/employees", { companyId }),
  employee: (companyId: string, id: string) => apiRequest<Employee>(`/payroll/employees/${id}`, { companyId }),
  createEmployee: (companyId: string, input: EmployeeInput) => apiRequest<Employee>("/payroll/employees", { method: "POST", companyId, body: input }),
  updateEmployee: (companyId: string, id: string, input: Partial<EmployeeInput>) => apiRequest<Employee>(`/payroll/employees/${id}`, { method: "PATCH", companyId, body: input }),
  profiles: (companyId: string, employeeId: string) => apiRequest<EmployeePayrollProfile[]>(`/payroll/employees/${employeeId}/profiles`, { companyId }),
  createProfile: (companyId: string, employeeId: string, input: Record<string, unknown>) => apiRequest<EmployeePayrollProfile>(`/payroll/employees/${employeeId}/profiles`, { method: "POST", companyId, body: input }),

  components: (companyId: string, type?: string) => apiRequest<PayrollComponent[]>("/payroll/components", { companyId, query: { type } }),
  createComponent: (companyId: string, input: Record<string, unknown>) => apiRequest<PayrollComponent>("/payroll/components", { method: "POST", companyId, body: input }),
  updateComponent: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<PayrollComponent>(`/payroll/components/${id}`, { method: "PATCH", companyId, body: input }),
  deactivateComponent: (companyId: string, id: string) => apiRequest<PayrollComponent>(`/payroll/components/${id}/deactivate`, { method: "PATCH", companyId, body: {} }),
  statutoryRules: async (companyId: string) => (await apiRequest<DataPayload<Array<Record<string, unknown>>>>("/payroll/statutory-rules", { companyId })).data,
  createStatutoryRule: async (companyId: string, input: Record<string, unknown>) => (await apiRequest<DataPayload<Record<string, unknown>>>("/payroll/statutory-rules", { method: "POST", companyId, body: input })).data,

  periods: (companyId: string) => apiRequest<PayrollPeriod[]>("/payroll/periods", { companyId }),
  createPeriod: (companyId: string, input: Record<string, unknown>) => apiRequest<PayrollPeriod>("/payroll/periods", { method: "POST", companyId, body: input }),
  batches: (companyId: string) => apiRequest<PayrollBatch[]>("/payroll/batches", { companyId }),
  batch: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}`, { companyId }),
  createBatch: (companyId: string, payrollPeriodId: string, correctionOfBatchId?: string) => apiRequest<PayrollBatch>("/payroll/batches", { method: "POST", companyId, body: { payroll_period_id: payrollPeriodId, correction_of_batch_id: correctionOfBatchId } }),
  calculate: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/calculate`, { method: "POST", companyId, body: {} }),
  recalculate: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/recalculate`, { method: "POST", companyId, body: {} }),
  review: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/review`, { method: "POST", companyId, body: {} }),
  approve: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/approve`, { method: "POST", companyId, body: {} }),
  post: (companyId: string, id: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/post`, { method: "POST", companyId, idempotencyKey: crypto.randomUUID(), body: {} }),
  reverse: (companyId: string, id: string, postingDate: string, reason: string) => apiRequest<PayrollBatch>(`/payroll/batches/${id}/reverse`, { method: "POST", companyId, idempotencyKey: crypto.randomUUID(), body: { posting_date: postingDate, reason } }),
  postingPreview: async (companyId: string, id: string) => (await apiRequest<DataPayload<PayrollPostingLine[]>>(`/payroll/batches/${id}/posting-preview`, { companyId })).data,

  entries: (companyId: string, batchId: string) => apiRequest<PayrollEntry[]>(`/payroll/batches/${batchId}/entries`, { companyId }),
  addAdjustment: async (companyId: string, entryId: string, input: { payroll_component_id: string; amount: number; reason: string }) => (await apiRequest<DataPayload<Record<string, unknown>>>(`/payroll/entries/${entryId}/adjustments`, { method: "POST", companyId, body: input })).data,
  payslip: async (companyId: string, entryId: string) => (await apiRequest<DataPayload<Payslip>>(`/payroll/entries/${entryId}/payslip`, { companyId })).data,

  financialAccounts: (companyId: string) => apiRequest<FinancialAccountOption[]>("/banking/accounts", { companyId }),
  payBatch: (companyId: string, batchId: string, input: { financial_account_id: string; payment_date: string; amount: number; reference?: string }) => apiRequest(`/payroll/batches/${batchId}/payments`, { method: "POST", companyId, idempotencyKey: crypto.randomUUID(), body: input }),
  payEmployee: (companyId: string, entryId: string, input: { financial_account_id: string; payment_date: string; amount: number; reference?: string }) => apiRequest(`/payroll/entries/${entryId}/payments`, { method: "POST", companyId, idempotencyKey: crypto.randomUUID(), body: input }),
  liabilities: async (companyId: string, batchId?: string) => (await apiRequest<DataPayload<PayrollLiabilityReport>>("/payroll/liabilities", { companyId, query: { payroll_batch_id: batchId } })).data,
  settleLiability: (companyId: string, input: { payroll_batch_id: string; liability_type: string; financial_account_id: string; payment_date: string; amount: number; reference?: string }) => apiRequest("/payroll/liability-settlements", { method: "POST", companyId, idempotencyKey: crypto.randomUUID(), body: input }),

  summary: async (companyId: string) => (await apiRequest<DataPayload<PayrollSummary>>("/payroll/reports/summary", { companyId })).data,
  reconciliation: async (companyId: string, batchId: string) => (await apiRequest<DataPayload<PayrollReconciliation>>(`/payroll/reports/reconciliation/${batchId}`, { companyId })).data,
};
