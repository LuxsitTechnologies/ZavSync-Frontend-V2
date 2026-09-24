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
  Customer,
  Journal,
  JournalLine,
  Money,
  Payment,
  ReceivableInvoice,
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

export const nowIso = () => NOW;
