# DEV release candidate checklist — do not deploy

Status: READY FOR PUSH VERIFICATION. G2 is implemented and the complete updated external normal-Terminal verifier passed; this checklist accompanies the single local release commit. No deployment, production access or V1 production-data migration has been performed.

## Backend and operations

- [x] Confirmed approved backend remains `e900c8bb44f57763005e3e91558168bb8d4c0557`.
- [ ] Retain the supplied MariaDB certification evidence. This frontend task used disposable SQLite HTTP verification and did not rerun MariaDB concurrency certification.
- [ ] Review DEV backup and restore, database/file consistency, storage permissions and encryption-key continuity before migration. Never regenerate APP_KEY over existing encrypted addresses/contacts/files.
- [ ] Apply pending backend migrations in timestamp order using the normal reviewed DEV migration process. Never use migrate:fresh against DEV data. Final additions cover personal-upload idempotency, self address/contacts, announcements, teams/manager, asset requests, expense categories/claims and schedules (2026_10_03_143810 through 161011).
- [ ] Seed/reconcile the certified permission catalog through the approved targeted platform seed process; review actual DEV role grants. Do not run demo factories or frontend test fixtures in DEV. New permission families are employee.profile.edit, employee.documents.*, employee.announcements.view, announcements.*, employee.directory.view, employee.teams.view, teams.*, employee.schedule.*, schedules.*, employee.assets.*, assets.*, employee.expenses.* and expenses.*.
- [ ] Confirm active company membership, explicit employee links, payroll entitlement, company timezone and effective_navigation for employee/admin personas. A platform-admin flag does not substitute for permission.
- [ ] Provision private DocumentService storage and existing storage quota policy. Preserve DOCUMENT_MAX_KILOBYTES (default 10240) and certified MIME configuration. These employee files need no public symlink; never expose their storage directory via storage:link or public URLs.
- [ ] Review normal environment/session/CSRF/CORS/APP_URL/FRONTEND_URL settings. No new frontend provider credentials are introduced. Confirm existing private storage configuration; no production provider endpoint is used for QA.
- [ ] Review current queue worker/scheduler setup and health. Existing platform jobs, in-app notification infrastructure and queues remain; announcement expiry is checked by read queries and does not require a fabricated portal expiry job. Restart approved workers after release if backend code changes; retain scheduler single-server/overlap configuration.
- [ ] After approved backend migration/config changes, clear/rebuild relevant Laravel config/route/view caches through the normal DEV process. Verify actual role/navigation results after cache refresh.
- [ ] Plan rollback as an approved app rollback plus compatible data/storage restore. Do not drop tables containing uploaded files, releases, claims or schedules to undo a frontend release. Keep backups, schema compatibility and encryption keys together. Returning to the previous frontend should not replay operational decisions.

## Frontend

- [x] Frontend release identity: the single commit containing this checklist, above baseline `98d583f6bc774d09e7779c81501180fd58ea4185`; exact hash is reported in the final task response.
- [x] Accepted complete updated external verifier: focused suite, all prior regressions, full E2E, HTTP contract and artifact/static checks passed.
- [x] Final production build PASS and intended artifact review PASS. Only built deployment assets belong in the eventual deployment process; do not commit dist, screenshots, traces, reports, environment files or test database copies.
- [ ] Confirm VITE_API_BASE_URL targets the approved DEV backend, or the approved same-origin `/api/v1` proxy. Verify session cookies/CSRF/CORS under the real DEV origins. Build-time environment changes require a rebuilt frontend; no credentials belong in VITE variables.
- [x] Complete main-branch baseline review and single local release commit finalization. No push/deployment is authorized in this task.

## Zeeshan manual QA

Use synthetic DEV records only. Prepare separate active employee, peer target, employee without write permission, unlinked membership, resigned/terminated linked employee, administrative reader, administrative manager and platform-admin-without-domain-permission personas. Use companies A/B/C with different permissions and links. Repeat critical navigation/forms at 390, 768 and 1440 pixels.

| Area | Employee checks | Administrator / boundary checks |
|---|---|---|
| Login/session | Sign in, refresh, sign out, reset flow | No employee link inferred from account name/email |
| Company switching | A→B→C during list/detail/form/upload/download/mutation; no old content or notices | New role/modules/navigation apply without privilege carry-over |
| Profile/account/password | HR fields read-only; name update; current-password rejection/success; session preserved; fields clear | No email/avatar/DOB/gender/salary/bank/tax edits |
| Address/contacts | Address version conflict; contact add/edit/remove; cancel/focus; clear on switch | No emergency contacts in directory/team screens; former writes blocked |
| Notifications/preferences | Read, read-all, paging, preference save/error | No email delivery/read-receipt claim |
| Documents | Own uploads/released issued files; download denial/retry; uncertain retry same file | Issue remains invisible until separate release; foreign company denied; no delete/retract |
| Announcements | Published/unexpired feed/detail/attachment | Draft/edit/attachment/publish, expired visibility, separate manage/publish grants |
| Directory/My Team | Search/paging, narrow fields, explicit manager/lead/reports | Team create/rename/member add/remove/lead; explicit manager GET/edit/clear, exact version, stale conflict reload without replay, cycle rejection |
| Payroll/payslips | Released history/detail/print; unreleased denied | Existing explicit release/firewalls unchanged; no payment inference |
| Attendance/breaks/corrections | Clock/break/end, history/calendar, correction request, stale switch | Correct decision/intervention permissions and immutable evidence |
| Leave/holidays | Balance units, apply, attachments, cancel/cancellation pending, holiday dates | Own-request guard from is_own_request only; approval/cancellation/type/allocation boundaries |
| Tasks/tickets | Certified transitions/comments/files, safe errors, same-key retry | CRM/HRM separation, hidden direct route, assignment/content/version decisions |
| Schedule | Published own date range/company time, former history cap | Day-only shifts, rota/slots/coverage/assignments/publication; conflict and version reload |
| Swaps | Own and explicitly shared target references; target consent/decline | Separate PENDING_ADMIN decision; participants cannot self-decide; no optimistic exchange |
| Equipment | NEW_EQUIPMENT request/history | Approve/reject is not issuance; no custody/stock state |
| Expenses | Exact PKR amount, category, draft/edit/receipt/submit/history | Submitted review/private receipt/decision; approved is not paid; no Accounting/Banking effect |
| Dashboard/calendar/Requests | Honest previews/totals; source statuses/events; independent source errors | No fabricated global totals, absence/late/birthday/meeting/deadline or generic withdrawal |
| Navigation/permissions | Explicit SHOW cannot overcome missing permission/entitlement | Every new certified identity, hide vs direct authorization, platform-admin non-bypass |
| Former employees | Historical reads retained; new self mutations absent | Directory/current team denied; account itself not globally disabled |
| Responsive/accessibility | No page overflow; keyboard-only forms; correct labels | Dialog focus trap, Escape, focus return, pending lock and safe text errors |

Record screenshots/results only in the approved QA artifact location, never in the source commit. Manual QA and operational approvals remain pending; this checklist is not a claim of deployment or accessibility certification.
