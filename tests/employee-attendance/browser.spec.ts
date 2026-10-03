import { test, expect, type Page } from "@playwright/test";
import type { AttendanceSession } from "../../src/types/attendance";

type Call = { path: string; company: string; method: string; key?: string; query: string };
type SetupOptions = { permissions?: string[]; unlinked?: boolean; former?: "resigned" | "terminated"; slowA?: boolean; networkOnce?: boolean; conflictOnce?: boolean; validationOnce?: boolean; initialClosed?: boolean };

function session(company: string, state: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT" = "CLOCKED_OUT"): AttendanceSession & { employee_id: string } {
  const closed = state === "CLOCKED_OUT";
  return {
    id: `session-${company}`, work_date: "2026-10-02", timezone: "Asia/Karachi", state,
    original: { clock_in_at: "2026-10-02T17:00:00+00:00", clock_out_at: closed ? "2026-10-03T01:00:00+00:00" : null,
      breaks: [], break_seconds: 0, worked_seconds: closed ? 28800 : null },
    effective: { clock_in_at: "2026-10-02T17:00:00+00:00", clock_out_at: closed ? "2026-10-03T01:00:00+00:00" : null,
      breaks: [], break_seconds: 0, worked_seconds: closed ? 28800 : null },
    corrected: false, revision_number: 0, provenance: "SELF_CLOCK", employee_id: `employee-${company}`,
  };
}

async function setup(page: Page, options: SetupOptions = {}) {
  const calls: Call[] = [];
  const permissions = options.permissions ?? ["employee.self.view", "employee.attendance.view", "employee.attendance.clock", "employee.attendance.correction.request", "attendance.view", "attendance.manage", "attendance.corrections.manage"];
  const states = new Map<string, ReturnType<typeof session> | null>([["A", options.initialClosed || options.former ? session("A") : null], ["B", null]]);
  const corrections: Array<{ id: string; session_id: string; status: "PENDING" | "APPROVED" | "REJECTED"; reason: string; submitted_at: string; proposed: ReturnType<typeof session>["effective"]; original: ReturnType<typeof session>["original"]; kind: string; decision_reason: string | null; decided_at: string | null }> = [];
  let releaseA = () => {};
  const gateA = new Promise<void>(resolve => { releaseA = resolve; });
  let releaseAction = () => {};
  const actionGate = new Promise<void>(resolve => { releaseAction = resolve; });
  let holdAction = false;
  let networkFailed = false;
  let conflictFailed = false;
  let validationFailed = false;
  const company = (id: string) => ({ id, name: `Company ${id}`, roles: [], permissions, modules: ["payroll"], timezone: "Asia/Karachi", effective_navigation: { catalog: [], items: [], visible_keys: ["hrm.attendance"] } });
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const id = request.headers()["x-company-id"] ?? "A";
    const method = request.method();
    calls.push({ path, company: id, method, key: request.headers()["idempotency-key"], query: url.search });
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return respond({ user: { id: 1, name: "Employee", email: "employee@example.invalid", is_platform_admin: true }, companies: ["A", "B"].map(company) });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company((request.postDataJSON() as { company_id: string }).company_id) });
    if (path.endsWith("/employee/me")) return respond({ linked: !options.unlinked, employee: options.unlinked ? null : { id: `employee-${id}`, employee_code: `EMP-${id}`, full_name: `Employee ${id}`, status: options.former ?? "active" }, self_editable: false });
    if (path.endsWith("/platform/notifications")) return respond({ unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, per_page: 30, total: 0 } });
    if (path.endsWith("/employee/attendance/status")) {
      if (options.slowA && id === "A") await gateA;
      if (options.unlinked) return respond({ message: "No employee link", error_code: "EMPLOYEE_IDENTITY_NOT_LINKED" }, 409);
      const current = states.get(id) ?? null;
      const allowed_actions = options.former ? [] : !current || current.state === "CLOCKED_OUT" ? ["CLOCK_IN"] : current.state === "ON_BREAK" ? ["BREAK_END"] : ["CLOCK_OUT", "BREAK_START"];
      return respond({ state: current?.state ?? "NOT_CLOCKED_IN", timezone: current?.timezone ?? "Asia/Karachi", work_date: current?.work_date ?? "2026-10-03", session: current, allowed_actions });
    }
    if (/\/employee\/attendance\/(clock-in|clock-out|breaks\/start|breaks\/end)$/.test(path)) {
      if (holdAction) await actionGate;
      if (options.networkOnce && !networkFailed) { networkFailed = true; return route.abort("failed"); }
      if (options.conflictOnce && !conflictFailed) { conflictFailed = true; return respond({ message: "Attendance changed", error_code: "ATTENDANCE_INVALID_TRANSITION" }, 409); }
      const current = states.get(id) ?? null;
      if (path.endsWith("/clock-in")) states.set(id, session(id, "CLOCKED_IN"));
      else if (path.endsWith("/breaks/start") && current) { current.state = "ON_BREAK"; current.original.breaks = [{ started_at: "2026-10-02T20:00:00+00:00", ended_at: null, duration_seconds: null }]; current.effective.breaks = current.original.breaks; }
      else if (path.endsWith("/breaks/end") && current) { current.state = "CLOCKED_IN"; current.original.breaks = [{ started_at: "2026-10-02T20:00:00+00:00", ended_at: "2026-10-02T20:05:00+00:00", duration_seconds: 300 }]; current.effective.breaks = current.original.breaks; current.original.break_seconds = current.effective.break_seconds = 300; }
      else if (path.endsWith("/clock-out") && current) { current.state = "CLOCKED_OUT"; current.original.clock_out_at = current.effective.clock_out_at = "2026-10-03T01:00:00+00:00"; current.original.worked_seconds = current.effective.worked_seconds = 28500; }
      return respond(states.get(id));
    }
    if (path.endsWith("/employee/attendance/history")) {
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      const current = states.get(id);
      return respond({ data: current ? [pageNumber === 1 ? current : { ...current, id: `older-${id}`, work_date: "2026-09-30" }] : [], meta: { total: current ? 2 : 0, current_page: pageNumber, last_page: current ? 2 : 1, per_page: 20 } });
    }
    if (path.endsWith("/employee/attendance/calendar")) return respond({ month: url.searchParams.get("month"), days: states.get(id) ? [{ date: "2026-10-02", session_count: 1, states: [states.get(id)?.state] }] : [] });
    if (path.endsWith("/employee/attendance/corrections")) return respond({ data: corrections, meta: { total: corrections.length, current_page: 1, last_page: 1, per_page: 20 } });
    if (/\/employee\/attendance\/[^/]+\/corrections$/.test(path) && method === "POST") {
      if (options.validationOnce && !validationFailed) { validationFailed = true; return respond({ message: "Invalid correction", errors: { clock_out_at: ["Invalid time"] } }, 422); }
      const body = request.postDataJSON() as { clock_in_at: string; clock_out_at: string; breaks: []; reason: string };
      const current = states.get(id)!;
      const item = { id: `correction-${corrections.length + 1}`, session_id: current.id, status: "PENDING" as const, kind: "EMPLOYEE_REQUEST", reason: body.reason,
        original: current.original, proposed: { ...current.effective, clock_in_at: body.clock_in_at, clock_out_at: body.clock_out_at }, submitted_at: "2026-10-03T10:00:00+00:00", decision_reason: null, decided_at: null };
      corrections.unshift(item);
      return respond(item, 201);
    }
    if (/\/employee\/attendance\/[^/]+$/.test(path)) return respond(states.get(id));
    if (path.endsWith("/attendance/sessions")) return respond({ data: states.get(id) ? [states.get(id)] : [], meta: { total: states.get(id) ? 1 : 0, current_page: 1, last_page: 1 } });
    if (path.endsWith("/attendance/corrections")) return respond({ data: corrections.map(item => ({ ...item, employee_id: `employee-${id}` })), meta: { total: corrections.length, current_page: 1, last_page: 1 } });
    if (/\/attendance\/corrections\/[^/]+\/(approve|reject)$/.test(path)) {
      const item = corrections[0];
      item.status = path.endsWith("/approve") ? "APPROVED" : "REJECTED";
      item.decision_reason = (request.postDataJSON() as { reason: string }).reason;
      item.decided_at = "2026-10-03T11:00:00+00:00";
      return respond(item);
    }
    if (/\/attendance\/sessions\/[^/]+\/interventions$/.test(path) && method === "POST") {
      const current = states.get(id)!;
      const body = request.postDataJSON() as { clock_out_at: string };
      current.effective.clock_out_at = body.clock_out_at;
      current.corrected = true;
      current.revision_number += 1;
      return respond({ id: "intervention-1", status: "APPROVED" }, 201);
    }
    if (/\/attendance\/sessions\/[^/]+$/.test(path)) return respond({ ...states.get(id), corrections });
    return respond({ message: "Unexpected request" }, 500);
  });
  return { calls, states, corrections, releaseA, releaseAction, hold: () => { holdAction = true; } };
}

test("linked status and server-authoritative clock/break lifecycle", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/employee/attendance");
  await expect(page.getByText("NOT CLOCKED IN", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Asia/Karachi").first()).toBeVisible();
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByRole("button", { name: "Start Break" })).toBeVisible();
  await page.getByRole("button", { name: "Start Break" }).click();
  await expect(page.getByRole("button", { name: "End Break" })).toBeVisible();
  await page.getByRole("button", { name: "End Break" }).click();
  await page.getByRole("button", { name: "Clock Out" }).click();
  await expect(page.getByText("7h 55m").first()).toBeVisible();
  expect(calls.filter(call => /clock-in|clock-out|breaks\/(start|end)/.test(call.path)).every(call => call.key && call.method === "POST")).toBe(true);
  expect(calls.filter(call => /\/payroll\/|\/accounting\/|\/banking\/|\/inventory\//.test(call.path))).toEqual([]);
});

test("double click is disabled and an uncertain retry keeps the original key", async ({ page }) => {
  const context = await setup(page, { networkOnce: true });
  await page.goto("/employee/attendance");
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByText(/Could not reach the ZavSync server/)).toBeVisible();
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByRole("button", { name: "Start Break" })).toBeVisible();
  const attempts = context.calls.filter(call => call.path.endsWith("/clock-in"));
  expect(attempts).toHaveLength(2);
  expect(attempts[0].key).toBe(attempts[1].key);
});

test("in-flight clock action cannot be submitted twice", async ({ page }) => {
  const context = await setup(page);
  context.hold();
  await page.goto("/employee/attendance");
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByRole("button", { name: "Clock In" })).toBeDisabled();
  expect(context.calls.filter(call => call.path.endsWith("/clock-in"))).toHaveLength(1);
  context.releaseAction();
  await expect(page.getByRole("button", { name: "Start Break" })).toBeVisible();
});

test("conflict reloads authority without pretending success", async ({ page }) => {
  await setup(page, { conflictOnce: true });
  await page.goto("/employee/attendance");
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByText("Attendance changed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clock In" })).toBeVisible();
});

test("unlinked and unauthorized states do not offer self-service", async ({ page }) => {
  await setup(page, { unlinked: true });
  await page.goto("/employee/attendance");
  await expect(page.getByText(/No employee profile is linked/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Clock In" })).toHaveCount(0);
});

test("platform administrator without attendance permission cannot enter self attendance", async ({ page }) => {
  const context = await setup(page, { permissions: ["employee.self.view", "payroll.view"] });
  await page.goto("/employee/attendance");
  await expect(page).not.toHaveURL(/employee\/attendance/);
  expect(context.calls.filter(call => call.path.includes("/employee/attendance"))).toEqual([]);
});

test("overnight work date, pagination and calendar use server dates", async ({ page }) => {
  const { calls } = await setup(page, { initialClosed: true });
  await page.goto("/employee/attendance");
  await expect(page.getByText("2026-10-02").first()).toBeVisible();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  expect(calls.some(call => call.path.endsWith("/employee/attendance/history") && call.query.includes("page=2"))).toBe(true);
  await page.getByRole("tab", { name: "Calendar" }).click();
  await expect(page.getByText("1 session")).toBeVisible();
  await expect(page.getByText(/Empty days are not classified/)).toBeVisible();
});

test("correction validates then submits without changing effective evidence", async ({ page }) => {
  const { calls, corrections } = await setup(page, { initialClosed: true, validationOnce: true });
  await page.goto("/employee/attendance");
  await page.getByRole("tab", { name: "History" }).click();
  await page.getByRole("button", { name: "Request correction" }).last().click();
  await expect(page.getByLabel("Reason")).toBeVisible();
  await page.getByLabel("Reason").fill("My clock-out needs review.");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Invalid correction")).toBeVisible();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("PENDING", { exact: false }).first()).toBeVisible();
  expect(corrections).toHaveLength(1);
  expect(calls.filter(call => call.path.endsWith("/corrections") && call.method === "POST")).toHaveLength(2);
  expect(calls.filter(call => call.path.includes("/attendance/") && call.method === "POST").every(call => !!call.key)).toBe(true);
});

for (const former of ["resigned", "terminated"] as const) test(`${former} employee can read and request historical correction but cannot clock`, async ({ page }) => {
  await setup(page, { former });
  await page.goto("/employee/attendance");
  await expect(page.getByText(/No clock action is available/)).toBeVisible();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("2026-10-02").first()).toBeVisible();
  await page.getByRole("button", { name: "Request correction" }).last().click();
  await expect(page.getByLabel("Reason")).toBeVisible();
});

test("company switch discards stale old-company status", async ({ page }) => {
  const context = await setup(page, { slowA: true });
  await page.goto("/employee/attendance");
  await expect.poll(() => context.calls.some(call => call.company === "A" && call.path.endsWith("/employee/attendance/status"))).toBe(true);
  await page.getByLabel("Active company").selectOption("B");
  context.releaseA();
  await expect(page.getByText("Company B").first()).toBeVisible();
  await expect(page.getByText("session-A")).toHaveCount(0);
  expect(context.calls.some(call => call.company === "B" && call.path.endsWith("/employee/attendance/status"))).toBe(true);
});

test("dashboard attendance uses only verified status", async ({ page }) => {
  await setup(page, { initialClosed: true });
  await page.goto("/employee");
  await expect(page.getByText("CLOCKED OUT", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("2026-10-02").first()).toBeVisible();
  await expect(page.getByText(/attendance percentage|overtime pay|salary/i)).toHaveCount(0);
});

test("HR attendance uses separate admin register, decision and immutable revision contracts", async ({ page }) => {
  const context = await setup(page, { initialClosed: true });
  const original = context.states.get("A")!;
  context.corrections.push({ id: "admin-correction", session_id: original.id, status: "PENDING", kind: "EMPLOYEE_REQUEST",
    reason: "Review the original clock-out.", original: original.original, proposed: original.effective,
    submitted_at: "2026-10-03T10:00:00+00:00", decision_reason: null, decided_at: null });
  await page.goto("/hrm/attendance");
  await expect(page.getByRole("heading", { name: "Attendance Register" })).toBeVisible();
  await page.getByRole("button", { name: "Review evidence" }).click();
  await expect(page.getByText("Original evidence")).toBeVisible();
  await page.getByLabel("Decision reason").fill("The evidence was reviewed.");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Decided")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create revision" })).toBeEnabled();
  await page.getByLabel("Corrected check-out").fill("2026-10-03T01:30:00+00:00");
  await page.getByLabel("Reason", { exact: true }).fill("Manager checked the original evidence.");
  await expect(page.getByLabel("Corrected check-out")).toHaveValue("2026-10-03T01:30:00+00:00");
  await expect(page.getByLabel("Reason", { exact: true })).toHaveValue("Manager checked the original evidence.");
  await expect(page.getByRole("button", { name: "Create revision" })).toBeEnabled();
  await page.getByRole("button", { name: "Create revision" }).click();
  await expect.poll(() => context.calls.filter(call => call.path.endsWith("/interventions") && call.method === "POST").length).toBe(1);
  await expect.poll(() => context.states.get("A")?.revision_number).toBe(1);
  await expect(page.getByText("Effective revision 1")).toBeVisible();
  expect(original.original.clock_out_at).toBe("2026-10-03T01:00:00+00:00");
  expect(context.calls.some(call => call.path.endsWith("/approve") && call.method === "POST")).toBe(true);
  expect(context.calls.some(call => call.path.endsWith("/interventions") && call.method === "POST" && !!call.key)).toBe(true);
  expect(context.calls.filter(call => call.path.startsWith("/api/v1/employee/attendance"))).toEqual([]);
});

test("tabs are keyboard operable and preserve focus", async ({ page }) => {
  await setup(page);
  await page.goto("/employee/attendance");
  await page.getByRole("tab", { name: "Today" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "History" })).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "History" })).toBeVisible();
});

for (const width of [390, 768, 1440]) test(`attendance layout fits ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page, { initialClosed: true });
  await page.goto("/employee/attendance");
  await expect(page.getByRole("tab", { name: "Today" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "History" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
