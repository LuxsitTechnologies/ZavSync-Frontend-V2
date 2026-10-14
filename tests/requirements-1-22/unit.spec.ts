import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { formatMoney, formatMoneyCompact } from "../../src/lib/money";

test("final backend repositories retain separate company, billing and FBR authorities", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const originalFetch = globalThis.fetch, originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: Array<{ path: string; method: string; headers: Record<string, string>; body?: string }> = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "http://contract-test.invalid" } } });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ path: url.pathname, method: init?.method ?? "GET", headers: init?.headers as Record<string, string>, body: init?.body as string | undefined });
    return new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }), { status: 200 });
  };
  try {
    const { billingRepository } = await server.ssrLoadModule("/src/services/platform/billing.repository.ts");
    const { companyRepository } = await server.ssrLoadModule("/src/services/platform/company.repository.ts");
    const { fbrRepository } = await server.ssrLoadModule("/src/services/fbr/repository.ts");
    await billingRepository.catalogue("A");
    await billingRepository.quote("A", "professional", "annual");
    await billingRepository.checkout("A", "professional", "annual", "base-key");
    await billingRepository.componentCheckout("A", "addon", "fbr", 1, "addon-key");
    await billingRepository.reconcileCheckout("A", "attempt");
    await companyRepository.onboardingPlans();
    await companyRepository.pendingProfile("pending-company");
    await fbrRepository.portalSettings("A");
    await fbrRepository.creditNotes("A", "invoice");
    await fbrRepository.searchReferences("A", "HS_CODE", "1234", 2);
    expect(calls.map(call => call.path)).toEqual([
      "/api/v1/platform/billing/catalogue", "/api/v1/platform/billing/quote",
      "/api/v1/platform/billing/checkout", "/api/v1/platform/billing/components/checkout",
      "/api/v1/platform/billing/checkout/attempt/reconcile", "/api/v1/auth/onboarding/plans",
      "/api/v1/platform/companies/pending-company/pending-profile", "/api/v1/pakistan-fbr/portal-settings",
      "/api/v1/pakistan-fbr/invoices/invoice/credit-notes", "/api/v1/pakistan-fbr/reference-data/search",
    ]);
    expect(calls.filter(call => call.path.startsWith("/api/v1/platform/billing/") || call.path.startsWith("/api/v1/pakistan-fbr/")).every(call => call.headers["X-Company-Id"] === "A")).toBe(true);
    expect(calls.find(call => call.path.endsWith("/onboarding/plans"))!.headers).not.toHaveProperty("X-Company-Id");
    expect(calls.find(call => call.path.endsWith("/pending-profile"))!.headers).not.toHaveProperty("X-Company-Id");
    expect(calls.find(call => call.path.endsWith("/billing/checkout"))!.headers["Idempotency-Key"]).toBe("base-key");
    expect(calls.find(call => call.path.endsWith("/components/checkout"))!.headers["Idempotency-Key"]).toBe("addon-key");
    expect(JSON.parse(calls.find(call => call.path.endsWith("/billing/quote"))!.body!)).toEqual({ plan: "professional", billing_interval: "annual" });
    expect(JSON.parse(calls.find(call => call.path.endsWith("/components/checkout"))!.body!)).toEqual({ kind: "addon", code: "fbr", quantity: 1 });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    await server.close();
  }
});

test("managed billing, Portal Settings and invoice printing keep private authority boundaries", () => {
  const settings = readFileSync("src/pages/Settings.vue", "utf8");
  const billing = readFileSync("src/pages/Billing.vue", "utf8");
  const portal = readFileSync("src/components/fbr/PortalSettings.vue", "utf8");
  const printing = readFileSync("src/components/fbr/FbrPrint.vue", "utf8");
  expect(settings).not.toMatch(/saveSubscription|setEntitlement|status:'ACTIVE'/);
  expect(billing).toContain("reconcileCheckout");
  expect(billing).not.toMatch(/localStorage|sessionStorage|card_number|cardNumber/);
  expect(portal).not.toMatch(/localStorage|sessionStorage|console\.log/);
  expect(portal).toContain('credential.value = ""');
  expect(printing).toContain("data.verification.qr_content");
  expect(printing).not.toMatch(/qr-code-styling|QRCode\.toCanvas|data:image\/png;base64/);
});

test("DEV acceptance copy keeps calendar states and employee list customer-facing", () => {
  const calendar = readFileSync("src/pages/AiCalendar.vue", "utf8");
  const internal = readFileSync("src/components/ai/InternalCalendar.vue", "utf8");
  const employees = readFileSync("src/pages/HrmEmployees.vue", "utf8");
  const login = readFileSync("src/pages/Login.vue", "utf8");
  const router = readFileSync("src/router/index.ts", "utf8");
  expect(calendar).toContain("Calendar integration not connected");
  expect(calendar).not.toContain("Safety boundary");
  expect(internal).not.toContain("(UTC date)");
  expect(employees).not.toContain("UUID {{ employee.id }}");
  expect(employees).toContain("{{ employee.full_name }}");
  expect(login).toContain("Your account automatically opens the workspace you have access to.");
  expect(router).toContain("employeeOnlyCandidate(company)");
});

test("business currency displays use the currency code consistently", () => {
  expect(formatMoney(118000, "PKR")).toMatch(/^PKR\s+1,180\.00$/);
  expect(formatMoneyCompact(118000, "PKR")).toMatch(/^PKR\s+/);
});
