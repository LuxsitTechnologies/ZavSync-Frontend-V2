# Zeeshan QA frontend remediation: verified local release candidate

Source: `Zavsync from WhatsApp Business.xlsx`, Sheet1 rows 2–24. Frontend pre-QA baseline: `f1897546081b07e70d9fc02a96f6c9780b88a714`. Backend pre-QA baseline: `c4f2bfa9f8659ad0845a4dc26fea91dd374a1eb8`; clean backend HEAD and `origin/main` at final review: `b10fb7a4bfae89f7b9fa275548e5a19fad678727`. The user reports MariaDB 11.8.9 certification of the backend correction with 810 backend tests and 107 concurrency tests. Backend commit/push activity occurred independently during this frontend task; no backend mutation or push was performed here. The user accepted the complete normal-Terminal frontend verifier result: `ZEESHAN QA FRONTEND NORMAL-TERMINAL VERIFICATION: PASSED`.

The [V1/V2 parity audit](zeeshan-v1-v2-frontend-parity.md) records the original observations, routes, V1 references, V2 differences and dispositions. No V1 component or authorization shortcut was copied. V1 admin and employee repositories were inspected read-only; both remain clean.

| # | Status | Frontend result and remaining gate |
|---|---|---|
| 1 | PARTIALLY FIXED | `/accounting/customers` and CRM `/crm/companies/:id` customer handoff now validate customer phone as 7–15 digits with common separators, retain formatting, and leave contact-person names unrestricted. The corrected customer browser authorization fixture passed the accepted verifier; original-route QA reproduction remains open. |
| 2 | PARTIALLY FIXED | `/login` now gives safe 401/403/419/422 guidance and binds the remember option. Redacted DEV company-creation/login reproduction and cookie/origin configuration are still needed. |
| 3 | PARTIALLY FIXED | Dedicated FBR editor/detail explain draft save, eligibility, submission and retry. The existing backend permission, lifecycle and idempotency gates remain unchanged. The accepted verifier passed FBR regressions; original QA reproduction remains open. |
| 4 | PARTIALLY FIXED | V2 employee department/designation fields and backend accept alphanumeric text; no alphabet-only restriction was added. A product rule for numeric-only entries remains undecided; QA reproduction is pending. |
| 5 | BLOCKED | Full employee bank-account display/storage lacks a certified encrypted, masked, permissioned backend contract and privacy decision. No private bank data was added. |
| 6 | PARTIALLY FIXED | Company settings and CRM account website fields now explain safe HTTP/HTTPS/bare-domain handling and show field errors. Settings form accepts the server-returned normalized HTTPS value. The accepted verifier passed local integration; the original reported DEV route and session still need reproduction. |
| 7 | PARTIALLY FIXED | Announcement expiry uses an accessible `datetime-local` input, converts selected-company wall time to offset-bearing ISO, and rejects nonexistent DST time. The accepted verifier passed its browser and static regressions; original QA reproduction remains open. |
| 8 | PARTIALLY FIXED | The original observation says “Employee UUID in employee Dashboard not searching employee”; it does not identify a route or actor. V1's administrative employee index searched an employee ID. V2's authorized `/hrm/employees` list now searches and displays its existing company employee UUID, while task create/reassign uses the separate narrow `/tasks/assignees` lookup and employee linking uses its own selector. The self-service `/employee` dashboard remains limited to the linked person's identity. A coworker search there, or a manager-administration selector for actors lacking payroll employee-list access, needs a separately approved narrow backend contract and clarified QA reproduction. Task lookup must never infer self identity. |
| 9 | PARTIALLY FIXED | Final Employee Portal actions have action-specific confirmations. The dedicated FBR submit confirmation now states that a saved draft will be transmitted to the configured FBR environment and may create an external submission; uncertain outcomes use status refresh and certified retry. Permissions, capability gates, endpoints and idempotency are unchanged. The accepted verifier passed the new browser assertions; original QA reproduction remains open. |
| 10 | DEFERRED | Overnight shifts remain excluded by the certified day-only scheduling contract. Cross-date, DST, attendance and payroll rules require a separate design. |
| 11 | PARTIALLY FIXED | Swap and equipment pages now explain employee request, target acceptance, administrator decision, and the fact that approval is not inventory issuance. Portal browser regressions passed in the accepted verifier; original QA reproduction remains open. |
| 12 | PARTIALLY FIXED | Expense-category option labels are Active/Inactive; wire values remain exact booleans. The corrected option-attribute browser assertions passed in the accepted verifier; original QA reproduction remains open. |
| 13 | PARTIALLY FIXED | Shared-login and employee-link guidance is clearer; employee identity remains based on explicit membership link, not a second credential or inferred email/name. DEV membership/link reproduction is pending. |
| 14 | PARTIALLY FIXED | Company sign-in errors and selected-company context are clearer. Credentialed DEV session/cookie/origin and membership evidence is still required to explain the reported failure. |
| 15 | PARTIALLY FIXED | Configuration labels the masked replacement credential “Company FBR token”; it is not rehydrated or put in browser storage. FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 16 | PARTIALLY FIXED | FBR configuration now explains seller details, environment, credential state and submission readiness without claiming that saving a token verifies it. FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 17 | PARTIALLY FIXED | Task assignment now selects a UUID returned by the task-only lookup; the server still rechecks eligibility at write time. Browser pagination and real-backend HTTP contract checks passed in the accepted verifier; original QA reproduction remains open. |
| 18 | PARTIALLY FIXED | Navigation/page descriptions distinguish native Accounting invoice FBR status from the separate Pakistan FBR invoice register; API roots and record IDs remain separate. Navigation and FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 19 | BLOCKED | HS-code completeness needs an approved authoritative catalogue, update cadence and licence. No V1 or fabricated reference values were imported. |
| 20 | PARTIALLY FIXED | The invitation picker now reads `GET /platform/invitations/assignable-roles` with the selected `X-Company-Id` and uses only its `{roles:[{id,name}]}` response. The backend filters archived, foreign and over-privileged roles; the UI also rejects a role ID absent from the current response. Role administration and existing member role controls retain `GET /platform/roles`. Loading/error/empty/retry, company-switch clearing and stale-response browser regressions passed in the accepted verifier. The backend contract is present in clean backend HEAD and `origin/main` at `b10fb7a4` and was MariaDB-certified per supplied evidence; DEV deployment and original QA reproduction are not established. |
| 21 | PARTIALLY FIXED | Number format is limited to the two backend-supported options and field-specific errors appear beside that field. Browser tests for both formats with empty/populated phone and 422 attribution passed in the accepted verifier; original QA reproduction remains open. |
| 22 | PARTIALLY FIXED | Employee Portal icon requires self permission plus payroll entitlement, and unlinked/permission states explain administrator linking for the selected company. No automatic identity link or platform-admin bypass was introduced. Browser regressions passed; DEV link verification remains pending. |
| 23 | PARTIALLY FIXED | The existing approved V2 raster logos remain in use at responsive sizes. The light asset is 719×141 pixels and the dark asset is 795×160; both have enough source pixels for 2× display at their current 32/48–56-pixel rendered heights, but the dark asset has visible baked-in edge defects. V1's assets are different branding or do not improve this source quality. A brand-approved replacement asset and browser visual review are needed for full closure; no logo was invented. |

## Verification and release gate

- User-accepted complete normal-Terminal verifier: **PASS** (`ZEESHAN QA FRONTEND NORMAL-TERMINAL VERIFICATION: PASSED`). This supersedes the earlier 75/75 focused Chromium pass and the intermediate 127-pass/one-failure run. The accepted result includes the corrected customer-phone authorization fixture, invitation-role locators and expense-category option assertions. The full verifier log was not attached to this report, so no invented per-suite counts are claimed.
- Typecheck, production build, unit/static tests and Chromium browser regressions: **PASS**, per the accepted external verification. Local final-review reruns of typecheck, build, unit/static tests and whitespace checks are recorded separately at commit finalization.
- The prepared verifier invokes the existing frontend regression suites and disposable real-backend E2E. Its accepted overall pass is evidence for those gates; it is not evidence of DEV login configuration, DEV deployment, V1 production data or original user-session reproduction.
- No tests were removed, skipped, padded with waits, or given larger timeouts. The invitation-role locator and expense-category matcher corrections retain their semantic assertions; the customer-phone fixture grants the permissions required by the certified route and create API.
- Frontend push, deployment, production and V1-production actions: **NONE**. The backend and V1 repositories were not modified by this frontend remediation.

Run the complete prepared verifier in a normal macOS Terminal:

```bash
bash /Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2/scripts/verify-zeeshan-qa.sh
```

This command is the archived pre-commit verifier: it checks the frontend baseline HEAD, backend HEAD, typecheck, build, unit/static tests, browser regressions, the complete synthetic local real-backend E2E, whitespace, and both worktree statuses. Its frontend HEAD check intentionally applies before the local QA commit. It uses the existing disposable frontend E2E database workflow; it does not access production.

## Changed frontend files (38, including this report)

```text
docs/qa/zeeshan-frontend-final-report.md
docs/qa/zeeshan-v1-v2-frontend-parity.md
playwright.zeeshan-unit.config.ts
playwright.zeeshan.config.ts
scripts/verify-zeeshan-qa.sh
src/pages/HrmEmployees.vue
src/components/employee/PortalShell.vue
src/components/fbr/FbrConfiguration.vue
src/components/fbr/FbrDetail.vue
src/components/fbr/FbrEditor.vue
src/components/fbr/FbrRegister.vue
src/components/portal-final/PortalDomain.vue
src/components/work/TaskAssigneePicker.vue
src/components/work/WorkSurface.vue
src/components/zs/AuthLayout.vue
src/components/zs/Topbar.vue
src/lib/companyDateTime.ts
src/lib/customerPhone.ts
src/lib/nav.ts
src/lib/portalFinal.ts
src/pages/AccountingCustomers.vue
src/pages/AccountingFbr.vue
src/pages/CrmClients.vue
src/pages/CrmCompanyDetail.vue
src/pages/Login.vue
src/pages/Settings.vue
src/pages/Users.vue
src/pages/employee/EmployeeDashboard.vue
src/services/adminWork.repository.ts
src/services/platform/repository.ts
src/types/platform.ts
tests/e2e/work-contract.spec.ts
tests/employee-final/browser.spec.ts
tests/employee-final/unit.spec.ts
tests/employee-work/browser.spec.ts
tests/fbr/stage15b.spec.ts
tests/zeeshan/browser.spec.ts
tests/zeeshan/unit.spec.ts
```

## Contract and privacy boundaries

The new assignee picker calls `/tasks/assignees` only for task assignment. It never uses `/employee/me`, the Payroll employee list, names or email to infer self identity. Search results contain name/code/status/UUID only; the server decides eligibility and assignment. The endpoint is present in backend commit `b10fb7a4`, and the accepted verifier passed local real-backend contract checks. DEV behavior remains a separate environment check. Existing Accounting/FBR invoice isolation, Stage 16A effective navigation, task idempotency, and company-context stale-response fencing are preserved.

Full bank details, overnight shifts, and a complete HS catalogue remain deliberately deferred. Login symptoms require redacted DEV evidence, and logo replacement requires an approved asset. None was simulated with mock production authority.
