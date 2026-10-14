# Visible names reviewed for requirements 1–22

The listed changes are presentation text only. Technical routes, navigation keys, permissions and backend status values remain unchanged.

| Current visible name | Proposed visible name | Requirement | Approval source | Implementation location |
|---|---|---|---|---|
| FBR Invoicing / Pakistan FBR invoice register | FBR Invoice | 02, 05 | Explicitly approved in user request | `src/lib/nav.ts`, `src/pages/FbrInvoicing.vue`, FBR component descriptions |
| Create draft | Create Invoice | 03 | Explicitly approved in user request | `src/components/fbr/FbrRegister.vue`, `FbrEditor.vue` |
| Save draft and review | Save Draft | 03 | Explicitly approved in user request | `src/components/fbr/FbrEditor.vue` |
| Navigation visibility | Navigation Visibility | 04, 07 | User explicitly requires Title Case | Navigation page and sidebar |
| Employee documents / Shift swaps / Equipment requests / Expense claims / Expense categories | Employee Documents / Shift Swaps / Equipment Requests / Expense Claims / Expense Categories | 04 | User's explicit Title Case examples | HRM/Employee Portal navigation and domain headings |
| Existing dashboard return absent | Back to Dashboard | 17 | Descriptive action using existing Dashboard terminology requested by user | Employee Portal sidebar/topbar |
| No dedicated page | Billing | 12 | User expressly requests a dedicated Billing page | `src/pages/Billing.vue`, route and sidebar |
| Obsolete public preview title/description | ZavSync / Unified. Intelligent. Synchronized. | 16 | Explicitly approved in user request | `index.html` |

No additional product or module name is proposed. Company Profile, Company Portal, Portal Settings and Dashboard Customization are names used in the request, but their full pages are not implemented while the relevant backend contracts are absent. Any alternate name is **NEEDS USER APPROVAL** before implementation.
