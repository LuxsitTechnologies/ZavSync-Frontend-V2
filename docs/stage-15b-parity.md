# Stage 15B — FBR Invoicing

## Verified baseline and audit update (before application edits)

Frontend: main, 545ad75c55eecc463a82b08976193d7df5ace094, clean.
Backend: main and fetched origin/main, 23017b75f70fb07ae6b5fba650c3bf198ba342ae, clean.
Origin: https://github.com/LuxsitTechnologies/ZavSync-Backend-V2.git.
V1 evidence retained from the prior audit: ZavSync-Backend-V1 at
56932b69b73deb5f79e245be7fbbe31b2fbe017e; resources/views/hrm/invoices,
resources/views/hrm/fbr_invoices, HRM/InvoicesController and PostInvoiceToFbr.
This is source evidence, not certification of a live production snapshot.

A = full parity, B = adapted to V2, C = unavailable pending backend/provider certification,
D = intentionally not ported. This updates the previous audit, not a new audit.

| Feature | Class | Dedicated contract / frontend treatment |
| --- | --- | --- |
| Invoice list | B | Paginated GET invoices, company scoped |
| Search/status/date filters | C | Explicitly deferred by Stage 15A.7; no misleading page-only search |
| Historical filter/pagination | B | historical=0/1, page, per_page |
| Create invoice | B | POST invoices with creation key; review saved backend result |
| Edit draft | B | Full PATCH; backend editable flag and manage permission |
| Review | B | Dedicated detail resource, no authoritative client calculations |
| Buyer name | B | buyer_snapshot.name |
| NTN/CNIC | B | Optional 7/13 digits; submission validation remains backend owned |
| Registration type | B | Registered/Unregistered |
| Registration lookup | C | Unavailable; manual type is not verified registration |
| Provinces | B/C | Existing catalog and string fields; certified content unavailable |
| Invoice/document type | B/C | DOCUMENT_TYPE lookup; provider semantics uncertified |
| Sales type | B/C | SALE_TYPE lookup, invoice-wide field |
| Scenario | B | Former blocker resolved: server derives SN001/SN002; display only |
| HS code | B/C | HS_CODE catalog/string; certification unavailable |
| UOM | B/C | UOM catalog/string; certification unavailable |
| Quantity | B | Integer thousandths, exact decimal input |
| Unit price/value | B | Integer paisa unit price, discount; backend calculates line value |
| Tax rate | B/C | Integer basis points and fbr_rate_id metadata; no invented provider mapping |
| Sales tax | B | Former blocker resolved: positive exact paisa; zero/null/absent uses rate |
| Extra tax | B | Former blocker resolved: exact paisa; no nonzero rate sent alongside |
| Further tax | B | Former blocker resolved: exact paisa |
| Withholding | B | Former blocker resolved: exact paisa, reported separately, not deducted |
| SRO schedule/item | B/C | Catalog identifiers; dependent regulatory semantics uncertified |
| Drafts | B | DRAFT and backend eligibility; no implicit submission |
| Submission | B/C | Dedicated submit endpoint; provider enable flag, explicit confirmation |
| Idempotency | B | Stable key and payload for uncertain create; server recovery for submit |
| Status | B | Render returned state; never infer accepted from HTTP success |
| Attempts/history | B | Dedicated sanitized attempts endpoint |
| Retry | B | Former blocker resolved: POST invoices/{id}/retry, no browser-stored key |
| FBR reference | B | Render returned reference; do not generate |
| Errors | B | Safe API errors and validation fields, no raw HTML rendering |
| Historical invoices | B | Read-only original header/line values; never recalculate or resubmit |
| Historical evidence | B | migration.view controls dedicated evidence endpoint |
| Configuration | B | GET/PUT configuration; blank replacement credential omitted |
| Migration/admin | B | Runs, saved reconciliation, exceptions; resolution requires migration.manage |
| Regulatory print | C | Detail/review supported; no certified print action |
| QR | C | Unavailable; never generate |
| Native accounting effects | D | No posting/payment/receivable/invoice APIs in the module |
| V1 insecure transport/token logging | D | Never ported |

## Three blocker resolutions verified in source

SavePakistanFbrInvoiceRequest accepts sales_tax, extra_tax, further_tax, st_withheld
as integer paisa. PakistanFbrInvoiceService preserves positive explicit sales tax,
uses rate calculation for zero/null/absent, and adds taxable + sales + extra + further
without subtracting withholding for new documents. Historical values bypass this workflow.
PakistanFbrInvoice.scenarioId derives buyer type; the resource and mapper expose it.

POST /api/v1/pakistan-fbr/invoices/{invoice}/retry is registered, sensitive-throttled,
requires pakistan_fbr.submit and company-scoped lookup. The service locks the invoice,
selects the latest unresolved pending/failed attempt, and reuses its original key
through submit. Payload hashing, configuration/enable checks, the two-minute lease,
and generation fencing still apply. Historical/accepted/submitted/reference-bearing
records are prohibited. Resource retry_recovery is an eligibility signal, not a promise
that an active lease will send again. No localStorage/sessionStorage recovery is needed.

## Scope and certification

All feature requests are restricted to /api/v1/pakistan-fbr/* through a dedicated repository.
Shared authentication, company switching and the app shell retain their platform APIs.
Native Accounting routes and behavior are preserved. The invoicing entitlement and separate
pakistan_fbr.*, fbr.configuration.*, migration.* permissions govern this module.
Registration lookup, certified catalogs, regulatory print/QR and real provider certification
remain unavailable and do not block this frontend. No backend source changes are authorized.

## Implementation and verification status

Implemented: dedicated navigation/register; historical filter and pagination; exact-decimal
create/edit inputs; saved review/detail and independent header/line totals; backend scenario;
confirmed submit/server retry; status and sanitized attempts; immutable historical evidence;
configuration with write-only credential replacement; authorized migration exception review.
All FBR resource objects and nonpaginated collections are unwrapped, matching the backend's
AppServiceProvider JsonResource::withoutWrapping(); the invoice paginator retains data/meta.

Tenant/route remounting clears sensitive form state, and mutation continuations reject stale
company contexts. Creation retry retains the identical payload/key in memory while uncertain.
Submission recovery never depends on browser storage. Native Accounting source is unchanged.

Verified in this session:
- Application and test TypeScript checking passed.
- Four unit/navigation/static and runtime repository firewall tests passed.
- One HTTP integration test passed against an isolated copy of backend 23017b75 with synthetic
  SQLite data and provider submission explicitly disabled. It covers exact tax, zero fallback,
  scenario, creation replay/conflict, update, empty attempts, no-attempt retry rejection,
  disabled submission, cross-company rejection and reference provenance.
- Production build passed.
- Changed/new file whitespace and private-key/token pattern review passed. No hardcoded provider
  URL or credential was introduced. Test-only credentials refer to the existing disposable seed.
- No lint configuration or lint script exists in the baseline; no lint pass is claimed.

Final external verification supplied by the user on 2026-10-02 and reconciled with
this worktree: corrected scenarios 5/5 PASS; unit/firewall 4/4 PASS; complete FBR
Chromium suite 24/24 PASS; typecheck PASS; production build PASS; complete existing
E2E regression 12/12 PASS, including the dedicated FBR HTTP contract integration.
These are normal-macOS-Terminal results, not a claimed Codex Chromium run. The FBR
24-test configuration includes its four unit checks and 20 browser scenarios.
Responsive/keyboard cases cover 390/768/1440 pixels; this is not a comprehensive
accessibility certification. No Chromium rerun was required for finalization.

Final review covers every changed/new frontend file, artifact exclusion, secret and
hardcoded API checks, Accounting firewall, in-memory keys, exact tax conversion,
backend-derived scenario, server retry, historical immutability and backend status.
Only local test URLs and the existing synthetic seed login occur in test code;
no production/provider credential or generated verification artifact is included.
Native Accounting source behavior is unchanged. No push/deployment/import/cutover
or real provider call is part of this work. Backend source remains frozen and clean
at 23017b75f70fb07ae6b5fba650c3bf198ba342ae.

## Follow-up: five external browser failures

The external verifier reported 19/24 passing tests and five failures. Screenshots,
accessibility error contexts, DOM/action traces and reference responses were inspected
for all five before corrections. Each failure was a test locator defect: exact
getByLabel included option text nested inside the label. The rendered controls had
the intended accessible names. Records and Per page are native selects; Buyer
province and the other reference fields are native inputs with datalist suggestions.
The four form failures stopped at Buyer province before their scenario actions.

Tests now use exact combobox role/name locators, assert the actual control types,
reference option presence, focus and retained values. Fixture coverage now includes
all reference categories exercised by fillDraft, including SRO schedule/item.
Per-page selection additionally verifies the outgoing per_page query. No application
control, financial behavior, scenario/retry logic or accounting firewall changed.

Before the successful external verification above, the focused five were attempted
inside Codex but Chromium failed before app loading
with MachPortRendezvousServer permission denied (1100); one launch failed and four
were not run under max-failures=1. That sandbox attempt supplied no browser PASS.
Typecheck, all four unit/firewall tests and production build passed after correction.
The updated normal-Terminal verifier subsequently passed all supplied gates as
recorded above. Backend source remains unchanged.
