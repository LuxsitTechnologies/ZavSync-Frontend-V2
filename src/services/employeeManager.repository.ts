import { apiRequest } from '@/services/api/client';

export interface EmployeeManager { employee_id: string; manager_employee_id: string | null; version: number }
function narrow(value: EmployeeManager): EmployeeManager {
  if (typeof value.employee_id !== 'string' || (value.manager_employee_id !== null && typeof value.manager_employee_id !== 'string') || !Number.isSafeInteger(value.version) || value.version < 1) {
    throw new Error('Invalid manager relationship response');
  }
  return { employee_id: value.employee_id, manager_employee_id: value.manager_employee_id, version: value.version };
}
const path = (employee: string) => `/hrm/employees/${encodeURIComponent(employee)}/manager`;
export const employeeManagerRepository = {
  read: async (companyId: string, employee: string, signal: AbortSignal) => narrow(await apiRequest<EmployeeManager>(path(employee), { companyId, signal })),
  save: async (companyId: string, employee: string, manager: string | null, version: number, signal: AbortSignal) => narrow(await apiRequest<EmployeeManager>(path(employee), {
    companyId, signal, method: 'PATCH', body: { manager_employee_id: manager, version },
  })),
};
