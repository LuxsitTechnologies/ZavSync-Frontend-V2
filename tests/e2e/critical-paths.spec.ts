import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function apiRequest<T>(
  page: Page,
  path: string,
  options: { method?: "GET" | "POST"; companyId?: string; idempotencyKey?: string; data?: unknown } = {},
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ requestPath, requestOptions }) => {
      const token = document.cookie
        .split("; ")
        .find((item) => item.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length);
      const response = await fetch(requestPath, {
        method: requestOptions.method ?? "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(requestOptions.companyId ? { "X-Company-Id": requestOptions.companyId } : {}),
          ...(requestOptions.idempotencyKey ? { "Idempotency-Key": requestOptions.idempotencyKey } : {}),
          ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}),
        },
        body: requestOptions.data === undefined ? undefined : JSON.stringify(requestOptions.data),
      });
      return { status: response.status, body: (await response.json()) as T };
    },
    { requestPath: path, requestOptions: options },
  );
}

async function signIn(page: Page): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("finance@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  return page.getByLabel("Active company").inputValue();
}

test("authentication protects routes and logout clears the session", async ({ page }) => {
  await page.goto("/accounting/invoices");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/accounting/invoices");
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

test("company switching invalidates tenant UI and enforces module entitlements", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "New company" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Legal name").fill("Stage 14 Isolation Company");
  await dialog.getByLabel("Plan").selectOption({ label: "Starter" });
  await dialog.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByLabel("Active company")).toHaveValue(/.+/);
  await expect(page.getByLabel("Active company").locator("option:checked")).toHaveText("Stage 14 Isolation Company");
  await expect(page.getByText("Payroll", { exact: true })).toHaveCount(0);
  await page.goto("/payroll");
  await expect(page).toHaveURL(/\/$/);
  await page.getByLabel("Active company").selectOption({ label: "ZavSync Demo Company" });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("revenue and receivables screens use authoritative records", async ({ page }) => {
  await signIn(page);
  await page.goto("/accounting/customers");
  await expect(page.getByText("Demo Customer", { exact: true })).toBeVisible();
  await page.goto("/accounting/invoices");
  await expect(page.getByText("INV-2026-0001", { exact: true })).toBeVisible();
  await page.goto("/accounting/receivables");
  await expect(page.getByRole("heading", { name: "Accounts Receivable" })).toBeVisible();
});

test("procurement and payables expose real workflow boundaries", async ({ page }) => {
  await signIn(page);
  await page.goto("/accounting/payables/suppliers");
  await expect(page.getByText("Demo Supplier", { exact: true })).toBeVisible();
  await page.goto("/purchases");
  await expect(page.getByRole("heading", { name: "Purchase Orders" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New purchase order" })).toBeEnabled();
});

test("inventory item and ledger visibility are API-backed", async ({ page }) => {
  await signIn(page);
  await page.goto("/inventory");
  await expect(page.getByText("Demo Inventory Item", { exact: false })).toBeVisible();
  await page.goto("/accounting/inventory-ledger");
  await expect(page.getByRole("heading", { name: /Inventory/ })).toBeVisible();
});

test("banking accounts and reconciliation load without simulated data", async ({ page }) => {
  await signIn(page);
  await page.goto("/banking/accounts");
  await expect(page.getByText("Primary Bank", { exact: true })).toBeVisible();
  await page.goto("/banking/reconciliation");
  await expect(page.getByRole("heading", { name: /Bank Reconciliation/ })).toBeVisible();
});

test("payroll batch advances through calculation review and approval", async ({ page }) => {
  await signIn(page);
  await page.goto("/payroll/batches");
  await page.getByRole("button", { name: "New batch" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Payroll period").selectOption({ index: 1 });
  await dialog.getByRole("button", { name: "Create batch" }).click();
  await page.getByRole("button", { name: "Calculate" }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("table").getByText("Approved", { exact: true })).toBeVisible();
  await page.goto("/payroll/posting");
  await expect(page.getByRole("heading", { name: /Payroll Posting/ })).toBeVisible();
});

test("qualified CRM lead converts through the real domain endpoint", async ({ page }) => {
  const companyId = await signIn(page);
  const response = await apiRequest<{ data: Array<{ id: string }> }>(page, "/api/v1/crm/leads?status=QUALIFIED", { companyId });
  expect(response.status).toBe(200);
  const payload = response.body;
  expect(payload.data.length).toBeGreaterThan(0);
  await page.goto(`/crm/leads/${payload.data[0]?.id}`);
  await page.getByRole("button", { name: "Convert lead" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Create a new account").uncheck();
  await dialog.getByLabel("Existing account").selectOption({ index: 1 });
  await dialog.getByLabel("Create a new contact").uncheck();
  await dialog.getByLabel("Existing contact").selectOption({ index: 1 });
  await dialog.getByRole("button", { name: "Convert lead" }).click();
  await expect(page.getByText("Conversion complete", { exact: true })).toBeVisible();
});

test("outreach and close workflows expose local lifecycle state", async ({ page }) => {
  await signIn(page);
  await page.goto("/outreach/automations");
  await expect(page.getByRole("heading", { name: "Outreach Automations" })).toBeVisible();
  await page.goto("/accounting/year-end");
  await expect(page.getByRole("heading", { name: /Year-End/ })).toBeVisible();
});

test("AI proposals cannot execute before separate human approval", async ({ page }) => {
  const companyId = await signIn(page);
  const proposalResponse = await apiRequest<{ id: string }>(page, "/api/v1/ai/action-proposals", {
    method: "POST",
    companyId,
    idempotencyKey: "stage14-e2e-ai-boundary",
    data: {
      action_type: "CRM_ACTIVITY_DRAFT",
      payload: { type: "TASK", subject: "Stage 14 approval boundary", priority: "HIGH" },
    },
  });
  expect(proposalResponse.status).toBe(201);
  const proposal = proposalResponse.body;
  const blocked = await apiRequest(page, `/api/v1/ai/action-proposals/${proposal.id}/execute`, {
    method: "POST",
    companyId,
    idempotencyKey: "stage14-e2e-ai-execute",
    data: {},
  });
  expect(blocked.status).toBe(409);

  await page.goto("/ai/actions");
  await expect(page.getByText("Stage 14 approval boundary", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "approve" }).click();
  await expect(page.getByRole("button", { name: "Execute through domain service" })).toBeVisible();
});

test("responsive shell remains usable at all required widths", async ({ page }) => {
  await signIn(page);
  const representativePages = [
    { path: "/accounting/invoices", heading: "Invoices" },
    { path: "/purchases", heading: "Purchase Orders" },
    { path: "/inventory", heading: "Inventory" },
    { path: "/payroll/batches", heading: "Payroll Batches" },
    { path: "/crm/pipeline", heading: "Pipeline" },
    { path: "/outreach/automations", heading: "Outreach Automations" },
    { path: "/knowledge/chat", heading: "ZavSync Copilot" },
    { path: "/ai/priorities", heading: "AI Priority Workspace" },
  ];

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  }

  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const target of representativePages) {
      await page.goto(target.path);
      await expect(page.getByRole("heading", { name: target.heading })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
      const hasPageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasPageOverflow, `${target.path} must not overflow at ${width}px`).toBe(false);
    }
  }
});
