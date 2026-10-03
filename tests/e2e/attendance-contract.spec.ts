import { expect, test } from "@playwright/test";

test("Stage 16B.3 real attendance HTTP contract preserves identity, evidence and accounting firewall", async ({ request }) => {
  const origin = "http://127.0.0.1:8080";
  const auth = () => ({ Origin: origin, Accept: "application/json" });
  await request.get("/sanctum/csrf-cookie", { headers: auth() });
  const csrf = async () => decodeURIComponent((await request.storageState()).cookies.find(cookie => cookie.name === "XSRF-TOKEN")?.value ?? "");
  const login = await request.post("/api/v1/auth/login", { headers: { ...auth(), "X-XSRF-TOKEN": await csrf() },
    data: { email: "attendance@example.invalid", password: "password" } });
  expect(login.status()).toBe(200);
  const payload = await login.json();
  const companies = payload.companies as Array<{ id: string; name: string; permissions: string[] }>;
  const company = (letter: string) => companies.find(item => item.name === `Attendance Company ${letter}`)!;
  const headers = async (letter: string, key?: string) => ({ ...auth(), "X-XSRF-TOKEN": await csrf(), "X-Company-Id": company(letter).id,
    ...(key ? { "Idempotency-Key": key } : {}) });
  const switchTo = async (letter: string) => {
    const response = await request.post("/api/v1/auth/switch-company", { headers: await headers(letter), data: { company_id: company(letter).id } });
    expect(response.status()).toBe(200);
  };

  expect(company("A").permissions).toContain("employee.attendance.view");
  expect(company("A").permissions).toContain("employee.attendance.clock");
  expect(company("A").permissions).toContain("attendance.corrections.manage");
  await switchTo("A");
  const statusBefore = await request.get("/api/v1/employee/attendance/status", { headers: await headers("A") });
  expect(statusBefore.status()).toBe(200);
  expect((await statusBefore.json()).state).toBe("NOT_CLOCKED_IN");

  const clockIn = await request.post("/api/v1/employee/attendance/clock-in", { headers: await headers("A", "real-clock-in"), data: {} });
  expect(clockIn.status()).toBe(200);
  const opened = await clockIn.json();
  expect(opened.state).toBe("CLOCKED_IN");
  const replay = await request.post("/api/v1/employee/attendance/clock-in", { headers: await headers("A", "real-clock-in"), data: {} });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).id).toBe(opened.id);
  const duplicate = await request.post("/api/v1/employee/attendance/clock-in", { headers: await headers("A", "different-clock-in"), data: {} });
  expect(duplicate.status()).toBe(409);
  await new Promise(resolve => setTimeout(resolve, 1100));

  const breakStart = await request.post("/api/v1/employee/attendance/breaks/start", { headers: await headers("A", "real-break-start"), data: {} });
  expect(breakStart.status()).toBe(200);
  expect((await breakStart.json()).state).toBe("ON_BREAK");
  expect((await request.post("/api/v1/employee/attendance/clock-out", { headers: await headers("A", "blocked-out"), data: {} })).status()).toBe(409);
  await new Promise(resolve => setTimeout(resolve, 1100));

  const breakEnd = await request.post("/api/v1/employee/attendance/breaks/end", { headers: await headers("A", "real-break-end"), data: {} });
  expect(breakEnd.status()).toBe(200);
  expect((await breakEnd.json()).original.break_seconds).toBeGreaterThan(0);
  const clockOut = await request.post("/api/v1/employee/attendance/clock-out", { headers: await headers("A", "real-clock-out"), data: {} });
  expect(clockOut.status()).toBe(200);
  const closed = await clockOut.json();
  expect(closed.state).toBe("CLOCKED_OUT");
  expect(closed.effective.worked_seconds).toBeGreaterThanOrEqual(0);
  expect(closed.original.breaks).toHaveLength(1);

  const statusAfter = await request.get("/api/v1/employee/attendance/status", { headers: await headers("A") });
  const status = await statusAfter.json();
  expect(status.session.id).toBe(closed.id);
  expect(status.allowed_actions).toContain("CLOCK_IN");
  const workDate = closed.work_date as string;
  const history = await request.get(`/api/v1/employee/attendance/history?from=${workDate}&to=${workDate}`, { headers: await headers("A") });
  expect(history.status()).toBe(200);
  expect((await history.json()).data[0].id).toBe(closed.id);
  const calendar = await request.get(`/api/v1/employee/attendance/calendar?month=${workDate.slice(0, 7)}`, { headers: await headers("A") });
  expect(calendar.status()).toBe(200);
  expect((await calendar.json()).days[0].date).toBe(workDate);

  const correctedOut = new Date(new Date(closed.effective.clock_out_at).getTime() + 60_000).toISOString().replace(".000Z", "Z");
  const correctionInput = { clock_in_at: closed.effective.clock_in_at, clock_out_at: correctedOut,
    breaks: closed.effective.breaks.map((item: { started_at: string; ended_at: string }) => ({ started_at: item.started_at, ended_at: item.ended_at })),
    reason: "Original clock-out needs review." };
  const correction = await request.post(`/api/v1/employee/attendance/${closed.id}/corrections`, { headers: await headers("A", "real-correction"), data: correctionInput });
  expect(correction.status()).toBe(201);
  const pending = await correction.json();
  expect(pending.status).toBe("PENDING");
  const beforeApproval = await request.get(`/api/v1/employee/attendance/${closed.id}`, { headers: await headers("A") });
  expect((await beforeApproval.json()).effective.clock_out_at).toBe(closed.effective.clock_out_at);
  const approved = await request.post(`/api/v1/attendance/corrections/${pending.id}/approve`, { headers: await headers("A"), data: { reason: "Evidence reviewed and accepted." } });
  expect(approved.status()).toBe(200);
  expect((await approved.json()).status).toBe("APPROVED");
  const afterApproval = await request.get(`/api/v1/employee/attendance/${closed.id}`, { headers: await headers("A") });
  const approvedSession = await afterApproval.json();
  expect(approvedSession.original.clock_out_at).toBe(closed.original.clock_out_at);
  expect(approvedSession.effective.clock_out_at).toBe(correctedOut.replace("Z", "+00:00"));
  for (const forbidden of ["base_salary", "bank_reference", "journal_id", "payroll_profile"]) expect(JSON.stringify(approvedSession)).not.toContain(forbidden);

  await switchTo("B");
  const formerStatus = await request.get("/api/v1/employee/attendance/status", { headers: await headers("B") });
  expect(formerStatus.status()).toBe(200);
  expect((await formerStatus.json()).allowed_actions).toEqual([]);
  const formerHistory = await request.get("/api/v1/employee/attendance/history?from=2026-10-02&to=2026-10-03", { headers: await headers("B") });
  expect(formerHistory.status()).toBe(200);
  const formerSession = (await formerHistory.json()).data[0];
  expect(formerSession.work_date).toBe("2026-10-02");
  expect((await request.post("/api/v1/employee/attendance/clock-in", { headers: await headers("B", "former-blocked"), data: {} })).status()).toBe(403);
  const formerCorrection = await request.post(`/api/v1/employee/attendance/${formerSession.id}/corrections`, {
    headers: await headers("B", "former-correction"), data: { clock_in_at: formerSession.effective.clock_in_at,
      clock_out_at: formerSession.effective.clock_out_at, breaks: [], reason: "Historical attendance needs review." },
  });
  expect(formerCorrection.status()).toBe(201);
  expect((await request.get(`/api/v1/employee/attendance/${closed.id}`, { headers: await headers("B") })).status()).toBe(404);

  await switchTo("C");
  const unlinked = await request.get("/api/v1/employee/attendance/status", { headers: await headers("C") });
  expect(unlinked.status()).toBe(409);
  expect((await unlinked.json()).error_code).toBe("EMPLOYEE_IDENTITY_NOT_LINKED");
});
