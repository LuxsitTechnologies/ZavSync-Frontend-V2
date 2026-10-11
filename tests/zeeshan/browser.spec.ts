import { expect, test, type Page } from "@playwright/test";

const permissions = ["platform.settings.view", "platform.settings.manage", "platform.users.view", "platform.users.manage", "platform.invitations.manage", "receivables.customers"];
const company = (id: string, grants = permissions) => ({ id, name: `Company ${id}`, roles: [], permissions: grants, modules: ["payroll", "receivables"], timezone: "Asia/Karachi", effective_navigation: { visible_keys: [], items: [], catalog: [] } });
const settings = { company_id: "A", legal_name: "Company A", trading_name: null, registration_number: null, tax_identifier: null, cnic: null, email: null, phone: null, website: null, address: null, country_code: "PK", timezone: "Asia/Karachi", base_currency: "PKR", date_format: "DD/MM/YYYY", time_format: "24h", number_format: "1,234.56", fiscal_year_start_month: 7, default_payment_terms_days: 30, invoice_prefix: "INV", purchase_prefix: "PO", outreach_physical_address: null, outreach_footer: null, outreach_open_tracking_enabled: true, outreach_click_tracking_enabled: true, outreach_unsubscribe_required: true, ai_scheduled_intelligence_enabled: false };

async function setup(page: Page, grants = permissions) {
  const writes: Array<{ path: string; company: string; body: Record<string, unknown> }> = [];
  const roleReads: Array<{ path: string; company: string }> = [];
  let roleFailure = false;
  let roleEmpty = false;
  let formatFailure = false;
  const roles = [
    { id: 1, company_id: "A", name: "Viewer", archived_at: null, permissions: [{ id: 1, name: "platform.users.view" }] },
    { id: 2, company_id: "A", name: "Payroll administrator", archived_at: null, permissions: [{ id: 2, name: "payroll.manage" }] },
    { id: 3, company_id: "A", name: "Archived", archived_at: "2030-01-01", permissions: [] },
    { id: 4, company_id: "B", name: "Other company", archived_at: null, permissions: [] },
  ];
  await page.route("**/api/v1/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    const active = request.headers()["x-company-id"] ?? "A";
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : {};
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return respond({ user: { id: 1, name: "QA User", email: "qa@example.invalid", is_platform_admin: false }, companies: [company("A", grants), company("B", grants)] });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company(String(body.company_id), grants) });
    if (path.endsWith("/platform/notifications")) return respond({ unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    if (path.endsWith("/platform/notification-preferences")) return respond([]);
    if (path.endsWith("/platform/settings")) {
      if (method === "GET") return respond({ ...settings, company_id: active });
      writes.push({ path, company: active, body });
      if (formatFailure) return respond({ message: "Validation failed", errors: { number_format: ["Choose a supported number format"] } }, 422);
      return respond({ ...settings, ...body, website: body.website === "example.com" ? "https://example.com" : body.website });
    }
    if (path.endsWith("/platform/users")) return respond({ data: [], current_page: 1, last_page: 1, total: 0 });
    if (path.endsWith("/payroll/employees")) return respond(active === "A" ? [
      { id: "11111111-1111-4111-8111-111111111111", employee_code: "EMP-001", full_name: "Employee One", email: null, department: "Operations", designation: "Operator", employment_type: "full_time", joining_date: "2026-01-01", status: "active" },
      { id: "22222222-2222-4222-8222-222222222222", employee_code: "EMP-002", full_name: "Employee Two", email: null, department: "Operations", designation: "Operator", employment_type: "full_time", joining_date: "2026-01-01", status: "active" },
    ] : [{ id: "33333333-3333-4333-8333-333333333333", employee_code: "EMP-003", full_name: "Company B Employee", email: null, department: "Operations", designation: "Operator", employment_type: "full_time", joining_date: "2026-01-01", status: "active" }]);
    if (path.endsWith("/payroll/components") || path.endsWith("/accounting/financial-accounts")) return respond([]);
    if (path.endsWith("/accounting/customers")) {
      if (method === "GET") return respond([]);
      writes.push({ path, company: active, body });
      return respond({ id: "customer", ...body }, 201);
    }
    if (path.endsWith("/platform/roles")) {
      roleReads.push({ path, company: active });
      return grants.includes("platform.roles.view") ? respond({ roles: roles.filter(role => role.company_id === active), permissions: [] }) : respond({ message: "Role administration unavailable" }, 403);
    }
    if (path.endsWith("/platform/invitations/assignable-roles")) {
      roleReads.push({ path, company: active });
      if (roleFailure) return respond({ message: "Roles unavailable" }, 503);
      return respond({ roles: roleEmpty ? [] : active === "A" ? [{ id: 1, name: "Viewer" }] : [{ id: 5, name: "Company B viewer" }] });
    }
    if (path.endsWith("/platform/invitations")) {
      if (method === "GET") return respond({ data: [], current_page: 1, last_page: 1, total: 0 });
      writes.push({ path, company: active, body });
      return respond({ invitation: { id: "inv", email: body.email, status: "PENDING", role_ids: body.role_ids, expires_at: "2030-12-31" } }, 201);
    }
    return respond({ message: "Unexpected API request" }, 500);
  });
  return { writes, roleReads, setRoleFailure: (value: boolean) => { roleFailure = value; }, setRoleEmpty: (value: boolean) => { roleEmpty = value; }, setFormatFailure: (value: boolean) => { formatFailure = value; } };
}

test("shared sign-in maps safe errors and sends the selected remember value", async ({ page }) => {
  const attempts: Array<Record<string, unknown>> = [];
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204, body: "" }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: { message: "Unauthenticated" } });
    if (path.endsWith("/auth/login")) {
      attempts.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({ status: attempts.length === 1 ? 422 : 403, json: { message: attempts.length === 1 ? "Invalid input" : "No company membership", errors: attempts.length === 1 ? { email: ["Work email is not registered"] } : {} } });
    }
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  await page.goto("/login");
  await expect(page.getByText("Company and Employee Portal use the same account.", { exact: false })).toBeVisible();
  await page.getByLabel("Work email").fill("qa@example.invalid");
  await page.getByLabel("Password").fill("secret");
  await page.getByLabel("Keep me signed in").uncheck();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Work email is not registered");
  expect(attempts[0]).toMatchObject({ email: "qa@example.invalid", remember: false });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No company membership");
  await expect(page.getByRole("alert")).toContainText("Ask your company administrator");
});

test("website accepts authoritative HTTPS and number formats retain boolean-free values", async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto("/settings");
  await page.getByLabel("Website").fill("example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Website")).toHaveValue("https://example.com");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1.234,56");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({ company: "A", body: { phone: null, number_format: "1.234,56" } });
  await page.getByRole("button", { name: "Company", exact: true }).last().click();
  await page.getByLabel("Phone").fill("+92 300 1234567");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1,234.56");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2]).toMatchObject({ company: "A", body: { phone: "+92 300 1234567", number_format: "1,234.56" } });
});

test("number-format validation stays attached to number format, not phone", async ({ page }) => {
  const { setFormatFailure } = await setup(page);
  setFormatFailure(true);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1.234,56");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a supported number format" })).toBeVisible();
  await expect(page.getByLabel("Number format")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Company", exact: true }).last().click();
  await expect(page.getByLabel("Phone")).not.toHaveAttribute("aria-invalid", "true");
});

test("customer phone validates digits while contact person remains text", async ({ page }) => {
  const { writes } = await setup(page, [...permissions, "accounting.view", "accounting.create"]);
  await page.goto("/accounting/customers");
  await page.getByRole("button", { name: "New customer" }).click();
  await page.getByLabel("Customer name").fill("ACME");
  await page.getByLabel("Contact person").fill("Ayesha Khan");
  await page.getByLabel("Phone").fill("Contact Ayesha");
  await expect(page.getByRole("alert").filter({ hasText: "Use digits and common phone separators only" })).toBeVisible();
  await page.getByRole("button", { name: "Save customer" }).click();
  expect(writes).toHaveLength(0);
  await page.getByLabel("Phone").fill("+92 (300) 123-4567");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ company: "A", body: { phone: "+92 (300) 123-4567", contact_person: "Ayesha Khan" } });
});

test("authorized HRM Employees lookup finds a UUID without exposing other companies", async ({ page }) => {
  await setup(page, [...permissions, "payroll.view"]);
  await page.goto("/hrm/employees");
  await expect(page.getByText("UUID 11111111-1111-4111-8111-111111111111")).toBeVisible();
  await page.getByLabel("Search employees").fill("22222222-2222-4222-8222-222222222222");
  await expect(page.getByText("UUID 22222222-2222-4222-8222-222222222222")).toBeVisible();
  await expect(page.getByText("UUID 11111111-1111-4111-8111-111111111111")).toHaveCount(0);
  await page.getByLabel("Active company").selectOption("B");
  await page.getByLabel("Search employees").fill("");
  await expect(page.getByText("UUID 33333333-3333-4333-8333-333333333333")).toBeVisible();
  await expect(page.getByText("UUID 22222222-2222-4222-8222-222222222222")).toHaveCount(0);
});

test("invitation roles expose retry and only assignable company roles", async ({ page }) => {
  const { writes, roleReads, setRoleFailure } = await setup(page);
  setRoleFailure(true);
  await page.goto("/users");
  await page.getByRole("button", { name: "Invite user" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Roles unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send invitation" })).toBeDisabled();
  setRoleFailure(false);
  await page.getByRole("button", { name: "Retry roles" }).click();
  const role = page.getByRole("combobox", { name: "Role", exact: true });
  await expect(role.getByRole("option", { name: "Viewer" })).toHaveCount(1);
  for (const name of ["Payroll administrator", "Archived", "Other company"]) await expect(role.getByRole("option", { name })).toHaveCount(0);
  await page.getByLabel("Work email").fill("member@example.invalid");
  await role.selectOption("1");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ path: "/api/v1/platform/invitations", company: "A", body: { email: "member@example.invalid", role_ids: [1] } });
  expect(roleReads.some(read => read.path.endsWith("/platform/invitations/assignable-roles") && read.company === "A")).toBe(true);
  expect(roleReads.some(read => read.path.endsWith("/platform/roles"))).toBe(false);
});

test("role administration retains its complete company role listing", async ({ page }) => {
  const { roleReads } = await setup(page, [...permissions, "platform.roles.view"]);
  await page.goto("/roles");
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(page.getByText("Payroll administrator", { exact: true })).toBeVisible();
  expect(roleReads.some(read => read.path === "/api/v1/platform/roles" && read.company === "A")).toBe(true);
  expect(roleReads.some(read => read.path.endsWith("/assignable-roles"))).toBe(false);
});

test("an empty invitation role list cannot be submitted", async ({ page }) => {
  const { writes, setRoleEmpty } = await setup(page);
  setRoleEmpty(true);
  await page.goto("/users");
  await page.getByRole("button", { name: "Invite user" }).click();
  await expect(page.getByRole("status").filter({ hasText: "No role you may assign" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Role", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send invitation" })).toBeDisabled();
  expect(writes).toHaveLength(0);
});

test("invitation role selection clears across companies and submits only the new company's role", async ({ page }) => {
  const { writes, roleReads } = await setup(page);
  await page.goto("/users");
  await page.getByRole("button", { name: "Invite user" }).click();
  await page.getByLabel("Work email").fill("old-company@example.invalid");
  await page.getByRole("combobox", { name: "Role", exact: true }).selectOption("1");
  await page.getByLabel("Active company").selectOption("B");
  await expect(page.getByRole("dialog", { name: "Invite a company user" })).toHaveCount(0);
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "Invite user" }).click();
  const role = page.getByRole("combobox", { name: "Role", exact: true });
  await expect(role).toHaveValue("");
  await expect(role.getByRole("option", { name: "Company B viewer" })).toHaveCount(1);
  await expect(role.getByRole("option", { name: "Viewer", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Work email")).toHaveValue("");
  await page.getByLabel("Work email").fill("new-company@example.invalid");
  await role.selectOption("5");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ path: "/api/v1/platform/invitations", company: "B", body: { email: "new-company@example.invalid", role_ids: [5] } });
  expect(roleReads.some(read => read.path.endsWith("/platform/invitations/assignable-roles") && read.company === "B")).toBe(true);
});

test("late invitation roles from the old company cannot replace the selected company's choices", async ({ page }) => {
  await setup(page);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let oldRequests = 0;
  await page.route(url => url.pathname === "/api/v1/platform/invitations/assignable-roles", async route => {
    if (route.request().headers()["x-company-id"] !== "A") return route.fallback();
    oldRequests++;
    await gate;
    await route.fulfill({ json: { roles: [{ id: 1, name: "Old company role" }] } });
  });
  await page.goto("/users");
  await expect.poll(() => oldRequests).toBe(1);
  await page.getByLabel("Active company").selectOption("B");
  release();
  await page.getByRole("button", { name: "Invite user" }).click();
  const role = page.getByRole("combobox", { name: "Role", exact: true });
  await expect(role.getByRole("option", { name: "Company B viewer" })).toHaveCount(1);
  await expect(role.getByRole("option", { name: "Old company role" })).toHaveCount(0);
  await expect(role).toHaveValue("");
});
