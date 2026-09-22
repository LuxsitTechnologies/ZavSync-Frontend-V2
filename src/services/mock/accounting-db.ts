/**
 * PREVIEW DATA ONLY.
 *
 * This module backs the accounting screens until the ZavSync accounting API is
 * connected. It is deliberately isolated behind the repositories in
 * `src/services/accounting/*` — no page imports it directly. Every record is
 * stamped with a `company_id`, and the repositories filter on the active company
 * so the isolation rules can be verified before the backend exists.
 */
import { companies } from "@/lib/mock-data";
import { toMinor } from "@/lib/money";
import type {
  Account,
  AccountMapping,
  AccountMappingKey,
  AccountingPeriod,
  CogsPosting,
  Customer,
  InventoryItemValuation,
  InventoryLedgerEntry,
  Journal,
  JournalLine,
  Money,
  Payment,
  PayrollPosting,
  ReceivableInvoice,
  Supplier,
  SupplierBill,
} from "@/types/accounting";

export const USER = "Humza Mazhar";
const NOW = "2026-09-21T09:00:00Z";

let seq = 0;
const uid = (prefix: string) => `${prefix}-${(++seq).toString(36)}`;

interface AccountSeed {
  code: string;
  name: string;
  type: Account["type"];
  parent?: string;
  system?: boolean;
  opening?: number;
  balance?: number;
  inactive?: boolean;
  txns?: number;
}

const ACCOUNT_SEEDS: AccountSeed[] = [
  { code: "1000", name: "Assets", type: "asset", system: true },
  { code: "1010", name: "Cash in Hand", type: "asset", parent: "1000", opening: 250000, balance: 412500, txns: 34 },
  { code: "1020", name: "Bank — Habib Metro 0142", type: "asset", parent: "1000", system: true, opening: 18400000, balance: 24120000, txns: 210 },
  { code: "1030", name: "Bank — Meezan 8891", type: "asset", parent: "1000", opening: 4200000, balance: 6835400, txns: 92 },
  { code: "1100", name: "Accounts Receivable", type: "asset", parent: "1000", system: true, opening: 7600000, balance: 11482500, txns: 168 },
  { code: "1200", name: "Inventory Asset", type: "asset", parent: "1000", system: true, opening: 3100000, balance: 4287000, txns: 74 },
  { code: "1300", name: "Prepaid Expenses", type: "asset", parent: "1000", opening: 480000, balance: 362000, txns: 12 },
  { code: "1400", name: "Office Equipment", type: "asset", parent: "1000", opening: 5400000, balance: 5120000, txns: 9 },
  { code: "2000", name: "Liabilities", type: "liability", system: true },
  { code: "2010", name: "Accounts Payable", type: "liability", parent: "2000", system: true, opening: 3850000, balance: 5241000, txns: 121 },
  { code: "2020", name: "Sales Tax Payable", type: "liability", parent: "2000", system: true, opening: 920000, balance: 1486300, txns: 88 },
  { code: "2030", name: "Salary Payable", type: "liability", parent: "2000", system: true, opening: 0, balance: 9320000, txns: 26 },
  { code: "2040", name: "EOBI / Provident Payable", type: "liability", parent: "2000", system: true, opening: 0, balance: 412000, txns: 24 },
  { code: "2050", name: "Payroll Tax Payable", type: "liability", parent: "2000", system: true, opening: 0, balance: 1184000, txns: 24 },
  { code: "2060", name: "Short Term Loan", type: "liability", parent: "2000", opening: 2500000, balance: 1500000, inactive: true, txns: 4 },
  { code: "3000", name: "Equity", type: "equity", system: true },
  { code: "3010", name: "Share Capital", type: "equity", parent: "3000", system: true, opening: 15000000, balance: 15000000, txns: 2 },
  { code: "3020", name: "Retained Earnings", type: "equity", parent: "3000", system: true, opening: 6420000, balance: 8960000, txns: 6 },
  { code: "4000", name: "Revenue", type: "revenue", system: true },
  { code: "4010", name: "Software Services Revenue", type: "revenue", parent: "4000", opening: 0, balance: 42680000, txns: 142 },
  { code: "4020", name: "Facilities Services Revenue", type: "revenue", parent: "4000", opening: 0, balance: 13920000, txns: 61 },
  { code: "4030", name: "Hardware Sales", type: "revenue", parent: "4000", opening: 0, balance: 7340000, txns: 38 },
  { code: "5000", name: "Expenses", type: "expense", system: true },
  { code: "5010", name: "Cost of Goods Sold", type: "expense", parent: "5000", system: true, opening: 0, balance: 5182000, txns: 44 },
  { code: "5020", name: "Salary Expense", type: "expense", parent: "5000", system: true, opening: 0, balance: 28640000, txns: 26 },
  { code: "5030", name: "Employer Contribution Expense", type: "expense", parent: "5000", system: true, opening: 0, balance: 1246000, txns: 24 },
  { code: "5040", name: "Rent & Utilities", type: "expense", parent: "5000", opening: 0, balance: 3840000, txns: 36 },
  { code: "5050", name: "Cloud & Software", type: "expense", parent: "5000", opening: 0, balance: 2286400, txns: 58 },
  { code: "5060", name: "Travel & Conveyance", type: "expense", parent: "5000", opening: 0, balance: 918000, txns: 41 },
  { code: "5070", name: "Professional Fees", type: "expense", parent: "5000", opening: 0, balance: 640000, txns: 11 },
];

/** Company weight so each company shows genuinely different numbers. */
const WEIGHT: Record<string, number> = { c1: 1, c2: 0.42, c3: 0.18 };

export const accounts: Account[] = [];

for (const company of companies) {
  const weight = WEIGHT[company.id] ?? 0.3;
  const byCode = new Map<string, string>();
  for (const seed of ACCOUNT_SEEDS) {
    const id = uid(`acc-${company.code.toLowerCase()}`);
    byCode.set(seed.code, id);
    accounts.push({
      id,
      company_id: company.id,
      code: seed.code,
      name: seed.name,
      type: seed.type,
      parent_id: seed.parent ? (byCode.get(seed.parent) ?? null) : null,
      is_active: !seed.inactive,
      is_system: Boolean(seed.system),
      currency: "PKR",
      opening_balance: toMinor(Math.round((seed.opening ?? 0) * weight)),
      opening_balance_date: seed.opening ? "2026-07-01" : null,
      balance: toMinor(Math.round((seed.balance ?? 0) * weight)),
      transaction_count: Math.round((seed.txns ?? 0) * weight),
      created_by: USER,
      created_at: "2026-07-01T04:00:00Z",
      updated_by: null,
      updated_at: null,
    });
  }
}

export function accountsFor(companyId: string): Account[] {
  return accounts.filter((a) => a.company_id === companyId);
}

export function findAccount(companyId: string, code: string): Account | undefined {
  return accounts.find((a) => a.company_id === companyId && a.code === code);
}

/* ----------------------------- periods ----------------------------- */

export const periods: AccountingPeriod[] = companies.flatMap((company) => [
  { id: uid("per"), company_id: company.id, name: "Jun 2026", start_date: "2026-06-01", end_date: "2026-06-30", status: "closed", closed_by: USER, closed_at: "2026-07-05T06:00:00Z" },
  { id: uid("per"), company_id: company.id, name: "Jul 2026", start_date: "2026-07-01", end_date: "2026-07-31", status: "closed", closed_by: USER, closed_at: "2026-08-04T06:00:00Z" },
  { id: uid("per"), company_id: company.id, name: "Aug 2026", start_date: "2026-08-01", end_date: "2026-08-31", status: "open", closed_by: null, closed_at: null },
  { id: uid("per"), company_id: company.id, name: "Sep 2026", start_date: "2026-09-01", end_date: "2026-09-30", status: "open", closed_by: null, closed_at: null },
]);

/* ----------------------------- mappings ----------------------------- */

const MAPPING_SEEDS: { key: AccountMappingKey; label: string; description: string; code: string; required: boolean }[] = [
  { key: "accounts_receivable", label: "Accounts Receivable control", description: "Debited when a customer invoice is posted.", code: "1100", required: true },
  { key: "accounts_payable", label: "Accounts Payable control", description: "Credited when a supplier bill is posted.", code: "2010", required: true },
  { key: "bank", label: "Default bank account", description: "Debited on customer receipts, credited on supplier payments.", code: "1020", required: true },
  { key: "cash", label: "Cash account", description: "Used for cash receipts and payments.", code: "1010", required: false },
  { key: "sales_revenue", label: "Default revenue account", description: "Credited on invoice lines without their own account.", code: "4010", required: true },
  { key: "sales_tax_payable", label: "Output tax payable", description: "Credited for sales tax charged on invoices.", code: "2020", required: true },
  { key: "input_tax", label: "Input tax receivable", description: "Debited for recoverable tax on supplier bills.", code: "1300", required: false },
  { key: "inventory_asset", label: "Inventory asset", description: "Debited on receipts, credited on FIFO issues.", code: "1200", required: true },
  { key: "cogs", label: "Cost of goods sold", description: "Debited with the FIFO cost of inventory consumed.", code: "5010", required: true },
  { key: "salary_expense", label: "Salary expense", description: "Debited with gross salary on payroll posting.", code: "5020", required: true },
  { key: "salary_payable", label: "Salary payable", description: "Credited with net pay on payroll posting.", code: "2030", required: true },
  { key: "employer_contribution_expense", label: "Employer contribution expense", description: "Debited with employer-side contributions.", code: "5030", required: true },
  { key: "employer_contribution_payable", label: "Employer contribution payable", description: "Credited with employer-side contributions.", code: "2040", required: true },
  { key: "payroll_tax_payable", label: "Payroll tax payable", description: "Credited with payroll tax withheld from employees.", code: "2050", required: false },
];

export const accountMappings: AccountMapping[] = companies.flatMap((company) =>
  MAPPING_SEEDS.map((seed) => ({
    company_id: company.id,
    key: seed.key,
    label: seed.label,
    description: seed.description,
    required: seed.required,
    account_id: findAccount(company.id, seed.code)?.id ?? null,
  })),
);

/* ----------------------------- journals ----------------------------- */

interface JournalSeed {
  number: string;
  date: string;
  reference: string;
  reference_type: Journal["reference_type"];
  description: string;
  status: Journal["status"];
  source_label?: string;
  source_route?: string;
  lines: [code: string, description: string, debit: number, credit: number][];
}

const JOURNAL_SEEDS: JournalSeed[] = [
  {
    number: "JV-2026-0091", date: "2026-09-18", reference: "INV-2026-0311", reference_type: "invoice",
    description: "Sales invoice — Systems Ltd", status: "posted",
    source_label: "Invoice INV-2026-0311", source_route: "/accounting/receivables",
    lines: [["1100", "Receivable — Systems Ltd", 2760000, 0], ["4010", "Implementation services", 2400000, 0], ["2020", "Sales tax 15%", 0, 360000]],
  },
  {
    number: "JV-2026-0092", date: "2026-09-18", reference: "RCPT-2026-0148", reference_type: "customer_payment",
    description: "Receipt — Systems Ltd", status: "posted",
    source_label: "Receipt RCPT-2026-0148", source_route: "/accounting/receivables",
    lines: [["1020", "Bank receipt", 1500000, 0], ["1100", "Settle receivable", 0, 1500000]],
  },
  {
    number: "JV-2026-0093", date: "2026-09-16", reference: "BILL-4471", reference_type: "supplier_bill",
    description: "Supplier bill — Netsol Hardware", status: "posted",
    source_label: "Bill BILL-4471", source_route: "/accounting/payables",
    lines: [["1200", "Inventory received", 980000, 0], ["1300", "Input tax", 147000, 0], ["2010", "Payable — Netsol Hardware", 0, 1127000]],
  },
  {
    number: "JV-2026-0094", date: "2026-09-15", reference: "COGS-SEP-014", reference_type: "inventory",
    description: "FIFO cost of goods sold — laptop issue", status: "posted",
    source_label: "Inventory issue COGS-SEP-014", source_route: "/accounting/inventory-ledger",
    lines: [["5010", "COGS — FIFO layers", 1345000, 0], ["1200", "Inventory relieved", 0, 1345000]],
  },
  {
    number: "JV-2026-0095", date: "2026-09-10", reference: "PR-2026-08", reference_type: "payroll",
    description: "Payroll posting — August 2026", status: "posted",
    source_label: "Payroll run PR-2026-08", source_route: "/payroll/posting",
    lines: [["5020", "Gross salary", 9480000, 0], ["5030", "Employer contributions", 412000, 0], ["2030", "Net salary payable", 0, 8296000], ["2050", "Payroll tax withheld", 0, 1184000], ["2040", "Employer contribution payable", 0, 412000]],
  },
  {
    number: "JV-2026-0096", date: "2026-09-12", reference: "PAY-2026-0072", reference_type: "supplier_payment",
    description: "Supplier payment — Orient Facilities", status: "posted",
    lines: [["2010", "Settle payable", 640000, 0], ["1020", "Bank payment", 0, 640000]],
  },
  {
    number: "JV-2026-0097", date: "2026-09-19", reference: "ADJ-SEP-03", reference_type: "manual_journal",
    description: "September rent accrual", status: "draft",
    lines: [["5040", "Office rent — September", 450000, 0], ["2010", "Accrued rent payable", 0, 450000]],
  },
  {
    number: "JV-2026-0098", date: "2026-09-20", reference: "ADJ-SEP-04", reference_type: "manual_journal",
    description: "Reclassify cloud subscriptions", status: "draft",
    lines: [["5050", "Cloud & software", 186400, 0], ["1300", "Prepaid release", 0, 186400]],
  },
  {
    number: "JV-2026-0088", date: "2026-08-28", reference: "ADJ-AUG-11", reference_type: "manual_journal",
    description: "Duplicate travel claim — reversed", status: "reversed",
    lines: [["5060", "Travel & conveyance", 64000, 0], ["1010", "Cash paid", 0, 64000]],
  },
];

function buildJournal(companyId: string, seed: JournalSeed, weight: number): Journal {
  const lines: JournalLine[] = seed.lines.map(([code, description, debit, credit]) => {
    const account = findAccount(companyId, code);
    return {
      id: uid("jl"),
      account_id: account?.id ?? "",
      account_code: code,
      account_name: account?.name ?? code,
      description,
      debit: toMinor(Math.round(debit * weight)),
      credit: toMinor(Math.round(credit * weight)),
    };
  });
  const total_debit = lines.reduce((s, l) => s + l.debit, 0);
  const total_credit = lines.reduce((s, l) => s + l.credit, 0);
  return {
    id: uid("jr"),
    company_id: companyId,
    number: seed.number,
    posting_date: seed.date,
    reference: seed.reference,
    reference_type: seed.reference_type,
    source_label: seed.source_label ?? null,
    source_route: seed.source_route ?? null,
    description: seed.description,
    status: seed.status,
    lines,
    total_debit,
    total_credit,
    created_by: USER,
    created_at: `${seed.date}T05:20:00Z`,
    updated_by: null,
    updated_at: null,
    posted_by: seed.status === "draft" ? null : USER,
    posted_at: seed.status === "draft" ? null : `${seed.date}T06:05:00Z`,
    reverses_journal_id: null,
    reversed_by_journal_id: null,
  };
}

export const journals: Journal[] = companies.flatMap((company) => {
  const weight = WEIGHT[company.id] ?? 0.3;
  const seeds = company.id === "c1" ? JOURNAL_SEEDS : JOURNAL_SEEDS.slice(0, company.id === "c2" ? 6 : 4);
  return seeds.map((seed) => buildJournal(company.id, seed, weight));
});

/* ----------------------------- receivables ----------------------------- */

interface CustomerSeed { name: string; code: string; terms: number; email: string; phone: string; tax: string }
const CUSTOMER_SEEDS: CustomerSeed[] = [
  { name: "Systems Ltd", code: "CUS-001", terms: 30, email: "ap@systemsltd.com", phone: "+92 42 111 797 836", tax: "0712345-6" },
  { name: "Bank Alfalah", code: "CUS-002", terms: 45, email: "payables@bankalfalah.com", phone: "+92 21 111 225 111", tax: "1122334-5" },
  { name: "Emaar Pakistan", code: "CUS-003", terms: 30, email: "finance@emaar.pk", phone: "+92 21 111 362 273", tax: "2233445-1" },
  { name: "Foodpanda PK", code: "CUS-004", terms: 15, email: "vendors@foodpanda.pk", phone: "+92 42 111 100 200", tax: "3344556-2" },
  { name: "Habib University", code: "CUS-005", terms: 60, email: "accounts@habib.edu.pk", phone: "+92 21 111 042 242", tax: "4455667-3" },
];

interface InvoiceSeed { number: string; customer: number; date: string; due: string; subtotal: number; tax: number; paid: number }
const INVOICE_SEEDS: InvoiceSeed[] = [
  { number: "INV-2026-0311", customer: 0, date: "2026-09-18", due: "2026-10-18", subtotal: 2400000, tax: 360000, paid: 1500000 },
  { number: "INV-2026-0305", customer: 1, date: "2026-09-08", due: "2026-10-23", subtotal: 1850000, tax: 277500, paid: 0 },
  { number: "INV-2026-0298", customer: 2, date: "2026-08-26", due: "2026-09-25", subtotal: 1260000, tax: 189000, paid: 1449000 },
  { number: "INV-2026-0284", customer: 3, date: "2026-08-05", due: "2026-08-20", subtotal: 540000, tax: 81000, paid: 200000 },
  { number: "INV-2026-0271", customer: 4, date: "2026-07-18", due: "2026-09-16", subtotal: 980000, tax: 147000, paid: 0 },
  { number: "INV-2026-0260", customer: 1, date: "2026-07-02", due: "2026-08-16", subtotal: 1420000, tax: 213000, paid: 400000 },
  { number: "INV-2026-0244", customer: 2, date: "2026-06-14", due: "2026-07-14", subtotal: 760000, tax: 114000, paid: 0 },
  { number: "INV-2026-0231", customer: 0, date: "2026-05-28", due: "2026-06-27", subtotal: 615000, tax: 92250, paid: 300000 },
];

const TODAY = "2026-09-21";

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

export const customers: Customer[] = [];
export const receivableInvoices: ReceivableInvoice[] = [];
export const customerPayments: Payment[] = [];

for (const company of companies) {
  const weight = WEIGHT[company.id] ?? 0.3;
  const seeds = company.id === "c1" ? CUSTOMER_SEEDS : CUSTOMER_SEEDS.slice(0, company.id === "c2" ? 3 : 2);
  const ids = seeds.map((seed) => {
    const id = uid("cus");
    customers.push({
      id,
      company_id: company.id,
      name: company.id === "c1" ? seed.name : `${seed.name} (${company.code})`,
      code: seed.code,
      email: seed.email,
      phone: seed.phone,
      tax_number: seed.tax,
      payment_terms_days: seed.terms,
      is_active: true,
      outstanding: 0,
    });
    return id;
  });

  const invSeeds = company.id === "c1" ? INVOICE_SEEDS : INVOICE_SEEDS.slice(0, company.id === "c2" ? 5 : 3);
  invSeeds.forEach((seed) => {
    const customerIndex = seed.customer % ids.length;
    const customerId = ids[customerIndex]!;
    const customer = customers.find((c) => c.id === customerId)!;
    const total: Money = toMinor(Math.round((seed.subtotal + seed.tax) * weight));
    const paid: Money = toMinor(Math.round(seed.paid * weight));
    const outstanding = total - paid;
    const overdueDays = outstanding > 0 ? Math.max(0, daysBetween(seed.due, TODAY)) : 0;
    const status: ReceivableInvoice["status"] =
      outstanding <= 0 ? "paid" : overdueDays > 0 ? "overdue" : paid > 0 ? "partial" : "unpaid";
    customer.outstanding += outstanding;
    const invoiceId = uid("inv");
    receivableInvoices.push({
      id: invoiceId,
      company_id: company.id,
      invoice_number: `${seed.number}${company.id === "c1" ? "" : `-${company.code}`}`,
      customer_id: customerId,
      customer_name: customer.name,
      invoice_date: seed.date,
      due_date: seed.due,
      currency: "PKR",
      subtotal: toMinor(Math.round(seed.subtotal * weight)),
      tax: toMinor(Math.round(seed.tax * weight)),
      total,
      paid_amount: paid,
      outstanding,
      status,
      days_overdue: overdueDays,
      journal_id: journals.find((j) => j.company_id === company.id && j.reference === seed.number)?.id ?? null,
      created_by: USER,
      created_at: `${seed.date}T05:00:00Z`,
      updated_by: null,
      updated_at: null,
    });
    if (paid > 0) {
      customerPayments.push({
        id: uid("rcpt"),
        company_id: company.id,
        number: `RCPT-${seed.number.slice(-4)}`,
        party_id: customerId,
        party_name: customer.name,
        document_id: invoiceId,
        document_number: seed.number,
        payment_date: seed.date,
        amount: paid,
        method: "bank_transfer",
        reference: `TT-${seed.number.slice(-4)}`,
        journal_id: null,
      });
    }
  });
}

/* ----------------------------- payables ----------------------------- */

interface SupplierSeed { name: string; code: string; terms: number; tax: string; expense: string }
const SUPPLIER_SEEDS: SupplierSeed[] = [
  { name: "Netsol Hardware", code: "SUP-001", terms: 30, tax: "5566778-1", expense: "1200" },
  { name: "Orient Facilities", code: "SUP-002", terms: 15, tax: "6677889-2", expense: "5040" },
  { name: "K-Electric", code: "SUP-003", terms: 7, tax: "7788990-3", expense: "5040" },
  { name: "Amazon Web Services", code: "SUP-004", terms: 30, tax: "—", expense: "5050" },
  { name: "Ali & Co Chartered Accountants", code: "SUP-005", terms: 45, tax: "8899001-4", expense: "5070" },
];

interface BillSeed { number: string; supplier: number; date: string; due: string; subtotal: number; tax: number; paid: number; status?: "draft" }
const BILL_SEEDS: BillSeed[] = [
  { number: "BILL-4471", supplier: 0, date: "2026-09-16", due: "2026-10-16", subtotal: 980000, tax: 147000, paid: 0 },
  { number: "BILL-4468", supplier: 3, date: "2026-09-12", due: "2026-10-12", subtotal: 386400, tax: 0, paid: 386400 },
  { number: "BILL-4460", supplier: 1, date: "2026-09-01", due: "2026-09-16", subtotal: 640000, tax: 96000, paid: 640000 },
  { number: "BILL-4452", supplier: 2, date: "2026-08-22", due: "2026-08-29", subtotal: 412000, tax: 61800, paid: 0 },
  { number: "BILL-4441", supplier: 4, date: "2026-07-30", due: "2026-09-13", subtotal: 350000, tax: 52500, paid: 150000 },
  { number: "BILL-4433", supplier: 1, date: "2026-06-20", due: "2026-07-05", subtotal: 288000, tax: 43200, paid: 0 },
  { number: "BILL-4480", supplier: 0, date: "2026-09-20", due: "2026-10-20", subtotal: 145000, tax: 21750, paid: 0, status: "draft" },
];

export const suppliers: Supplier[] = [];
export const supplierBills: SupplierBill[] = [];
export const supplierPayments: Payment[] = [];

for (const company of companies) {
  const weight = WEIGHT[company.id] ?? 0.3;
  const seeds = company.id === "c1" ? SUPPLIER_SEEDS : SUPPLIER_SEEDS.slice(0, company.id === "c2" ? 3 : 2);
  const ids = seeds.map((seed) => {
    const id = uid("sup");
    suppliers.push({
      id,
      company_id: company.id,
      name: company.id === "c1" ? seed.name : `${seed.name} (${company.code})`,
      code: seed.code,
      tax_number: seed.tax,
      email: `ar@${seed.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
      phone: "+92 21 111 000 000",
      address: "Shahrah-e-Faisal, Karachi, Pakistan",
      payment_terms_days: seed.terms,
      default_expense_account_id: findAccount(company.id, seed.expense)?.id ?? null,
      default_payable_account_id: findAccount(company.id, "2010")?.id ?? null,
      status: "active",
      outstanding: 0,
      created_by: USER,
      created_at: "2026-07-01T04:00:00Z",
      updated_by: null,
      updated_at: null,
    });
    return id;
  });

  const billSeeds = company.id === "c1" ? BILL_SEEDS : BILL_SEEDS.slice(0, company.id === "c2" ? 4 : 3);
  billSeeds.forEach((seed) => {
    const supplierId = ids[seed.supplier % ids.length]!;
    const supplier = suppliers.find((s) => s.id === supplierId)!;
    const expenseAccount =
      accounts.find((a) => a.id === supplier.default_expense_account_id) ?? findAccount(company.id, "5040")!;
    const total = toMinor(Math.round((seed.subtotal + seed.tax) * weight));
    const paid = toMinor(Math.round(seed.paid * weight));
    const outstanding = total - paid;
    const overdueDays = outstanding > 0 ? Math.max(0, daysBetween(seed.due, TODAY)) : 0;
    const status: SupplierBill["status"] =
      seed.status === "draft"
        ? "draft"
        : outstanding <= 0
          ? "paid"
          : overdueDays > 0
            ? "overdue"
            : paid > 0
              ? "partial"
              : "unpaid";
    if (status !== "draft") supplier.outstanding += outstanding;
    const billId = uid("bill");
    supplierBills.push({
      id: billId,
      company_id: company.id,
      bill_number: `${seed.number}${company.id === "c1" ? "" : `-${company.code}`}`,
      supplier_id: supplierId,
      supplier_name: supplier.name,
      bill_date: seed.date,
      due_date: seed.due,
      reference: `PO-${seed.number.slice(-4)}`,
      expense_account_id: expenseAccount.id,
      expense_account_name: `${expenseAccount.code} · ${expenseAccount.name}`,
      subtotal: toMinor(Math.round(seed.subtotal * weight)),
      tax: toMinor(Math.round(seed.tax * weight)),
      total,
      paid_amount: paid,
      outstanding,
      status,
      days_overdue: overdueDays,
      journal_id: journals.find((j) => j.company_id === company.id && j.reference === seed.number)?.id ?? null,
      created_by: USER,
      created_at: `${seed.date}T05:00:00Z`,
      updated_by: null,
      updated_at: null,
    });
    if (paid > 0) {
      supplierPayments.push({
        id: uid("pay"),
        company_id: company.id,
        number: `PAY-${seed.number.slice(-4)}`,
        party_id: supplierId,
        party_name: supplier.name,
        document_id: billId,
        document_number: seed.number,
        payment_date: seed.due,
        amount: paid,
        method: "bank_transfer",
        reference: `TT-${seed.number.slice(-4)}`,
        journal_id: null,
      });
    }
  });
}

/* ----------------------------- inventory ----------------------------- */

interface ItemSeed { sku: string; name: string; category: string }
const ITEM_SEEDS: ItemSeed[] = [
  { sku: "HW-LAP-14", name: "Dell Latitude 5440", category: "Hardware" },
  { sku: "HW-MON-27", name: "Dell P2723DE Monitor", category: "Hardware" },
  { sku: "HW-DOC-01", name: "USB-C Docking Station", category: "Accessories" },
  { sku: "CN-CLR-05", name: "Industrial Cleaning Kit", category: "Consumables" },
];

interface MovementSeed { date: string; type: InventoryLedgerEntry["type"]; reference: string; ref_type: InventoryLedgerEntry["reference_type"]; qty: number; unit_cost?: number }
const MOVEMENT_SEEDS: Record<string, MovementSeed[]> = {
  "HW-LAP-14": [
    { date: "2026-07-05", type: "opening", reference: "OPEN-2026", ref_type: "inventory", qty: 10, unit_cost: 100000 },
    { date: "2026-08-11", type: "purchase", reference: "BILL-4433", ref_type: "supplier_bill", qty: 10, unit_cost: 120000 },
    { date: "2026-09-15", type: "sale", reference: "INV-2026-0298", ref_type: "invoice", qty: -15 },
    { date: "2026-09-19", type: "purchase", reference: "BILL-4471", ref_type: "supplier_bill", qty: 6, unit_cost: 124000 },
  ],
  "HW-MON-27": [
    { date: "2026-07-05", type: "opening", reference: "OPEN-2026", ref_type: "inventory", qty: 18, unit_cost: 62000 },
    { date: "2026-08-24", type: "sale", reference: "INV-2026-0284", ref_type: "invoice", qty: -7 },
    { date: "2026-09-09", type: "adjustment_out", reference: "ADJ-SEP-02", ref_type: "inventory", qty: -1 },
  ],
  "HW-DOC-01": [
    { date: "2026-07-12", type: "purchase", reference: "BILL-4441", ref_type: "supplier_bill", qty: 24, unit_cost: 18500 },
    { date: "2026-09-02", type: "sale", reference: "INV-2026-0305", ref_type: "invoice", qty: -9 },
    { date: "2026-09-14", type: "return_in", reference: "CRN-0021", ref_type: "invoice", qty: 2, unit_cost: 18500 },
  ],
  "CN-CLR-05": [
    { date: "2026-07-08", type: "purchase", reference: "BILL-4460", ref_type: "supplier_bill", qty: 60, unit_cost: 4200 },
    { date: "2026-08-19", type: "sale", reference: "INV-2026-0271", ref_type: "invoice", qty: -40 },
    { date: "2026-09-11", type: "purchase", reference: "BILL-4468", ref_type: "supplier_bill", qty: 30, unit_cost: 4550 },
  ],
};

export const inventoryLedger: InventoryLedgerEntry[] = [];
export const inventoryValuation: InventoryItemValuation[] = [];
export const cogsPostings: CogsPosting[] = [];

interface Layer { id: string; date: string; reference: string; original: number; remaining: number; unit_cost: Money }
export const fifoLayers: (Layer & { company_id: string; item_id: string })[] = [];

for (const company of companies) {
  const weight = WEIGHT[company.id] ?? 0.3;
  const itemSeeds = company.id === "c1" ? ITEM_SEEDS : ITEM_SEEDS.slice(0, company.id === "c2" ? 3 : 2);
  for (const item of itemSeeds) {
    const itemId = uid("item");
    const layers: Layer[] = [];
    let runningQty = 0;
    let runningValue: Money = 0;

    for (const move of MOVEMENT_SEEDS[item.sku] ?? []) {
      const qty = move.qty > 0 ? Math.max(1, Math.round(move.qty * (company.id === "c1" ? 1 : weight * 2))) : move.qty;
      if (qty > 0) {
        const unitCost = toMinor(move.unit_cost ?? 0);
        const layerId = uid("lay");
        layers.push({ id: layerId, date: move.date, reference: move.reference, original: qty, remaining: qty, unit_cost: unitCost });
        const value = unitCost * qty;
        runningQty += qty;
        runningValue += value;
        inventoryLedger.push({
          id: uid("il"), company_id: company.id, item_id: itemId, item_name: item.name, item_sku: item.sku,
          date: move.date, type: move.type, reference: move.reference, reference_type: move.ref_type,
          quantity_in: qty, quantity_out: 0, unit_cost: unitCost, value,
          running_quantity: runningQty, running_value: runningValue,
          journal_id: null,
        });
      } else {
        let needed = Math.min(Math.abs(qty), runningQty);
        const consumption = [];
        let cogs: Money = 0;
        for (const layer of layers) {
          if (needed <= 0) break;
          if (layer.remaining <= 0) continue;
          const take = Math.min(layer.remaining, needed);
          layer.remaining -= take;
          needed -= take;
          const value = layer.unit_cost * take;
          cogs += value;
          consumption.push({ layer_id: layer.id, received_date: layer.date, quantity: take, unit_cost: layer.unit_cost, value });
        }
        const outQty = Math.abs(qty) - needed;
        if (outQty === 0) continue;
        runningQty -= outQty;
        runningValue -= cogs;
        const entryId = uid("il");
        inventoryLedger.push({
          id: entryId, company_id: company.id, item_id: itemId, item_name: item.name, item_sku: item.sku,
          date: move.date, type: move.type, reference: move.reference, reference_type: move.ref_type,
          quantity_in: 0, quantity_out: outQty,
          unit_cost: outQty ? Math.round(cogs / outQty) : 0, value: cogs,
          running_quantity: runningQty, running_value: runningValue,
          journal_id: journals.find((j) => j.company_id === company.id && j.reference_type === "inventory")?.id ?? null,
        });
        cogsPostings.push({
          id: uid("cogs"), company_id: company.id, date: move.date, item_id: itemId, item_name: item.name,
          reference: move.reference, quantity: outQty, cogs_amount: cogs, consumption,
          journal_id: journals.find((j) => j.company_id === company.id && j.reference_type === "inventory")?.id ?? null,
          posted: move.date <= "2026-09-15",
        });
      }
    }

    for (const layer of layers) {
      fifoLayers.push({ ...layer, company_id: company.id, item_id: itemId });
    }
    inventoryValuation.push({
      id: itemId, company_id: company.id, sku: item.sku, name: item.name, category: item.category,
      quantity: runningQty, value: runningValue,
      average_unit_cost: runningQty ? Math.round(runningValue / runningQty) : 0,
      layers: layers.filter((l) => l.remaining > 0).length,
    });
  }
}

/* ----------------------------- payroll postings ----------------------------- */

interface RunSeed { run: string; label: string; period: string; pay_date: string; employees: number; gross: number; deductions: number; employer: number; status: PayrollPosting["accounting_status"] }
const RUN_SEEDS: RunSeed[] = [
  { run: "PR-2026-09", label: "September 2026 — Monthly payroll", period: "Sep 2026", pay_date: "2026-09-28", employees: 128, gross: 9820000, deductions: 1260000, employer: 428000, status: "not_posted" },
  { run: "PR-2026-08", label: "August 2026 — Monthly payroll", period: "Aug 2026", pay_date: "2026-08-28", employees: 126, gross: 9480000, deductions: 1184000, employer: 412000, status: "posted" },
  { run: "PR-2026-07", label: "July 2026 — Monthly payroll", period: "Jul 2026", pay_date: "2026-07-28", employees: 124, gross: 9260000, deductions: 1142000, employer: 402000, status: "posted" },
];

export const payrollPostings: PayrollPosting[] = companies.flatMap((company) => {
  const weight = WEIGHT[company.id] ?? 0.3;
  const seeds = company.id === "c1" ? RUN_SEEDS : RUN_SEEDS.slice(0, 2);
  return seeds.map((seed) => {
    const gross = toMinor(Math.round(seed.gross * weight));
    const deductions = toMinor(Math.round(seed.deductions * weight));
    const employer = toMinor(Math.round(seed.employer * weight));
    const net = gross - deductions;
    const map = (key: AccountMappingKey) => {
      const mapping = accountMappings.find((m) => m.company_id === company.id && m.key === key);
      const account = accounts.find((a) => a.id === mapping?.account_id);
      return {
        account_id: account?.id ?? null,
        account_code: account?.code ?? null,
        account_name: account?.name ?? null,
      };
    };
    const journal = journals.find((j) => j.company_id === company.id && j.reference === seed.run);
    return {
      id: uid("prp"),
      company_id: company.id,
      run_id: seed.run,
      run_label: seed.label,
      period: seed.period,
      pay_date: seed.pay_date,
      employees: Math.max(4, Math.round(seed.employees * weight)),
      gross,
      deductions,
      employer_contributions: employer,
      net_pay: net,
      accounting_status: seed.status,
      posting_date: seed.status === "posted" ? seed.pay_date : null,
      journal_id: journal?.id ?? null,
      journal_number: journal?.number ?? null,
      locked: seed.status === "posted",
      preview: [
        { label: "Salary expense (gross)", ...map("salary_expense"), debit: gross, credit: 0 },
        { label: "Employer contributions", ...map("employer_contribution_expense"), debit: employer, credit: 0 },
        { label: "Net salary payable", ...map("salary_payable"), debit: 0, credit: net },
        { label: "Payroll tax withheld", ...map("payroll_tax_payable"), debit: 0, credit: deductions },
        { label: "Employer contribution payable", ...map("employer_contribution_payable"), debit: 0, credit: employer },
      ],
    };
  });
});

export const nowIso = () => NOW;
