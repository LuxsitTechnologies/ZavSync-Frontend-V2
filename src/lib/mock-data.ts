/**
 * Typed mock services. Every function mirrors the shape the Laravel API will
 * return, so swapping to real endpoints is a one-file change.
 */

export interface Company {
  id: string;
  name: string;
  code: string;
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

export const dashboard = {
  kpis: [
    { key: "headcount", label: "Active Headcount", value: 128, format: "number" as const, delta: 3.2 },
    { key: "attendance", label: "Attendance Today", value: 94.2, format: "percent" as const, delta: 1.8 },
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
  ],
  activity: [
    { id: "t1", who: "Nida Hassan", what: "posted payroll run for July 2026", when: "12 min ago" },
    { id: "t3", who: "Hira Zafar", what: "approved 2 leave requests", when: "3h ago" },
    { id: "t4", who: "Bilal Ahmed Khan", what: "clocked in at 09:04", when: "Today" },
    { id: "t5", who: "System", what: "synced 46 attendance devices", when: "Today 06:00" },
  ],
};
