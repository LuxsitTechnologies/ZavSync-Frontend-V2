#!/usr/bin/env bash
set -euo pipefail

frontend_dir="/Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2"
backend_dir="/Users/humzamazhar/Documents/ChatGPT/ZavSync-Backend-V2"

fail() { printf 'VERIFICATION FAILED: %s\n' "$*" >&2; exit 1; }
[[ -d "$frontend_dir/.git" ]] || fail "Frontend repository missing: $frontend_dir"
[[ -d "$backend_dir/.git" ]] || fail "Backend repository missing: $backend_dir"
cd "$frontend_dir"
printf 'Pinned committed bases and reviewed uncommitted candidate\n'
node scripts/verify-role-model-candidate.mjs verify || fail "Candidate integrity check failed before testing."

printf '\nTypecheck and production build\n'
npm run typecheck
npm run build

printf '\nUnit/static suites\n'
npx playwright test --config playwright.zeeshan-unit.config.ts

printf '\nFocused and regression Chromium suites\n'
npm run test:navigation
npm run test:fbr
npm run test:employee-portal
npm run test:employee-final
npm run test:employee-work
npx playwright test --config playwright.zeeshan.config.ts
npm run test:identity
npm run test:employee-leave
npm run test:employee-attendance
npm run test:employee-payroll

printf '\nDisposable real-backend E2E\n'
ZAVSYNC_BACKEND_DIR="$backend_dir" npm run test:e2e

printf '\nStatic HTML metadata and whitespace\n'
grep -Fq '<title>ZavSync</title>' dist/index.html || fail "Built HTML title is incorrect."
grep -Fq 'Unified. Intelligent. Synchronized.' dist/index.html || fail "Built HTML description is incorrect."
if grep -Eq 'ZavSync — Unified ERP|HRM, payroll, accounting and FBR compliance in one multi-company workspace\.' dist/index.html; then
  fail "Built HTML still contains obsolete public preview copy."
fi
git diff --check
git -C "$backend_dir" diff --check

printf '\nArtifact and secret-file review\n'
if git status --porcelain --untracked-files=all | grep -Ei '(^|/)(\.env(\.|$)|playwright-report|test-results|dist|screenshots?|traces?|[^/]+\.(log|sqlite|db)$)'; then
  fail "A generated artifact or secret-like file is present in Git status."
fi
if git -C "$backend_dir" status --porcelain --untracked-files=all | grep -Ei '(^|/)(\.env(\.|$)|playwright-report|test-results|dist|screenshots?|traces?|[^/]+\.(log|sqlite|db)$)'; then
  fail "A generated artifact or secret-like file is present in backend Git status."
fi
secret_pattern="^\\+[^+]*(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|sk_live_[A-Za-z0-9]+|password[[:space:]]*[:=][[:space:]]*['\"][^'\"]+['\"])"
if git diff -- . ':!*.md' | grep -Ei "$secret_pattern"; then
  fail "A secret pattern appears in executable changes; inspect the diff."
fi
if git -C "$backend_dir" diff -- . ':!*.md' | grep -Ei "$secret_pattern"; then
  fail "A secret pattern appears in backend executable changes; inspect the diff."
fi
node scripts/verify-role-model-candidate.mjs verify || fail "Candidate integrity changed during testing."

printf '\nExecutable verification gate: PASS\n'
printf 'Requirements 1–22 acceptance remains conditional on the documented backend contracts, DEV checks and Zeeshan/user review.\n'
