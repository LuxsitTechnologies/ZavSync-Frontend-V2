import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/roles",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/roles",
  use: { baseURL: "http://127.0.0.1:8084", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 8084", url: "http://127.0.0.1:8084", reuseExistingServer: false },
});
