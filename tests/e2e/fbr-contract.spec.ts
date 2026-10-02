import { test, expect } from "@playwright/test";

test("dedicated FBR contract supports exact tax drafts, scenario, idempotency and disabled-provider recovery", async ({ request }) => {
  const origin = "http://127.0.0.1:8080";
  await request.get("/sanctum/csrf-cookie", { headers: { Origin: origin, Accept: "application/json" } });
  const csrf = decodeURIComponent((await request.storageState()).cookies.find(cookie => cookie.name === "XSRF-TOKEN")?.value ?? "");
  const authHeaders = { Origin: origin, Accept: "application/json", "X-XSRF-TOKEN": csrf };
  const login = await request.post("/api/v1/auth/login", { headers: authHeaders, data: { email: "finance@example.com", password: "password" } });
  expect(login.status()).toBe(200);
  const companyId = (await login.json()).companies[0].id;
  const refreshedCsrf = decodeURIComponent((await request.storageState()).cookies.find(cookie => cookie.name === "XSRF-TOKEN")?.value ?? "");
  const headers = { ...authHeaders, "X-XSRF-TOKEN": refreshedCsrf, "X-Company-Id": companyId };
  const path = "/api/v1/pakistan-fbr";
  const body = {
    invoice_date: "2026-10-02", invoice_type: "Sale Invoice", sale_type: "Goods", origin_province: "PUNJAB", destination_province: "PUNJAB",
    buyer_snapshot: { name: "Synthetic Stage 15B buyer", registration_number: "1234567", type: "Registered", province: "PUNJAB", address: "Synthetic address" },
    lines: [{ description: "Synthetic item", hs_code: "0101", unit: "unit", quantity_milli: 1000, unit_price: 100000, discount: 0, tax_rate_bps: 1800, fbr_rate_id: "18%", sales_tax: 15001, extra_tax: 1, further_tax: 2, st_withheld: 333 }],
  };
  const creationHeaders = { ...headers, "Idempotency-Key": `stage15b-${crypto.randomUUID()}` };
  const created = await request.post(`${path}/invoices`, { headers: creationHeaders, data: body });
  expect(created.status()).toBe(201);
  const invoice = (await created.json());
  expect(invoice).toMatchObject({ domain: "pakistan_fbr", total: 115004, sales_tax: 15001, extra_tax: 1, further_tax: 2, withholding_tax: 333, scenario_id: "SN001", editable: true });
  expect(invoice.lines[0]).toMatchObject({ sales_tax: 15001, extra_tax: 1, further_tax: 2, st_withheld: 333, total: 115004 });
  // Never invoke a provider-enabled contract in this verification.
  expect(invoice.capabilities.provider_submission_enabled).toBe(false);
  const replay = await request.post(`${path}/invoices`, { headers: creationHeaders, data: body });
  expect((await replay.json()).id).toBe(invoice.id);
  const conflict = await request.post(`${path}/invoices`, { headers: creationHeaders, data: { ...body, notes: "Changed" } });
  expect(conflict.status()).toBe(409);
  const update = await request.patch(`${path}/invoices/${invoice.id}`, { headers, data: { ...body, buyer_snapshot: { ...body.buyer_snapshot, type: "Unregistered" }, lines: [{ ...body.lines[0], sales_tax: 0 }] } });
  expect(update.status()).toBe(200);
  expect((await update.json())).toMatchObject({ scenario_id: "SN002", sales_tax: 18000, total: 118003, withholding_tax: 333 });
  const attempts = await request.get(`${path}/invoices/${invoice.id}/attempts`, { headers });
  expect(await attempts.json()).toEqual([]);
  const retry = await request.post(`${path}/invoices/${invoice.id}/retry`, { headers });
  expect(retry.status()).toBe(422);
  const disabled = await request.post(`${path}/invoices/${invoice.id}/submit`, { headers: { ...headers, "Idempotency-Key": `stage15b-submit-${crypto.randomUUID()}` } });
  expect(disabled.status()).toBe(503);
  expect((await disabled.json()).error_code).toBe("FBR_UNAVAILABLE");
  const foreign = await request.get(`${path}/invoices/${invoice.id}`, { headers: { ...headers, "X-Company-Id": "00000000-0000-4000-8000-000000000000" } });
  expect([403, 404]).toContain(foreign.status());
  const refs = await request.get(`${path}/reference-data`, { headers });
  expect(refs.status()).toBe(200); expect((await refs.json()).some((row: { source: string }) => row.source === "LOCAL_FIXTURE")).toBe(true);
});
