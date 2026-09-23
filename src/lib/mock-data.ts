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
