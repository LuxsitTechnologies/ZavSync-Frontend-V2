import { expect, test, type Page } from "@playwright/test";

const permissions = ["platform.settings.view", "platform.settings.manage", "platform.users.view", "platform.users.manage", "platform.invitations.manage", "receivables.customers"];
const company = (id: string, grants = permissions) => ({ id, name: `Company ${id}`, roles: [], permissions: grants, modules: ["payroll", "receivables"], timezone: "Asia/Karachi", effective_navigation: { visible_keys: [], items: [], catalog: [] } });
const settings = { company_id: "A", legal_name: "Company A", trading_name: null, registration_number: null, tax_identifier: null, cnic: null, email: null, phone: null, website: null, address: null, country_code: "PK", timezone: "Asia/Karachi", base_currency: "PKR", date_format: "DD/MM/YYYY", time_format: "24h", number_format: "1,234.56", fiscal_year_start_month: 7, default_payment_terms_days: 30, invoice_prefix: "INV", purchase_prefix: "PO", outreach_physical_address: null, outreach_footer: null, outreach_open_tracking_enabled: true, outreach_click_tracking_enabled: true, outreach_unsubscribe_required: true, ai_scheduled_intelligence_enabled: false };

async function setup(page: Page, grants = permissions) {
  const writes: Array<{ path: string; company: string; body: Record<string, unknown> }> = [];
  const reads: Array<{ path: string; company: string }> = [];
  const roleReads: Array<{ path: string; company: string }> = [];
  let roleFailure = false;
  let roleEmpty = false;
  let formatFailure = false;
  const numberFormats: Record<string, string> = {};
  const profile = { id: "A", name: "Company A", company_size: null, province_code: null, currency: "PKR", timezone: "Asia/Karachi", approval_status: "APPROVED", is_active: true, profile_version: 1, email: "company-a@example.invalid", phone: null as string | null, address: null, tax_identifier: "1234567", fbr_credential_configured: false, created_at: "2026-01-01T00:00:00Z" };
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
    if (method === "GET" && ["/api/v1/platform/users", "/api/v1/platform/invitations"].includes(path)) reads.push({ path, company: active });
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return respond({ user: { id: 1, name: "QA User", email: "qa@example.invalid", is_platform_admin: false }, companies: [company("A", grants), company("B", grants)] });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company(String(body.company_id), grants) });
    if (path.endsWith("/platform/notifications")) return respond({ unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    if (path.endsWith("/platform/notification-preferences")) return respond([]);
    if (path.endsWith("/auth/onboarding/plans")) return respond({ plans: [], trial_days_after_approval: 14, checkout_available: false, catalogue_approved: true, pricing_certified: true });
    if (path.endsWith("/platform/company-profile")) {
      if (method === "GET") return respond(profile);
      writes.push({ path, company: active, body });
      profile.phone = body.phone as string | null;
      profile.profile_version += 1;
      return respond(profile);
    }
    if (path.endsWith("/platform/settings")) {
      if (method === "GET") return respond({ ...settings, company_id: active, phone: active === "A" ? profile.phone : null, number_format: numberFormats[active] ?? settings.number_format });
      writes.push({ path, company: active, body });
      if (formatFailure) return respond({ message: "Validation failed", errors: { number_format: ["Choose a supported number format"] } }, 422);
      if (typeof body.number_format === "string") numberFormats[active] = body.number_format;
      return respond({ ...settings, ...body, phone: active === "A" ? profile.phone : null, number_format: numberFormats[active] ?? settings.number_format, website: body.website === "example.com" ? "https://example.com" : body.website });
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
  return { writes, reads, roleReads, setRoleFailure: (value: boolean) => { roleFailure = value; }, setRoleEmpty: (value: boolean) => { roleEmpty = value; }, setFormatFailure: (value: boolean) => { formatFailure = value; } };
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
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByLabel("Website")).toHaveValue("https://example.com");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1.234,56");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({ path: "/api/v1/platform/settings", company: "A", body: { number_format: "1.234,56" } });
  expect(typeof writes[1]!.body.number_format).toBe("string");
  expect(writes[1]!.body).not.toHaveProperty("phone");
  await page.goto("/companies");
  const profilePanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Company Profile", exact: true }) });
  await expect(profilePanel.getByLabel("Phone")).toHaveValue("");
  await profilePanel.getByLabel("Phone").fill("+92 300 1234567");
  await profilePanel.getByRole("button", { name: "Save Profile" }).click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2]).toMatchObject({ path: "/api/v1/platform/company-profile", company: "A", body: { phone: "+92 300 1234567", profile_version: 1 } });
  await expect(profilePanel.getByLabel("Phone")).toHaveValue("+92 300 1234567");
  await page.goto("/settings");
  await expect(page.getByLabel("Phone")).toHaveValue("+92 300 1234567");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1,234.56");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => writes.length).toBe(4);
  expect(writes[3]).toMatchObject({ path: "/api/v1/platform/settings", company: "A", body: { number_format: "1,234.56" } });
  expect(writes[3]!.body).not.toHaveProperty("phone");
});

test("number-format validation stays attached to number format, not phone", async ({ page }) => {
  const { setFormatFailure } = await setup(page);
  setFormatFailure(true);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Regional" }).click();
  await page.getByLabel("Number format").selectOption("1.234,56");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
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

for (const width of [390, 768, 1440]) test(`customer form stays centered, scrollable and keyboard-safe at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 700 });
  await setup(page, [...permissions, "accounting.view", "accounting.create"]);
  await page.goto("/accounting/customers");
  const trigger = page.getByRole("button", { name: "New customer" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "New customer" });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.locator("aside").boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
  expect(bounds!.height).toBeLessThanOrEqual(700);
  await dialog.getByLabel("Notes").scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Save customer" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
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

test("company switch leaves a route when the new membership lacks its permission", async ({ page }) => {
  const { reads } = await setup(page);
  await page.route(url => url.pathname === "/api/v1/auth/me", route => route.fulfill({ json: {
    user: { id: 1, name: "QA User", email: "qa@example.invalid", is_platform_admin: false },
    companies: [company("A"), company("B", ["platform.settings.view"])],
  } }));
  await page.route(url => url.pathname === "/api/v1/auth/switch-company", route => route.fulfill({ json: {
    company: company("B", ["platform.settings.view"]),
  } }));
  await page.route(url => url.pathname === "/api/v1/platform/users", route => route.request().headers()["x-company-id"] === "A"
    ? route.fulfill({ json: { data: [{ id: 99, company_id: "A", user: { id: 99, name: "Private Company A member", email: "private-a@example.invalid" }, role: null, roles: [], is_active: true, suspended_at: null }], current_page: 1, last_page: 1, total: 1 } })
    : route.fallback());
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users & Invitations" })).toBeVisible();
  await expect(page.getByText("Private Company A member")).toBeVisible();
  await page.getByLabel("Active company").selectOption("B");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Active company")).toHaveValue("B");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Users & Invitations" })).toHaveCount(0);
  await expect(page.getByText("Private Company A member")).toHaveCount(0);
  expect(reads.filter(read => read.company === "B")).toHaveLength(0);
  await page.goto("/users");
  await expect(page).toHaveURL(/\/$/);
  expect(reads.filter(read => read.company === "B")).toHaveLength(0);
});

async function beneficiaryFixture(page: Page, grants = ["payroll.view", "payroll.configure"]) {
  await setup(page);
  const accounts = new Map<string, { id: string; employee_id: string; account_holder_name: string; bank_name: string; branch_name: string; masked_account_number: string; swift_configured: boolean; version: number }>();
  const writes: Array<{ method: string; company: string; body: Record<string, unknown> }> = [];
  const reads: string[] = [];
  const membership = (id: string) => company(id, grants);
  await page.route(url => url.pathname === "/api/v1/auth/me", route => route.fulfill({ json: {
    user: { id: 1, name: "Payroll administrator", email: "admin@example.invalid", is_platform_admin: false },
    companies: [membership("A"), membership("B")],
  } }));
  await page.route(url => url.pathname === "/api/v1/auth/switch-company", route => route.fulfill({ json: {
    company: membership(String(route.request().postDataJSON().company_id)),
  } }));
  await page.route(url => /\/api\/v1\/payroll\/employees\/[^/]+\/beneficiary-account(?:\/[^/]+)?$/.test(url.pathname), route => {
    const request = route.request(), method = request.method(), companyId = request.headers()["x-company-id"] ?? "";
    const employeeId = new URL(request.url()).pathname.split("/")[5] ?? "";
    const key = `${companyId}:${employeeId}`;
    const current = accounts.get(key);
    if (!grants.includes("payroll.configure")) return route.fulfill({ status: 403, json: { message: "Payroll configuration is unavailable" } });
    if (method === "GET") { reads.push(key); return route.fulfill(current ? { json: current } : { status: 404, json: { message: "No beneficiary account" } }); }
    const body = request.postDataJSON() as Record<string, unknown>;
    writes.push({ method, company: companyId, body });
    if ((method === "PUT" || method === "DELETE") && (!current || body.version !== current.version)) return route.fulfill({ status: 409, json: { message: "The beneficiary account changed; refresh before editing.", error_code: "BENEFICIARY_ACCOUNT_VERSION_STALE" } });
    if (method === "DELETE") { accounts.delete(key); return route.fulfill({ json: { status: "REMOVED" } }); }
    if (method === "POST" && current) return route.fulfill({ status: 409, json: { message: "Account exists", error_code: "BENEFICIARY_ACCOUNT_EXISTS" } });
    const last = String(body.account_number).replace(/[^A-Za-z0-9]/g, "").slice(-4);
    const saved = { id: current?.id ?? "beneficiary-1", employee_id: employeeId, account_holder_name: String(body.account_holder_name), bank_name: String(body.bank_name), branch_name: String(body.branch_name), masked_account_number: `••••${last}`, swift_configured: !!body.swift_code, version: (current?.version ?? 0) + 1 };
    accounts.set(key, saved);
    return route.fulfill({ status: method === "POST" ? 201 : 200, json: saved });
  });
  return { accounts, writes, reads };
}

test("payroll administrator creates, replaces and removes masked beneficiary details", async ({ page }) => {
  const { writes, reads } = await beneficiaryFixture(page);
  await page.goto("/hrm/employees");
  await page.getByRole("button", { name: "Beneficiary banking" }).first().click();
  const panel = page.getByRole("dialog", { name: "Beneficiary banking" });
  await expect(panel.getByText("No beneficiary account is saved")).toBeVisible();
  const readsBeforeCreate = reads.length;
  await panel.getByLabel("Account holder").fill("Payroll Employee");
  await panel.getByLabel("Account number").fill("PK00-TEST-1234");
  await panel.getByLabel("Bank name").fill("Example Bank");
  await panel.getByLabel("Branch").fill("Main Branch");
  await panel.getByLabel("SWIFT (optional)").fill("EXAMPKKA");
  await panel.getByRole("button", { name: "Add account" }).click();
  await expect(panel.getByText("Account ••••1234")).toBeVisible();
  expect(reads).toHaveLength(readsBeforeCreate);
  await expect(panel.getByText("SWIFT configured")).toBeVisible();
  await expect(page.getByText("PK00-TEST-1234")).toHaveCount(0);
  await panel.getByRole("button", { name: "Edit bank details" }).click();
  await expect(panel.getByLabel("Account number")).toHaveValue("");
  await panel.getByLabel("Account number").fill("PK99-NEW-5678");
  await panel.getByRole("button", { name: "Save replacement" }).click();
  await expect(panel.getByText("Account ••••5678")).toBeVisible();
  await panel.getByRole("button", { name: "Remove bank details" }).click();
  await expect(page.getByRole("alertdialog", { name: "Remove beneficiary account" })).toBeVisible();
  await page.getByRole("button", { name: "Remove account" }).click();
  await expect(panel.getByText("No beneficiary account is saved")).toBeVisible();
  expect(writes.map(write => [write.method, write.company])).toEqual([["POST", "A"], ["PUT", "A"], ["DELETE", "A"]]);
  expect(writes[1]?.body).toMatchObject({ account_number: "PK99-NEW-5678", version: 1 });
  expect(writes[2]?.body).toEqual({ version: 2 });
});

test("beneficiary banking denies ordinary users and clears on company switch", async ({ page }) => {
  await beneficiaryFixture(page, ["payroll.view"]);
  await page.goto("/hrm/employees");
  await expect(page.getByRole("button", { name: "Beneficiary banking" })).toHaveCount(0);
  await page.getByLabel("Active company").selectOption("B");
  await expect(page.getByText("Company B Employee")).toBeVisible();
  await expect(page.getByText("Employee One")).toHaveCount(0);
});

test("beneficiary form and masked account stay within the selected company", async ({ page }) => {
  const { accounts } = await beneficiaryFixture(page);
  const employeeId = "11111111-1111-4111-8111-111111111111";
  accounts.set(`A:${employeeId}`, { id: "beneficiary-A", employee_id: employeeId, account_holder_name: "Company A holder", bank_name: "Bank A", branch_name: "A branch", masked_account_number: "••••1234", swift_configured: false, version: 1 });
  await page.goto("/hrm/employees");
  await page.getByRole("button", { name: "Beneficiary banking" }).first().click();
  const panel = page.getByRole("dialog", { name: "Beneficiary banking" });
  await expect(panel.getByText("Account ••••1234")).toBeVisible();
  await panel.getByRole("button", { name: "Edit bank details" }).click();
  await panel.getByLabel("Account number").fill("UNSAVED-TEST-9999");
  await panel.getByRole("button", { name: "Close panel" }).last().click();
  await page.getByLabel("Active company").selectOption("B");
  await expect(page.getByText("Company B Employee")).toBeVisible();
  await page.getByRole("button", { name: "Beneficiary banking" }).click();
  await expect(page.getByRole("dialog", { name: "Beneficiary banking" }).getByText("No beneficiary account is saved")).toBeVisible();
  await expect(page.getByText("Company A holder")).toHaveCount(0);
  await expect(page.getByText("UNSAVED-TEST-9999")).toHaveCount(0);
});

test("beneficiary version conflict reloads authoritative masked state without replay", async ({ page }) => {
  const { accounts, writes } = await beneficiaryFixture(page);
  const employeeId = "11111111-1111-4111-8111-111111111111";
  accounts.set(`A:${employeeId}`, { id: "beneficiary-1", employee_id: employeeId, account_holder_name: "Original", bank_name: "Example Bank", branch_name: "Main", masked_account_number: "••••1234", swift_configured: false, version: 1 });
  await page.goto("/hrm/employees");
  await page.getByRole("button", { name: "Beneficiary banking" }).first().click();
  const panel = page.getByRole("dialog", { name: "Beneficiary banking" });
  await expect(panel.getByText("Account ••••1234")).toBeVisible();
  await panel.getByRole("button", { name: "Edit bank details" }).click();
  await panel.getByLabel("Account number").fill("PK99-NEW-5678");
  accounts.set(`A:${employeeId}`, { id: "beneficiary-1", employee_id: employeeId, account_holder_name: "Changed elsewhere", bank_name: "Other Bank", branch_name: "Other", masked_account_number: "••••9999", swift_configured: true, version: 2 });
  await panel.getByRole("button", { name: "Save replacement" }).click();
  await expect(panel.getByText("Account ••••9999")).toBeVisible();
  await expect(panel.getByText("Account changed.", { exact: false })).toBeVisible();
  expect(writes.filter(write => write.method === "PUT")).toHaveLength(1);
  await expect(page.getByText("PK99-NEW-5678")).toHaveCount(0);
});
