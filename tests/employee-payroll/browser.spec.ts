import { test, expect, type Page } from "@playwright/test";

type Call = { path: string; company: string; method: string };
const callsByPage = new WeakMap<Page, Call[]>();

function slip(company: string, id = "entry-1", paymentStatus = "UNPAID") {
  return {
    id, released_at: "2026-10-03T10:00:00Z", company: { id: company, name: `Company ${company}` },
    employee: { id: `employee-${company}`, employee_code: `EMP-${company}`, full_name: `Employee ${company}`, department: "Operations", designation: "Analyst" },
    payroll: { batch_number: `PAY-${company}`, batch_status: "POSTED", posted_at: "2026-09-30T10:00:00Z", period: { name: "September 2026", period_start: "2026-09-01", period_end: "2026-09-30", pay_date: "2026-09-30" } },
    currency: "PKR", base_salary: 100000, gross_earnings: 180001, employee_deductions: 10000,
    employee_contributions: 5000, tax_amount: 20000, reimbursements: 0, net_pay: 145001,
    paid_amount: paymentStatus === "PAID" ? 145001 : paymentStatus === "PARTIALLY_PAID" ? 45001 : 0,
    outstanding_amount: paymentStatus === "PAID" ? 0 : paymentStatus === "PARTIALLY_PAID" ? 100000 : 145001,
    payment_status: paymentStatus,
    earnings_lines: [{ component_code: "BASIC", component_name: "Basic Salary", component_type: "EARNINGS", amount: 100000 }, { component_code: "BONUS", component_name: "Bonus", component_type: "EARNINGS", amount: 80001 }],
    deduction_lines: [{ component_code: "LOAN", component_name: "Loan Deduction", component_type: "DEDUCTIONS", amount: 10000 }],
  };
}

async function setup(page: Page, options: { permissions?: string[]; unlinked?: boolean; empty?: boolean; slowA?: boolean; paymentStatus?: string; batchStatus?: string; historyErrorOnce?: boolean; slowRelease?: boolean } = {}) {
  const calls: Call[] = [];
  callsByPage.set(page, calls);
  const permissions = options.permissions ?? ["employee.self.view", "employee.payroll.view"];
  let releaseA = () => {};
  let releaseSubmission = () => {};
  const gateA = new Promise<void>(resolve => { releaseA = resolve; });
  const releaseGate = new Promise<void>(resolve => { releaseSubmission = resolve; });
  let historyCalls = 0;
  const company = (id: string) => ({ id, name: `Company ${id}`, roles: [], permissions, modules: ["payroll"], effective_navigation: { catalog: [], items: [], visible_keys: [] } });
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const id = request.headers()["x-company-id"] ?? "A";
    const method = request.method();
    calls.push({ path, company: id, method });
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return respond({ user: { id: 1, name: "Account", email: "account@example.invalid", is_platform_admin: true }, companies: ["A", "B"].map(company) });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company((request.postDataJSON() as { company_id: string }).company_id) });
    if (path.endsWith("/employee/me")) return respond({ linked: !options.unlinked, employee: options.unlinked ? null : { id: `employee-${id}`, employee_code: `EMP-${id}`, full_name: `Employee ${id}`, status: "resigned" }, self_editable: false });
    if (path.endsWith("/platform/notifications")) return respond({ unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, per_page: 30, total: 0 } });
    if (path.endsWith("/employee/payroll")) {
      if (options.slowA && id === "A") await gateA;
      historyCalls += 1;
      if (options.historyErrorOnce && historyCalls === 1) return respond({ message: "Temporary payroll error" }, 503);
      if (options.unlinked) return respond({ message: "No employee link", error_code: "EMPLOYEE_IDENTITY_NOT_LINKED" }, 409);
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      const data = options.empty ? [] : [slip(id, pageNumber === 1 ? `entry-${id}-1` : `entry-${id}-2`, options.paymentStatus)];
      return respond({ data: data.map(({ earnings_lines: _earnings, deduction_lines: _deductions, ...summary }) => summary), links: { first: null, last: null, prev: null, next: null }, meta: { current_page: pageNumber, last_page: options.empty ? 1 : 2, per_page: 12, total: options.empty ? 0 : 2 } });
    }
    if (path.includes("/employee/payroll/")) {
      if (path.endsWith("/unreleased") || path.endsWith("/foreign")) return respond({ message: "Not found" }, 404);
      return respond(slip(id, path.split("/").at(-1), options.paymentStatus));
    }
    if (path.endsWith("/payroll/batches")) return respond([{ id: "batch-1", number: "PAY-001", status: options.batchStatus ?? "POSTED", period: { name: "September 2026" }, employee_count: 1, net_pay: 145001, gross_earnings: 180001, employee_deductions: 10000, employee_contributions: 5000, tax_amount: 20000 }]);
    if (path.endsWith("/payroll/components") || path.endsWith("/banking/accounts")) return respond([]);
    if (path.endsWith("/payroll/batches/batch-1/entries")) return respond([{ id: "entry-1", employee_name: "Employee A", employee_code: "EMP-A", base_salary: 100000, gross_earnings: 180001, employee_deductions: 10000, employee_contributions: 5000, tax_amount: 20000, net_pay: 145001, outstanding_amount: 145001, payment_status: "UNPAID", released_at: null, released_by: null }]);
    if (path.endsWith("/payroll/entries/entry-1/release")) { if (options.slowRelease) await releaseGate; return respond({ entry_id: "entry-1", released_at: "2026-10-03T10:00:00Z", released_by: 1 }); }
    return respond({ message: "Unexpected request" }, 500);
  });
  return { calls, releaseA, releaseSubmission };
}

test.afterEach(async ({ page }) => {
  const calls = callsByPage.get(page) ?? [];
  const employeeCalls = calls.filter(call => call.path.startsWith("/api/v1/employee/payroll"));
  expect(employeeCalls.every(call => call.method === "GET")).toBe(true);
  if (employeeCalls.length) expect(calls.filter(call => /^\/api\/v1\/payroll\//.test(call.path))).toEqual([]);
});

test("released history shows backend values, payment state and pagination", async ({ page }) => {
  const { calls } = await setup(page, { paymentStatus: "PARTIALLY_PAID" });
  await page.goto("/employee/payroll");
  await expect(page.getByText("PAY-", { exact: false })).toHaveCount(0);
  await expect(page.getByText("September 2026")).toBeVisible();
  await expect(page.getByText("PARTIALLY PAID", { exact: false })).toBeVisible();
  await expect(page.getByText(/1,450\.01/).first()).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  expect(calls.some(call => call.path === "/api/v1/employee/payroll" && call.company === "A")).toBe(true);
});

test("detail renders safe stored breakdown, totals and independent payment states", async ({ page }) => {
  await setup(page, { paymentStatus: "PAID" });
  await page.goto("/employee/payroll/entry-A-1");
  await expect(page.getByText("Basic Salary")).toBeVisible();
  await expect(page.getByText("Loan Deduction")).toBeVisible();
  await expect(page.getByText("Net Salary")).toBeVisible();
  await expect(page.getByText("Payment status:")).toContainText("PAID");
  await expect(page.getByText("Browser print only")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await expect(page.getByText(/bank|journal|iban|SENSITIVE/i)).toHaveCount(0);
});

test("released but unpaid payslip remains visible with authoritative outstanding amount", async ({ page }) => {
  await setup(page);
  await page.goto("/employee/payroll/entry-A-1");
  await expect(page.getByText("Payment status:")).toContainText("UNPAID");
  await expect(page.getByText("Outstanding:")).toContainText(/1,450\.01/);
});

test("unreleased and foreign entries are unavailable", async ({ page }) => {
  await setup(page);
  await page.goto("/employee/payroll/unreleased");
  await expect(page.getByText("This payslip is not available to you.")).toBeVisible();
  await page.goto("/employee/payroll/foreign");
  await expect(page.getByText("This payslip is not available to you.")).toBeVisible();
});

test("unlinked and missing permission states are honest", async ({ page }) => {
  await setup(page, { unlinked: true });
  await page.goto("/employee/payroll");
  await expect(page.getByText(/No employee identity is linked/)).toBeVisible();
});

test("missing permission blocks even a platform admin without requesting payroll", async ({ page }) => {
  const { calls } = await setup(page, { permissions: [] });
  await page.goto("/employee/payroll");
  await expect(page).not.toHaveURL(/employee\/payroll/);
  expect(calls.filter(call => call.path.startsWith("/api/v1/employee/payroll"))).toEqual([]);
});

test("empty and retry states use only self-service data", async ({ page }) => {
  await setup(page, { empty: true, historyErrorOnce: true });
  await page.goto("/employee/payroll");
  await expect(page.getByText("Temporary payroll error")).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(/No payslips have been released/)).toBeVisible();
});

test("resigned employee retains released payslip access when authorized", async ({ page }) => {
  await setup(page);
  await page.goto("/employee/payroll/entry-A-1");
  await expect(page.getByRole("main").getByText("Employee A", { exact: true })).toBeVisible();
  await expect(page.getByText("Net Salary")).toBeVisible();
});

test("company switching removes old data and ignores late response", async ({ page }) => {
  const { calls, releaseA } = await setup(page, { slowA: true });
  await page.goto("/employee/payroll");
  await expect.poll(() => calls.some(call => call.company === "A" && call.path.endsWith("/employee/payroll"))).toBe(true);
  await page.getByLabel("Active company").selectOption("B");
  await expect(page.getByText("Company B").first()).toBeVisible();
  releaseA();
  await expect(page.getByText("Employee A")).toHaveCount(0);
});

test("release is confirmed, permission gated and cannot double-submit", async ({ page }) => {
  const { calls, releaseSubmission } = await setup(page, { permissions: ["payroll.view", "payroll.release"], slowRelease: true });
  await page.goto("/payroll/runs");
  await expect(page.getByText("Not released")).toBeVisible();
  await page.getByRole("button", { name: "Release to employee" }).click();
  expect(calls.filter(call => call.path.endsWith("/release"))).toHaveLength(0);
  await page.getByRole("button", { name: "Release payslip", exact: true }).click();
  await expect(page.getByRole("button", { name: "Working…" })).toBeDisabled();
  expect(calls.filter(call => call.path.endsWith("/release") && call.method === "POST")).toHaveLength(1);
  releaseSubmission();
  await expect(page.getByText("Released to employee")).toBeVisible();
  expect(calls.filter(call => call.path.endsWith("/release") && call.method === "POST")).toHaveLength(1);
  expect(calls.filter(call => /\/post$|\/payments$|\/journals/.test(call.path))).toEqual([]);
});

test("payroll administrator without release permission sees no release control", async ({ page }) => {
  const { calls } = await setup(page, { permissions: ["payroll.view"] });
  await page.goto("/payroll/runs");
  await expect(page.getByText("Not released")).toBeVisible();
  await expect(page.getByRole("button", { name: "Release to employee" })).toHaveCount(0);
  expect(calls.filter(call => call.path.endsWith("/release"))).toEqual([]);
});

test("fully paid but unreleased entry still requires explicit keyboard-confirmed release", async ({ page }) => {
  const { calls } = await setup(page, { permissions: ["payroll.view", "payroll.release"], batchStatus: "PAID" });
  await page.goto("/payroll/runs");
  const release = page.getByRole("button", { name: "Release to employee" });
  await expect(release).toBeVisible();
  await release.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(release).toBeFocused();
  expect(calls.filter(call => call.path.endsWith("/release"))).toEqual([]);
});

for (const width of [390, 768, 1440]) test(`payroll pages fit ${width}px without horizontal overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page);
  await page.goto("/employee/payroll");
  await expect(page.getByText("September 2026")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
