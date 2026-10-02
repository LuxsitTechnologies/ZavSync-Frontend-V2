import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const backendDirectory = process.env["ZAVSYNC_BACKEND_DIR"];
if (!backendDirectory) {
  throw new Error("ZAVSYNC_BACKEND_DIR must point to the ZavSync Laravel repository.");
}

const identityFixture = "'" + resolve("tests/support/identity-fixture.php").replaceAll("'", "'\"'\"'") + "'";

const backendEnvironment = [
  "APP_ENV=testing",
  "APP_URL=http://127.0.0.1:8001",
  "FRONTEND_URL=http://127.0.0.1:8080",
  "DB_CONNECTION=sqlite",
  "DB_DATABASE=/tmp/zavsync-stage14-e2e.sqlite",
  "CACHE_STORE=array",
  "SESSION_DRIVER=file",
  "QUEUE_CONNECTION=sync",
  "MAIL_MAILER=array",
  "SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8080",
].join(" ");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "Laravel API",
      cwd: backendDirectory,
      command: `touch /tmp/zavsync-stage14-e2e.sqlite && ${backendEnvironment} php artisan migrate:fresh --seed --no-interaction && ${backendEnvironment} php ${identityFixture} && ${backendEnvironment} php artisan serve --host=127.0.0.1 --port=8001`,
      url: "http://127.0.0.1:8001/up",
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      name: "Vue application",
      command: "npm run dev -- --host 127.0.0.1 --port 8080",
      env: { VITE_API_PROXY_TARGET: "http://127.0.0.1:8001" },
      url: "http://127.0.0.1:8080/login",
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
