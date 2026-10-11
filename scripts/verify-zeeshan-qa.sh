#!/usr/bin/env bash
set -euo pipefail

frontend_dir="/Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2"
backend_dir="/Users/humzamazhar/Documents/ChatGPT/ZavSync-Backend-V2"

cd "$frontend_dir"
test "$(git rev-parse HEAD)" = "f1897546081b07e70d9fc02a96f6c9780b88a714"
test "$(git -C "$backend_dir" rev-parse HEAD)" = "b10fb7a4bfae89f7b9fa275548e5a19fad678727"

npm run typecheck
npm run build
npx playwright test --config playwright.zeeshan-unit.config.ts
npm run test:employee-work
npm run test:employee-final
npx playwright test --config playwright.zeeshan.config.ts
npm run test:fbr
npm run test:identity
npm run test:navigation
npm run test:employee-portal
npm run test:employee-leave
npm run test:employee-attendance
npm run test:employee-payroll
ZAVSYNC_BACKEND_DIR="$backend_dir" npm run test:e2e

git diff --check
git status --short
git -C "$backend_dir" status --short
echo "ZEESHAN QA FRONTEND NORMAL-TERMINAL VERIFICATION: PASSED"
