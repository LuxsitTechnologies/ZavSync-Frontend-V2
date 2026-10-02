# Stage 16C frontend user and employee identity

Baseline: frontend main dda4e4ea5335b936447c993c6aaa72afce0668d0, initially clean.
Frozen backend: main 5b7478358547652fa27aac4cbd3ecd9f2b6328b1, clean.
Both configured origins matched the specified LuxsitTechnologies repositories.
The preceding d51cca8 identity audit is retained; Stage 16C.1 resolves its selector gap.

## Identity and contract boundaries

Global account, company membership and company employee are separate authorities.
No employee is inferred from account name/email or searched to resolve self identity.
No commercial entitlement or Stage 16A presentation key is introduced for Profile.

GET /auth/profile returns an unwrapped id/name/email/email_verified resource. PATCH
sends only name and uses the server response. Email is read-only; there is no avatar
or email-change control. IDs and privilege fields are not exposed as editable fields.
A failed name update restores the last loaded authoritative name and displays errors.
The topbar's existing initials/name link opens /profile. This authenticated global route
works without employee linkage or active company. Existing route guards are otherwise
unchanged; the profile does not depend on payroll or employee-self permission.

GET /employee/me sends X-Company-Id and is called only with employee.self.view.
The {linked,employee,self_editable} response is rendered through an explicit field list:
code/name, work email/phone, department/designation, employment type/status/dates/location.
Linked terminated/resigned records remain readable. Text does not imply global account
suspension. Unlinked membership shows an honest no-profile state. There are no HR edits,
Payroll enrichment, salary, bank, tax/statutory, private notes or unrelated employees.
Extra fields are never rendered through raw JSON or dynamic resource enumeration.

POST /auth/change-password sends current_password, password and password_confirmation.
New password minimum is 12; server owns current-password/confirmation validation. Forms
have autocomplete, field errors and busy guards; values clear on success, failure and
component teardown. No password is logged or persisted by application code. The certified
backend preserves the current browser session, revokes API tokens and other database
sessions. UI explains that scope; existing unauthenticated handling remains in place.

## Link administration and resolved selector blocker

Users & Invitations links authorized administrators to /users/{membership}/employee-link.
Route and component require employee.links.manage; platform-admin flag and payroll.view
are not substitutes. The parent Users directory retains its existing platform.users.view
permission; direct authorized membership-link routes require employee.links.manage.

GET/PUT/DELETE /platform/users/{membership}/employee-link returns membership_id,
employee_id and linked. PUT sends only employee_id. Existing links must be explicitly
unlinked before selecting another employee. Unlink uses an accessible confirmation.
409 conflicts and 404/cross-company failures render safe errors; failed mutations reload
link and candidate state, not optimistic reassignment. Backend remains final authority.

GET /platform/employee-link-options requires employee.links.manage, not payroll.view.
The paginated data/meta resource contains only id, employee_code, full_name, status,
linked, available. Frontend uses search, page, per_page (default 25, UI choices 10–100).
Search uses code/name; option labels include code, name, status and availability.
Already-linked records stay visible but disabled. Terminated/resigned options are not
filtered by frontend status. No Payroll or general employee-detail endpoint is used.

## Company and privacy protection

Profile and link contents unmount during company switching and remount by contextVersion;
link content also keys by membership route. AbortController cancels outstanding requests.
All result continuations check component lifetime, company, user and context version.
Candidate searches additionally use request sequence checks so older searches cannot win.
Password and selected-candidate values clear with teardown; old identity is not shown
while switching. A membership ID from another company remains subject to backend 404;
the frontend never translates it by guessing a user/employee association.

## Verification

Local PASS: application/test typecheck, three identity unit tests, four navigation unit
tests, four FBR unit/firewall tests, production build, PHP fixture syntax and HTTP identity
contract test. The real contract uses an isolated git-archive copy of backend 5b747835,
never the frozen checkout, with synthetic SQLite data and disabled provider endpoints.
The disposable test fixture is guarded by testing environment and exact SQLite DB path.
It creates separate identity-only accounts/companies, without changing the finance user.

HTTP coverage: profile GET/name PATCH/prohibited email, linked/terminated/resigned/unlinked
self identity across A/B/C; selector minimal fields/search/pagination/company scope without
Payroll permission; link/409 no reassignment/404 foreign candidate/unlink; ordinary reader
selector and write denials; password validation/change and surviving browser session.
Token/other-database-session revocation is grounded in certified backend source/tests;
the local HTTP test uses the existing file-session E2E harness.

Final supplied normal-macOS-Terminal verification, reconciled with this worktree:
- Typecheck: PASS.
- Identity unit suite: 3/3 PASS.
- Identity browser suite: 18/18 PASS.
- Stage 16A navigation regression: 16/16 PASS (four unit and twelve browser cases).
- FBR unit/Accounting-firewall: 4/4 PASS.
- Production build: PASS.
- Complete E2E: 14/14 PASS, including the real Stage 16C identity contract.
- Complete Stage 15B FBR configuration: 24/24 PASS (includes four unit checks).

These are supplied external results, not claimed as Codex-executed browser runs.
The earlier Codex Chromium attempt failed before app loading with the macOS sandbox
MachPortRendezvousServer Permission denied (1100). The successful external run satisfies
the browser gate. No application behavior or tests changed during finalization.

Browser coverage confirms narrow account-name updates, read-only email/employee fields,
failed name restoration, terminated/resigned readable identity, A/B/C switching and stale
responses, platform-admin non-bypass, password errors/success/double-submit/clearing,
selector search/pagination/availability, explicit link and confirmed unlink, no Payroll
dependency, 409 authoritative reload, ordinary-user denial and safe validation handling.
Responsive/keyboard cases passed at 390/768/1440px, including dialog Escape/focus behavior.
This is scoped automated coverage, not comprehensive accessibility certification.

Final review found only intended source, tests, configuration and audit documentation.
Whitespace, secret/hardcoded endpoint, artifact, identity privacy and FBR firewall checks
passed. No screenshots/traces/reports, .env files, production credentials or temporary
artifacts are included. Synthetic test passwords and local test URLs are test-only.
No existing lint configuration/script; no lint PASS claimed.

## Deferred work

No broader Employee Portal, HR self-edit, email change, avatar upload, emergency contacts,
experience/education, production user/employee migration or cutover. Payroll, Accounting,
FBR financial behavior, subscriptions, entitlements and Stage 16A visibility are unchanged.
Employee Portal authorization/workflows and deferred HR fields need separate scoping.
No push, deployment, real provider calls or production data operations.
