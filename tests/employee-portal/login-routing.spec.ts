import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, options: { linked: boolean; workspace: boolean; platformAdmin?: boolean }) {
  const calls: string[] = [];
  const permissions = ["employee.self.view", ...(options.workspace ? ["accounting.view"] : [])];
  const company = { id: "A", name: "Company A", roles: options.workspace ? ["Company User"] : ["Employee"], permissions, modules: ["payroll", ...(options.workspace ? ["invoicing"] : [])], approval_status: "APPROVED", is_active: true, effective_navigation: { catalog: [], items: [], visible_keys: [] } };
  const payload = { user: { id: 1, name: "Account User", email: "account@example.invalid", is_platform_admin: options.platformAdmin ?? false }, companies: [company] };
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    calls.push(path);
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: { message: "Unauthenticated" } });
    if (path.endsWith("/auth/login")) return route.fulfill({ json: payload });
    if (path.endsWith("/employee/me")) return route.fulfill({ json: { linked: options.linked, employee: options.linked ? { id: "employee-A", full_name: "Linked Employee", employee_code: "EMP-001", status: "active" } : null, self_editable: false } });
    if (path.endsWith("/platform/notifications")) return route.fulfill({ json: { unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, per_page: 30, total: 0 } } });
    return route.fulfill({ status: 403, json: { message: "Unavailable in this fixture" } });
  });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("account@example.invalid");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  return calls;
}

test("linked employee-only account lands in the existing Employee Portal", async ({ page }) => {
  const calls = await signIn(page, { linked: true, workspace: false });
  await expect(page).toHaveURL(/\/employee$/);
  expect(calls.some(path => path.endsWith("/employee/me"))).toBe(true);
  await expect(page.getByRole("link", { name: "Back to Dashboard" })).toHaveCount(0);
});

test("dual-role account lands in company workspace and keeps an explicit Portal entry", async ({ page }) => {
  const calls = await signIn(page, { linked: true, workspace: true });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Employee Portal", exact: true })).toBeVisible();
  expect(calls.some(path => path.endsWith("/employee/me"))).toBe(true);
});

test("unlinked account is not routed to employee self-service", async ({ page }) => {
  await signIn(page, { linked: false, workspace: false });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Employee Portal", exact: true })).toHaveCount(0);
});

test("platform administrator retains the company workspace landing", async ({ page }) => {
  await signIn(page, { linked: true, workspace: true, platformAdmin: true });
  await expect(page).toHaveURL(/\/$/);
});

test("restored employee-only session opens the Portal after a page reload", async ({ page }) => {
  const company = { id: "A", name: "Company A", roles: ["Employee"], permissions: ["employee.self.view"], modules: ["payroll"], approval_status: "APPROVED", is_active: true, effective_navigation: { catalog: [], items: [], visible_keys: [] } };
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { user: { id: 1, name: "Employee", email: "employee@example.invalid", is_platform_admin: false }, companies: [company] } });
    if (path.endsWith("/employee/me")) return route.fulfill({ json: { linked: true, employee: { id: "employee-A", full_name: "Linked Employee", employee_code: "EMP-001", status: "active" }, self_editable: false } });
    if (path.endsWith("/platform/notifications")) return route.fulfill({ json: { unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, per_page: 30, total: 0 } } });
    return route.fulfill({ status: 403, json: { message: "Unavailable in this fixture" } });
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/employee$/);
  await page.reload();
  await expect(page).toHaveURL(/\/employee$/);
});
