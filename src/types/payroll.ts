import type { Money } from "@/types/accounting";

export type EmployeeStatus = "active" | "probation" | "on_leave" | "notice_period" | "resigned" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type PayrollStatus = "DRAFT" | "CALCULATED" | "REVIEWED" | "APPROVED" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PayrollComponentType = "EARNINGS" | "DEDUCTIONS" | "EMPLOYEE_CONTRIBUTIONS" | "EMPLOYER_CONTRIBUTIONS" | "TAX" | "REIMBURSEMENTS" | "OTHER";

export interface Employee {
  id: string;
  company_id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  joining_date: string;
  leaving_date: string | null;
  location: string | null;
  payroll_profile?: EmployeePayrollProfile | null;
}

export interface EmployeeInput {
  employee_code: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  joining_date: string;
  leaving_date?: string | null;
  location?: string | null;
}

export interface PayrollComponent {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: PayrollComponentType;
  calculation_method: "fixed" | "basis_points" | "statutory" | "manual";
  fixed_amount: Money | null;
  rate_bps: number | null;
  calculation_base: "basic" | "gross" | "taxable" | null;
  is_taxable: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  gl_account_id: string | null;
  liability_account_id: string | null;
  description: string | null;
}

export interface EmployeePayrollComponent {
  id: string;
  payroll_component_id: string;
  fixed_amount: Money | null;
  rate_bps: number | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  component?: PayrollComponent;
}

export interface EmployeePayrollProfile {
  id: string;
  company_id: string;
  employee_id: string;
  payroll_status: "active" | "inactive" | "hold";
  pay_frequency: "monthly";
  base_salary: Money;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  tax_identifier: string | null;
  statutory_registration: Record<string, unknown> | null;
  payment_financial_account_id: string | null;
  employee_bank_reference: string | null;
  components?: EmployeePayrollComponent[];
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  fiscal_year_id: string | null;
  accounting_period_id: string | null;
  name: string;
  frequency: "monthly";
  period_start: string;
  period_end: string;
  pay_date: string;
  status: "open" | "closed";
}

export interface PayrollEntryLine {
  id: string;
  component_code: string;
  component_name: string;
  component_type: PayrollComponentType;
  amount: Money;
  is_taxable: boolean;
  gl_account_id: string | null;
  liability_account_id: string | null;
}

export interface PayrollEntry {
  id: string;
  company_id: string;
  payroll_batch_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  base_salary: Money;
  currency: string;
  gross_earnings: Money;
  taxable_earnings: Money;
  employee_deductions: Money;
  employee_contributions: Money;
  tax_amount: Money;
  employer_contributions: Money;
  reimbursements: Money;
  net_pay: Money;
  employer_total_cost: Money;
  paid_amount: Money;
  outstanding_amount: Money;
  payment_status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  released_at: string | null;
  released_by: number | null;
  profile_snapshot: Record<string, unknown>;
  statutory_rule_snapshot: Array<Record<string, unknown>>;
  lines?: PayrollEntryLine[];
}

export interface PayrollBatch {
  id: string;
  company_id: string;
  payroll_period_id: string;
  number: string;
  status: PayrollStatus;
  accounting_date: string;
  employee_count: number;
  gross_earnings: Money;
  taxable_earnings: Money;
  employee_deductions: Money;
  employee_contributions: Money;
  tax_amount: Money;
  employer_contributions: Money;
  reimbursements: Money;
  net_pay: Money;
  employer_total_cost: Money;
  journal_id: string | null;
  reversal_journal_id: string | null;
  correction_of_batch_id: string | null;
  correction_reason: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  posted_at: string | null;
  period?: PayrollPeriod;
  entries?: PayrollEntry[];
}

export interface PayrollPostingLine {
  account_id: string;
  description: string;
  debit: Money;
  credit: Money;
  related_type: "payroll_batch" | "payroll_entry";
  related_id: string;
}

export interface PayrollLiabilityRow {
  batch_id: string;
  batch_number: string;
  period: string;
  employee_id: string;
  employee_name: string;
  liability_type: "NET_PAY" | "TAX" | "EMPLOYEE_CONTRIBUTION" | "EMPLOYER_CONTRIBUTION" | "OTHER_DEDUCTION";
  component?: string;
  original_amount: Money;
  settled_amount: Money;
  outstanding_amount: Money;
}

export interface PayrollLiabilityReport {
  rows: PayrollLiabilityRow[];
  totals: Array<{ liability_type: PayrollLiabilityRow["liability_type"]; original_amount: Money; settled_amount: Money; outstanding_amount: Money }>;
  outstanding_total: Money;
}

export interface PayrollSummary {
  totals: { batches: number; employees: number; gross_earnings: Money; tax_amount: Money; employee_deductions: Money; employee_contributions: Money; employer_contributions: Money; net_pay: Money; employer_total_cost: Money };
  batches: Array<{ id: string; number: string; status: PayrollStatus; accounting_date: string; period: { id: string; name: string; pay_date: string } | null; employee_count: number; gross_earnings: Money; tax_amount: Money; employee_deductions: Money; employee_contributions: Money; employer_contributions: Money; net_pay: Money; employer_total_cost: Money; journal_id: string | null }>;
}

export interface FinancialAccountOption {
  id: string;
  name: string;
  type: "bank" | "cash";
  currency: string;
  is_active: boolean;
}

export interface PayrollReconciliation {
  batch_id: string;
  batch_number: string;
  status: PayrollStatus;
  journal_id: string | null;
  expected_debit: Money;
  expected_credit: Money;
  journal_debit: Money;
  journal_credit: Money;
  difference: Money;
  operational_outstanding: Money;
  liability_gl_balance: Money;
  liability_difference: Money;
  liabilities_reconciled: boolean;
  balanced: boolean;
}

export interface Payslip extends PayrollEntry {
  company: { id: string; name: string };
  employee: { id: string; employee_code: string; full_name: string; department: string | null; designation: string | null };
  payroll_period: { name: string; period_start: string; period_end: string; pay_date: string };
}
