# User Requirements 1–22: frontend implementation and verification record

## Role-model DEV correction candidate (2026-10-14; verification pending)

| State | Frontend | Backend |
|---|---|---|
| **BASE COMMIT** | `5e69750067abeb3db6ea93ab3af543599052e159` | `e93e998ae6cfbcb675805e1006791106260100b4` |
| **UNCOMMITTED ROLE-MODEL CANDIDATE** | Changes to role-aware navigation, routing, authentication consumers and regression tests, plus this verification record and tooling. | Separate uncommitted Platform Admin/Admin/custom-role provisioning, authority, migration and contract/test changes. |
| **FINAL CERTIFIED COMMIT** | Not yet created. | Not yet created for the role-model changes. |

The earlier Requirements 1–22 executable verification and the currently deployed frontend commit do **not** certify these new role-model worktree bytes. The new verifier records the exact changed-file inventory, each changed file's SHA-256 and executable mode, and the tracked binary-diff SHA-256 for both repositories in [the candidate lock](user-requirements-1-22-role-model-candidate.lock.json). The lock itself is excluded from its own fingerprint to avoid a circular hash; it is a review artifact, not executable authority. Both HEADs must remain at the base commits, staged changes are rejected, and the verifier checks the recorded candidate before testing and again after testing. New, removed or changed files in either repository make it stop. The lock is never refreshed by a verifier run.

After reviewing any intentional edit to either candidate, explicitly run `node scripts/verify-role-model-candidate.mjs record` from the frontend repository, review the resulting lock inventory and diff, then run `node scripts/verify-role-model-candidate.mjs verify`. A new record supersedes prior test evidence for the changed bytes. In normal Terminal, run `bash /Users/humzamazhar/Documents/Codex/ZavSync-Frontend-V2/scripts/verify-user-requirements-1-22.sh` only after that review. Full Chromium/real-backend verification, MariaDB certification of the backend role-model candidate, DEV actor `/auth/me` acceptance and final commit review remain pending. No commit, push or deployment is authorized by this record.

The section below describes the **prior** certified Requirements 1–22 candidate. Its 19 browser/real-backend passes and 52 unit/static passes are historical evidence, not verification of the current role-model candidate.

## Final executable candidate against certified backend e93e998 (2026-10-14)

Frontend base HEAD is `8465a37b43ea89425aee573075a3dbc55ec8a29d`. The **72-file candidate** (45 modified, 27 new) remains uncommitted and unstaged. The clean backend is at `e93e998ae6cfbcb675805e1006791106260100b4`, equal to local `origin/main`; its [frontend handoff](/Users/humzamazhar/Documents/ChatGPT/ZavSync-Backend-V2/docs/qa/user-requirements-1-22-frontend-contract.md) is the authority. The older `013471be` analysis below is historical evidence, not the current contract. No production or V1 data was accessed, and no backend mutation, frontend commit, push or deployment occurred.

**Status: 22/22 IMPLEMENTED + EXECUTABLE VERIFIED against the approved V2 scope.** The complete external normal-Terminal Requirements 1–22 verifier passed: browser/real-backend verification **19 passed, 0 failed**; typecheck **PASS**; production build **PASS**; unit/static **52/52 PASS**; static HTML metadata and whitespace **PASS**; artifact and secret-file review **PASS**; `git diff --check` **PASS**; final output **`Executable verification gate: PASS`**. This is executable-candidate evidence, not DEV deployment, Zeeshan/user visual acceptance or live-provider certification. No executable/test/build/configuration file was edited after this accepted result; the production build is newer than every changed executable file. The frozen candidate is ready for a reviewed local commit, but none has been created.

The local managed HS catalogue and buyer **Not FBR Verified** state are approved current behavior. A genuine FBR QR appears only with authoritative provider verification data; private print does not claim regulatory certification. Live FBR Credit Note transport and Stripe checkout require separate provider activation/certification. Company removal is deactivation with retained records, not hard delete. These truthful boundaries are **not** frontend defects.

| # | Implemented and executable-verified frontend scope | Acceptance still pending or approved boundary |
|---|---|---|
| 01 | Shared centered, scrollable dialogs and side panels. | Zeeshan/user representative-form and 390/768/1440 visual/accessibility acceptance. |
| 02 | `FBR Invoice` visible name without changing technical identities. | DEV visible-name scan and user approval. |
| 03 | Distinct Create Invoice, Save Draft and provider submission actions. | DEV lifecycle acceptance; live provider activation separate. |
| 04 | Critical HRM, Employee and FBR labels use Title Case. | Zeeshan/user visual label review. |
| 05 | Dedicated FBR branch; native Accounting remains separate. | DEV domain/navigation smoke. |
| 06 | Active route opens its sidebar branch; user expansion retained. | DEV mobile/refresh visual acceptance. |
| 07 | Selected-company navigation preferences and stale-response fencing. | DEV A/B permission and presentation review. |
| 08 | Backend parent/leaf effective navigation and `accounting.fbr_status`. | DEV catalog visibility review. |
| 09 | Organizer-owned internal events shared by Smart Agenda and Meeting Assistant. | DEV timezone/company review; connected calendar/provider invitations are separate activation scope. |
| 10 | Authenticated Companies create/list/search/view/edit/approve/deactivate flow. | DEV role/lifecycle acceptance; hard delete intentionally prohibited. |
| 11 | Distinct HRM icons without authority changes. | Zeeshan/user responsive visual review. |
| 12 | Server-owned billing catalogue, usage, quote, checkout/reconciliation, plan changes, history and hosted payment-method UI. | DEV/sandbox acceptance; live Stripe checkout remains configuration gated until account activation. |
| 13 | Versioned dashboard layout and backend-effective widget visibility. | DEV A/B and visual layout acceptance. |
| 14 | Approved V2 logo and tagline. | Zeeshan/user high-density and responsive visual acceptance. |
| 15 | Public registration/verification, login guidance, plan discovery and pending-company presentation. | DEV email-delivery and full onboarding acceptance. |
| 16 | Static title, description, OG and Twitter metadata in built HTML. | DEV served-HTML and social-preview acceptance. |
| 17 | Employee Portal return uses current-company Dashboard authority. | DEV session/mobile/company-switch acceptance. |
| 18 | Company profile/context without a duplicate Company domain. | DEV ordinary/admin role review. |
| 19 | Draft locks/deletion, retry/reconciliation, one full linked Credit Note and private print. | DEV lifecycle acceptance; live Credit Note transport requires provider certification. |
| 20 | Dynamic FBR editor/register/print, server values, buyer contact fields and bounded local HS search. | Zeeshan/user long-form/PDF visual acceptance; local managed HS is approved, buyer remains Not FBR Verified absent authority, genuine QR requires provider data. |
| 21 | Approved V2 Portal Settings, logo/reset, write-only credential and immutable historical snapshots. | DEV save/reload/A-B acceptance; expanded deployed-V1 visual parity is not claimed. |
| 22 | Versioned admin company search/detail/edit/approval/activity and optional protected credential. | DEV role/trial acceptance; removal is deactivation, not hard delete. |

**Remaining gates are separate:** (1) **DEV deployment acceptance pending** for a deployed build, configured email/auth, company context, permissions, browser/responsive/accessibility smoke and isolated test data; (2) **Zeeshan/user visual acceptance pending** for forms, naming/icons, navigation, onboarding, dashboard, invoice print and Portal Settings; (3) **external provider activation pending** for live Stripe, live FBR submission/Credit Note transport, genuine provider QR and any connected calendar provider. No live provider outcome is inferred from the executable verifier. The historical pre-handoff analysis below is retained only as provenance; its old `BLOCKED` labels and pending-browser statements are superseded by this final ledger.

## Historical pre-e93e998 candidate record (superseded contract/status)

Frontend baseline and current HEAD: `8465a37b43ea89425aee573075a3dbc55ec8a29d` (uncommitted work). Reviewed V2 backend: `013471be8d4a407388798135b640d5bc07943b39`, read-only. Deployed V1 backend snapshot: `deployed-v1-20261012-205908`, captured `2026-10-12T20:59:08Z`; see the [field-by-field parity audit](user-requirements-1-22-v1-v2-parity.md). Evidence labels and full 22-row source audit appear in [the audit](user-requirements-1-22-frontend-audit.md). The one-page invoice PDF was found locally under the same title without “(1)” and visually inspected; expanded Portal Settings screenshots remain unavailable. No production, live FBR, real payment, backend mutation, V1 mutation, commit, push or deployment occurred.

Completion status for every requirement is **BLOCKED — NOT COMPLETE** until every applicable gate passes: implemented behavior, certified backend contract and frontend integration, unit/static, Chromium, real-backend E2E, responsive/accessibility, isolated DEV deployment and verification, Zeeshan acceptance, and user visual/naming acceptance. Local candidate code and prior-stage verification do not satisfy those gates. Browser, real-backend, DEV and Zeeshan evidence from before this uncommitted stage does not verify this stage's executable changes. The details below distinguish current code from the exact outstanding gate; they do not claim completion.

## 01 — Center Forms and Dialogs

- **Original Requirement:** Centered, responsive, scrollable, accessible create/edit forms and dialogs across the platform.
- **V1 Evidence:** V1-GIT invoice create is a page form; deployed frontend visual behavior NOT VERIFIED.
- **Current/Implemented V2 Behavior:** Shared `ConfirmDialog.vue` and `SidePanel.vue` now use centered responsive bounds, internal scrolling and reachable footers. Source inventory finds **54 SidePanel instances in 35 files** and **24 ConfirmDialog instances in 22 files**; their caller-specific pending/unsaved close behavior and all-consumer browser layout are not yet certified. Complex page forms remain pages.
- **Frontend Files:** `src/components/zs/ConfirmDialog.vue`, `SidePanel.vue`, `tests/zeeshan/browser.spec.ts`.
- **Backend Contract:** None for layout; preserve each form's mutation/validation contract.
- **Automated Verification:** New 390/768/1440 customer-form browser checks cover centering, long-form scroll, footer access, Escape and focus return; Chromium execution and other consumers remain pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Major visual change requires review. **Remaining Dependency:** Full form inventory and browser accessibility validation, including large desktop and pending safeguards. **Status:** BLOCKED — NOT COMPLETE.

## 02 — FBR Invoice Name

- **Original Requirement:** Use approved visible `FBR Invoice` name, preserving technical IDs.
- **V1 Evidence:** V1-GIT labels vary; not V2 naming authority.
- **Current/Implemented V2 Behavior:** Navigation, register, configuration, administration and page headings use approved label; backend `fbr.invoicing` key remains unchanged.
- **Frontend Files:** `src/lib/nav.ts`, `src/pages/FbrInvoicing.vue`, `src/components/fbr/*`, `src/components/settings/NavigationVisibility.vue`, `src/pages/AccountingFbr.vue`.
- **Backend Contract:** Existing FBR endpoints/navigation identity, unchanged.
- **Automated Verification:** Navigation/FBR unit checks passed before the final documentation edit; browser rerun pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No; exact name was approved. **Remaining Dependency:** Browser/DEV visible-name pass. **Status:** BLOCKED — NOT COMPLETE.

## 03 — Create Invoice and Save Draft

- **Original Requirement:** Creation action says `Create Invoice`, draft persistence says `Save Draft`, submission remains separate.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: FBR `is_draft` makes store/update either save or directly submit; separate HRM invoices queue posting.
- **Current/Implemented V2 Behavior:** Creation entry/headline and draft button use approved wording without changing endpoint or lifecycle.
- **Frontend Files:** `src/components/fbr/FbrRegister.vue`, `FbrEditor.vue`, `src/pages/FbrInvoicing.vue`, FBR tests.
- **Backend Contract:** POST draft; separate submit endpoint and eligibility.
- **Automated Verification:** Existing Stage 15B label assertions updated, not removed; browser rerun pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No. **Remaining Dependency:** Create/save/submit browser and real-backend sequence. **Status:** BLOCKED — NOT COMPLETE.

## 04 — Title Case

- **Original Requirement:** Critical multiword visible labels use Title Case; technical keys and user data remain unchanged.
- **V1 Evidence:** V1-GIT has mixed labels.
- **Current/Implemented V2 Behavior:** HRM/Employee navigation and FBR labels updated narrowly; no global CSS text transform.
- **Frontend Files:** `src/lib/nav.ts`, `src/lib/portalFinal.ts`, `src/components/employee/PortalSidebar.vue`, `PortalTopbar.vue`, `src/components/portal-final/PortalPreviews.vue`, navigation tests.
- **Backend Contract:** None.
- **Automated Verification:** Navigation unit/static passed; full visual inventory and browser pending.
- **Real-Backend Verification:** Not applicable. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No for listed labels; new module/product names still require approval. **Remaining Dependency:** Full-page label scan. **Status:** BLOCKED — NOT COMPLETE.

## 05 — FBR Functionality Grouping

- **Original Requirement:** Discover FBR-specific workflow under FBR Invoice, keep native Accounting separate.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: dedicated `/fbr-invoices` and separate `/invoices` routes.
- **Current/Implemented V2 Behavior:** Approved FBR branch includes register, configuration and migration administration. Native Accounting FBR status stays in Accounting with explanatory text; no ID/endpoint mixing.
- **Frontend Files:** `src/lib/nav.ts`, FBR components, `src/pages/AccountingFbr.vue`.
- **Backend Contract:** `/pakistan-fbr/*` and `/accounting/*` remain distinct.
- **Automated Verification:** FBR firewall unit checks previously passed; full browser/E2E rerun pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No new subsection name introduced. **Remaining Dependency:** Navigation and domain firewall E2E. **Status:** BLOCKED — NOT COMPLETE.

## 06 — Sidebar Branch Persistence

- **Original Requirement:** Keep active parent open through child/detail navigation, preserve user-expanded branches.
- **V1 Evidence:** Deployed frontend behavior NOT VERIFIED.
- **Current/Implemented V2 Behavior:** Longest route-prefix mapping activates detail/edit child; `NavBranch` reacts to route changes and retains expansion.
- **Frontend Files:** `src/lib/nav.ts`, `src/components/zs/NavBranch.vue`, `NavLeaf.vue`, navigation tests.
- **Backend Contract:** Effective navigation controls presentation; authority remains separate.
- **Automated Verification:** Route mapping static tests passed; browser refresh/mobile/company-switch pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No. **Remaining Dependency:** Browser regression across branches. **Status:** BLOCKED — NOT COMPLETE.

## 07 — Navigation Visibility Company Context

- **Original Requirement:** Display selected company, clear old results, explain presentation versus authority.
- **V1 Evidence:** V1-GIT company visibility is a different mechanism.
- **Current/Implemented V2 Behavior:** Page shows active company; component explains authority and already fences company requests.
- **Frontend Files:** `src/pages/NavigationSettings.vue`, `src/components/settings/NavigationVisibility.vue`.
- **Backend Contract:** GET/PUT/DELETE `/platform/navigation` scoped by `X-Company-Id`.
- **Automated Verification:** Existing navigation static tests passed; A/B browser rerun pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No. **Remaining Dependency:** A/B stale-response and persistence browser tests. **Status:** BLOCKED — NOT COMPLETE.

## 08 — Subsection Visibility

- **Original Requirement:** Catalog-driven leaf controls with Default/Show/Hide/Reset and effective state.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: admin company-module visibility routes; different from V2 navigation preferences.
- **Current/Implemented V2 Behavior:** Existing component renders backend-supplied leaves and reset; label mapping uses approved FBR name while retaining key.
- **Frontend Files:** `src/components/settings/NavigationVisibility.vue`.
- **Backend Contract:** Backend `/platform/navigation` catalog; missing keys cannot be fabricated by frontend.
- **Automated Verification:** Static tests passed; exact required-leaf catalog comparison and browser pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No. **Remaining Dependency:** Backend catalog completeness evidence for all required HRM/FBR/Accounting/Payroll/CRM/Portal children. **Status:** BLOCKED — NOT COMPLETE.

## 09 — Smart Agenda and Meeting Assistant Calendars

- **Original Requirement:** Real date navigation/events/detail and authorized schedule/edit/cancel in both surfaces.
- **V1 Evidence:** Deployed frontend calendar/provider behavior NOT VERIFIED.
- **Current/Implemented V2 Behavior:** Existing Smart Agenda and Meeting Assistant list synchronized events and provider capability; no complete calendar grid or event mutations were added.
- **Frontend Files:** Existing `src/pages/AiCalendar.vue`, `AiMeetings.vue`, `src/services/ai/repository.ts`.
- **Backend Contract:** GET capability/events/context and POST synchronize; no provider-connect or event create/update/cancel route at pinned commit; events paginate 50 globally by start.
- **Automated Verification:** Existing AI tests only; complete calendar scenarios pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Provider selection. **Remaining Dependency:** Provider, event mutation, date-filter/calendar pagination and conflict contracts. **Status:** BLOCKED — NOT COMPLETE.

## 10 — Company Management and Profile

- **Original Requirement:** Company list/search/create/view/profile/edit/delete or safe deletion block.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: `CompanyController` has list/search/pagination, create, show, update, status, activity, destroy; deployed frontend unverified.
- **Current/Implemented V2 Behavior:** Existing selected-company Settings and authenticated company creation; no management list/profile/edit/delete route.
- **Frontend Files:** Existing `src/pages/Settings.vue`, `src/services/platform/repository.ts`.
- **Backend Contract:** POST `/platform/companies`; no V2 list/show/update/delete/approval contract.
- **Automated Verification:** Existing company settings regression only; requirement E2E pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Deletion semantics after backend design. **Remaining Dependency:** Company lifecycle APIs. **Status:** BLOCKED — NOT COMPLETE.

## 11 — Distinct HRM Icons

- **Original Requirement:** Relevant distinct icons for 14 HRM leaves with accessible text.
- **V1 Evidence:** V1 icons are not V2 design authority.
- **Current/Implemented V2 Behavior:** Existing Lucide icons mapped distinctly; route/permission identities preserved.
- **Frontend Files:** `src/lib/nav.ts`, `tests/navigation/unit.spec.ts`.
- **Backend Contract:** None.
- **Automated Verification:** Static icon uniqueness test passed; visual 390/768/1440 pending.
- **Real-Backend Verification:** Not applicable. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No new branding. **Remaining Dependency:** Responsive visual acceptance. **Status:** BLOCKED — NOT COMPLETE.

## 12 — Billing

- **Original Requirement:** Dedicated authoritative plan/subscription/billing/payments page.
- **V1 Evidence:** No certified V1 payment-provider contract.
- **Current/Implemented V2 Behavior:** New read-only `/billing` shows server plan, status and available plans for authorized company; payment methods, checkout, history, receipts and success states are explicitly unavailable.
- **Frontend Files:** `src/pages/Billing.vue`, `src/router/index.ts`, `src/lib/nav.ts`.
- **Backend Contract:** GET `/platform/subscription` with company header and `platform.subscription.view`; no checkout/payment contract.
- **Automated Verification:** Typecheck/build passed; billing browser and A/B tests pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Payment provider and flow. **Remaining Dependency:** Provider-hosted/tokenized checkout, payment states/history/receipts APIs. **Status:** BLOCKED — NOT COMPLETE.

## 13 — Dashboard Customization

- **Original Requirement:** Persist selected-company widget visibility, order/layout/size, preview and reset.
- **V1 Evidence:** No certified deployed preference/precedence behavior.
- **Current/Implemented V2 Behavior:** Dashboard remains server-data-driven; no false localStorage customization added.
- **Frontend Files:** Existing `src/pages/Dashboard.vue`.
- **Backend Contract:** No widget catalog/preferences/precedence contract at pinned V2 commit.
- **Automated Verification:** Not executable until contract.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Layout/precedence choices if backend source does not establish them. **Remaining Dependency:** Company-scoped persistence and widget authorization. **Status:** BLOCKED — NOT COMPLETE.

## 14 — Logo and Tagline Alignment

- **Original Requirement:** Approved V2 logo and exact tagline form a responsive aligned block.
- **V1 Evidence:** V1 frontend Git assets do not prove approved deployed art.
- **Current/Implemented V2 Behavior:** Existing approved V2 logo retained; no artwork redesign. Auth layout now centers logo and exact tagline as one block on desktop **and** mobile. Source PNGs are 795×160 (dark) and 719×141 (light), enough native pixels for the displayed sizes; final visual dimensions remain unverified in Chromium.
- **Frontend Files:** `src/components/zs/AuthLayout.vue`; existing `src/components/zs/Logo.vue` and approved assets.
- **Backend Contract:** None.
- **Automated Verification:** Responsive/high-density visual browser checks pending.
- **Real-Backend Verification:** Not applicable. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Final visual acceptance. **Remaining Dependency:** Responsive/high-density visual check at all requested widths. **Status:** BLOCKED — NOT COMPLETE.

## 15 — Need an Account / Onboarding

- **Original Requirement:** Actionable, real new-user/existing-user/zero-membership company onboarding and approval lifecycle.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: V1 public register and company status routes exist, but V2 auth/tenant architecture differs.
- **Current/Implemented V2 Behavior:** Existing login text remains inert; authenticated company create exists in Settings. No fake public registration added.
- **Frontend Files:** Existing login/AuthLayout and `src/pages/Settings.vue`.
- **Backend Contract:** Only authenticated POST `/platform/companies` requires plan ID; no public registration, zero-membership plan discovery or approval lifecycle API.
- **Automated Verification:** Pending after contract.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Onboarding approval policy if backend cannot derive it. **Remaining Dependency:** Registration/verification/plan/approval contracts. **Status:** BLOCKED — NOT COMPLETE.

## 16 — Shared-Link Metadata

- **Original Requirement:** Server-delivered `ZavSync` title and exact approved description/OG/Twitter metadata.
- **V1 Evidence:** No V1 authority needed; USER REQUIRED copy.
- **Current/Implemented V2 Behavior:** `index.html` static metadata updated; no unapproved image; tenant/user data excluded.
- **Frontend Files:** `index.html`, `tests/navigation/unit.spec.ts`.
- **Backend Contract:** None.
- **Automated Verification:** Source static test and built `dist/index.html` passed; actual DEV served HTML pending.
- **Real-Backend Verification:** Not applicable. **DEV Verification:** Pending curl of deployed HTML. **Zeeshan Verification:** Pending.
- **User Approval Required:** Preview image only if supplied. **Remaining Dependency:** DEV delivery and WhatsApp cache distinction. **Status:** BLOCKED — NOT COMPLETE.

## 17 — Employee Portal Return

- **Original Requirement:** Return to authorized company dashboard in same session/company, including mobile.
- **V1 Evidence:** V1 separate employee login is not V2 session authority.
- **Current/Implemented V2 Behavior:** Sidebar and topbar show Back to Dashboard only with current membership's `accounting.view` and `invoicing`; otherwise a safe explanatory state.
- **Frontend Files:** `src/components/employee/PortalSidebar.vue`, `PortalTopbar.vue`, `tests/employee-portal/browser.spec.ts`.
- **Backend Contract:** Existing session membership permissions and modules; no new API.
- **Automated Verification:** New browser cases added; Chromium execution pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No. **Remaining Dependency:** Browser A/B, authorized/employee-only/session verification. **Status:** BLOCKED — NOT COMPLETE.

## 18 — Company Profile and Company Portal Discovery

- **Original Requirement:** Discoverable shared Company domain with authorized profile and portal entry.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: company show/update; V1-GIT company pages. Deployed frontend NOT VERIFIED.
- **Current/Implemented V2 Behavior:** Selected-company settings exist; no distinct Company Profile/Company Portal contract or route.
- **Frontend Files:** Existing `src/pages/Settings.vue`, `src/lib/nav.ts`.
- **Backend Contract:** V2 company list/show/profile/portal APIs absent.
- **Automated Verification:** Pending after contract.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Only if a genuinely new product/module name or portal semantics must be chosen. **Remaining Dependency:** Shared company domain contracts. **Status:** BLOCKED — NOT COMPLETE.

## 19 — FBR Invoice Lifecycle and Credit Note

- **Original Requirement:** Draft, safe submit/retry, pending/uncertain/submitted lock, delete and original-preserving Credit Note lifecycle.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: FBR controller direct submit/retry, HRM job submit; no credit contract. V1 source does not meet strengthened lock requirement.
- **Current/Implemented V2 Behavior:** Existing FBR draft/edit/submit/retry/status remains; no invented credit or delete controls.
- **Frontend Files:** `src/components/fbr/FbrEditor.vue`, `FbrDetail.vue`, `FbrRegister.vue`.
- **Backend Contract:** V2 draft/detail/submit/retry/attempts; no FBR delete/credit authority.
- **Automated Verification:** Existing Stage 15B suite; stage browser/real-backend rerun pending.
- **Real-Backend Verification:** Pending mock-provider and direct mutation denial. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** No for prescribed lifecycle. **Remaining Dependency:** Delete, original-line credit, remaining-credit, immutable snapshot APIs. **Status:** BLOCKED — NOT COMPLETE.

## 20 — Complete V1 Invoice Parity and Print

- **Original Requirement:** All V1-backed fields/lookups/totals/register actions and dynamic invoice print/PDF structure.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED field-by-field in parity document; V1-GIT frontend is separate. SCREENSHOT/PDF OBSERVED through direct inspection of the one-page local invoice PDF.
- **Current/Implemented V2 Behavior:** Existing FBR editor/detail support many fields but lack buyer email/phone, certified dependent lookups, complete HS catalog, search/filter/date and print/PDF. No sample values added.
- **Frontend Files:** Existing `src/components/fbr/FbrEditor.vue`, `FbrDetail.vue`, `FbrRegister.vue`, `src/types/fbr.ts`.
- **Backend Contract:** V2 saved draft/detail/reference data; missing immutable full print snapshot, buyer fields, complete lookups and catalog.
- **Automated Verification:** Existing FBR tests only; individual decimal, lookup, print/long-page and provider tests pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Final rendered V2 visual acceptance. **Remaining Dependency:** Certified V2 contracts and catalogue authority; no copied V1 fallback calculations/defaults. **Status:** BLOCKED — NOT COMPLETE.

## 21 — Portal Settings

- **Original Requirement:** Implement only actual deployed V1 settings with persisted downstream effects and historical safety.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: module seeder labels a `portal-settings` leaf and maps it to frontend `/settings`, with no dedicated API route. V1-GIT sidebar groups Designations, Departments and Invoice Data beneath the label; its Invoice Data link goes to `/fbr`, unlike the deployed seeder's `/settings` mapping. V1-GIT Account Settings and FBR Reference Data screens are distinct; expanded deployed Portal Settings visual reference NOT PROVIDED.
- **Current/Implemented V2 Behavior:** Separate Settings, FBR configuration and other domain screens remain; no speculative Portal Settings fields/tabs.
- **Frontend Files:** Existing `src/pages/Settings.vue`; parity audit only this stage.
- **Backend Contract:** No generic V2 Portal Settings route; individual domain contracts require separate field→validation→storage→read→consumer→effect review.
- **Automated Verification:** No invented field to test; requirement pending.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Expanded V1 Portal Settings visual reference or confirmed desired grouping. **Remaining Dependency:** Visual evidence and specific V2 persistence/effect contracts. **Status:** BLOCKED — NOT COMPLETE.

## 22 — Admin Company Profile and Approval

- **Original Requirement:** Admin company list/create/view/edit/approve, V1-backed fields, separate approval/active states and protected FBR token/history.
- **V1 Evidence:** DEPLOYED-V1 SOURCE VERIFIED: `CompanyController` handles identity fields, list/search/page, approval/rejection and separate activity toggle. See parity audit.
- **Current/Implemented V2 Behavior:** Selected-company Settings and authenticated create only; no admin list/profile/approval added.
- **Frontend Files:** Existing `src/pages/Settings.vue`, `src/services/platform/repository.ts`.
- **Backend Contract:** V2 POST company and selected-company settings; no admin list/show/update/approve/delete endpoints.
- **Automated Verification:** Pending after contract.
- **Real-Backend Verification:** Pending. **DEV Verification:** Pending. **Zeeshan Verification:** Pending.
- **User Approval Required:** Deletion/closure semantics if backend cannot establish. **Remaining Dependency:** Company administration, approval/active and historical snapshot APIs. **Status:** BLOCKED — NOT COMPLETE.

## Stage gate and handoff

The exact **38** changed frontend paths in this intermediate candidate are:

```text
index.html
src/components/employee/PortalSidebar.vue
src/components/employee/PortalTopbar.vue
src/components/fbr/FbrAdministration.vue
src/components/fbr/FbrConfiguration.vue
src/components/fbr/FbrEditor.vue
src/components/fbr/FbrRegister.vue
src/components/portal-final/PortalPreviews.vue
src/components/settings/NavigationVisibility.vue
src/components/zs/AuthLayout.vue
src/components/zs/ConfirmDialog.vue
src/components/zs/NavBranch.vue
src/components/zs/NavLeaf.vue
src/components/zs/SidePanel.vue
src/lib/nav.ts
src/lib/portalFinal.ts
src/pages/AccountingFbr.vue
src/pages/Billing.vue
src/pages/FbrInvoicing.vue
src/pages/NavigationSettings.vue
src/pages/Settings.vue
src/router/index.ts
src/services/fbr/repository.ts
tests/e2e/critical-paths.spec.ts
tests/employee-final/browser.spec.ts
tests/employee-portal/browser.spec.ts
tests/fbr/stage15b.spec.ts
tests/fbr/unit.spec.ts
tests/navigation/browser.spec.ts
tests/navigation/unit.spec.ts
tests/zeeshan/browser.spec.ts
docs/qa/user-requirements-1-22-api-dependencies.md
docs/qa/user-requirements-1-22-frontend-audit.md
docs/qa/user-requirements-1-22-frontend-final.md
docs/qa/user-requirements-1-22-manual-qa.md
docs/qa/user-requirements-1-22-v1-v2-parity.md
docs/qa/user-requirements-1-22-visible-names.md
scripts/verify-user-requirements-1-22.sh
```

The frontend candidate remains uncommitted. After the final executable edit, local `npm run typecheck`, `npm run build`, and unit/static **49/49** passed; `git diff --check` passed. Chromium could not start its Vite server in the Codex sandbox (`listen EPERM 127.0.0.1:8083`), so the stage has no complete browser, real-backend, responsive/accessibility, DEV or Zeeshan result. The backend HEAD remains the reviewed commit, but its worktree contains separate uncommitted FBR/navigation executable changes. Those candidate changes were not integrated or certified; the verifier intentionally stops until a clean, reviewed backend handoff. The script `scripts/verify-user-requirements-1-22.sh` must then be run in a normal Terminal with a disposable backend before a DEV candidate is considered. No commit is proposed until all required implementation and verification gates pass.

The DEV plan remains conditional: pin exact frontend candidate and backend commit; build with `npm run build`; record API base URL and environment; take frontend, backend and disposable/test database rollback points; check migrations, CORS, SPA fallback and caches; smoke-test the 22 journeys under safe sandbox/mock provider boundaries; then obtain Zeeshan and user visual acceptance. No DEV deployment is authorized in this task.

## Current 1–22 completion ledger

Every row is **BLOCKED — NOT COMPLETE**. “Next action” identifies the remaining implementation or evidence in addition to the shared Chromium, real-backend E2E, responsive/accessibility, isolated DEV, Zeeshan and user acceptance gates. The individual sections above retain the route, source and test detail.

| # | Status | Exact blocker / next action |
|---|---|---|
| 01 | BLOCKED — NOT COMPLETE | Inventory every form/dialog consumer; verify keyboard, focus, overflow and pending controls at 390/768/1440 in Chromium and DEV. |
| 02 | BLOCKED — NOT COMPLETE | Verify the approved FBR Invoice label in every browser navigation and DEV surface. |
| 03 | BLOCKED — NOT COMPLETE | Verify Create Invoice → Save Draft → Submit remains distinct against the certified backend and in DEV. |
| 04 | BLOCKED — NOT COMPLETE | Finish visible-label inventory and browser/user review; preserve API keys and user-entered text. |
| 05 | BLOCKED — NOT COMPLETE | Verify FBR grouping and the Accounting/FBR ID and API firewall in browser and real-backend E2E. |
| 06 | BLOCKED — NOT COMPLETE | Verify sidebar expansion on child/detail routes, refresh, mobile and company switch. |
| 07 | BLOCKED — NOT COMPLETE | Verify company-scoped visibility save/reset and stale-response fencing in browser and real-backend E2E. |
| 08 | BLOCKED — NOT COMPLETE | Certify the full backend navigation catalog, then verify every leaf's override, default, authority boundary and A/B isolation. |
| 09 | BLOCKED — NOT COMPLETE | Obtain certified provider/event view, schedule, edit, cancel, meeting, timezone, conflict and date-pagination contracts; build both calendar surfaces and verify synchronization. |
| 10 | BLOCKED — NOT COMPLETE | Obtain certified company list/search/page/create/view/edit/delete-or-block APIs; integrate a single company domain and verify authorization. |
| 11 | BLOCKED — NOT COMPLETE | Verify distinct HRM icons, accessible names and responsive rendering in Chromium/DEV with user review. |
| 12 | BLOCKED — NOT COMPLETE | Obtain approved billing/provider contract for plans, methods, changes, history, receipts and authoritative payment states; integrate and verify recovery. |
| 13 | BLOCKED — NOT COMPLETE | Obtain widget catalog and company preference persistence/precedence contract; implement customize/preview/save/reset and dashboard consumption. |
| 14 | BLOCKED — NOT COMPLETE | Verify approved V2 logo/tagline at 390/768/1440 and high density, then obtain user visual acceptance. |
| 15 | BLOCKED — NOT COMPLETE | Obtain certified new/existing/zero-membership onboarding, plan, validation, verification and approval contracts; implement real lifecycle. |
| 16 | BLOCKED — NOT COMPLETE | Verify server-delivered metadata from isolated DEV, including crawler-facing HTML and user-visible link preview. |
| 17 | BLOCKED — NOT COMPLETE | Verify authorized dashboard return and same-session/company behavior across browser, mobile and company switches. |
| 18 | BLOCKED — NOT COMPLETE | Integrate discoverable Company Profile and Company Portal from the certified shared company domain; verify tenant and role isolation. |
| 19 | BLOCKED — NOT COMPLETE | Obtain certified delete, immutable in-flight/submitted, print and linked Credit Note contracts; implement every state and test direct backend rejection. |
| 20 | BLOCKED — NOT COMPLETE | Close each invoice parity row, certified lookups and authoritative HS catalog; implement dynamic reference-matched print/PDF and full register controls. |
| 21 | BLOCKED — NOT COMPLETE | Obtain expanded deployed V1 Portal Settings evidence and certified V2 field→validation→storage→read→consumer→effect contracts; implement only verified settings. |
| 22 | BLOCKED — NOT COMPLETE | Obtain certified admin company list/create/edit/view/approve, approval-versus-active, protected token and historical snapshot contracts; integrate and verify. |
