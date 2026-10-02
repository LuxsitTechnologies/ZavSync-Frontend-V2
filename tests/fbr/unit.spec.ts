import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { blankDraft, decimal, parseExact, toDraft } from "../../src/components/fbr/form";
import { moduleForPath, permissionForPath, navigationForModules } from "../../src/lib/nav";
const permissions = ["pakistan_fbr.view", "pakistan_fbr.manage", "pakistan_fbr.submit", "fbr.configuration.view", "migration.view"];

test("exact conversion preserves paisa and rejects precision/overflow; no totals are calculated", () => {
  expect(parseExact("90071992547409.91", 2)).toBe(Number.MAX_SAFE_INTEGER);
  expect(() => parseExact("90071992547409.92", 2)).toThrow();
  for (const value of ["1.001", "-1", "NaN", "1e2", ""]) expect(() => parseExact(value, 2)).toThrow();
  expect(parseExact("0.001", 3)).toBe(1);
  expect(decimal(Number.MAX_SAFE_INTEGER)).toBe("90071992547409.91");
  const form = blankDraft(); Object.assign(form.lines[0]!, { unit_price: "1000", rate: "18", extra_tax: "0.01", further_tax: "0.02", st_withheld: "3.33" });
  expect(toDraft(form).lines[0]).toMatchObject({ unit_price: 100000, sales_tax: null, extra_tax: 1, further_tax: 2, st_withheld: 333 });
  form.lines[0]!.sales_tax = "0"; expect(toDraft(form).lines[0]!.sales_tax).toBe(0);
  form.lines[0]!.sales_tax = "150.01"; expect(toDraft(form).lines[0]!.sales_tax).toBe(15001);
  expect(toDraft(form)).not.toHaveProperty("total");
  expect(toDraft(form)).not.toHaveProperty("scenario_id");
});

test("navigation separates permissions and entitlement from Native Accounting", () => {
  expect(moduleForPath("/fbr-invoicing/configuration")).toBe("invoicing");
  expect(permissionForPath("/fbr-invoicing/new")).toBe("pakistan_fbr.manage");
  expect(permissionForPath("/fbr-invoicing/invoice-1/edit")).toBe("pakistan_fbr.manage");
  expect(permissionForPath("/fbr-invoicing/configuration")).toBe("fbr.configuration.view");
  expect(permissionForPath("/fbr-invoicing/migrations/run-1")).toBe("migration.view");
  expect(permissionForPath("/accounting/invoices")).toBe("accounting.view");
  expect(JSON.stringify(navigationForModules(["invoicing"], false, ["pakistan_fbr.view"]))).toContain('FBR Invoicing');
  expect(JSON.stringify(navigationForModules([], false, permissions))).not.toContain('FBR Invoicing');
});

test("static Accounting firewall disallows accounting repositories, API literals and key persistence", () => {
  const files = ["src/pages/FbrInvoicing.vue", "src/services/fbr/repository.ts", ...readdirSync("src/components/fbr").map(name => `src/components/fbr/${name}`)];
  for (const file of files) {
    const text = readFileSync(resolve(file), "utf8");
    expect(text, file).not.toMatch(/\/accounting\/|services\/accounting|localStorage|sessionStorage/);
  }
});


test("repository firewall and unwrapped resource contracts cover every FBR operation", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: { path: string; method: string; headers: Record<string, string> }[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "http://fbr-test.invalid" } } });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ path: url.pathname, method: init?.method ?? "GET", headers: init?.headers as Record<string, string> });
    return new Response(JSON.stringify({ marker: "unwrapped-server-resource" }), { status: 200 });
  };
  try {
    const { fbrRepository: repo } = await server.ssrLoadModule("/src/services/fbr/repository.ts");
    await expect(repo.detail("", "invoice")).rejects.toThrow("Select a company");
    expect(await repo.detail("A", "invoice")).toEqual({ marker: "unwrapped-server-resource" });
    await repo.list("A", 2, 25, "1");
    await repo.create("A", {}, "creation-key"); await repo.update("A", "invoice", {});
    await repo.submit("A", "invoice", "submission-key"); await repo.retry("A", "invoice");
    await repo.attempts("A", "invoice"); await repo.evidence("A", "invoice");
    await repo.references("A", "2026-10-02"); await repo.configuration("A"); await repo.saveConfiguration("A", {});
    await repo.migrations("A"); await repo.migration("A", "run"); await repo.exceptions("A", "run"); await repo.resolve("A", "exception", "RESOLVED", "Evidence checked");
    expect(calls).toHaveLength(15);
    expect(calls.every(call => call.path.startsWith("/api/v1/pakistan-fbr/") && call.headers["X-Company-Id"] === "A")).toBe(true);
    expect(calls.find(call => call.path.endsWith("/retry"))).toMatchObject({ method: "POST" });
    expect(calls.find(call => call.path.endsWith("/retry"))!.headers).not.toHaveProperty("Idempotency-Key");
    expect(calls.find(call => call.path.endsWith("/submit"))!.headers["Idempotency-Key"]).toBe("submission-key");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    await server.close();
  }
});
