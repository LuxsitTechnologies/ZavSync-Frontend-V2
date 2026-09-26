/**
 * Mock datasets for the remaining ZavSync modules. Shapes mirror the API
 * contracts, so each list can be swapped for a typed service call later.
 */

export interface AttendanceRow {
  id: string;
  employee: string;
  code: string;
  department: string;
  clock_in: string;
  clock_out: string;
  hours: number;
  overtime: number;
  status: "present" | "late" | "half_day" | "on_leave" | "absent";
  device: string;
}

export const attendance: AttendanceRow[] = [
  { id: "at1", employee: "Ayesha Siddiqui", code: "ZTS-0101", department: "Engineering", clock_in: "08:58", clock_out: "18:04", hours: 9.1, overtime: 1.1, status: "present", device: "Lahore HQ · Gate 1" },
  { id: "at2", employee: "Bilal Ahmed Khan", code: "ZTS-0102", department: "Engineering", clock_in: "09:34", clock_out: "18:12", hours: 8.6, overtime: 0, status: "late", device: "Lahore HQ · Gate 1" },
  { id: "at3", employee: "Fatima Noor", code: "ZTS-0103", department: "Finance", clock_in: "—", clock_out: "—", hours: 0, overtime: 0, status: "on_leave", device: "—" },
  { id: "at4", employee: "Usman Tariq", code: "ZTS-0104", department: "Operations", clock_in: "08:41", clock_out: "17:50", hours: 9.1, overtime: 0.9, status: "present", device: "Islamabad Office" },
  { id: "at5", employee: "Hira Zafar", code: "ZTS-0105", department: "People", clock_in: "09:02", clock_out: "13:30", hours: 4.4, overtime: 0, status: "half_day", device: "Lahore HQ · Gate 2" },
  { id: "at6", employee: "Danish Raza", code: "ZTS-0106", department: "Engineering", clock_in: "—", clock_out: "—", hours: 0, overtime: 0, status: "absent", device: "—" },
  { id: "at7", employee: "Sana Iqbal", code: "ZTS-0107", department: "Sales", clock_in: "08:55", clock_out: "19:20", hours: 10.4, overtime: 2.4, status: "present", device: "Karachi Office" },
  { id: "at8", employee: "Maryam Yousaf", code: "ZTS-0109", department: "Finance", clock_in: "09:05", clock_out: "18:00", hours: 8.9, overtime: 0, status: "present", device: "Islamabad Office" },
  { id: "at9", employee: "Nida Hassan", code: "ZTS-0113", department: "Finance", clock_in: "09:12", clock_out: "18:02", hours: 8.8, overtime: 0, status: "late", device: "Karachi Office" },
  { id: "at10", employee: "Zoya Malik", code: "ZTS-0111", department: "Engineering", clock_in: "10:02", clock_out: "19:10", hours: 9.1, overtime: 1.1, status: "present", device: "Remote · Web" },
];

export interface LeaveRow {
  id: string;
  employee: string;
  type: "Annual" | "Sick" | "Casual" | "Unpaid" | "Maternity";
  from: string;
  to: string;
  days: number;
  balance: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approver: string;
}

export const leaveRequests: LeaveRow[] = [
  { id: "l1", employee: "Fatima Noor", type: "Annual", from: "2026-08-20", to: "2026-08-22", days: 3, balance: 11, status: "pending", approver: "Hira Zafar" },
  { id: "l2", employee: "Bilal Ahmed Khan", type: "Sick", from: "2026-08-18", to: "2026-08-18", days: 1, balance: 7, status: "approved", approver: "Ayesha Siddiqui" },
  { id: "l3", employee: "Kamran Sheikh", type: "Unpaid", from: "2026-09-01", to: "2026-09-05", days: 5, balance: 0, status: "pending", approver: "Humza Mazhar" },
  { id: "l4", employee: "Zoya Malik", type: "Casual", from: "2026-08-25", to: "2026-08-25", days: 1, balance: 4, status: "pending", approver: "Hira Zafar" },
  { id: "l5", employee: "Nida Hassan", type: "Annual", from: "2026-07-11", to: "2026-07-18", days: 6, balance: 8, status: "approved", approver: "Fatima Noor" },
  { id: "l6", employee: "Ahsan Mehmood", type: "Casual", from: "2026-08-12", to: "2026-08-13", days: 2, balance: 2, status: "rejected", approver: "Usman Tariq" },
  { id: "l7", employee: "Sana Iqbal", type: "Maternity", from: "2026-10-01", to: "2026-12-24", days: 85, balance: 85, status: "pending", approver: "Hira Zafar" },
  { id: "l8", employee: "Rehan Aslam", type: "Sick", from: "2026-08-05", to: "2026-08-06", days: 2, balance: 5, status: "cancelled", approver: "Hira Zafar" },
];

export interface Team {
  id: string;
  name: string;
  lead: string;
  department: string;
  members: number;
  open_roles: number;
  utilisation: number;
}

export const teams: Team[] = [
  { id: "t1", name: "Platform Engineering", lead: "Ayesha Siddiqui", department: "Engineering", members: 14, open_roles: 2, utilisation: 92 },
  { id: "t2", name: "Product Design", lead: "Zoya Malik", department: "Engineering", members: 5, open_roles: 1, utilisation: 78 },
  { id: "t3", name: "Finance Controlling", lead: "Fatima Noor", department: "Finance", members: 9, open_roles: 0, utilisation: 85 },
  { id: "t4", name: "Field Operations — North", lead: "Usman Tariq", department: "Operations", members: 32, open_roles: 6, utilisation: 96 },
  { id: "t5", name: "Field Operations — South", lead: "Ahsan Mehmood", department: "Operations", members: 27, open_roles: 3, utilisation: 88 },
  { id: "t6", name: "Enterprise Sales", lead: "Kamran Sheikh", department: "Sales", members: 11, open_roles: 2, utilisation: 74 },
  { id: "t7", name: "People & Culture", lead: "Hira Zafar", department: "People", members: 6, open_roles: 0, utilisation: 69 },
];

export interface RotaShift {
  id: string;
  employee: string;
  site: string;
  shifts: (string | null)[];
  hours: number;
}

export const rotaDays = ["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28", "Sat 29", "Sun 30"];

export const rota: RotaShift[] = [
  { id: "r1", employee: "Usman Tariq", site: "Emaar Tower", shifts: ["06:00–14:00", "06:00–14:00", "06:00–14:00", "14:00–22:00", "14:00–22:00", null, null], hours: 40 },
  { id: "r2", employee: "Ahsan Mehmood", site: "Packages Mall", shifts: ["14:00–22:00", "14:00–22:00", null, "06:00–14:00", "06:00–14:00", "06:00–14:00", null], hours: 40 },
  { id: "r3", employee: "Owais Farooq", site: "K-Electric HQ", shifts: [null, "22:00–06:00", "22:00–06:00", "22:00–06:00", "22:00–06:00", "22:00–06:00", null], hours: 40 },
  { id: "r4", employee: "Danish Raza", site: "Shifa Hospital", shifts: ["06:00–14:00", null, "06:00–14:00", null, "06:00–14:00", "06:00–14:00", "06:00–14:00"], hours: 40 },
  { id: "r5", employee: "Rehan Aslam", site: "Bahria Town", shifts: [null, "14:00–22:00", "14:00–22:00", "14:00–22:00", null, "14:00–22:00", "14:00–22:00"], hours: 40 },
];

export interface FbrInvoice {
  id: string;
  invoice_number: string;
  irn: string;
  client: string;
  taxable: number;
  sales_tax: number;
  submitted_at: string;
  status: "submitted" | "pending" | "rejected";
  note: string;
}

export const fbrInvoices: FbrInvoice[] = [
  { id: "f1", invoice_number: "INV-2026-0418", irn: "7000021-2608261418", client: "Descon Engineering", taxable: 1228813, sales_tax: 221187, submitted_at: "2026-08-14 16:22", status: "submitted", note: "Accepted by IRIS" },
  { id: "f2", invoice_number: "INV-2026-0417", irn: "7000021-2608261417", client: "Packages Mall", taxable: 730932, sales_tax: 131568, submitted_at: "2026-08-11 11:04", status: "submitted", note: "Accepted by IRIS" },
  { id: "f3", invoice_number: "INV-2026-0416", irn: "—", client: "Systems Ltd", taxable: 1957627, sales_tax: 352373, submitted_at: "—", status: "pending", note: "Queued for nightly batch" },
  { id: "f4", invoice_number: "INV-2026-0413", irn: "—", client: "Emaar Pakistan", taxable: 2902542, sales_tax: 522458, submitted_at: "2026-07-19 09:41", status: "rejected", note: "Invalid HS code on line 3" },
  { id: "f5", invoice_number: "INV-2026-0412", irn: "—", client: "Bahria Town", taxable: 457627, sales_tax: 82373, submitted_at: "—", status: "pending", note: "Buyer NTN missing" },
  { id: "f6", invoice_number: "INV-2026-0411", irn: "7000021-2607261411", client: "K-Electric", taxable: 1686441, sales_tax: 303559, submitted_at: "2026-07-05 15:10", status: "submitted", note: "Accepted by IRIS" },
];

export interface Account {
  id: string;
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  parent: string;
  balance: number;
}

export const chartOfAccounts: Account[] = [
  { id: "ac1", code: "1000", name: "Current Assets", type: "Asset", parent: "—", balance: 42850000 },
  { id: "ac2", code: "1010", name: "Cash in Hand", type: "Asset", parent: "1000", balance: 1250000 },
  { id: "ac3", code: "1020", name: "Bank — Habib Metro 0142", type: "Asset", parent: "1000", balance: 28640000 },
  { id: "ac4", code: "1100", name: "Accounts Receivable", type: "Asset", parent: "1000", balance: 12960000 },
  { id: "ac5", code: "2000", name: "Current Liabilities", type: "Liability", parent: "—", balance: 9840000 },
  { id: "ac6", code: "2010", name: "Accounts Payable", type: "Liability", parent: "2000", balance: 5410000 },
  { id: "ac7", code: "2050", name: "Sales Tax Payable (FBR)", type: "Liability", parent: "2000", balance: 3120000 },
  { id: "ac8", code: "2060", name: "Payroll Liabilities", type: "Liability", parent: "2000", balance: 1310000 },
  { id: "ac9", code: "3000", name: "Share Capital", type: "Equity", parent: "—", balance: 20000000 },
  { id: "ac10", code: "4000", name: "Service Revenue", type: "Revenue", parent: "—", balance: 68420000 },
  { id: "ac11", code: "4010", name: "Facility Management Revenue", type: "Revenue", parent: "4000", balance: 41200000 },
  { id: "ac12", code: "5000", name: "Salaries & Wages", type: "Expense", parent: "—", balance: 31480000 },
  { id: "ac13", code: "5100", name: "Fuel & Travel", type: "Expense", parent: "—", balance: 2740000 },
  { id: "ac14", code: "5200", name: "Rent & Utilities", type: "Expense", parent: "—", balance: 4180000 },
];

export interface LedgerLine {
  id: string;
  date: string;
  reference: string;
  account: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

export const ledger: LedgerLine[] = [
  { id: "g1", date: "2026-08-01", reference: "OB-2026-08", account: "1020 · Bank", narration: "Opening balance", debit: 0, credit: 0, balance: 24120000 },
  { id: "g2", date: "2026-08-04", reference: "RCPT-1188", account: "1020 · Bank", narration: "Receipt — Lucky Cement", debit: 2650000, credit: 0, balance: 26770000 },
  { id: "g3", date: "2026-08-07", reference: "PAY-0771", account: "1020 · Bank", narration: "Vendor payment — Shell Pakistan", debit: 0, credit: 415000, balance: 26355000 },
  { id: "g4", date: "2026-08-11", reference: "RCPT-1192", account: "1020 · Bank", narration: "Part receipt — Packages Mall", debit: 400000, credit: 0, balance: 26755000 },
  { id: "g5", date: "2026-08-14", reference: "RCPT-1195", account: "1020 · Bank", narration: "Receipt — Descon Engineering", debit: 1450000, credit: 0, balance: 28205000 },
  { id: "g6", date: "2026-08-18", reference: "PR-2026-07", account: "1020 · Bank", narration: "Payroll disbursement July", debit: 0, credit: 3120000, balance: 25085000 },
  { id: "g7", date: "2026-08-20", reference: "FBR-0825", account: "1020 · Bank", narration: "Sales tax deposit — CPR 992441", debit: 0, credit: 1180000, balance: 23905000 },
  { id: "g8", date: "2026-08-21", reference: "RCPT-1201", account: "1020 · Bank", narration: "Receipt — Habib Metro Bank", debit: 560000, credit: 0, balance: 24465000 },
];

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  type: "Manual" | "Payroll" | "Sales" | "Purchase" | "Adjustment";
  narration: string;
  amount: number;
  status: "posted" | "draft" | "pending";
  created_by: string;
}

export const journalEntries: JournalEntry[] = [
  { id: "j1", number: "JV-2026-0221", date: "2026-08-20", type: "Payroll", narration: "July 2026 payroll accrual", amount: 3120000, status: "posted", created_by: "Nida Hassan" },
  { id: "j2", number: "JV-2026-0222", date: "2026-08-20", type: "Sales", narration: "Revenue recognition — August batch 2", amount: 4285000, status: "posted", created_by: "System" },
  { id: "j3", number: "JV-2026-0223", date: "2026-08-21", type: "Adjustment", narration: "Depreciation — fleet vehicles", amount: 218000, status: "draft", created_by: "Fatima Noor" },
  { id: "j4", number: "JV-2026-0224", date: "2026-08-21", type: "Purchase", narration: "Consumables — Al-Karam Traders", amount: 96400, status: "pending", created_by: "Usman Tariq" },
  { id: "j5", number: "JV-2026-0225", date: "2026-08-22", type: "Manual", narration: "Reclass — misposted fuel expense", amount: 41500, status: "draft", created_by: "Maryam Yousaf" },
];

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  rate: number;
  tax_rate: number;
  hs_code: string;
  active: boolean;
}

export const services: ServiceItem[] = [
  { id: "s1", code: "SVC-001", name: "Manned Guarding — Day Shift", category: "Security", unit: "Guard / month", rate: 68000, tax_rate: 15, hs_code: "9819.1000", active: true },
  { id: "s2", code: "SVC-002", name: "Manned Guarding — Night Shift", category: "Security", unit: "Guard / month", rate: 74000, tax_rate: 15, hs_code: "9819.1000", active: true },
  { id: "s3", code: "SVC-010", name: "Deep Cleaning — Commercial", category: "Cleaning", unit: "Sq. ft.", rate: 18, tax_rate: 15, hs_code: "9822.2000", active: true },
  { id: "s4", code: "SVC-011", name: "Facade Cleaning", category: "Cleaning", unit: "Sq. ft.", rate: 42, tax_rate: 15, hs_code: "9822.2000", active: true },
  { id: "s5", code: "SVC-020", name: "HVAC Preventive Maintenance", category: "Technical", unit: "Visit", rate: 145000, tax_rate: 16, hs_code: "9815.4000", active: true },
  { id: "s6", code: "SVC-021", name: "Generator Servicing", category: "Technical", unit: "Visit", rate: 92000, tax_rate: 16, hs_code: "9815.4000", active: false },
  { id: "s7", code: "SVC-030", name: "Pest Control — Quarterly", category: "Hygiene", unit: "Contract", rate: 56000, tax_rate: 15, hs_code: "9821.5000", active: true },
];

export interface Expense {
  id: string;
  reference: string;
  claimant: string;
  category: string;
  date: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  receipt: boolean;
}

export const expenses: Expense[] = [
  { id: "ex1", reference: "EXP-2026-0341", claimant: "Usman Tariq", category: "Client travel", date: "2026-08-19", amount: 42500, status: "pending", receipt: true },
  { id: "ex2", reference: "EXP-2026-0340", claimant: "Sana Iqbal", category: "Client entertainment", date: "2026-08-18", amount: 18900, status: "approved", receipt: true },
  { id: "ex3", reference: "EXP-2026-0339", claimant: "Ahsan Mehmood", category: "Site consumables", date: "2026-08-16", amount: 67400, status: "paid", receipt: true },
  { id: "ex4", reference: "EXP-2026-0338", claimant: "Danish Raza", category: "Software licence", date: "2026-08-15", amount: 24000, status: "rejected", receipt: false },
  { id: "ex5", reference: "EXP-2026-0337", claimant: "Owais Farooq", category: "Fuel", date: "2026-08-14", amount: 31200, status: "paid", receipt: true },
  { id: "ex6", reference: "EXP-2026-0336", claimant: "Hira Zafar", category: "Recruitment", date: "2026-08-12", amount: 55000, status: "approved", receipt: true },
  { id: "ex7", reference: "EXP-2026-0335", claimant: "Maryam Yousaf", category: "Government fees", date: "2026-08-10", amount: 12500, status: "paid", receipt: true },
];

export interface Client {
  id: string;
  name: string;
  industry: string;
  owner: string;
  contracts: number;
  arr: number;
  ntn: string;
  status: "active" | "pending" | "on_leave" | "terminated";
}

export const clients: Client[] = [
  { id: "cl1", name: "Descon Engineering", industry: "Engineering", owner: "Kamran Sheikh", contracts: 4, arr: 18400000, ntn: "0712345-8", status: "active" },
  { id: "cl2", name: "Packages Mall", industry: "Retail", owner: "Sana Iqbal", contracts: 2, arr: 10350000, ntn: "1198822-1", status: "active" },
  { id: "cl3", name: "Systems Ltd", industry: "Technology", owner: "Kamran Sheikh", contracts: 3, arr: 27720000, ntn: "0900314-6", status: "active" },
  { id: "cl4", name: "Emaar Pakistan", industry: "Real Estate", owner: "Sana Iqbal", contracts: 5, arr: 41100000, ntn: "3311907-2", status: "pending" },
  { id: "cl5", name: "K-Electric", industry: "Utilities", owner: "Kamran Sheikh", contracts: 2, arr: 23880000, ntn: "0455129-4", status: "active" },
  { id: "cl6", name: "Gourmet Foods", industry: "FMCG", owner: "Sana Iqbal", contracts: 1, arr: 3780000, ntn: "2044981-7", status: "terminated" },
];

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  last_touch: string;
}

export const contacts: Contact[] = [
  { id: "cn1", name: "Imran Sethi", title: "Head of Facilities", company: "Descon Engineering", email: "imran.sethi@descon.com", phone: "+92 300 8842190", last_touch: "2026-08-19" },
  { id: "cn2", name: "Rabia Kausar", title: "Procurement Manager", company: "Packages Mall", email: "rabia.k@packagesmall.pk", phone: "+92 321 4498211", last_touch: "2026-08-14" },
  { id: "cn3", name: "Adeel Waheed", title: "CFO", company: "Systems Ltd", email: "adeel.w@systemsltd.com", phone: "+92 333 7712004", last_touch: "2026-08-08" },
  { id: "cn4", name: "Nadia Rehman", title: "Operations Director", company: "Emaar Pakistan", email: "nadia.r@emaar.pk", phone: "+92 345 9931077", last_touch: "2026-07-30" },
  { id: "cn5", name: "Faisal Butt", title: "Site Manager", company: "K-Electric", email: "faisal.b@ke.com.pk", phone: "+92 302 1120934", last_touch: "2026-08-21" },
];

export interface Lead {
  id: string;
  company: string;
  contact: string;
  stage: "New" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
  value: number;
  probability: number;
  owner: string;
  next_step: string;
}

export const leads: Lead[] = [
  { id: "ld1", company: "Bahria Enclave", contact: "Shahzad Alvi", stage: "Proposal", value: 14500000, probability: 60, owner: "Kamran Sheikh", next_step: "Send revised SOW" },
  { id: "ld2", company: "Lake City Holdings", contact: "Mehwish Ali", stage: "Qualified", value: 8200000, probability: 40, owner: "Sana Iqbal", next_step: "Site survey 26 Aug" },
  { id: "ld3", company: "Aga Khan Hospital", contact: "Dr. Saad Kazmi", stage: "Negotiation", value: 32400000, probability: 75, owner: "Kamran Sheikh", next_step: "Commercial review" },
  { id: "ld4", company: "Metro Cash & Carry", contact: "Junaid Baig", stage: "New", value: 6100000, probability: 15, owner: "Sana Iqbal", next_step: "Discovery call" },
  { id: "ld5", company: "Serena Hotels", contact: "Ayesha Raza", stage: "Won", value: 19750000, probability: 100, owner: "Kamran Sheikh", next_step: "Mobilisation 01 Sep" },
  { id: "ld6", company: "Fatima Fertilizer", contact: "Tahir Mahmood", stage: "Lost", value: 11200000, probability: 0, owner: "Sana Iqbal", next_step: "Revisit in Q1" },
];

export const pipelineStages = ["New", "Qualified", "Proposal", "Negotiation", "Won"] as const;
