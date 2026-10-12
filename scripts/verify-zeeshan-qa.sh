#!/usr/bin/env bash
set -euo pipefail

frontend_dir="/Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2"
backend_dir="/Users/humzamazhar/Documents/ChatGPT/ZavSync-Backend-V2"

cd "$frontend_dir"
test "$(git rev-parse HEAD)" = "0cc042c511766bde66c7840ad48f468945f949a2"
test "$(git -C "$backend_dir" rev-parse HEAD)" = "013471be8d4a407388798135b640d5bc07943b39"

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
