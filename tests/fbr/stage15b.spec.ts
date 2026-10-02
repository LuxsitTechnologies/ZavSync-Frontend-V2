import { test, expect, type Page, type Route } from "@playwright/test";

// Match the backend's JsonResource::withoutWrapping(): only paginated lists have data/meta.
async function fulfill(route: Route, options: NonNullable<Parameters<Route["fulfill"]>[0]>) {
  const json = options.json;
  return route.fulfill({ ...options, ...(json && typeof json === "object" && "data" in json && !("meta" in json) ? { json: json.data } : {}) });
}
const observed = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(observed.get(page) ?? [], "FBR screens must never call Native Accounting APIs").toEqual([]);
});
const permissions = ["pakistan_fbr.view", "pakistan_fbr.manage", "pakistan_fbr.submit", "fbr.configuration.view", "fbr.configuration.manage", "migration.view", "migration.manage"];
const company = (id: string, perms = permissions, modules = ["invoicing"]) => ({ id, name: `Company ${id}`, currency: "PKR", timezone: "Asia/Karachi", roles: [], permissions: perms, modules });
const line = { id: "line-1", position: 1, description: "Test item", hs_code: "fixture-hs", unit: "fixture-uom", quantity_milli: 1000, unit_price: 100000, discount: 0, subtotal: 100000, taxable_amount: 100000, tax_rate_bps: 1800, fbr_rate_id: "fixture-rate", sales_tax: 15001, extra_tax: 1, further_tax: 2, st_withheld: 333, sro_schedule_id: null, sro_item_id: null, total: 115004, sales_type: "fixture-sale" };
const invoice = (extra: Record<string, unknown> = {}) => ({ id: "invoice-1", company_id: "A", invoice_number: "PKF-00000001", domain: "pakistan_fbr", invoice_date: "2026-10-02", due_date: null, invoice_type: "fixture-document", sale_type: "fixture-sale", origin_province: "fixture-province", destination_province: "fixture-province", buyer_snapshot: { name: "Buyer A", registration_number: "1234567", type: "Registered", province: "fixture-province", address: "Address" }, notes: "", document_state: "DRAFT", is_historical: false, editable: true, submission_blocked: false, fbr_status: "not_submitted", fbr_reference_number: null, scenario_id: "SN001", currency: "PKR", subtotal: 100000, discount: 0, taxable_amount: 100000, sales_tax: 15001, extra_tax: 1, further_tax: 2, withholding_tax: 333, total: 115004, historical_amount_paid: null, capabilities: { retry_recovery: false, provider_submission_enabled: true, regulatory_print_status: "STAGING_CERTIFICATION_REQUIRED" }, lines: [line], created_at: "2026-10-02T12:00:00Z", updated_at: "2026-10-02T12:00:00Z", ...extra });
const referenceFixtures = [
  ["PROVINCE", "fixture-province"], ["DOCUMENT_TYPE", "fixture-document"],
  ["SALE_TYPE", "fixture-sale"], ["HS_CODE", "fixture-hs"], ["UOM", "fixture-uom"],
  ["RATE", "fixture-rate"], ["SRO_SCHEDULE", "fixture-schedule"], ["SRO_ITEM", "fixture-item"],
].map(([category, code]) => ({ id: code, category, code, label: `Synthetic ${category}`, parent_code: null, metadata: {}, is_active: true, source: "LOCAL_FIXTURE", source_version: "v1", valid_from: null, valid_until: null }));
type Handler = (route: Route, path: string) => Promise<boolean>;
async function setup(page: Page, options: { permissions?: string[]; modules?: string[]; handler?: Handler; record?: ReturnType<typeof invoice> } = {}) {
  const requests: { path: string; method: string; company: string | undefined; key: string | undefined; body: any }[] = [];
  const unexpected: string[] = [];
  const forbidden: string[] = []; observed.set(page, forbidden);
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:8082") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const request = route.request(), path = url.pathname.replace("/api/v1", "");
    if (path.startsWith("/accounting/")) forbidden.push(path);
    requests.push({ path, method: request.method(), company: request.headers()["x-company-id"], key: request.headers()["idempotency-key"], body: request.postDataJSON() });
    const respond = (body: unknown, status = 200) => fulfill(route, { status, json: body });
    if (path === "/auth/me") return respond({ user: { id: 1, name: "Test User", email: "test@example.invalid", is_platform_admin: false }, companies: [company("A", options.permissions, options.modules), company("B", options.permissions, options.modules)] });
    if (path === "/auth/switch-company") return respond({ company: company(request.postDataJSON().company_id, options.permissions, options.modules) });
    if (path.includes("notifications")) return respond({ notifications: { data: [] }, unread_count: 0 });
    if (options.handler && await options.handler(route, path)) return;
    const record = options.record ?? invoice();
    if (path === "/pakistan-fbr/invoices") return respond({ data: [record], meta: { current_page: Number(url.searchParams.get("page") || 1), last_page: 2, total: 26 } });
    if (path === "/pakistan-fbr/invoices/invoice-1") return respond({ data: record });
    if (path.endsWith("/attempts")) return respond([]);
    if (path.endsWith("/reference-data")) return respond(referenceFixtures);
    if (path === "/pakistan-fbr/configuration") return respond({ message: "Not found" }, 404);
    if (path === "/pakistan-fbr/migrations") return respond({ data: [] });
    unexpected.push(path);
    return respond({ message: "Unexpected test request" }, 500);
  });
  return { requests, unexpected };
}
async function enterReference(page: Page, label: string, code: string) {
  // These are editable native input+datalist comboboxes, not select elements.
  // Exact accessible names exclude the nested datalist option text.
  const control = page.getByRole("combobox", { name: label, exact: true });
  await expect(control).toHaveAccessibleName(label);
  expect(await control.evaluate(element => element.tagName)).toBe("INPUT");
  const listId = await control.getAttribute("list");
  expect(listId).toBeTruthy();
  await expect(page.locator(`datalist[id="${listId}"] option[value="${code}"]`)).toHaveCount(1);
  await control.focus();
  await expect(control).toBeFocused();
  await control.fill(code);
  await control.press("Tab");
  await expect(control).toHaveValue(code);
}
async function fillDraft(page: Page) {
  await page.getByLabel("Buyer name", { exact: true }).fill("Buyer A");
  await page.getByLabel("NTN / CNIC", { exact: true }).fill("1234567");
  await enterReference(page, "Buyer province", "fixture-province");
  await page.getByLabel("Invoice date", { exact: true }).fill("2026-10-02");
  await enterReference(page, "Invoice / document type", "fixture-document");
  await enterReference(page, "Sales type", "fixture-sale");
  await enterReference(page, "Origin province", "fixture-province");
  await enterReference(page, "Destination province", "fixture-province");
  await page.getByLabel("Description", { exact: true }).fill("Test item");
  await enterReference(page, "HS code", "fixture-hs");
  await enterReference(page, "UOM", "fixture-uom");
  await page.getByLabel("Unit price (PKR)", { exact: true }).fill("1000.00");
  await page.getByLabel("Sales tax rate (%)", { exact: true }).fill("18");
  await enterReference(page, "FBR rate metadata", "fixture-rate");
  await enterReference(page, "SRO schedule", "fixture-schedule");
  await enterReference(page, "SRO item", "fixture-item");
  await page.getByLabel("Exact sales tax (PKR)", { exact: true }).fill("150.01");
  await page.getByLabel("Extra tax (PKR)", { exact: true }).fill("0.01");
  await page.getByLabel("Further tax (PKR)", { exact: true }).fill("0.02");
  await page.getByLabel("Withholding (PKR)", { exact: true }).fill("3.33");
}

test("register uses dedicated pagination and historical filtering", async ({ page }) => {
  const state = await setup(page); await page.goto("/fbr-invoicing");
  await expect(page.getByRole("link", { name: "PKF-00000001" })).toBeVisible();
  const records = page.getByRole("combobox", { name: "Records", exact: true });
  const perPage = page.getByRole("combobox", { name: "Per page", exact: true });
  await expect(records).toHaveAccessibleName("Records");
  await expect(perPage).toHaveAccessibleName("Per page");
  expect(await perPage.evaluate(element => element.tagName)).toBe("SELECT");
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).searchParams.get("per_page") === "10"),
    perPage.selectOption("10"),
  ]);
  await expect(perPage).toHaveValue("10");
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).searchParams.get("historical") === "1"),
    records.selectOption("1"),
  ]);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  expect(state.requests.filter(r => r.path.startsWith("/pakistan-fbr")).every(r => r.company === "A")).toBe(true);
  expect(state.unexpected).toEqual([]);
});

test("create preserves exact amounts, excludes scenario and reviews server totals", async ({ page }) => {
  const state = await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/invoices" && route.request().method() === "POST") { await fulfill(route, { json: { data: invoice() }, status: 201 }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/new"); await fillDraft(page);
  await page.getByRole("button", { name: "Save draft and review" }).click();
  await expect(page.getByTestId("total-total")).toHaveText("PKR 1150.04");
  const saved = state.requests.find(r => r.method === "POST")!;
  expect(saved.body.lines[0]).toMatchObject({ sales_tax: 15001, extra_tax: 1, further_tax: 2, st_withheld: 333 });
  expect(saved.key).toBeTruthy(); expect(saved.body).not.toHaveProperty("scenario_id");
  await expect(page.getByText("SN001", { exact: true })).toBeVisible();
  expect(state.unexpected).toEqual([]);
});

test("uncertain create locks payload and reuses original key", async ({ page }) => {
  let count = 0;
  const state = await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/invoices" && route.request().method() === "POST") { count++; await fulfill(route, count === 1 ? { status: 503, json: { message: "Unavailable" } } : { json: { data: invoice() } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/new"); await fillDraft(page); await page.getByRole("button", { name: "Save draft and review" }).click();
  await expect(page.getByLabel("Buyer name", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry same save" }).click(); await expect(page).toHaveURL(/invoice-1$/);
  const posts = state.requests.filter(r => r.method === "POST"); expect(posts).toHaveLength(2); expect(posts[0]!.key).toBe(posts[1]!.key); expect(posts[0]!.body).toEqual(posts[1]!.body);
});

test("edit uses PATCH and preserves explicit amounts", async ({ page }) => {
  const state = await setup(page, { handler: async (route, path) => {
    if (path.endsWith("/invoice-1") && route.request().method() === "PATCH") { await fulfill(route, { json: { data: invoice() } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/invoice-1/edit"); await expect(page.getByLabel("Extra tax (PKR)", { exact: true })).toHaveValue("0.01");
  await page.getByRole("button", { name: "Save draft and review" }).click(); await expect(page).toHaveURL(/invoice-1$/);
  expect(state.requests.find(r => r.method === "PATCH")?.body.lines[0].st_withheld).toBe(333);
});

test("submit requires confirmation and guards double submit; acceptance only comes from response", async ({ page }) => {
  let submitted = false;
  const state = await setup(page, { handler: async (route, path) => {
    if (path.endsWith("/submit")) { await new Promise(resolve => setTimeout(resolve, 200)); submitted = true; await fulfill(route, { json: { data: invoice() } }); return true; }
    if (path.endsWith("/invoice-1") && submitted) { await fulfill(route, { json: { data: invoice({ fbr_status: "submitted", editable: false, document_state: "ISSUED" }) } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/invoice-1"); await page.getByRole("button", { name: "Submit to FBR" }).click();
  expect(state.requests.filter(r => r.path.endsWith("/submit"))).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm submission" }).evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect(page.getByTestId("fbr-status")).toHaveText("submitted");
  await expect(page.getByRole("button", { name: "Submit to FBR" })).toHaveCount(0);
  expect(state.requests.filter(r => r.path.endsWith("/submit"))).toHaveLength(1);
  expect(state.requests.find(r => r.path.endsWith("/submit"))?.key).toBeTruthy(); expect(state.unexpected).toEqual([]);
});

test("retry recovers failed submission without a client key, preserving pending lease state", async ({ page }) => {
  const record = invoice({ fbr_status: "failed", editable: false, capabilities: { retry_recovery: true, provider_submission_enabled: true } });
  const state = await setup(page, { record, handler: async (route, path) => {
    if (path.endsWith("/retry")) { record.fbr_status = "pending"; await fulfill(route, { json: { data: record } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/invoice-1"); await page.getByRole("button", { name: "Retry submission" }).click(); await page.getByRole("button", { name: "Confirm retry" }).click();
  await expect(page.getByTestId("fbr-status")).toHaveText("pending");
  const retry = state.requests.find(r => r.path.endsWith("/retry")); expect(retry?.method).toBe("POST"); expect(retry?.key).toBeUndefined(); expect(state.unexpected).toEqual([]);
});

test("historical values/evidence stay immutable even when header and line totals disagree", async ({ page }) => {
  const state = await setup(page, { record: invoice({ is_historical: true, editable: false, total: 99999, historical_amount_paid: 12, fbr_status: "accepted", historical: { legacy_status: "sent", accounting_state: "PRESERVED", reconciliation_state: "REVIEW" }, migration_metadata: { original_financial_values: { total: "999.99" } } }), handler: async (route, path) => {
    if (path.endsWith("/evidence")) { await fulfill(route, { json: { data: [{ id: "e1", original_status: "success", normalized_status: "ambiguous", fbr_reference_number: null, requires_review: true, retry_count: 1, sanitized_response: { message: "<script>bad()</script>" } }] } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/invoice-1"); await expect(page.getByTestId("total-total")).toHaveText("PKR 999.99");
  await expect(page.getByText("Requires review.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit draft" })).toHaveCount(0); await expect(page.getByRole("button", { name: /Submit to FBR|Retry submission/ })).toHaveCount(0);
  expect(state.requests.some(r => r.path.endsWith("/attempts"))).toBe(false);
  await page.goto("/fbr-invoicing/invoice-1/edit"); await expect(page.getByText("This invoice is read-only.", { exact: false })).toBeVisible();
  expect(state.requests.every(r => r.method === "GET")).toBe(true);
});

test("read-only permissions hide mutations and historical evidence requests", async ({ page }) => {
  const state = await setup(page, { permissions: ["pakistan_fbr.view"], record: invoice({ is_historical: true }) });
  await page.goto("/fbr-invoicing/invoice-1"); await expect(page.getByText("Historical evidence requires migration viewing permission.")).toBeVisible();
  expect(state.requests.some(r => r.path.endsWith("/evidence"))).toBe(false);
  await page.goto("/fbr-invoicing/new"); await expect(page.getByRole("alert")).toContainText("requires the invoicing entitlement and permission");
  await expect(page.getByRole("button", { name: "Save draft and review" })).toHaveCount(0);
});

for (const reason of ["permission", "entitlement"]) test(`direct routes deny missing ${reason} without FBR requests`, async ({ page }) => {
  const state = await setup(page, reason === "permission" ? { permissions: [] } : { modules: [] });
  await page.goto("/fbr-invoicing"); await expect(page.getByRole("alert")).toContainText("requires the invoicing entitlement and permission");
  expect(state.requests.some(r => r.path.startsWith("/pakistan-fbr"))).toBe(false);
});

test("company switching discards unsaved data and late mutation navigation", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/invoices" && route.request().method() === "POST") { await gate; await fulfill(route, { json: { data: invoice() } }).catch(() => {}); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/new"); await fillDraft(page); await page.getByRole("button", { name: "Save draft and review" }).click();
  await expect.poll(() => state.requests.some(r => r.method === "POST")).toBe(true);
  await page.getByLabel("Active company").selectOption("B"); await expect(page.getByLabel("Buyer name", { exact: true })).toHaveValue("");
  release(); await expect(page).toHaveURL(/\/new$/);
  expect(state.requests.find(r => r.path === "/pakistan-fbr/invoices" && r.method === "POST")?.company).toBe("A");
  await expect.poll(() => state.requests.some(r => r.path.endsWith("/reference-data") && r.company === "B")).toBe(true);
});

test("unavailable provider, print and QR are honest", async ({ page }) => {
  await setup(page, { record: invoice({ capabilities: { provider_submission_enabled: false, retry_recovery: false } }) });
  await page.goto("/fbr-invoicing/invoice-1"); await expect(page.getByText("Provider submission is unavailable", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit to FBR" })).toHaveCount(0);
  await expect(page.getByText("Regulatory printing, QR codes", { exact: false })).toBeVisible();
});

test("validation errors preserve editable form and display safe text", async ({ page }) => {
  await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/invoices" && route.request().method() === "POST") { await fulfill(route, { status: 422, json: { message: "Check invoice", errors: { "lines.0.extra_tax": ["Invalid exact tax"] } } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/new"); await fillDraft(page); await page.getByRole("button", { name: "Save draft and review" }).click();
  await expect(page.getByRole("alert").first()).toContainText("Check invoice"); await expect(page.getByLabel("Buyer name", { exact: true })).toBeEnabled();
});

test("configuration does not expose saved credential and omits blank replacement", async ({ page }) => {
  const state = await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/configuration") { await fulfill(route, { json: { data: { seller_business_name: "Seller", seller_tax_identifier: "1234567", seller_province: "fixture-province", seller_address: "Address", environment: "SANDBOX", credential_configured: true, connection_state: "NOT_VERIFIED" } } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/configuration"); await expect(page.getByLabel("Replacement credential", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Save configuration", exact: true }).click(); await page.getByRole("button", { name: "Confirm configuration" }).click();
  await expect(page.getByText("Configuration saved.", { exact: false })).toBeVisible();
  expect(state.requests.find(r => r.method === "PUT")?.body).not.toHaveProperty("credential"); expect(state.unexpected).toEqual([]);
});

test("migration reconciliation and confirmed exception resolution use dedicated endpoints", async ({ page }) => {
  const exception = { id: "ex-1", exception_code: "TOTAL_MISMATCH", severity: "WARNING", source_entity_type: "invoice", source_id: "v1", resolution_state: "OPEN", safe_metadata: { preserved: true } };
  const state = await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/migrations/run-1") { await fulfill(route, { json: { data: { id: "run-1", source_system: "V1", status: "COMPLETED", mode: "IMPORT", reconciliation: { discrepancies: 1 } } } }); return true; }
    if (path.endsWith("/exceptions")) { await fulfill(route, { json: { data: [exception] } }); return true; }
    if (path.endsWith("/migration-exceptions/ex-1")) { exception.resolution_state = "RESOLVED"; await fulfill(route, { json: { data: exception } }); return true; } return false;
  }});
  await page.goto("/fbr-invoicing/migrations/run-1"); await page.getByRole("button", { name: "Review exception" }).click(); await page.getByLabel("Resolution note").fill("Reviewed source evidence");
  await page.getByRole("button", { name: "Save resolution" }).click(); await page.getByRole("button", { name: "Confirm resolution" }).click();
  await expect(page.getByText("invoice / v1 · RESOLVED")).toBeVisible();
  expect(state.requests.find(r => r.method === "PATCH")?.body).toEqual({ resolution_state: "RESOLVED", resolution_note: "Reviewed source evidence" }); expect(state.unexpected).toEqual([]);
});

for (const width of [390, 768, 1440]) test(`responsive labeled controls and dialog keyboard access at ${width}px`, async ({ page }) => {
  await setup(page); await page.setViewportSize({ width, height: 900 }); await page.goto("/fbr-invoicing/new");
  await expect(page.getByLabel("Buyer name", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/fbr-invoicing/invoice-1"); await page.getByRole("button", { name: "Submit to FBR" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit to FBR" })).toBeFocused();
});

test("register shows loading, sanitized error, retry and empty states", async ({ page }) => {
  let failing = true;
  await setup(page, { handler: async (route, path) => {
    if (path === "/pakistan-fbr/invoices") {
      await new Promise(resolve => setTimeout(resolve, 200));
      await fulfill(route, failing ? { status: 503, json: { message: "Invoice service unavailable" } } : { json: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } });
      return true;
    }
    return false;
  }});
  await page.goto("/fbr-invoicing");
  await expect(page.getByText("Invoice service unavailable")).toBeVisible();
  failing = false; await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Loading" })).toBeVisible();
  await expect(page.getByText("No FBR invoices", { exact: true })).toBeVisible();
});

test("configuration and migration viewing permissions do not grant mutation authority", async ({ page }) => {
  const state = await setup(page, { permissions: ["fbr.configuration.view", "migration.view"], handler: async (route, path) => {
    if (path.endsWith("/migrations/run-1")) { await fulfill(route, { json: { id: "run-1", source_system: "V1", status: "COMPLETED" } }); return true; }
    if (path.endsWith("/exceptions")) { await fulfill(route, { json: [{ id: "ex", exception_code: "MISMATCH", resolution_state: "OPEN" }] }); return true; }
    return false;
  }});
  await page.goto("/fbr-invoicing/configuration"); await expect(page.getByLabel("Replacement credential", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save configuration" })).toHaveCount(0);
  await page.goto("/fbr-invoicing/migrations/run-1"); await expect(page.getByText("MISMATCH", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review exception" })).toHaveCount(0);
  expect(state.requests.every(request => request.method === "GET")).toBe(true);
});
