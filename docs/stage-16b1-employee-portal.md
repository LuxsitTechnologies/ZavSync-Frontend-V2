# Stage 16B.1 — Employee Portal foundation handoff

## Design and application boundary

The approved design reference is the separate `ZavSync-Frontend-EP` checkout at commit `7b97c3704dc4460dbc7f11263f178fb7b818e67a`. Stage 16B.1 adapts its fixed responsive sidebar, mobile drawer, sticky topbar, card/panel layout, profile hero, dashboard grid, and notification list into the certified `ZavSync-Frontend-V2` application. V2 already shares its ZavSync color tokens, typography, logo, and `zs` card/form/badge components. The source checkout remains read-only and is not deployed.

The material visual changes are functional honesty: seeded attendance, leave, payroll, tasks, holidays, and document data have been replaced by clearly unavailable cards; the prototype's inert global search, fake notifications, fake 2FA, bank panel, and unbacked edit actions are absent. The original visual hierarchy and responsive behavior remain.

## Routes and authorities

Authenticated routes: `/employee`, `/employee/profile`, `/employee/notifications`. These are separate from administrative `/hrm/*`, `/payroll/*`, and `/profile` routes. The existing V2 router protects all three. The active-company selector uses `useCompanyStore().setCompany`, which returns certified membership, permissions, modules, and effective navigation for the selected company. No independent portal session, employee ID inference, directory search, or company model is introduced.

- Employee identity: `GET /api/v1/employee/me` only when the active membership has `employee.self.view`; an authorized unlinked response remains visibly unlinked. A platform-admin flag alone does not bypass this permission. Terminated/resigned records remain readable while membership is active.
- Global account and password: the existing Stage 16C `ProfileContent` is mounted within the portal profile. It owns `GET/PATCH /api/v1/auth/profile` and `POST /api/v1/auth/change-password`, clears password inputs, and exposes only the approved self-profile fields. Email is read-only.
- Notifications: existing V2 recipient/company-scoped `/api/v1/platform/notifications` and `/api/v1/platform/notification-preferences` contracts. The portal supports read, read-all, pagination, and preference updates. It does not invent employee-domain events or a parallel notification store.
- Stage 16A presentation: company context and effective navigation come from the existing auth/switch response. The three active portal links are self-service surfaces; there are no Stage 16A portal presentation keys in the current backend catalog. Unimplemented portal modules are visually marked unavailable, with no dead routes or mock actions.

## Company-switch and privacy guarantees

The portal store clears employee identity, notification inbox, preferences, errors, and loading state synchronously when switching begins. It aborts pending requests and accepts responses only if company ID, context version, user authentication, and local request generation still match. Upon switch completion it reloads the new company's employee and notification context. The shared Stage 16C profile component is unmounted while switching and remounted with a context key.

Portal production code does not import `employee-data.ts`, `mock-data.ts`, or preview adapters. It does not request administrative Payroll or employee-list APIs, the link selector, bank, salary, statutory, or private HR fields. Passwords are not stored in browser persistence. Dashboard cards never calculate or fabricate domain totals.

## Current functionality and extension points

Active: employee dashboard identity/company/notification summary, read-only employee profile, account name/password, recipient notifications/read actions/preferences, company switching, mobile navigation, theme toggle, loading/retry/unlinked/unauthorized states. The existing `PortalShell`, `PortalSidebar`, `PortalTopbar`, and `employeePortal` store provide stable visual and authority boundaries for future widgets.

Deferred vertical slices: attendance, leave, self-service payroll/payslips, employee documents, announcements, holidays, tasks, tickets, teams/directory, shifts/rota/swaps, assets, expenses, emergency contacts, education, experience, HR self-edit, email change, and avatar upload. Future modules should replace unavailable cards only when their self-scoped V2 contracts are certified. No V1 production data migration or production cutover is part of this stage.
