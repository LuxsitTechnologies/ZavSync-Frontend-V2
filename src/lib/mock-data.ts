/**
 * Typed mock services. Every function mirrors the shape the Laravel API will
 * return, so swapping to real endpoints is a one-file change.
 */

export type EmployeeStatus =
  | "active"
  | "probation"
  | "on_leave"
  | "notice_period"
  | "resigned"
  | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue" | "draft";
export type FbrStatus = "submitted" | "pending" | "rejected" | "not_applicable";

export interface Company {
  id: string;
  name: string;
  code: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  joining_date: string;
  location: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  currency: string;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  fbr_status: FbrStatus;
}

export const companies: Company[] = [
  { id: "c1", name: "Zavtech Solutions", code: "ZTS" },
  { id: "c2", name: "GetXM Facilities", code: "GXM" },
  { id: "c3", name: "JetClean Services", code: "JCS" },
];

export const currentUser = {
  name: "Humza Mazhar",
  email: "humza@zavtech.io",
  role: "Super Admin",
};

export const employees: Employee[] = [
  { id: "e1", employee_code: "ZTS-0101", full_name: "Ayesha Siddiqui", email: "ayesha.s@zavtech.io", phone: "+92 300 4412987", department: "Engineering", designation: "Senior Backend Engineer", employment_type: "full_time", status: "active", joining_date: "2022-03-14", location: "Lahore" },
  { id: "e2", employee_code: "ZTS-0102", full_name: "Bilal Ahmed Khan", email: "bilal.k@zavtech.io", phone: "+92 321 7788201", department: "Engineering", designation: "Frontend Engineer", employment_type: "full_time", status: "active", joining_date: "2023-01-09", location: "Lahore" },
  { id: "e3", employee_code: "ZTS-0103", full_name: "Fatima Noor", email: "fatima.n@zavtech.io", phone: "+92 333 2019845", department: "Finance", designation: "Accounts Manager", employment_type: "full_time", status: "on_leave", joining_date: "2021-07-01", location: "Karachi" },
  { id: "e4", employee_code: "ZTS-0104", full_name: "Usman Tariq", email: "usman.t@zavtech.io", phone: "+92 345 6620014", department: "Operations", designation: "Operations Lead", employment_type: "full_time", status: "active", joining_date: "2020-11-23", location: "Islamabad" },
  { id: "e5", employee_code: "ZTS-0105", full_name: "Hira Zafar", email: "hira.z@zavtech.io", phone: "+92 302 5541209", department: "People", designation: "HR Business Partner", employment_type: "full_time", status: "active", joining_date: "2023-05-02", location: "Lahore" },
  { id: "e6", employee_code: "ZTS-0106", full_name: "Danish Raza", email: "danish.r@zavtech.io", phone: "+92 311 9087734", department: "Engineering", designation: "QA Engineer", employment_type: "contract", status: "probation", joining_date: "2026-06-16", location: "Remote" },
  { id: "e7", employee_code: "ZTS-0107", full_name: "Sana Iqbal", email: "sana.i@zavtech.io", phone: "+92 336 4471290", department: "Sales", designation: "Key Account Executive", employment_type: "full_time", status: "active", joining_date: "2022-09-05", location: "Karachi" },
  { id: "e8", employee_code: "ZTS-0108", full_name: "Kamran Sheikh", email: "kamran.s@zavtech.io", phone: "+92 300 1123456", department: "Sales", designation: "Sales Manager", employment_type: "full_time", status: "notice_period", joining_date: "2019-02-18", location: "Lahore" },
  { id: "e9", employee_code: "ZTS-0109", full_name: "Maryam Yousaf", email: "maryam.y@zavtech.io", phone: "+92 340 7781120", department: "Finance", designation: "Tax Analyst (FBR)", employment_type: "full_time", status: "active", joining_date: "2024-02-12", location: "Islamabad" },
  { id: "e10", employee_code: "ZTS-0110", full_name: "Ahsan Mehmood", email: "ahsan.m@zavtech.io", phone: "+92 315 3390021", department: "Operations", designation: "Field Supervisor", employment_type: "part_time", status: "active", joining_date: "2024-08-30", location: "Faisalabad" },
  { id: "e11", employee_code: "ZTS-0111", full_name: "Zoya Malik", email: "zoya.m@zavtech.io", phone: "+92 322 6654098", department: "Engineering", designation: "Product Designer", employment_type: "full_time", status: "active", joining_date: "2025-01-20", location: "Remote" },
  { id: "e12", employee_code: "ZTS-0112", full_name: "Rehan Aslam", email: "rehan.a@zavtech.io", phone: "+92 301 4478812", department: "People", designation: "Talent Sourcer", employment_type: "intern", status: "probation", joining_date: "2026-07-06", location: "Lahore" },
  { id: "e13", employee_code: "ZTS-0113", full_name: "Nida Hassan", email: "nida.h@zavtech.io", phone: "+92 335 2210047", department: "Finance", designation: "Payroll Officer", employment_type: "full_time", status: "active", joining_date: "2023-10-11", location: "Karachi" },
  { id: "e14", employee_code: "ZTS-0114", full_name: "Owais Farooq", email: "owais.f@zavtech.io", phone: "+92 313 8890231", department: "Operations", designation: "Fleet Coordinator", employment_type: "contract", status: "resigned", joining_date: "2021-04-04", location: "Multan" },
];

export const invoices: Invoice[] = [
  { id: "i1", invoice_number: "INV-2026-0418", client_name: "Descon Engineering", issue_date: "2026-08-14", due_date: "2026-09-13", currency: "PKR", total: 1450000, amount_paid: 1450000, balance: 0, payment_status: "paid", fbr_status: "submitted" },
  { id: "i2", invoice_number: "INV-2026-0417", client_name: "Packages Mall", issue_date: "2026-08-11", due_date: "2026-09-10", currency: "PKR", total: 862500, amount_paid: 400000, balance: 462500, payment_status: "partial", fbr_status: "submitted" },
  { id: "i3", invoice_number: "INV-2026-0416", client_name: "Systems Ltd", issue_date: "2026-08-08", due_date: "2026-09-07", currency: "PKR", total: 2310000, amount_paid: 0, balance: 2310000, payment_status: "unpaid", fbr_status: "pending" },
  { id: "i4", invoice_number: "INV-2026-0415", client_name: "Nestlé Pakistan", issue_date: "2026-07-29", due_date: "2026-08-12", currency: "PKR", total: 675400, amount_paid: 0, balance: 675400, payment_status: "overdue", fbr_status: "submitted" },
  { id: "i5", invoice_number: "INV-2026-0414", client_name: "Interloop Limited", issue_date: "2026-07-25", due_date: "2026-08-24", currency: "PKR", total: 1180000, amount_paid: 1180000, balance: 0, payment_status: "paid", fbr_status: "submitted" },
  { id: "i6", invoice_number: "INV-2026-0413", client_name: "Emaar Pakistan", issue_date: "2026-07-19", due_date: "2026-08-18", currency: "PKR", total: 3425000, amount_paid: 1712500, balance: 1712500, payment_status: "partial", fbr_status: "rejected" },
  { id: "i7", invoice_number: "INV-2026-0412", client_name: "Bahria Town", issue_date: "2026-07-14", due_date: "2026-07-28", currency: "PKR", total: 540000, amount_paid: 0, balance: 540000, payment_status: "overdue", fbr_status: "pending" },
  { id: "i8", invoice_number: "INV-2026-0411", client_name: "K-Electric", issue_date: "2026-07-05", due_date: "2026-08-04", currency: "PKR", total: 1990000, amount_paid: 1990000, balance: 0, payment_status: "paid", fbr_status: "submitted" },
  { id: "i9", invoice_number: "INV-2026-0410", client_name: "Shifa International", issue_date: "2026-06-30", due_date: "2026-07-30", currency: "PKR", total: 728000, amount_paid: 728000, balance: 0, payment_status: "paid", fbr_status: "submitted" },
  { id: "i10", invoice_number: "INV-2026-0409", client_name: "Gourmet Foods", issue_date: "2026-08-20", due_date: "2026-09-19", currency: "PKR", total: 315000, amount_paid: 0, balance: 315000, payment_status: "draft", fbr_status: "not_applicable" },
  { id: "i11", invoice_number: "INV-2026-0408", client_name: "Lucky Cement", issue_date: "2026-06-22", due_date: "2026-07-22", currency: "PKR", total: 2650000, amount_paid: 2650000, balance: 0, payment_status: "paid", fbr_status: "submitted" },
  { id: "i12", invoice_number: "INV-2026-0407", client_name: "Habib Metro Bank", issue_date: "2026-06-15", due_date: "2026-07-15", currency: "PKR", total: 1120000, amount_paid: 560000, balance: 560000, payment_status: "partial", fbr_status: "submitted" },
];

export const dashboard = {
  kpis: [
    { key: "revenue", label: "Revenue (MTD)", value: 8420000, format: "money" as const, delta: 12.4 },
    { key: "outstanding", label: "Outstanding", value: 6575400, format: "money" as const, delta: -4.1 },
    { key: "headcount", label: "Active Headcount", value: 128, format: "number" as const, delta: 3.2 },
    { key: "attendance", label: "Attendance Today", value: 94.2, format: "percent" as const, delta: 1.8 },
  ],
  revenueSeries: [
    { month: "Mar", invoiced: 5.2, collected: 4.6 },
    { month: "Apr", invoiced: 6.1, collected: 5.4 },
    { month: "May", invoiced: 5.8, collected: 5.7 },
    { month: "Jun", invoiced: 7.4, collected: 6.2 },
    { month: "Jul", invoiced: 8.9, collected: 7.1 },
    { month: "Aug", invoiced: 8.4, collected: 6.8 },
  ],
  attendanceSplit: [
    { label: "Present", value: 118, tone: "success" as const },
    { label: "Leave", value: 6, tone: "info" as const },
    { label: "Half day", value: 3, tone: "warning" as const },
    { label: "Absent", value: 1, tone: "danger" as const },
  ],
  approvals: [
    { id: "a1", type: "Leave request", subject: "Fatima Noor · 3 days annual", meta: "Submitted 2h ago" },
    { id: "a2", type: "Expense claim", subject: "PKR 42,500 · Client travel", meta: "Usman Tariq · 5h ago" },
    { id: "a3", type: "Payroll batch", subject: "August 2026 · 128 employees", meta: "Awaiting finance sign-off" },
    { id: "a4", type: "FBR resubmission", subject: "INV-2026-0413 · Emaar Pakistan", meta: "Rejected — invalid HS code" },
  ],
  activity: [
    { id: "t1", who: "Nida Hassan", what: "posted payroll run for July 2026", when: "12 min ago" },
    { id: "t2", who: "Maryam Yousaf", what: "submitted INV-2026-0418 to FBR", when: "1h ago" },
    { id: "t3", who: "Hira Zafar", what: "approved 2 leave requests", when: "3h ago" },
    { id: "t4", who: "Bilal Ahmed Khan", what: "clocked in at 09:04", when: "Today" },
    { id: "t5", who: "System", what: "synced 46 attendance devices", when: "Today 06:00" },
  ],
};
