import { expect, test, type Page } from "@playwright/test";
import type { PlatformRole } from "../../src/types/platform";

type Call = { method: string; company: string; path: string };
const role = (id: number, company_id: string, name: string, is_system = false, archived = false, memberships_count = 0): PlatformRole => ({
  id, company_id, name, is_system, archived_at: archived ? "2026-10-16T00:00:00Z" : null,
  memberships_count, permissions_count: 0, permissions: [],
});

async function setup(page: Page, options: { manage?: boolean; deleteStatus?: number; deleteCode?: string; lateDelete?: boolean } = {}) {
  const roles: Record<string, PlatformRole[]> = {
    A: [role(1, "A", "Admin", true, false, 2), role(2, "A", "Active custom", false, false, 1), role(3, "A", "Archived unused", false, true), role(4, "A", "Archived with history", false, true)],
    B: [role(10, "B", "Company B archived", false, true)],
  };
  const calls: Call[] = [];
  let releaseDelete = () => {};
  const deleteGate = new Promise<void>(resolve => { releaseDelete = resolve; });
  let releaseRead = () => {};
  const readGate = new Promise<void>(resolve => { releaseRead = resolve; });
  let delayNextARead = false;
  const company = (id: string) => ({ id, name: `Company ${id}`, roles: ["Admin"], modules: [],
    permissions: ["platform.roles.view", ...(options.manage === false ? [] : ["platform.roles.manage"])],
    approval_status: "APPROVED", is_active: true });
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const companyId = request.headers()["x-company-id"] ?? "A";
    const method = request.method();
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/auth/me")) return respond({ user: { id: 1, name: "Test", email: "test@example.invalid" }, companies: [company("A"), company("B")] });
    if (path.endsWith("/auth/switch-company")) return respond({ company: company(request.postDataJSON().company_id) });
    if (path.includes("/notifications")) return respond({ notifications: { data: [] }, unread_count: 0 });
    if (path === "/api/v1/platform/roles" && method === "GET") {
      calls.push({ method, company: companyId, path });
      const snapshot = structuredClone(roles[companyId]);
      if (companyId === "A" && delayNextARead) { delayNextARead = false; await readGate; }
      return respond({ roles: snapshot, permissions: [] });
    }
    if (path.startsWith("/api/v1/platform/roles/") && method === "DELETE") {
      calls.push({ method, company: companyId, path });
      if (options.lateDelete) await deleteGate;
      const id = Number(path.split("/").at(-1));
      if (companyId !== "A" || ![3, 4].includes(id)) return respond({ message: "Unavailable" }, 404);
      if (id === 4) return respond({ message: "Historical references exist", error_code: "ROLE_DELETE_BLOCKED" }, 409);
      if (options.deleteStatus) {
        if (options.deleteStatus === 404) roles.A = roles.A.filter(item => item.id !== id);
        return respond({ message: "Internal role detail must not leak", error_code: options.deleteCode }, options.deleteStatus);
      }
      roles.A = roles.A.filter(item => item.id !== id);
      return respond({ message: "Archived custom role deleted." });
    }
    return respond({ message: "Unexpected request" }, 500);
  });
  await page.goto("/roles");
  await expect(row(page, "Archived unused")).toBeVisible();
  return { calls, roles, releaseDelete, releaseRead, deferARead: () => { delayNextARead = true; } };
}

const row = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Delete archived role" });

test("only an archived custom role offers Delete; system Admin is protected", async ({ page }) => {
  const { calls } = await setup(page);
  await expect(row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  await expect(row(page, "Archived with history").getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  await expect(row(page, "Active custom").getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  for (const action of ["Delete", "Archive", "Edit"]) await expect(row(page, "Admin").getByRole("button", { name: action, exact: true })).toHaveCount(0);
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
});

test("confirmation is required; cancel never sends DELETE", async ({ page }) => {
  const { calls } = await setup(page);
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog(page)).toContainText("Delete this archived role permanently?");
  await expect(dialog(page)).toContainText("This action cannot be undone. Roles with existing assignments, invitations or historical references cannot be deleted.");
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page, "Archived unused")).toBeVisible();
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
});

test("confirmed deletion uses Company A and reloads authoritative roles and counts", async ({ page }) => {
  const { calls } = await setup(page);
  const roleCount = page.locator(".panel.relative").filter({ has: page.getByText("Roles", { exact: true }) }).locator(".num");
  await expect(roleCount).toHaveText("4");
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Delete role permanently" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page, "Archived unused")).toHaveCount(0);
  await expect(page.getByRole("row")).toHaveCount(4); // Header plus three authoritative roles.
  await expect(roleCount).toHaveText("3");
  expect(calls.filter(call => call.method === "DELETE")).toEqual([{ method: "DELETE", company: "A", path: "/api/v1/platform/roles/3" }]);
  expect(calls.filter(call => call.method === "GET" && call.company === "A")).toHaveLength(2);
});

for (const response of [
  { status: 403, code: "FORBIDDEN", text: "Access denied" },
  { status: 409, code: "ROLE_DELETE_BLOCKED", text: "existing assignments, invitations or historical references" },
  { status: 500, code: "SERVER_ERROR", text: "Check your connection and retry" },
]) test(`${response.status} deletion response is safe and retains the role`, async ({ page }) => {
  const { calls } = await setup(page, { deleteStatus: response.status, deleteCode: response.code });
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Delete role permanently" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(response.text);
  await expect(dialog(page)).not.toContainText("Internal role detail must not leak");
  await expect(row(page, "Archived unused")).toBeVisible();
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(1);
});

test("404 closes confirmation and reloads the authoritative list", async ({ page }) => {
  const { calls } = await setup(page, { deleteStatus: 404 });
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Delete role permanently" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("no longer available");
  await expect(row(page, "Archived unused")).toHaveCount(0);
  expect(calls.filter(call => call.method === "GET" && call.company === "A")).toHaveLength(2);
});

test("zero current users never bypasses the backend's historical-reference block", async ({ page }) => {
  const { calls } = await setup(page);
  await expect(row(page, "Archived with history")).toContainText("0");
  await row(page, "Archived with history").getByRole("button", { name: "Delete", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Delete role permanently" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("historical references");
  await expect(row(page, "Archived with history")).toBeVisible();
  expect(calls.filter(call => call.method === "DELETE")).toEqual([{ method: "DELETE", company: "A", path: "/api/v1/platform/roles/4" }]);
});

test("view-only user cannot delete even with archived roles", async ({ page }) => {
  const { calls } = await setup(page, { manage: false });
  await expect(row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New role" })).toHaveCount(0);
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
});

test("company switch clears A confirmation; B cannot delete A role", async ({ page }) => {
  const { calls } = await setup(page);
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByLabel("Active company").selectOption("B");
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page, "Company B archived")).toBeVisible();
  await expect(row(page, "Archived unused")).toHaveCount(0);
  expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
  expect(calls.filter(call => call.method === "GET").at(-1)?.company).toBe("B");
});

test("late A deletion cannot replace B roles or issue a B deletion", async ({ page }) => {
  const { calls, releaseDelete } = await setup(page, { lateDelete: true });
  await row(page, "Archived unused").getByRole("button", { name: "Delete", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Delete role permanently" }).click();
  await expect.poll(() => calls.filter(call => call.method === "DELETE").length).toBe(1);
  await page.getByLabel("Active company").selectOption("B");
  await expect(row(page, "Company B archived")).toBeVisible();
  releaseDelete();
  await expect(row(page, "Archived unused")).toHaveCount(0);
  await expect(row(page, "Company B archived")).toBeVisible();
  expect(calls.filter(call => call.method === "DELETE")).toEqual([{ method: "DELETE", company: "A", path: "/api/v1/platform/roles/3" }]);
});

test("late A role list cannot overwrite B after switching back and forth", async ({ page }) => {
  const { calls, deferARead, releaseRead } = await setup(page);
  await page.getByLabel("Active company").selectOption("B");
  await expect(row(page, "Company B archived")).toBeVisible();
  deferARead();
  await page.getByLabel("Active company").selectOption("A");
  await expect.poll(() => calls.filter(call => call.method === "GET" && call.company === "A").length).toBe(2);
  await page.getByLabel("Active company").selectOption("B");
  await expect(row(page, "Company B archived")).toBeVisible();
  releaseRead();
  await expect(row(page, "Archived unused")).toHaveCount(0);
  await expect(row(page, "Company B archived")).toBeVisible();
});
