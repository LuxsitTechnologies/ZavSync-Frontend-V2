import { test, expect, type Page } from "@playwright/test";

type Call = { path: string; company: string; method: string; body: unknown };
const observed = new WeakMap<Page, Call[]>();
const profile = { id: 1, name: "Account name", email: "account@example.invalid", email_verified: true };
const employee = (id: string, status = "active") => ({
  id: `employee-${id}`, employee_code: `CODE-${id}`, full_name: `Employee ${id}`,
  email: `${id}@example.invalid`, phone: "123", department: "Operations", designation: "Analyst",
  employment_type: "full_time", status, joining_date: "2020-01-01", leaving_date: null,
  location: "Lahore", base_salary: "SENSITIVE-SALARY", employee_bank_reference: "SENSITIVE-BANK",
});

async function setup(page: Page, options: { authenticated?: boolean; permissions?: string[]; status?: string; slowEmployee?: boolean; slowNotifications?: boolean } = {}) {
  const calls: Call[] = [];
  observed.set(page, calls);
  const permissions = options.permissions ?? ["employee.self.view"];
  let releaseEmployee = () => {};
  let releaseNotifications = () => {};
  const employeeGate = new Promise<void>(resolve => { releaseEmployee = resolve; });
  const notificationsGate = new Promise<void>(resolve => { releaseNotifications = resolve; });
  const read = new Set<string>();
  const company = (id: string) => ({ id, name: `Company ${id}`, roles: [], permissions, modules: [], effective_navigation: { catalog: [], items: [], visible_keys: [] } });
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const id = request.headers()["x-company-id"] ?? "A";
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path, company: id, method, body });
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return options.authenticated === false ? respond({ message: "Unauthenticated" }, 401) : respond({ user: { ...profile, is_platform_admin: true }, companies: ["A", "B", "C"].map(company) });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company((body as { company_id: string }).company_id) });
    if (path.endsWith("/auth/profile")) return respond(profile);
    if (path.endsWith("/auth/change-password")) return respond(profile);
    if (path.endsWith("/employee/me")) {
      if (options.slowEmployee && id === "A") await employeeGate;
      return respond({ linked: id !== "C", employee: id === "C" ? null : employee(id, options.status), self_editable: false });
    }
    if (path.endsWith("/platform/notifications")) {
      if (options.slowNotifications && id === "A") await notificationsGate;
      return respond({ unread_count: id !== "C" && !read.has(`${id}-notice`) ? 1 : 0, notifications: { data: id === "C" ? [] : [{ id: `${id}-notice`, type: "system", channel: "in_app", title: `Message ${id}`, message: `Body ${id}`, related_url: null, delivery_state: "DELIVERED", read_at: read.has(`${id}-notice`) ? "2026-10-03T00:00:00Z" : null, created_at: "2026-10-03T00:00:00Z" }], current_page: 1, last_page: 1, per_page: 30, total: id === "C" ? 0 : 1 } });
    }
    if (path.endsWith("/platform/notifications/read-all")) { read.add(`${id}-notice`); return respond({ message: "All notifications marked as read." }); }
    if (path.endsWith("/read")) { const noticeId = path.split("/").at(-2)!; read.add(noticeId); return respond({ id: noticeId, read_at: "2026-10-03T00:00:00Z" }); }
    if (path.endsWith("/platform/notification-preferences")) return method === "GET" ? respond([{ type: "system", in_app_enabled: true, email_enabled: true }]) : respond((body as { preferences: unknown[] }).preferences);
    return respond({ message: "Unexpected request" }, 500);
  });
  return { calls, releaseEmployee, releaseNotifications };
}

test.afterEach(async ({ page }) => {
  const calls = observed.get(page) ?? [];
  expect(calls.filter(call => /\/payroll|\/hrm\/employees|employee-link-options/.test(call.path)), "Portal must not access admin Payroll, HR or employee-link selection").toEqual([]);
});

test("unauthenticated portal route redirects to login without employee request", async ({ page }) => {
  const { calls } = await setup(page, { authenticated: false });
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  expect(calls.some(call => call.path.endsWith("/employee/me"))).toBe(false);
});

test("linked employee sees server identity and honest unavailable dashboard", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/employee");
  await expect(page.getByRole("main").getByText("Employee A", { exact: true })).toBeVisible();
  await expect(page.getByText("Message A", { exact: true })).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/SENSITIVE-/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check In" })).toHaveCount(0);
  expect(calls.some(call => call.path.endsWith("/employee/me") && call.company === "A")).toBe(true);
});

test("platform admin without self permission never requests employee identity", async ({ page }) => {
  const { calls } = await setup(page, { permissions: [] });
  await page.goto("/employee");
  await expect(page.getByText(/Employee self-service is unavailable/)).toBeVisible();
  expect(calls.some(call => call.path.endsWith("/employee/me"))).toBe(false);
});

test("unlinked and resigned records show distinct truthful states", async ({ page }) => {
  await setup(page, { status: "resigned" });
  await page.goto("/employee");
  await expect(page.getByText("Resigned", { exact: true })).toBeVisible();
  await expect(page.getByText(/employment record remains readable/)).toBeVisible();
  await page.getByLabel("Active company").selectOption("C");
  await expect(page.getByText(/No employee profile linked/)).toBeVisible();
  await expect(page.getByText("Employee A", { exact: true })).toHaveCount(0);
});

test("switch clears identity and notifications; late company A responses are ignored", async ({ page }) => {
  const { calls, releaseEmployee, releaseNotifications } = await setup(page, { slowEmployee: true, slowNotifications: true });
  await page.goto("/employee");
  await expect.poll(() => calls.filter(call => call.company === "A" && /employee\/me|platform\/notifications$/.test(call.path)).length).toBe(2);
  await page.getByLabel("Active company").selectOption("B");
  await expect(page.getByRole("main").getByText("Employee B", { exact: true })).toBeVisible();
  await expect(page.getByText("Message B", { exact: true })).toBeVisible();
  releaseEmployee(); releaseNotifications();
  await expect(page.getByText("Employee A", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Message A", { exact: true })).toHaveCount(0);
});

test("profile reuses Stage 16C account/password and excludes sensitive employee fields", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/employee/profile");
  await expect(page.getByLabel("Account name", { exact: true })).toHaveValue("Account name");
  await expect(page.getByText("Employee A", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Current password", { exact: true })).toBeVisible();
  await expect(page.getByText(/SENSITIVE-/)).toHaveCount(0);
  expect(calls.some(call => call.path.endsWith("/auth/profile"))).toBe(true);
});

test("notifications use company and recipient-scoped V2 API with read and preferences", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/employee/notifications");
  await expect(page.getByText("Message A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect.poll(() => calls.filter(call => call.path.endsWith("/read") && call.company === "A").length).toBe(1);
  await expect(page.getByText("You have 0 unread notifications.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as read", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect.poll(() => calls.filter(call => call.path.endsWith("/platform/notification-preferences") && call.method === "PUT").length).toBe(1);
  expect(calls.filter(call => call.path.includes("/platform/notifications") || call.path.includes("/notification-preferences")).every(call => call.company === "A")).toBe(true);
});

for (const width of [390, 768, 1440]) test(`portal is keyboard reachable with no horizontal overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page);
  await page.goto("/employee");
  await expect(page.getByRole("main").getByText("Employee A", { exact: true })).toBeVisible();
  if (width < 1024) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Close navigation" }).last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
