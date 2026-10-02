import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/employee-payroll",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/employee-payroll",
  use: { baseURL: "http://127.0.0.1:8086", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 8086", url: "http://127.0.0.1:8086", reuseExistingServer: false },
});
