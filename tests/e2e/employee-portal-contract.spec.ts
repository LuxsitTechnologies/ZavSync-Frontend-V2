import { test, expect } from "@playwright/test";

test("Stage 16B.1 portal uses real V2 identity, company switch and notification contracts", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/v1/")) calls.push(path);
  });
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel("Work email").fill("identity@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("main").getByText("Identity Employee A", { exact: true })).toBeVisible();
  await expect(page.getByText("Terminated", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Unavailable", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Active company").selectOption({ label: "Identity Company B" });
  await expect(page.getByRole("main").getByText("Identity Employee B", { exact: true })).toBeVisible();
  await expect(page.getByText("Identity Employee A", { exact: true })).toHaveCount(0);
  await page.getByLabel("Active company").selectOption({ label: "Identity Company C" });
  await expect(page.getByText(/No employee profile linked/)).toBeVisible();
  await expect(page.getByText("Identity Employee B", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Notifications", exact: true }).first().click();
  await expect(page).toHaveURL(/\/employee\/notifications$/);
  expect(calls.some(path => path.endsWith("/employee/me"))).toBe(true);
  expect(calls.some(path => path.endsWith("/platform/notifications"))).toBe(true);
  expect(calls.some(path => /\/payroll|\/hrm\/employees|employee-link-options/.test(path))).toBe(false);
});
