import { apiRequest, isApiConfigured, previewDelay } from "@/services/api/client";
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
  async trialBalance(companyId: string, from: string, to: string): Promise<TrialBalanceReport> {
    if (isApiConfigured()) return apiRequest("/accounting/reports/trial-balance", { companyId, query: { from, to } });
    return previewDelay({ debit: 0, credit: 0, balanced: true, rows: [] });
  },

  async profitAndLoss(companyId: string, from: string, to: string): Promise<ProfitAndLossReport> {
    if (isApiConfigured()) return apiRequest("/accounting/reports/profit-and-loss", { companyId, query: { from, to } });
    return previewDelay({ revenue: 0, cost_of_sales: 0, gross_profit: 0, operating_expenses: 0, other_income: 0, other_expenses: 0, net_profit: 0, trend: [] });
  },

  async balanceSheet(companyId: string, asOf: string): Promise<BalanceSheetReport> {
    if (isApiConfigured()) return apiRequest("/accounting/reports/balance-sheet", { companyId, query: { as_of: asOf } });
    return previewDelay({ assets: 0, liabilities: 0, equity: 0, current_earnings: 0, equity_including_current_earnings: 0, balanced: true });
  },
};
