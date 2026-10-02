import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { moduleForPath, permissionForPath } from "../../src/lib/nav";

const source = (path: string) => readFileSync(path, "utf8");

test("self payroll routes require the dedicated permission and existing payroll module", () => {
  for (const path of ["/employee/payroll", "/employee/payroll/entry-id"]) {
    expect(permissionForPath(path)).toBe("employee.payroll.view");
    expect(moduleForPath(path)).toBe("payroll");
  }
  expect(source("src/router/index.ts")).toContain('path: "/employee/payroll/:entry"');
  expect(source("src/components/employee/PortalSidebar.vue")).toContain('permission: "employee.payroll.view"');
});

test("employee screens use self-scoped APIs without administrative payroll or browser financial authority", () => {
  const repository = source("src/services/employeePayroll.repository.ts");
  const history = source("src/pages/employee/EmployeePayroll.vue");
  const detail = source("src/pages/employee/EmployeePayslip.vue");
  expect(repository).toContain('"/employee/payroll"');
  expect(repository).toContain('`/employee/payroll/${encodeURIComponent(entryId)}`');
  expect(repository).toContain('`/payroll/entries/${encodeURIComponent(entryId)}/release`');
  for (const code of [history, detail]) {
    expect(code).not.toMatch(/employee-data|mock-data|payrollRepository|\/payroll\/batches|\/payroll\/entries|apiDownload|localStorage|sessionStorage|v-html|journal_id|bank_reference|profile_snapshot/);
    expect(code).not.toMatch(/\.reduce\(|\.filter\(|toMajor\(|parseMoneyInput\(/);
  }
  expect(detail).not.toMatch(/Download PDF|Bank Transfer|Paid On|profile\.bank/);
});

test("company switches fence stale history and detail responses", () => {
  const store = source("src/stores/employeePayroll.ts");
  expect(store).toContain("historyController?.abort()");
  expect(store).toContain("detailController?.abort()");
  expect(store).toContain("company.contextVersion === version");
  expect(store).toContain("generation === claim");
  expect(store).toContain('flush: "sync"');
});

test("release is explicit, confirmed, permission gated and independent of accounting actions", () => {
  const page = source("src/pages/PayrollRuns.vue");
  expect(page).toContain('company.hasPermission("payroll.release")');
  expect(page).toContain("<ConfirmDialog :open=\"releaseOpen\"");
  expect(page).toContain("releaseMutation.saving.value");
  expect(page).toContain("released.released_at");
  expect(page).toContain("Not released");
  expect(page).not.toContain("Unrelease");
  expect(source("src/services/employeePayroll.repository.ts")).not.toMatch(/\/post|\/payments|\/journals|\/banking/);
});
