# Stage 16A frontend navigation visibility

Frontend baseline: main, e46f9312addf296e0f95d54c2fbde1c84b58be56, clean before edits.
Frozen backend: main, 26eb29d9536dbd8448cbb30a6db59f624a6e0666, clean.
Both origin URLs matched the specified LuxsitTechnologies repositories.

## Previous behavior and certified contract

The sidebar previously filtered the local navigation tree by commercial module,
platform-admin-only marker and explicit/path-derived permission; empty groups were
removed. Company switching replaced the active membership and its modules/permissions.
Routes independently checked authentication, company, module and permission; the
FBR module rendered its own denial states. These authorization checks remain intact.

The backend supplies effective_navigation on each auth company and switch response.
It contains catalog (commercial key/name/is_active/entitled), items and visible_keys.
Each item carries key, label, group, order, module_key, required_permission,
platform_active, entitled, authorized, visibility_override, presentation_visible,
effective_visible and unavailable_reason. The backend owns effective visibility.

Stage 16A.1 resolves the previous blocker: visibility_override is null for Default
(inherited), true for explicit Show and false for explicit Hide. It is never inferred
from presentation_visible, which is true for both inherited and explicit Show.

GET /api/v1/platform/navigation is available to an active company member. PUT to
/{item} with {is_visible: boolean} and DELETE /{item} require platform.settings.manage.
Responses contain the full resolved navigation object. DELETE removes the override
and returns null; PUT true is not reset. X-Company-Id carries the company context.

## Integration and security boundary

src/lib/nav.ts maps 52 existing routes to exact backend item keys. It does not copy
backend labels, permissions, eligibility calculations or catalogs. Supplied visible_keys
filters managed items; existing permission/entitlement metadata remains defense in depth.
Commercial modules and enabled_modules are never mutated by presentation preferences.
Older payloads without effective_navigation retain the existing navigation filtering
for compatibility; an explicitly supplied empty visible_keys list never falls back.

accounting.invoices and fbr.invoicing are independent despite sharing invoicing.
fbr.configuration and fbr.migrations remain independently permissioned items. The FBR
local menu also respects effective visibility. Financial forms, taxes, scenario,
submission/retry, historical evidence and dedicated FBR repositories are unchanged.

Dashboard and administration stay outside the managed commercial catalog. The legacy
/accounting/fbr link has no key in the certified catalog, so its existing filtering is
preserved rather than inventing a mapping or coupling it to dedicated FBR Invoicing.
The commercial analytics catalog entry does not create a new frontend route.

Presentation-hidden direct routes remain accessible under their existing entitlement
and permission rules. No visibility-derived 403 or platform-admin bypass is added.

## Administration and company switching

Navigation visibility lives at /settings/navigation, linked from existing Settings and
the administration sidebar. Any active member can read it, matching the GET contract;
only platform.settings.manage exposes mutation controls. Existing company Settings
permissions are unchanged. The screen uses V2 AppShell, PageHeader and buttons.

Each item shows Default/explicit Show/explicit Hide plus the returned effective state.
Reasons are exactly PLATFORM_INACTIVE, NOT_ENTITLED, NOT_AUTHORIZED, HIDDEN_BY_COMPANY,
with plain-language labels. Show is unavailable when any access prerequisite fails;
reset can still clear an override. No control implies granting access or subscription.
No optimistic change is made; failed mutations reload the server state. A failed
reload removes the administration data and offers retry rather than inventing state.

During switching, old sidebar items are removed. Fresh switch responses replace the
membership navigation. Administration remounts by contextVersion and is unmounted while
switching. Late responses are checked against company, version and component lifetime.
No navigation preference, credential or idempotency key is stored in browser storage.

## Verification

Passed locally: typecheck; four focused navigation unit tests; four Stage 15B unit and
Accounting-firewall tests; production build; one real HTTP navigation contract test.
The HTTP test uses an isolated git-archive copy of certified backend 26eb29d with vendor
dependencies and synthetic SQLite seed data. It checks initial auth navigation, PUT
show/hide, auth/me persistence, company switch, unchanged commercial modules, independent
Accounting state, authorized hidden FBR API access and DELETE reset to null.
No production database or real provider is used. Frozen backend source is not modified.

Twelve focused browser cases cover show/hide/reset/reload, three unavailable reasons
with explicit Show and platform-admin flag, null/false/true company switching, different
roles, stale mutation response, read-only controls, failed-save recovery, direct-route
access and 390/768/1440px keyboard/overflow checks. Four additional unit checks cover
labels, independent keys, all 52 default mappings and stale company updates.

Final supplied normal-Terminal verification passed on this implementation:
- Typecheck: PASS.
- Navigation unit suite: 4/4 PASS.
- Navigation browser suite: 12/12 PASS.
- FBR unit/Accounting-firewall suite: 4/4 PASS.
- Production build: PASS.
- Complete existing E2E plus navigation contract: 13/13 PASS.
- Stage 16A real backend navigation contract: PASS (included in E2E).
- Complete Stage 15B FBR configuration: 24/24 PASS (includes four unit checks).

These external results were supplied by the user and reconciled with the final diff;
they are not claimed as Codex-executed browser runs. The earlier Codex Chromium launch
was denied by the sandbox before loading the app. No browser rerun was needed for
finalization: only this audit document changed after successful external verification.

Passing browser coverage confirms override defaults/show/hide/reset, reload persistence,
independent Accounting/FBR visibility, unavailable reasons, switching without refresh,
stale responses, read-only administration, failed-write authoritative reload and direct
access to otherwise authorized presentation-hidden routes. Keyboard/responsive checks
pass at 390/768/1440px; this is scoped testing, not a comprehensive accessibility audit.
Final whitespace, static FBR firewall, secret/hardcoded endpoint and artifact reviews
passed. No generated test artifacts, production credentials or unrelated files are included.

No new User Profile, Employee Portal, Company Registration, commercial entitlement,
production module-setting migration or Stage 16C implementation. No push or deployment.
