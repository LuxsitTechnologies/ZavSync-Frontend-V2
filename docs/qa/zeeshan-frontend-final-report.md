# Zeeshan QA frontend remediation: verified local release candidate

Source: `Zavsync from WhatsApp Business.xlsx`, Sheet1 rows 2–24. Frontend pre-QA baseline: `f1897546081b07e70d9fc02a96f6c9780b88a714`. Backend pre-QA baseline: `c4f2bfa9f8659ad0845a4dc26fea91dd374a1eb8`; clean backend HEAD and `origin/main` at final review: `b10fb7a4bfae89f7b9fa275548e5a19fad678727`. The user reports MariaDB 11.8.9 certification of the backend correction with 810 backend tests and 107 concurrency tests. Backend commit/push activity occurred independently during this frontend task; no backend mutation or push was performed here. The user accepted the complete normal-Terminal frontend verifier result: `ZEESHAN QA FRONTEND NORMAL-TERMINAL VERIFICATION: PASSED`.

The [V1/V2 parity audit](zeeshan-v1-v2-frontend-parity.md) records the original observations, routes, V1 references, V2 differences and dispositions. No V1 component or authorization shortcut was copied. V1 admin and employee repositories were inspected read-only; both remain clean.

| # | Status | Frontend result and remaining gate |
|---|---|---|
| 1 | PARTIALLY FIXED | `/accounting/customers` and CRM `/crm/companies/:id` customer handoff now validate customer phone as 7–15 digits with common separators, retain formatting, and leave contact-person names unrestricted. The corrected customer browser authorization fixture passed the accepted verifier; original-route QA reproduction remains open. |
| 2 | PARTIALLY FIXED | `/login` now gives safe 401/403/419/422 guidance and binds the remember option. Redacted DEV company-creation/login reproduction and cookie/origin configuration are still needed. |
| 3 | PARTIALLY FIXED | Dedicated FBR editor/detail explain draft save, eligibility, submission and retry. The existing backend permission, lifecycle and idempotency gates remain unchanged. The accepted verifier passed FBR regressions; original QA reproduction remains open. |
| 4 | PARTIALLY FIXED | V2 employee department/designation fields and backend accept alphanumeric text; no alphabet-only restriction was added. A product rule for numeric-only entries remains undecided; QA reproduction is pending. |
| 5 | FRONTEND VERIFIED; DEV REPRODUCTION PENDING | Backend commit `013471b` returns the persisted version from POST. The admin Employees flow consumes its masked, versioned response for company-scoped add/update/delete, SWIFT indicator, validation, conflict reload and deletion confirmation. The accepted complete normal-Terminal verifier passed the Chromium and real-backend contract gates; original DEV QA reproduction remains open. |
| 6 | PARTIALLY FIXED | Company settings and CRM account website fields now explain safe HTTP/HTTPS/bare-domain handling and show field errors. Settings form accepts the server-returned normalized HTTPS value. The accepted verifier passed local integration; the original reported DEV route and session still need reproduction. |
| 7 | PARTIALLY FIXED | Announcement expiry uses an accessible `datetime-local` input, converts selected-company wall time to offset-bearing ISO, and rejects nonexistent DST time. The accepted verifier passed its browser and static regressions; original QA reproduction remains open. |
| 8 | PARTIALLY FIXED | The user clarified that the reported workflow is admin Employees search. V2's authorized `/hrm/employees` list searches and displays the selected company's employee UUID; a Chromium regression covers UUID search and company isolation. Task create/reassign and employee linking retain their separate narrow selectors. Original DEV-session reproduction remains open. Task lookup never infers self identity. |
| 9 | PARTIALLY FIXED | Final Employee Portal actions have action-specific confirmations. The dedicated FBR submit confirmation now states that a saved draft will be transmitted to the configured FBR environment and may create an external submission; uncertain outcomes use status refresh and certified retry. Permissions, capability gates, endpoints and idempotency are unchanged. The accepted verifier passed the new browser assertions; original QA reproduction remains open. |
| 10 | FRONTEND VERIFIED; DEV REPRODUCTION PENDING | Backend commit `013471b` adds versioned PUT of unused shift templates and rejects any template used by a rota with `SHIFT_IN_USE`. The frontend supports same-day/overnight edits, stale-version reload and an explicit replacement-template path after in-use rejection. Existing assignments and attendance remain server-owned. The accepted complete normal-Terminal verifier passed the Chromium and real-backend contract gates; original DEV QA reproduction remains open. |
| 11 | PARTIALLY FIXED | Swap and equipment pages now explain employee request, target acceptance, administrator decision, and the fact that approval is not inventory issuance. Portal browser regressions passed in the accepted verifier; original QA reproduction remains open. |
| 12 | PARTIALLY FIXED | Expense-category option labels are Active/Inactive; wire values remain exact booleans. The corrected option-attribute browser assertions passed in the accepted verifier; original QA reproduction remains open. |
| 13 | PARTIALLY FIXED | Shared-login and employee-link guidance is clearer; employee identity remains based on explicit membership link, not a second credential or inferred email/name. DEV membership/link reproduction is pending. |
| 14 | PARTIALLY FIXED | Company sign-in errors and selected-company context are clearer. Credentialed DEV session/cookie/origin and membership evidence is still required to explain the reported failure. |
| 15 | PARTIALLY FIXED | Configuration labels the masked replacement credential “Company FBR token”; it is not rehydrated or put in browser storage. FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 16 | PARTIALLY FIXED | FBR configuration now explains seller details, environment, credential state and submission readiness without claiming that saving a token verifies it. FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 17 | PARTIALLY FIXED | Task assignment now selects a UUID returned by the task-only lookup; the server still rechecks eligibility at write time. Browser pagination and real-backend HTTP contract checks passed in the accepted verifier; original QA reproduction remains open. |
| 18 | PARTIALLY FIXED | Navigation/page descriptions distinguish native Accounting invoice FBR status from the separate Pakistan FBR invoice register; API roots and record IDs remain separate. Navigation and FBR regressions passed in the accepted verifier; original QA reproduction remains open. |
| 19 | DEFERRED BY USER | The user requested on 2026-10-12 to leave HS-code catalogue work for now. Existing stored reference suggestions remain unchanged. The supplied 2017–18 Pakistan Customs Tariff PDF is historical reference material, not a current V2 catalogue or API contract; no codes were imported or fabricated. |
| 20 | PARTIALLY FIXED | The invitation picker now reads `GET /platform/invitations/assignable-roles` with the selected `X-Company-Id` and uses only its `{roles:[{id,name}]}` response. The backend filters archived, foreign and over-privileged roles; the UI also rejects a role ID absent from the current response. Role administration and existing member role controls retain `GET /platform/roles`. Loading/error/empty/retry, company-switch clearing and stale-response browser regressions passed in the accepted verifier. The backend contract is present in clean backend HEAD and `origin/main` at `b10fb7a4` and was MariaDB-certified per supplied evidence; DEV deployment and original QA reproduction are not established. |
| 21 | PARTIALLY FIXED | Number format is limited to the two backend-supported options and field-specific errors appear beside that field. Browser tests for both formats with empty/populated phone and 422 attribution passed in the accepted verifier; original QA reproduction remains open. |
| 22 | PARTIALLY FIXED | Employee Portal icon requires self permission plus payroll entitlement, and unlinked/permission states explain administrator linking for the selected company. No automatic identity link or platform-admin bypass was introduced. Browser regressions passed; DEV link verification remains pending. |
| 23 | PARTIALLY FIXED | The user confirmed that the existing V2 logo assets are approved. The light asset is 719×141 pixels and the dark asset is 795×160, enough for 2× display at their current 32/48–56-pixel rendered heights; `AuthLayout` preserves aspect ratio. The dark asset has baked-in edge defects, so final visual acceptance remains open. No unrelated V1 logo was substituted. |

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

At that review, full bank details, overnight shifts, and a complete HS catalogue were deferred. The later certified banking and overnight contracts are addressed below; the HS catalogue remains deferred by user request. Login symptoms require redacted DEV evidence, and logo visual acceptance remains open. None was simulated with mock production authority.

## Follow-up audit after `0cc042c` (100% completion request)

The original `0cc042c` follow-up found that backend `b10fb7a4` excluded full beneficiary banking (#5), overnight shifts (#10), and an authoritative complete HS-code catalogue (#19). Backend commit `11226a0` subsequently certified banking and overnight contracts, which are integrated in the later section below. HS-code work was deferred by the user. The user clarified that #8 means the authorized admin Employees search, which already searches UUID, and that the existing V2 logo assets are approved for #23. The numeric-only department/designation rule (#4) still needs a product decision. DEV-only authentication and company-membership symptoms (#2, #13, #14, #22) require redacted environment evidence before they can be called resolved.

One narrow frontend navigation defect was identified and corrected in this follow-up: after switching companies, the topbars now leave a current route when the new membership lacks its required permission or module. The dedicated FBR route retains its existing explicit unavailable-state behavior. New browser regressions cover the main and Employee Portal topbars. Their fixtures keep Company B's restricted permissions consistent across both switch and subsequent `/auth/me` reloads. They have **not** passed yet: the Codex sandbox initially blocked Vite loopback ports 8091 and 8090 (`listen EPERM`); after loopback access was granted, macOS denied Chromium Mach-port registration (`Permission denied (1100)`) before test execution. Follow-up local typecheck, production build, 42 unit/static tests, and `git diff --check` passed. The earlier accepted normal-Terminal verifier applies to commit `0cc042c`, not to these uncommitted follow-up changes.

The 23-row matrix above remains the issue-by-issue disposition as updated for the certified banking and overnight contracts. The HS-code catalogue is explicitly deferred at the user's request. Shift editing, DEV authentication and brand visual acceptance remain open. This follow-up does **not** claim 100% completion. No backend, V1, production, push, deployment, or commit action was taken during the follow-up.

On continuation, the backend checkout at published HEAD `b10fb7a4` contained uncommitted beneficiary-account and overnight-scheduling candidate changes. Its published contract documents still exclude those capabilities. The user instructed the frontend to wait for the certified handoff, so no frontend integration targets the candidate. The backend checkout was inspected read-only and its pre-existing uncommitted files were left untouched. Existing-company creation is available through Settings; a zero-membership account still cannot discover eligible plans because the only plan list is nested in the company-scoped subscription response. That onboarding case needs a company-independent plan-selection contract before implementation.

## Initial certified issue #5 and #10 integration (backend `11226a0`)

`GET/POST /payroll/employees/{employee}/beneficiary-account`, `PUT/DELETE /payroll/employees/{employee}/beneficiary-account/{account}` require the selected `X-Company-Id`, payroll entitlement and `payroll.configure`. POST/PUT require account holder, account number, bank name, branch and optional SWIFT; PUT/DELETE require the authoritative account version. Responses expose only account holder, bank/branch, a masked last-four account number, SWIFT-configured boolean and version. A local real-backend test found that POST presently returns `version: null` even though the subsequent GET returns version 1. The frontend therefore reloads GET after save and disables versioned actions until a safe integer version is available. Conflicts reload the server state without replaying the mutation. Full account input is cleared on success, conflict, uncertain outcome, panel close and company switch; it is neither rendered after save nor stored in browser storage.

`GET/POST /hrm/shifts` accept same-day or earlier-end overnight definitions (equal times fail); rota-slot creation validates the dated interval in the rota timezone and rejects missing/ambiguous DST boundaries. Assignment conflicts include cross-midnight overlap. Shift, slot and self-schedule responses include `ends_next_day`; self schedule retains the start `shift_date`. The frontend uses that flag to display the next calendar end date while leaving timezone, DST, overlap and attendance authority with the server. Existing `/hrm/shifts` routes expose no PATCH/PUT endpoint, so editing a shift definition is a remaining backend contract gap, not a simulated frontend operation.

Verification to date: typecheck, production build, unit/static suite and whitespace checks pass; one API-only real-backend E2E passes against a disposable copy of backend commit `11226a0` and a guarded `/tmp` SQLite database. Chromium UI suites cannot launch under the Codex macOS sandbox because Chromium Mach-port registration is denied. Those browser regressions, responsive inspection, and the complete frontend E2E suite still require a normal-Terminal run. Backend source, V1, production, push, deployment and commit were untouched.

## Versioned beneficiary response and shift editing (backend `013471b`)

The later backend release refreshes the created beneficiary model before presenting it, so POST now returns the persisted integer `version`. The frontend consumes that authoritative masked response directly, without a compensating GET. The browser fixture and real-backend contract assertions require version 1 from POST. PUT/DELETE continue to send the current version; 409 reloads state without replay. Neither the full stored account number nor SWIFT is rendered or persisted.

`PUT /hrm/shifts/{shift}` requires payroll entitlement, `schedules.manage`, selected `X-Company-Id`, `name`, `start_time`, `end_time` and the current integer `version`; `is_active` is optional. A successful edit returns the shift card with incremented `version` and `ends_next_day`. The frontend edits only the selected company's unused template and sends PUT with its displayed version. `SCHEDULE_VERSION_STALE` reloads the list without replay. `SHIFT_IN_USE` leaves existing slots and assignments unchanged and offers a separate, explicitly reviewed create form prefilled with proposed times and a distinct replacement name. Dated DST and assignment-overlap validation remain in the existing server slot and assignment flows; no attendance, payroll or journal mutation was added.

Updated verification: typecheck, 44 unit/static tests, production build, `git diff --check` and the focused real-backend HTTP E2E passed against a disposable copy of backend `013471b` and a guarded `/tmp` SQLite database. Focused Chromium tests reached launch but macOS denied Mach-port registration before executing test code; focused and full browser regressions plus complete browser E2E remain pending a normal-Terminal run.

## Final extended remediation verification

The later external normal-Terminal verifier completed with the accepted result **ZEESHAN QA FRONTEND NORMAL-TERMINAL VERIFICATION: PASSED**. This supersedes the earlier local Chromium-pending statements above. The accepted complete run covers the verifier's typecheck, production build, unit/static, Chromium regression, real-backend HTTP contract and complete E2E gates. No executable frontend files were changed after that accepted run; this finalization updates only this report. The backend remains at `013471be8d4a407388798135b640d5bc07943b39`.

This is a frontend release verification result, not proof that every original QA observation is closed in DEV or production. The HS-code catalogue (#19) remains deferred by user request. The numeric-only department/designation rule (#4) needs a product decision. Original DEV login, company creation, membership and Employee Portal access symptoms (#2, #13, #14, #22), plus banking/shift QA reproduction in that environment, still need redacted DEV evidence. A zero-membership onboarding flow still depends on a company-independent plan-selection contract. The approved existing V2 login logo (#23) still needs final visual acceptance. No production or V1 production migration is claimed.
