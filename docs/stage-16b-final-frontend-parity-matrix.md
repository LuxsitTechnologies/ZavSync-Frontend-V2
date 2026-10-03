# Stage 16B-FINAL frontend parity matrix

Implementation plan recorded before application edits. Planned IMPLEMENT/ADAPT rows are not completion claims. Final dispositions are reconciled below; complete updated external verification has passed.

## Verified baselines

Frontend main and local origin/main: `98d583f6bc774d09e7779c81501180fd58ea4185`; backend main and local origin/main: `03a601331b45db4e8092f7b3452720e6bf384769`. Both worktrees clean before implementation. Design reference `7b97c3704dc4460dbc7f11263f178fb7b818e67a` and V1 `56932b69b73deb5f79e245be7fbbe31b2fbe017e` clean and read-only. No production data access.

Primary authority: frozen backend `docs/stage-16b-final-employee-portal-contract.md`; backend parity matrix supplies behavioral inventory. Reference mock records and local transitions are presentation evidence only.

FE.1 authority update: backend main/HEAD/local origin/main reverified clean at `e900c8bb44f57763005e3e91558168bb8d4c0557`; frontend main/HEAD/local origin/main remain at the required baseline, preserving the externally verified uncommitted implementation.

## Capability inventory

| ID | Capability | Certified authority | Initial disposition | Boundary / rationale |
|---|---|---|---|---|
| I1 | Account identity, login, reset, sessions | `AuthController`, `AccountProfileController`, Sanctum | COMPLETE | Reuse; do not rebuild auth. |
| I2 | Explicit company-to-employee link | `CompanyUser.employee_id`, Stage 16C | COMPLETE | Reuse explicit link; no name/email matching. |
| I3 | Account name, email, phone, password | Account profile and password APIs | COMPLETE | Account-owned fields stay on User/account API. |
| I4 | Employee code, department, designation, employment dates/status | `EmployeeSelfProfileResource` | COMPLETE | HR-owned read-only, never self-write. |
| I5 | Address, DOB, gender | Stage 16B-FINAL encrypted employee address + versioned self update | IMPLEMENT | Approved: self-edit address only; DOB/gender remain HR-owned and excluded from self writes. |
| I6 | Emergency contacts | Stage 16B-FINAL scoped encrypted contact resource | IMPLEMENT | Approved: employee self-edit through a scoped contact resource. |
| I7 | Education and work experience | No V2 resource | DEFER | Employee self-edit is limited to address and emergency contacts; education/experience disclosure and HR maintenance need a separate reviewed contract. |
| I8 | Bank, tax and private HR profile fields | Payroll profiles are HR/Payroll-controlled | DO-NOT-PORT | Do not disclose or self-edit from prototype parity alone. |
| I9 | Prototype 2FA / backup codes | No certified authenticator lifecycle | DEFER | No fake 2FA or fabricated recovery codes. |
| P1 | Released payslip history/detail/payment state | `EmployeePayrollController`, release metadata | COMPLETE | Keep explicit release and GL authority. |
| P2 | Salary revision chart, PDF download | No employee-safe revision/PDF contract | DEFER | Separate disclosure and document certification. |
| T1 | Clock in/out, breaks, history, calendar | `EmployeeAttendanceController`, Attendance services | COMPLETE | Preserve evidence and timezone contract. |
| T2 | Attendance correction request/decision | V2 correction resources | COMPLETE | Preserve immutable correction evidence. |
| T3 | Absence, late, early-out, overtime classifications | No certified policy authority | DEFER | Do not synthesize from raw timestamps. |
| L1 | Leave types, exact balances, requests, decisions, cancellation | V2 Leave domain | COMPLETE | Preserve half-day units, reservation, overlap rules. |
| L2 | Fixed-date company holidays | `HolidayController` | COMPLETE | Manually managed dates; no inferred recurrence. |
| W1 | Employee tasks, comments, private files | Stage 16B.5 work domain | COMPLETE | Preserve assigned-employee scope and version/idempotency. |
| W2 | Employee tickets, comments, private files | Stage 16B.5 work domain | COMPLETE | Preserve self ownership and admin boundary. |
| W3 | Task project/progress percentages and fake overdue status | No V2 Task project/progress lifecycle | DEFER | Do not manufacture fields from prototype. |
| D1 | Personal employee documents: list, metadata, upload, download | Stage 16B-FINAL parent-authorized self-document API | IMPLEMENT | Private append-only self upload/read; no public URL or delete. |
| D2 | HR-issued or assigned employee-visible documents | Stage 16B-FINAL issue/release API and release metadata | IMPLEMENT | Approved: explicit admin release is required independently of upload/assignment; unreleased files stay invisible to employees. |
| D3 | Folder/category, verification/expiry/required status | Category metadata only; no verification/expiry/required workflow | ADAPT | Fixed safe category metadata is implemented. Verification, expiry and required-document policy are deferred because no authoritative workflow was approved. |
| A1 | Company-wide announcement feed, detail | Stage 16B-FINAL `CompanyAnnouncement` draft/publish/expiry | IMPLEMENT | Company-scoped publication and allowlisted read. |
| A2 | Announcement attachments/targeting/notification | Stage 16B-FINAL private attachment and V2 notification delivery | ADAPT | Private attachment; company-wide targeting only, no role-title logic. |
| A3 | Announcement read receipts | No V2 authority | DO-NOT-PORT | No inferred read tracking. |
| G1 | Company colleague directory | Stage 16B-FINAL privacy-minimized directory API | IMPLEMENT | Narrow scoped directory; only approved public-internal fields. |
| G2 | My Team, manager, team lead, membership | Stage 16B-FINAL explicit team, membership, lead and reporting-manager relations | IMPLEMENT | Department alone is not reporting line. |
| S1 | Shift definition and rota period | Stage 16B-FINAL `EmployeeShift`, `EmployeeRota`, `EmployeeRotaSlot` | IMPLEMENT | Approved day-only shifts; overnight is deferred. Company-scoped draft/publish schedule; `required_coverage` is a minimum staffing target, not a maximum. |
| S2 | Employee schedule assignment and self read | Stage 16B-FINAL `EmployeeShiftAssignment` | IMPLEMENT | Explicit employee UUID, no overlapping time for one employee, published-only self visibility. |
| S3 | Swap request and manager decision | Stage 16B-FINAL `EmployeeShiftSwap` and immutable events | ADAPT | Requester derived from linked employee; target employee must accept before a separate administrator may approve an atomic fenced exchange. |
| S4 | Schedule-derived attendance/payroll changes | No V2 integration contract | DO-NOT-PORT | Schedule must not rewrite evidence or Payroll. |
| X1 | Assigned assets and issuance/return/damage history | V2 Inventory exists, no employee custody ledger | DEFER | Custody authority, privacy and Inventory mapping have not been approved; no fake issuance. |
| X2 | Employee equipment/return/damage request | Stage 16B-FINAL new-equipment request/decision subset | ADAPT | New-equipment request/decision isolated. Return/damage requires certified employee-custody evidence; no automatic stock movement. |
| X3 | Fulfilment, return and stock effect | V2 Inventory movement authority | DEFER | No certified Inventory service/custody boundary; approval must not be presented as fulfilment. |
| E1 | Expense category, claim, receipt, pending edits/submission | Stage 16B-FINAL claim/category/receipt resources | IMPLEMENT | Integer minor units, self scope, private receipt and immutable submit event. |
| E2 | Expense approval/rejection | Stage 16B-FINAL admin decision lifecycle | IMPLEMENT | Separate admin permission, no self-approval, version/idempotency. |
| E3 | Expense disbursement/payment | V2 Banking exists, no claim-payment contract | DEFER | No approved payment authority or Banking settlement contract; approval is not payment. |
| E4 | Expense accounting/journal posting | V2 JournalPostingService authoritative | DEFER | No approved accounting mapping/posting contract; no automatic journal. |
| N1 | Company notifications, read state, preferences | V2 `NotificationService` and APIs | COMPLETE | Reuse recipient-scoped preferences; no parallel inbox. |
| N2 | Email/provider delivery | Stage 10/11 queue/outreach separate | DEFER | Do not claim delivery from in-app event. |
| C1 | Employee dashboard composition | Certified Attendance/Leave/Payroll/Work/Notification and new portal reads | ADAPT | Frontend composes source APIs; no new backend aggregate or fabricated totals. |
| C2 | Employee calendar composition | Leave/holiday/attendance and published schedule reads | ADAPT | Frontend composes certified sources; birthdays/meetings/deadlines remain deferred because no authoritative sources exist. |
| R1 | Unified Requests list and withdrawal | Domain-specific Leave/Ticket plus Stage 16B-FINAL asset/expense/swap APIs | ADAPT | Frontend may compose domain lists; no generic mutation or cross-domain withdrawal. |
| M1 | V1 historical migration of remaining portal domains | Existing V2 migration infrastructure, no portal imports | DEFER | Separate mapping, dry-run and exception stage; no production access or side effects now. |

## Additional reference controls and components

| Reference capability | Disposition | Reason / destination |
|---|---|---|
| Login/ForgotPassword/SetPassword | COMPLETE | Existing V2 authentication/session/reset; never port simulated timers. |
| NotFound | COMPLETE | Existing V2 routing fallback. |
| AppShell/Sidebar/Topbar/NavBranch/NavLeaf/Logo/AuthLayout | COMPLETE | Existing AppShell and PortalShell; extend portal menu/breadcrumbs, preserve company and keyboard handling. |
| Panel/PageHeader/Toolbar/Field/SearchInput/ZButton/DataTable/StatCard/StatusBadge | COMPLETE | Reuse existing V2 design system; explicit labels for every new select. |
| AreaChart / monthly hours and salary trends | DEFER | Reference values are fabricated; no certified aggregate supplied. |
| Global search | DEFER | No certified cross-domain search. Domain searches only where supported. |
| Theme | COMPLETE | Existing presentation-only theme toggle. |
| Notification clear/delete, prototype categories/totals | DO-NOT-PORT | Existing recipient inbox pagination/read/preferences only; no unsupported delete or calculated global totals. |
| Settings language/browser timezone overrides | DEFER | No persistence/translation contract; company timezone stays authoritative. |
| Avatar upload and email change | DEFER | No account API; keep email read-only and initials presentation. |
| Team availability/email/phone/message buttons | DO-NOT-PORT | Narrow card exposes name/department/designation/location only; no availability or contact enrichment. |
| Document category/search chips and verification/required/expiry badges | ADAPT | Only PERSONAL/ISSUED metadata; do not imply server-wide search from one page; no invented badges. |
| Expense projects/payment methods/reimbursed tab | DO-NOT-PORT | Certified category/claim/receipt/decision only. |
| Task project/progress/overdue and arbitrary status picker | DO-NOT-PORT | Preserve certified Stage 16B.5 transitions. |
| Requests generic totals/withdraw | ADAPT | Source-labelled read/navigation previews with native statuses and links to each source’s full paginated workflow; no generic mutation. |
| Calendar day navigation / empty dates | ADAPT | Leave/holiday calendar plus published schedule; no absence, birthday, meeting or deadline inference. |
| Print released payslip | COMPLETE | Existing V2 released payslip print; no generated official PDF or payment inference. |
| Employee profile request-change placeholders | ADAPT | Address and contacts are explicit self writes; other employee fields remain HR-owned. |

## G2 certified closure

Backend `e900c8bb44f57763005e3e91558168bb8d4c0557` supplies GET `/hrm/employees/{employee}/manager` requiring teams.view and payroll. The HRM Teams editor consumes only employee_id, manager_employee_id and version. PATCH requires teams.manage, sends the exact fetched version and accepts the authoritative returned relationship/version. Null clears the manager. TEAM_VERSION_STALE reloads GET and requires a fresh explicit intent; it never automatically replays the change. Explicit employee UUIDs remain separate from team leads, departments, account identities and self-profile reads. G2 is IMPLEMENTED; CONTRACT GAPS: 0.

Swap target discovery: own schedule intentionally excludes other employees' assignments. A target may explicitly share its assignment UUID; the UI must not query admin rotas or fabricate a colleague schedule. No target browser/selector is implied by the frozen contract. Implement explicit assignment-reference entry and server validation, with the own assignment reference copied from own published schedule.

## Final implementation and endpoint coverage audit

All new operational reads/writes require payroll entitlement, exact per-operation permission, existing authenticated client and company context. Account profile remains independently available. Every navigation identity in the final handoff is mapped without visibility-derived authorization.

| Backend capability | Final classification | Surface / decision |
|---|---|---|
| GET/PATCH employee/me | CONSUMED | Existing identity plus address-only versioned edit; GET retains entitlement-independent identity semantics. |
| GET/POST employee/emergency-contacts; GET/PATCH/DELETE contact | CONSUMED | Self profile, paginated list/detail/create/edit/confirmed removal. |
| GET/POST employee/documents; GET detail/download | CONSUMED | Personal uploads and server-released issued documents. |
| GET/POST hrm/employee-documents; GET detail/download; POST release | ADMIN-ONLY-CONSUMED | Explicit employee UUID, private issued file, separate release. |
| GET employee/announcements/detail/attachment | CONSUMED | Published/unexpired feed/detail/private attachment. |
| GET/POST/PATCH hrm/announcements; GET/POST attachment; POST publish | ADMIN-ONLY-CONSUMED | Draft edit, attachment, expiry and explicit publication. |
| GET employee/directory | CONSUMED | Server search/pagination, narrow public-internal cards. |
| GET employee/my-teams/detail/direct-reports | CONSUMED | Explicit manager, team membership, lead and reports. |
| GET/POST/PATCH hrm/teams; GET detail; POST/DELETE members; PATCH lead | ADMIN-ONLY-CONSUMED | Separate admin team management. |
| GET/PATCH hrm/employees/:employee/manager | ADMIN-ONLY-CONSUMED | Narrow authorized GET supplies the exact PATCH version; null clear, conflict reload and company fencing. |
| GET employee/schedule | CONSUMED | Own published assignments; date range, company-local time. |
| GET/POST hrm/shifts; GET/POST hrm/rotas; GET rota; POST slots/assignments/publish | ADMIN-ONLY-CONSUMED | Day shifts, draft periods, slots, explicit employees, publication. |
| GET/POST employee/shift-swaps; GET detail; POST accept/decline | CONSUMED | Explicit target assignment reference; target consent separate from admin decision. |
| GET hrm/shift-swaps/detail; POST approve/reject | ADMIN-ONLY-CONSUMED | Versioned server-authoritative decisions, no employee identity inference. |
| GET/POST employee/asset-requests; GET detail | CONSUMED | NEW_EQUIPMENT only, approval is not issuance. |
| GET hrm/asset-requests/detail; POST approve/reject | ADMIN-ONLY-CONSUMED | Operational decisions only. |
| GET employee/expense-categories | CONSUMED | Complete active-category list from the certified nonpaginated self endpoint. |
| GET hrm/expense-categories; POST; PATCH active | ADMIN-ONLY-CONSUMED | Read requires expenses.view; writes categories.manage. |
| GET/POST/PATCH employee/expense-claims; GET detail/receipt; POST receipt/submit | CONSUMED | Integer PKR minor units, draft then submit. |
| GET hrm/expense-claims/detail/receipt; POST approve/reject | ADMIN-ONLY-CONSUMED | No payment, GL or Banking authority. |
| Existing payroll/attendance/leave/work/notifications/account | CONSUMED | Preserve existing adapters and workflows; compose narrow reads only. |
| Audit, notification delivery, transactional locks, storage internals | NOT-APPLICABLE-TO-FRONTEND | Backend-owned infrastructure, no frontend replay. |
| Explicit backend deferrals D3/A3/S4/X1/X3/E3/E4/I7/I8/I9/P2/T3/W3/N2/M1 | DEFERRED-BY-BACKEND | Preserve each boundary above; no simulated controls or data. |

Complete updated external verification has passed; final release review confirms zero contract gaps.

## Final parity reconciliation

The initial inventory above is preserved to distinguish the pre-edit audit from implementation. Current code dispositions are below; implementation dispositions are supported by the accepted complete external verifier PASS.

| Final disposition | Capability IDs / reference controls | Result |
|---|---|---|
| COMPLETE (existing, preserved) | I1–I4, P1, T1–T2, L1–L2, W1–W2, N1; authentication, NotFound, shell, design system, theme, released-payslip print | Existing certified flows retained; all required browser regressions passed in the accepted complete external run. I3 retains only certified account-name/password writes; email stays read-only. |
| IMPLEMENTED | I5–I6, D1–D2, A1, G1–G2, S1–S2, E1–E2 | Address/contacts, private documents/release, announcements, directory/team/manager administration, day schedules, claims/decisions implemented. |
| ADAPTED/REDESIGNED | D3, A2, S3, X2, C1–C2, R1; request-change controls, dashboard, calendar, Requests | Only certified subsets implemented; private files/company-wide publication/target consent/new-equipment requests/read compositions. `/expenses` redirects to the permission-guarded `/hrm/expenses` claim administration rather than retaining its obsolete placeholder. |
| DEFERRED | I7, I9, P2, T3, W3, X1, X3, E3–E4, N2, M1; charts/global search/language/browser timezone/avatar/email | No invented authority; detailed boundaries above and in the stage handoff. |
| DO-NOT-PORT | I8, A3, S4; notification deletion/fake counts, colleague contact/message/availability actions, generic withdrawal | No privacy leaks, fake data, unsupported side effects or local lifecycle transitions. |
| NOT-APPLICABLE | Backend locks/audit/storage/queue internals; reference component implementation details | Existing server infrastructure and V2 design components supply the behavior; no duplicate authority. |

Optional server status/employee filters on administrative request lists are intentionally not surfaced in this first UI: paginated company-scoped lists and authoritative detail/actions remain available. Directory search, document employee filter and schedule date range are surfaced. Team-member action options use the current member page; navigate member pages to select another member. Swap discovery is explicit reference sharing, not an inferred relationship. No additional read API is silently substituted.

All 44 inventory IDs and additional reference controls have explicit dispositions. G2 is now consumed against the updated backend. ZERO CONTRACT-GAP and ZERO unexplained capability; complete updated external verification passed and the release is ready for local finalization/push verification.

Final 44-ID counts: COMPLETE 12; IMPLEMENTED 11; ADAPTED/REDESIGNED 7; DEFERRED 11; DO-NOT-PORT 3; CONTRACT-GAP 0. Backend-only infrastructure is NOT-APPLICABLE outside this count. All additional reference controls are explained above.
