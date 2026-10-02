import type { Money } from "@/types/accounting";

export interface EmployeePayslipSummary {
  id: string;
  released_at: string;
  company: { id: string; name: string };
  employee: { id: string; employee_code: string; full_name: string; department: string | null; designation: string | null };
  payroll: { batch_number: string; batch_status: string; posted_at: string | null; period: { name: string; period_start: string; period_end: string; pay_date: string } };
  currency: string;
  base_salary: Money;
  gross_earnings: Money;
  employee_deductions: Money;
  employee_contributions: Money;
  tax_amount: Money;
  reimbursements: Money;
  net_pay: Money;
  paid_amount: Money;
  outstanding_amount: Money;
  payment_status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
}

export interface EmployeePayslipLine {
  component_code: string;
  component_name: string;
  component_type: string;
  amount: Money;
}

export interface EmployeePayslip extends EmployeePayslipSummary {
  earnings_lines: EmployeePayslipLine[];
  deduction_lines: EmployeePayslipLine[];
}

export interface EmployeePayrollPage {
  data: EmployeePayslipSummary[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface PayrollRelease {
  entry_id: string;
  released_at: string;
  released_by: number;
}
