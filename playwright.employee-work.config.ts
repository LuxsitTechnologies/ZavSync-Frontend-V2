import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/employee-work",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/employee-work",
  use: { baseURL: "http://127.0.0.1:8089", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 8089", url: "http://127.0.0.1:8089", reuseExistingServer: false },
});
