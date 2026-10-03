# Stage 16B-FINAL-FE implementation and verification handoff

Status: **COMPLETE — ready for push verification**. The complete updated external normal-Terminal verifier passed after G2 implementation and the evidence-based browser-test corrections. The single local frontend release commit contains this report. Nothing was pushed, deployed or migrated into production.

## Baselines and scope

Before application changes, frontend main and its local origin/main were verified at `98d583f6bc774d09e7779c81501180fd58ea4185`, initial backend main and its local origin/main at `03a601331b45db4e8092f7b3452720e6bf384769`, design reference at `7b97c3704dc4460dbc7f11263f178fb7b818e67a`, and V1 at `56932b69b73deb5f79e245be7fbbe31b2fbe017e`. All four were clean. No remote fetch or reference/backend mutation was needed.

For FE.1, frontend main/HEAD/origin/main were reverified at the same baseline with the accepted dirty worktree preserved. Updated backend main/HEAD/origin/main were verified clean at `e900c8bb44f57763005e3e91558168bb8d4c0557` before manager implementation.

The parity matrix was written before application code. It inventories all 44 backend capability IDs plus reference-only controls and components. Its initial IMPLEMENT/ADAPT dispositions are retained as an audit trail; the reconciliation below records current implementation and limitations. The reference is adapted through existing V2 Panel/cards/forms, PortalShell and AppShell. No prototype data or simulated lifecycle is imported.

## Routes, navigation and read authority

All new domain routes use the existing payroll commercial entitlement. Presentation hiding does not revoke direct-route permission. Platform-admin status supplies no bypass. The nine new administrative mappings increase the existing mapping test from 56 to 65; every mapped route is still asserted. Existing CRM, Stage 16A and FBR identities remain independent.

| Employee route | Navigation identity | Read permission |
|---|---|---|
| `/employee/documents` | employee.documents | employee.documents.view |
| `/employee/announcements` | employee.announcements | employee.announcements.view |
| `/employee/directory` | employee.directory | employee.directory.view |
| `/employee/teams` | employee.teams | employee.teams.view |
| `/employee/schedule` | employee.schedule | employee.schedule.view |
| `/employee/shift-swaps` | employee.shift_swaps | employee.schedule.view |
| `/employee/assets` | employee.assets | employee.assets.view |
| `/employee/expenses` | employee.expenses | employee.expenses.view |
| Existing `/employee/profile` | employee.profile | Existing account route retained; employee read requires employee.self.view |
| `/employee/requests` | No invented identity | Each composed source checks its own permission and payroll entitlement |

Profile presentation follows the new payroll-backed employee.profile identity. Existing global account access and GET employee/me remain entitlement-independent. Address/contact writes additionally require payroll and employee.profile.edit. Existing account name/password controls and read-only email stay separate. Calendar and Requests are compositions rather than new commercial capabilities; each source is independently gated. Existing notifications and preferences are reused at `/employee/notifications`; no parallel Settings store or fake settings page is introduced.

| Administrative route | Navigation identity | Entry/read permission |
|---|---|---|
| `/hrm/employee-documents` | hrm.employee_documents | employee.documents.admin.view |
| `/hrm/announcements` | hrm.announcements | announcements.view |
| Existing `/hrm/teams` | hrm.teams | teams.view |
| `/hrm/shifts` | hrm.shifts | schedules.view |
| Existing `/hrm/rotas` | hrm.rotas | schedules.view |
| `/hrm/shift-swaps` | hrm.shift_swaps | schedules.view |
| `/hrm/asset-requests` | hrm.asset_requests | assets.view |
| `/hrm/expenses` | hrm.expenses | expenses.view |
| `/hrm/expense-categories` | hrm.expense_categories | Entry: expenses.categories.manage; list independently requires expenses.view |

The former `/expenses` placeholder now redirects to `/hrm/expenses`, which applies the certified route permission and entitlement.

Admin document issue/team membership/rota assignment use explicit administrative UUID inputs. They do not misuse a Payroll directory, link selector, employee/me, account email or name as a discovery authority. Manager relations confer no permissions.

## Exact API and action coverage

Paths below have `/api/v1` prefix, existing session/CSRF authentication and X-Company-Id. `{id}` means the selected authoritative resource ID. GET list pagination uses page and returned meta; complete nonpaginated lists retain their backend shape. Fields are allowlisted, not raw resource enumeration.

| Domain | Exact consumed operations | Mutation permissions |
|---|---|---|
| Profile | Existing GET employee/me; PATCH employee/me `{address,version}` | employee.profile.edit |
| Contacts | GET/POST employee/emergency-contacts; GET/PATCH/DELETE employee/emergency-contacts/{id} | employee.profile.edit; reads employee.self.view |
| Documents | GET/POST employee/documents; GET employee/documents/{id}; GET employee/documents/{id}/download | employee.documents.upload |
| Issued documents | GET/POST hrm/employee-documents; GET detail/download; POST hrm/employee-documents/{id}/release | employee.documents.issue / employee.documents.release |
| Announcements self | GET employee/announcements; GET employee/announcements/{id}; GET employee/announcements/{id}/attachment | None |
| Announcements admin | GET/POST hrm/announcements; GET/PATCH hrm/announcements/{id}; GET/POST .../{id}/attachment; POST .../{id}/publish | announcements.manage / announcements.publish |
| Directory/team self | GET employee/directory?search&page; GET employee/my-teams; GET employee/my-teams/{id}?page; GET employee/direct-reports?page | None |
| Reporting manager admin | GET/PATCH hrm/employees/{employee}/manager | Read teams.view; write teams.manage; both require payroll |
| Teams admin | GET/POST hrm/teams; GET/PATCH hrm/teams/{id}; POST .../{id}/members; DELETE .../{id}/members/{employee}; PATCH .../{id}/lead | teams.manage |
| Schedule self | GET employee/schedule?from_date&to_date | None |
| Schedule admin | GET/POST hrm/shifts; GET/POST hrm/rotas; GET hrm/rotas/{id}; POST .../{id}/slots; POST hrm/rota-slots/{slot}/assignments; POST hrm/rotas/{id}/publish | schedules.manage |
| Swaps self | GET/POST employee/shift-swaps; GET employee/shift-swaps/{id}; POST .../{id}/accept or /decline | employee.schedule.swap.request / employee.schedule.swap.respond |
| Swaps admin | GET hrm/shift-swaps; GET hrm/shift-swaps/{id}; POST .../{id}/approve or /reject | schedules.swaps.decide |
| Equipment self | GET/POST employee/asset-requests; GET employee/asset-requests/{id} | employee.assets.request |
| Equipment admin | GET hrm/asset-requests; GET hrm/asset-requests/{id}; POST .../{id}/approve or /reject | assets.decide |
| Expense categories | GET employee/expense-categories; GET/POST hrm/expense-categories; PATCH hrm/expense-categories/{id}/active | expenses.categories.manage for admin writes |
| Claims self | GET/POST employee/expense-claims; GET/PATCH employee/expense-claims/{id}; GET/POST .../{id}/receipt; POST .../{id}/submit | employee.expenses.create / edit / submit respectively |
| Claims admin | GET hrm/expense-claims; GET hrm/expense-claims/{id}; GET .../{id}/receipt; POST .../{id}/approve or /reject | expenses.approve |

The updated backend contract and successful real HTTP responses use `error_code`. The existing API client already consumes that exact field and is unchanged.

Documents show PERSONAL/ISSUED metadata and authorized private downloads. Personal upload is owner-readable; HR issue does not release. Admin release is a separate explicit confirmed operation. No delete/replace/retract or verification/expiry/required badges exist. Checksums and storage keys are not rendered. Employee reads rely on the certified released-only endpoint, not a guessed creation/assignment rule.

Announcements support paginated feed/detail, private attachments and admin draft/create/edit/expiry/attachment/publish. Published content has no edit controls. Expiry is an explicit offset-bearing ISO timestamp entered by the administrator; no browser timezone conversion is performed. Server expiry filtering remains authoritative. Notifications use the existing inbox, with no read receipt, email delivery or recipient-count claim.

Directory and team cards render only name, department, designation and location. My Team displays the backend manager and direct-report count; team detail displays explicit membership/lead, with pagination. Admin create/rename/add/remove/lead use current team versions. Manager administration is now implemented through the narrow certified GET/PATCH below.

Profile address is the sole self-editable employee field. Contacts are self-only paginated CRUD with versioned edit/removal and a keyed create. HR details, work email/phone, employment dates/status, department and designation remain read-only. DOB/gender, education/experience, bank/tax/private-HR/salary are excluded. Email change and avatar upload are absent. Existing password clearing and account authority are preserved.

Shifts are day-only definitions. Rotas expose periods, slots, returned assigned_count/coverage_gap, explicit employee assignments and publication. Own schedule reads require explicit date range; calendar/dashboard use bounded company-local dates. HH:mm values and dates are not converted into browser-local instants. No attendance/late/overtime/payroll effects are calculated.

Swaps accept explicit assignment references. Own references are visible in Published schedule; a colleague must explicitly share a target reference. There is no certified candidate-discovery endpoint, so no private colleague schedule or admin API is queried. The self target UUID is compared only with the explicitly linked self identity to present target consent. PENDING_TARGET accepts/declines; PENDING_ADMIN permits separate administrator decision. No optimistic exchange occurs. Administrative ownership is never inferred; backend participant/self-approval prohibitions remain authoritative.

Equipment only submits NEW_EQUIPMENT requests. Admin decisions are versioned PENDING → APPROVED/REJECTED. Approved never means issued. Expense claims use exact decimal-string to integer-minor-unit conversion through BigInt within the certified 15-digit minor-unit limit. Draft edit/one receipt/submission/admin decision remain separate. Approved never means paid, reimbursed or posted. History renders only explicit event type/time/reason.

## Compositions and settings

Dashboard retains certified Attendance status/completed seconds, leave server balances/holidays, work server totals/previews, notification unread count and the released-payslip link. New announcements/documents previews use first-page records and meta.total; published schedule is explicitly a date-bounded preview. No partial page length becomes a global count.

Calendar extends the existing Leave/Holiday calendar with separately labelled published schedule. Empty dates carry no absence classification. Existing Attendance evidence remains in its own certified calendar; there is no new inferred Attendance aggregate. Unsupported birthdays, meetings, task deadlines, company events and overtime are absent.

Requests composes Leave, Tickets, equipment, expenses and swaps. It labels each source, preserves its native status, shows at most three first-page records and links to the corresponding full workflow. No cross-domain totals, generic status rewrite or withdrawal exists.

Settings are the existing account/password and notification-preference screens. Theme remains presentation-only. No fake 2FA, backup codes, security state, language or timezone preference persistence is introduced.

## Company, former-employee, privacy and retry boundaries

New components reuse useWorkContext and the existing API/download client, rather than introduce stores or authentication. Every channel is fenced by company ID, contextVersion, generation, controller identity and component lifetime. Company/permission/module changes synchronously clear list/detail/forms/files/uncertain attempts/notices and abort all channels. Unmount does the same. Late mutation callbacks cannot refresh another company; private download checks abort before creating an object URL.

A new keyed intent snapshots original fields, File and key in memory. Duplicate submits and edits remain locked during uncertain outcomes. Retry sends the exact snapshot. Success or definitive failure clears it; company switch/unmount clears it safely. Versioned/nonkeyed failures do not auto-retry: list/detail reload before another intent. 409 uses the same authoritative reconciliation. Removal, release, publication and decisions use the existing focus-trapping confirmation dialog.

Former employees retain backend-authorized history, with new self mutations hidden when linked status is former or unverified. Directory/current team reads remain denied by the backend; schedule history is capped by the backend company-local date. Announcement visibility remains backend publication/expiry authority. No global account suspension is inferred.

Privacy/static checks exclude raw resource rendering, HTML injection, persistence/logging of sensitive forms/files, public storage URLs, private hashes, financial/HR leakage and unrelated APIs. The new repository invokes no Accounting, Banking, Inventory, Payroll, Attendance, Leave, CRM or generic document mutation. Compositions use existing narrow read repositories. Existing Stage 15B and 16A tests remain intact except the justified navigation-count extension. Prior corrected Work tests were not edited.

## Verification evidence and limitations

The previous complete external verifier PASS is accepted. After FE.1 changes, locally executed against the updated worktree and frozen backend `e900c8bb44f57763005e3e91558168bb8d4c0557`:

- Typecheck: PASS, including test TypeScript.
- Production build: PASS.
- All unit/static suites: 39/39 PASS (seven final-stage tests plus prior stages).
- Disposable frozen-backend HTTP contracts: 7/7 PASS — final portal, Work, Leave, Attendance, Identity, Navigation and FBR.
- Final portal HTTP flow: profile version/forbidden fields, contacts CRUD/idempotency/privacy, private personal/issued files and separate release, announcement draft/file/publish, narrow directory/team membership/lead, day shifts/rota assignment/publication, target consent then admin atomic swap, equipment decision, expense category/claim/receipt/submit/decision, tenancy, denied/unlinked/former access.
- Manager HTTP: narrow GET/version, PATCH set/clear, competing change/stale conflict/latest GET, read-only and platform-admin permission denial, missing payroll and foreign-company boundaries: PASS.
- PHP fixture syntax: PASS.
- Artifact/secret-pattern/whitespace review and git diff --check: PASS, including the final handoff recheck.

Accepted final external evidence supplied by the user: `ALL STAGE 16B-FINAL-FE VERIFICATION GATES PASSED` and `Artifact, whitespace and secret-pattern review: PASS`. The complete updated run includes the 125-test focused suite (seven unit/static and 118 browser, including 12 manager browser cases), all previous-stage regressions, build, complete real-backend E2E and final HTTP contract. Responsive 390/768/1440 and keyboard/dialog/focus assertions passed in that run. Earlier local Chromium/localhost sandbox failures are superseded by accepted external browser verification, not represented as local browser passes.

Three evidence-based test corrections remain intact:

- Manager hidden navigation targets the complementary/sidebar navigation link and separately asserts the authorized route, loaded manager data and legitimate breadcrumb.
- Manager company switching proves synchronous clearing while the switch is held, then waits for enabled company B context before input. B's authoritative response/version renders before the late A response is released; exact requests prohibit stale reload or PATCH replay.
- Attendance correction targets the eligible dated History row rather than the page-header button while history is loading. Reason, server validation, exact correction endpoint/idempotency and unchanged effective evidence remain asserted. The same selector correction covers former employees.

These corrections change only tests. No assertions were removed, no permissions or production authority changed to satisfy tests, and no sleeps, timeout increases or skipped tests were introduced. Automated checks are not a comprehensive accessibility certification; Zeeshan's DEV manual QA remains a separate step.

One normal-Terminal verifier is outside the repository:
`/Users/humzamazhar/Documents/Codex/2026-10-02/before-doing-any-development-verify-this/outputs/verify-stage-16b-final-fe.sh`

It checks baselines, creates a disposable git-archive backend copy with synthetic SQLite data and disabled providers, runs typecheck/focused final/all regressions/build/full E2E/final HTTP/static checks, and stops at the first failure. It performs no commit, push, deployment or production operation. Local non-browser evidence is logged at `/tmp/zavsync-final-verification.2gm3CR/verification.log` and the task workspace `work/stage16b-final1-local.log`. The complete updated external result is accepted for this finalization.

## Manager administration — G2 implemented

HRM Teams now includes a separate Reporting manager panel. The administrator enters an explicit employee UUID and loads GET `/hrm/employees/{employee}/manager`. Only `{employee_id, manager_employee_id, version}` is retained/rendered. No name enrichment or employee/me read occurs; neutral reference labels explain that names are unavailable. A null manager is an explicit unassigned relationship with its own authoritative version.

The exact GET version N is sent with `{manager_employee_id: UUID|null, version: N}` on confirmed PATCH. Success consumes the response and replaces both relationship and version. No optimistic state update is used. TEAM_VERSION_STALE and other unconfirmed outcomes clear the draft, reload GET, show safe feedback, and require a new explicit submission. This versioned mutation is never automatically replayed, including on uncertain transport outcomes. Team lead and reporting manager remain independent.

Read/entry requires teams.view plus payroll; write additionally requires teams.manage. Platform-admin and navigation visibility confer no bypass. Context changes clear the employee UUID, manager UUID, relationship, version, confirmation and feedback; shared context fences abort reads and reject late read/PATCH continuations. Nothing is persisted or logged.

Final inventory counts across 44 capability IDs: 12 existing COMPLETE, 11 IMPLEMENTED (including G2), 7 ADAPTED/REDESIGNED, 11 DEFERRED, 3 DO-NOT-PORT. Backend infrastructure is NOT-APPLICABLE outside those 44 IDs. ZERO unexplained capability. G2 is IMPLEMENTED. CONTRACT GAPS: 0. All other deliberate deferrals remain unchanged.

Deliberate backend deferrals remain: asset custody/issuance/stock/return/damage; expense payment/disbursement/Banking/GL; overnight shifts; schedule-derived attendance/payroll; document verification/expiry/required policies; announcement targeting/read receipts/provider email; salary revision/PDF; fake dashboard aggregates/attendance classifications; invented calendar events; generic withdrawal; education/experience edits; bank/tax/private HR; fake 2FA/backup codes; V1 historical migration. Additional unsupported account email/avatar and language/timezone settings remain absent.

The release consists of exactly one local frontend commit above the baseline, titled `Stage 16B-FINAL-FE: complete employee portal frontend`. Its hash is the commit containing this report and is also recorded in the final task response; it cannot be embedded in its own contents. Backend and V1/reference remain unchanged. DEV RELEASE CANDIDATE: READY FOR PUSH VERIFICATION. Deployment and production cutover are not authorized.

## Consolidated final verification and repository status

| Gate | Current result |
|---|---|
| Final focused | 125/125 PASS — accepted complete external run |
| Stage 16B.5 Tasks/Tickets | 4/4 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Stage 16B.4 Leave | 4/4 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Stage 16B.3 Attendance | 5/5 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Stage 16B.2 Payroll | 4/4 unit PASS; browser PASS — accepted external run |
| Stage 16B.1 Portal | 4/4 unit PASS; browser PASS — accepted external run |
| Stage 16C Identity | 3/3 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Stage 16A Navigation | 4/4 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Stage 15B FBR | 4/4 unit PASS; real HTTP PASS; browser PASS — accepted external run |
| Typecheck / production build | PASS after final application edits |
| Complete frontend E2E | PASS — accepted complete external run; local API-only subset 7/7 PASS |
| Responsive 390/768/1440 / keyboard/dialog/focus | PASS — accepted automated browser assertions; subsequent DEV manual QA remains separate |
| Privacy/domain-firewall/static/secret/artifact/whitespace | PASS; new source checked and existing firewalls pass |

Exactly 36 frontend files comprise the release: 16 baseline-file modifications and 20 additions. The commit range is `98d583f6bc774d09e7779c81501180fd58ea4185..HEAD` at finalization, exactly one local commit. Local origin/main remains the baseline because no push occurred. Only the Attendance browser selector/assertion correction above changes a previous-stage browser file; corrected Work tests remain untouched. The existing navigation unit mapping count changes from 56 to 65 for nine newly mapped certified identities. Final staging is restricted to the reviewed list below and verified byte-for-byte before commit.

Backend HEAD and local origin/main remain `e900c8bb44f57763005e3e91558168bb8d4c0557`, main, clean. Reference HEAD/local origin/main remain `7b97c3704dc4460dbc7f11263f178fb7b818e67a`, main, clean. V1 HEAD/local origin/main remain `56932b69b73deb5f79e245be7fbbe31b2fbe017e`, main, clean. These are local remote-tracking comparisons; no fetch or push was performed. No deployment, production access or V1 production-data access occurred.

Exact changed-file list (paths relative to the frontend repository):

- `docs/stage-16b-final-dev-readiness.md`
- `docs/stage-16b-final-frontend-parity-matrix.md`
- `docs/stage-16b-final-frontend.md`
- `package.json`
- `playwright.config.ts`
- `playwright.employee-final.config.ts`
- `src/components/employee/PortalSidebar.vue`
- `src/components/employee/PortalTopbar.vue`
- `src/components/leave/LeaveCalendar.vue`
- `src/components/portal-final/EmployeeAddress.vue`
- `src/components/portal-final/EmployeeManager.vue`
- `src/components/portal-final/PortalDomain.vue`
- `src/components/portal-final/PortalPreviews.vue`
- `src/lib/nav.ts`
- `src/lib/portalFinal.ts`
- `src/pages/HrmPortalResources.vue`
- `src/pages/HrmRotas.vue`
- `src/pages/HrmTeams.vue`
- `src/pages/employee/EmployeeDashboard.vue`
- `src/pages/employee/EmployeeLeaves.vue`
- `src/pages/employee/EmployeeProfile.vue`
- `src/pages/employee/EmployeeRequests.vue`
- `src/pages/employee/EmployeeResources.vue`
- `src/router/index.ts`
- `src/services/employeeManager.repository.ts`
- `src/services/identity.repository.ts`
- `src/services/portalFinal.repository.ts`
- `src/types/identity.ts`
- `src/types/portalFinal.ts`
- `tests/e2e/portal-final-contract.spec.ts`
- `tests/employee-attendance/browser.spec.ts`
- `tests/employee-final/browser.spec.ts`
- `tests/employee-final/manager.spec.ts`
- `tests/employee-final/unit.spec.ts`
- `tests/navigation/unit.spec.ts`
- `tests/support/portal-final-fixture.php`

The verifier script and logs are outside the frontend repository and are not part of the 36-file source change. Generated dist/Playwright outputs are ignored local verification products and excluded from the staged/committed tree. Pattern checks are not a claim that synthetic fixture passwords are production credentials; the fixture contains testing-only accounts and guards against non-disposable environments.

Final frontend review accepts the complete updated verification and reconciles all 44 capability IDs plus reference-only controls. Operational DEV approval, push verification and Zeeshan's manual QA remain subsequent work described in `stage-16b-final-dev-readiness.md`. No production or V1 production-data access occurred.

FRONTEND — STAGE 16B-FINAL-FE EMPLOYEE PORTAL: COMPLETE
BACKEND — FROZEN AT e900c8bb44f57763005e3e91558168bb8d4c0557
FRONTEND VERIFICATION: PASSED
CONTRACT GAPS: 0
DEV RELEASE CANDIDATE: READY FOR PUSH VERIFICATION
DEV DEPLOYMENT: NOT EXECUTED
V1 EMPLOYEE PORTAL PRODUCTION MIGRATION: NOT EXECUTED
PRODUCTION CUTOVER: NOT APPROVED
