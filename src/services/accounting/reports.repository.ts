import { apiRequest } from "@/services/api/client";
import type { Money } from "@/types/accounting";

export interface ReportRow {
  id: string;
  label: string;
  amount: Money;
}

export interface TrialBalanceReport {
  debit: Money;
  credit: Money;
  balanced: boolean;
  rows: Array<{ account_id: string; account_code: string; account_name: string; closing_balance: Money }>;
}

export interface ProfitAndLossReport {
  revenue: Money;
  cost_of_sales: Money;
  gross_profit: Money;
  operating_expenses: Money;
  other_income: Money;
  other_expenses: Money;
  net_profit: Money;
  trend: Array<{ month: string; actual: Money; comparison: Money }>;
}

export interface BalanceSheetReport {
  assets: Money;
  liabilities: Money;
  equity: Money;
  current_earnings: Money;
  equity_including_current_earnings: Money;
  balanced: boolean;
}

export const reportsRepository = {
  trialBalance(companyId: string, from: string, to: string): Promise<TrialBalanceReport> {
    return apiRequest("/accounting/reports/trial-balance", { companyId, query: { from, to } });
  },

  profitAndLoss(companyId: string, from: string, to: string): Promise<ProfitAndLossReport> {
    return apiRequest("/accounting/reports/profit-and-loss", { companyId, query: { from, to } });
  },

  balanceSheet(companyId: string, asOf: string): Promise<BalanceSheetReport> {
    return apiRequest("/accounting/reports/balance-sheet", { companyId, query: { as_of: asOf } });
  },
};
