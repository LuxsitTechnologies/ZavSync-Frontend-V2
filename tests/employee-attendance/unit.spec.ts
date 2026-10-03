import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { moduleForPath, permissionForPath, presentationKeyForRoute } from "../../src/lib/nav";

const source = (path: string) => readFileSync(path, "utf8");

test("attendance routes use dedicated permissions and the existing payroll entitlement", () => {
  expect(permissionForPath("/employee/attendance")).toBe("employee.attendance.view");
  expect(permissionForPath("/hrm/attendance")).toBe("attendance.view");
  expect(moduleForPath("/employee/attendance")).toBe("payroll");
  expect(moduleForPath("/hrm/attendance")).toBe("payroll");
  expect(presentationKeyForRoute["/hrm/attendance"]).toBe("hrm.attendance");
  expect(source("src/router/index.ts")).toContain('path: "/employee/attendance"');
  expect(source("src/components/employee/PortalSidebar.vue")).toContain('permission: "employee.attendance.view"');
});

test("self repository uses exact frozen endpoints and payloads without employee IDs", () => {
  const repository = source("src/services/attendance.repository.ts");
  for (const path of ["/employee/attendance/status", "/employee/attendance/clock-in", "/employee/attendance/clock-out",
    "/employee/attendance/breaks/start", "/employee/attendance/breaks/end", "/employee/attendance/history",
    "/employee/attendance/calendar", "/employee/attendance/corrections"]) expect(repository).toContain(path);
  expect(repository).toContain('body: {}, idempotencyKey');
  expect(repository).toContain('body: input, idempotencyKey');
  const selfContract = repository.split("export const attendanceAdminRepository")[0];
  expect(selfContract).not.toMatch(/employee_id:|\/payroll\/|\/hrm\/employees|employee-link-options/);
});

test("attendance UI has no prototype mocks, fabricated classifications, financial actions or unsafe HTML", () => {
  for (const path of ["src/pages/employee/EmployeeAttendance.vue", "src/pages/employee/EmployeeDashboard.vue",
    "src/pages/HrmAttendance.vue", "src/stores/employeeAttendance.ts"]) {
    const code = source(path);
    expect(code).not.toMatch(/employee-data|mock-data|v-html|journal_id|bank_reference|base_salary|net_pay|gross_pay/);
    expect(code).not.toMatch(/\/payroll\/(?:post|payments|calculate)|\/accounting\/journals|\/banking\/|\/inventory\//);
    expect(code).not.toMatch(/half_day|late_days|overtime_hours|absent_days/);
  }
  const page = source("src/pages/employee/EmployeeAttendance.vue");
  expect(page).not.toMatch(/new Date\(\)\.toTimeString|Date\.now\(\).*clock|attendanceSummary|attendanceHistory/);
  expect(page).toContain("attendance.status.allowed_actions.includes");
});

test("company switching and uncertain retries fence stale responses and preserve idempotency", () => {
  const store = source("src/stores/employeeAttendance.ts");
  expect(store).toContain("company.contextVersion === context.version");
  expect(store).toContain("generation === context.generation");
  expect(store).toContain("controllers[kind]?.abort()");
  expect(store).toContain('flush: "sync"');
  expect(store).toContain("sessionStorage.setItem(pendingKey(companyId)");
  expect(store).toContain("active.action !== action");
});

test("admin operations use only administrative attendance APIs and permissions", () => {
  const repository = source("src/services/attendance.repository.ts");
  const page = source("src/pages/HrmAttendance.vue");
  expect(repository).toContain('"/attendance/sessions"');
  expect(repository).toContain('"/attendance/corrections"');
  expect(page).toContain('company.hasPermission("attendance.corrections.manage")');
  expect(page).toContain('company.hasPermission("attendance.manage")');
  expect(page).not.toMatch(/employee\.attendance\.clock|employeePayrollRepository|payrollRepository/);
});
