# Zeeshan manual acceptance checklist — Requirements 1–22

> **2026-10-14 update:** Execute this checklist against backend `e93e998ae6cfbcb675805e1006791106260100b4` and the current uncommitted frontend candidate. For #09, test the private internal event lifecycle and keep provider calendar integration distinct. For #12, test Stripe sandbox checkout, independent add-ons/seats, server reconciliation, plan changes, usage and invoices; a redirect is not payment proof. For #19, test exactly one full Credit Note and the disabled-by-default provider transport. For #20, test local HS search but do not claim a complete catalogue, genuine QR, regulatory PDF or buyer registry verification. For #21, test the approved V2 settings and immutable snapshots without claiming deployed V1 visual parity. For #22, test activation/deactivation and preserved records, not hard-delete. Any old “missing contract” wording below is superseded by the current backend handoff; no check is marked passed until executed.


Run only in an approved DEV environment with test companies and sandbox/mock FBR and payment providers. Record actor, company, build commit, browser, viewport, date/time, screenshot or trace, expected result, actual result and issue ID for every executed check. Mark missing-contract checks BLOCKED rather than PASS. No live FBR submission or real payment is part of this checklist.

| ID | Journey to execute and evidence to retain |
|---|---|
| 01 | At 390/768/1440/large desktop, open representative create/edit forms; check centered bounds, scrollable content, reachable actions, keyboard trap/Escape/focus return and unsaved/pending protection. |
| 02 | Inspect sidebar, breadcrumb, register, configuration, dialogs and errors for approved `FBR Invoice` name. |
| 03 | Create Invoice, Save Draft, verify no submit request, then use distinct Submit to FBR test path. |
| 04 | Check HRM/Employee/FBR labels in Title Case while acronyms and user-entered data stay exact. |
| 05 | Enter FBR branch and native Accounting separately; confirm IDs, routes and requests never cross. |
| 06 | Expand Accounting/HRM/FBR/Payroll/CRM, navigate child/detail/edit/refresh, then company-switch; verify active branch and no stale content. |
| 07 | On Navigation Visibility, verify selected company name, A/B preference isolation, reset and presentation-only explanation. |
| 08 | Verify every required leaf in backend catalog, default/show/hide/reset, effective state, and no permission bypass. |
| 09 | In Smart Agenda and Meeting Assistant, verify real event dates, timezone, list/detail, navigation, company isolation, provider status, conflicts and only server-supported mutations. |
| 10 | List/search/create/view/edit company, approve and toggle activity; verify no hard-delete control and preserved records. |
| 11 | Check 14 distinct HRM icons, alignment and text accessibility in light/dark/mobile. |
| 12 | Inspect server-priced plan, usage and quote; run separate Stripe sandbox base/add-on/seat checkout and server reconciliation; check pending/failed/verified states, plan changes, history, documents and hosted payment method portal. |
| 13 | Enable/disable/reorder/preview/save/reload/reset widgets; A/B isolation; unauthorized widget never fetches data. |
| 14 | Inspect approved V2 logo/tagline alignment at responsive and high-density widths; collect user visual acceptance. |
| 15 | Activate Need an Account by keyboard and pointer; new/existing/zero-membership, duplicate, verification, plan and approval flows. |
| 16 | Fetch actual DEV served HTML and verify static title/description/OG/Twitter; distinguish WhatsApp cache from current HTML. |
| 17 | Return from Employee Portal to authorized Dashboard in same session/company; employee-only user sees no forbidden action; A/B recalc. |
| 18 | Locate Company Profile and Company Portal; check ordinary/admin access, direct URLs and stale A/B responses. |
| 19 | Draft/edit/delete, pending/uncertain/submitted locks, direct forbidden mutation denial, duplicate prevention, exactly one full linked Credit Note, and rejection of partial/second credit notes. Confirm provider credit transport is disabled unless separately certified. |
| 20 | All certified buyer/invoice/item/tax/SRO fields; multiple items and server totals; bounded local HS search; register search/filter/date/refresh; submit status; dynamic long multi-page private print/save-PDF and immutable historical snapshot. Record buyer registry lookup, complete HS catalogue and genuine regulatory PDF/QR as unavailable. |
| 21 | Test approved V2 Portal Settings fields, logo and write-only credential with save/reload/A-B/historical snapshot safety. Expanded deployed V1 settings visuals remain unavailable; do not claim visual parity. |
| 22 | Admin company list/search/pagination/create/view/edit/approve, separate active state, required V1 identity fields, protected token and historical invoice safety. |

At present requirements 09–10, 12–13, 15, 18–22 include documented contract/visual blockers in `user-requirements-1-22-frontend-final.md`. This checklist is a future acceptance plan, not a record of executed QA.
