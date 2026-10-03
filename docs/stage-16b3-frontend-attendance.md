# Stage 16B.3-FE — Employee Attendance

Frontend baseline: `0bb8d3951a479f0ec398948bfb5b4840ce328523`. Frozen backend contract: `082b97a3612b14d07b5a783e9613ed9373dd1d01`.

The Employee Portal attendance page reuses the layout and visual structure of the existing `zavsync-employee/src/pages/Attendance.vue` design reference. Its prototype records, local clock simulation and inferred absence/late labels are not used. The existing Portal shell, navigation and company context remain authoritative.

## API and authorization

| Surface | API | Permission |
| --- | --- | --- |
| Today/status | `GET /api/v1/employee/attendance/status` | `employee.attendance.view` |
| Clock in/out | `POST /api/v1/employee/attendance/clock-in`, `/clock-out` | `employee.attendance.clock` |
| Break start/end | `POST /api/v1/employee/attendance/breaks/start`, `/breaks/end` | `employee.attendance.clock` |
| History/detail/calendar | `GET /api/v1/employee/attendance/history`, `/{session}`, `/calendar` | `employee.attendance.view` |
| Correction requests | `GET /api/v1/employee/attendance/corrections`; `POST /{session}/corrections` | `employee.attendance.correction.request` for submission |
| Admin register/detail | `GET /api/v1/attendance/sessions`, `/sessions/{session}` | `attendance.view` |
| Admin correction queue/decision | `GET /api/v1/attendance/corrections`; `POST /corrections/{correction}/approve` or `/reject` | `attendance.corrections.manage` |
| Admin audited intervention | `POST /api/v1/attendance/sessions/{session}/interventions` | `attendance.manage` |

The payroll module entitlement and existing navigation visibility rules also gate the frontend entry points. Platform-admin status, payroll view permission and HR admin permission do not substitute for attendance self-service permissions. The backend remains the final authorization authority.

## Lifecycle and evidence

The UI consumes server `allowed_actions` and state (`NOT_CLOCKED_IN`, `CLOCKED_IN`, `ON_BREAK`, `CLOCKED_OUT`) rather than browser time. Mutating requests are serialized in the UI and use idempotency keys. A network-uncertain clock action retains its key in company-scoped session storage for a safe retry; a confirmed transition or authoritative conflict reloads server status. No optimistic punch or break is displayed.

Session `work_date`, timezone, original/effective timestamps, breaks and completed durations are server-provided. The UI formats instants for presentation only. Calendar days without records are not classified as absent, late, holidays or leave. Overnight sessions retain the server work date. History is filtered and paginated through the API.

Employee correction requests require an existing closed session, an explicit reason and full ISO timestamps with offsets. They are pending evidence, not immediate edits to original punches. Admin decisions and audited interventions use separate admin APIs; original and effective revisions are displayed distinctly. Former employees with the required active membership and permission can see history and submit historical corrections, but have no new clock/break action. Unlinked or unauthorized users do not receive self attendance data.

On company switch, attendance state is cleared and outstanding reads are aborted/fenced by company ID and context version. Responses from the prior company cannot render in the new company. Employee APIs never accept arbitrary employee IDs from the UI.

Attendance does not calculate payroll, create payslips, or create accounting, AR, banking or inventory effects. Payroll/accounting views remain separate. No V1 production attendance migration or production cutover is included.

## Verification and limitations

Focused static/browser tests cover permissions, state transitions, duplicate/uncertain actions, corrections, company switching, dashboard authority, admin evidence/decisions/intervention, keyboard tabs and 390/768/1440 layouts. A disposable SQLite backend copy exercises the real HTTP contract without changing the frozen backend worktree. Existing portal, payroll, identity, navigation, FBR and full frontend E2E suites plus typecheck/build are regression gates.

This integration does not infer leave/absence, supply offline clocking, bulk timesheet approval, payroll calculation or V1 attendance migration. Production identity, authorization and data migration require separate operational verification.
