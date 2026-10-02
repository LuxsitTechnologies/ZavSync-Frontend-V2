import { apiRequest } from "@/services/api/client";
import type { EmployeePayrollPage, EmployeePayslip, PayrollRelease } from "@/types/employeePayroll";

export const employeePayrollRepository = {
  history: (companyId: string, page = 1, signal?: AbortSignal) =>
    apiRequest<EmployeePayrollPage>("/employee/payroll", { companyId, query: { page }, signal }),
  detail: (companyId: string, entryId: string, signal?: AbortSignal) =>
    apiRequest<EmployeePayslip>(`/employee/payroll/${encodeURIComponent(entryId)}`, { companyId, signal }),
};

export const payrollReleaseRepository = {
  release: (companyId: string, entryId: string, signal?: AbortSignal) =>
    apiRequest<PayrollRelease>(`/payroll/entries/${encodeURIComponent(entryId)}/release`, { method: "POST", companyId, signal }),
};
