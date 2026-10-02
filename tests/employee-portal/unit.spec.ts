import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { permissionForPath, moduleForPath } from "../../src/lib/nav";

const portalFiles = [
  ...readdirSync("src/pages/employee").map(file => `src/pages/employee/${file}`),
  ...readdirSync("src/components/employee").map(file => `src/components/employee/${file}`),
  "src/stores/employeePortal.ts",
];

test("portal routes are separate from administration and remain authentication guarded", () => {
  const router = readFileSync("src/router/index.ts", "utf8");
  for (const path of ["/employee", "/employee/profile", "/employee/notifications"]) {
    expect(router).toContain(`path: "${path}"`);
    expect(moduleForPath(path)).toBeNull();
    expect(permissionForPath(path)).toBeNull();
  }
  expect(router).toContain("if (!company.authenticated)");
  expect(router).not.toContain('publicPaths = new Set(["/employee"');
});

test("portal production code has no seeded runtime authority, payroll or HR-directory calls", () => {
  for (const file of portalFiles) {
    const code = readFileSync(file, "utf8");
    expect(code, file).not.toMatch(/employee-data|mock-data|services\/mock|mock-modules|\/payroll\/batches|\/payroll\/entries|\/hrm\/employees|employee-link-options|localStorage|sessionStorage|v-html|console\./);
    expect(code, file).not.toMatch(/bank_reference|tax_identifier|private_hr_notes|mockAuthCode|backupCodes/);
    if (!file.endsWith("EmployeePayroll.vue") && !file.endsWith("EmployeePayslip.vue")) expect(code, file).not.toContain("base_salary");
  }
});

test("employee self identity is permission gated and company responses are fenced", () => {
  const store = readFileSync("src/stores/employeePortal.ts", "utf8");
  expect(store).toContain('company.hasPermission("employee.self.view")');
  expect(store).toContain("if (!context || !canViewEmployee.value) return;");
  expect(store).toContain("company.activeCompanyId === id");
  expect(store).toContain("company.contextVersion === version");
  expect(store).toContain("controller?.abort()");
  expect(store).toContain('flush: "sync"');
});

test("account and password authority remains Stage 16C", () => {
  const profile = readFileSync("src/pages/employee/EmployeeProfile.vue", "utf8");
  expect(profile).toContain("ProfileContent");
  expect(profile).not.toContain("identityRepository.saveName");
  expect(profile).not.toContain("identityRepository.password");
  expect(readFileSync("src/components/identity/ProfileContent.vue", "utf8")).toContain("passwords.value=emptyPasswords()");
});
