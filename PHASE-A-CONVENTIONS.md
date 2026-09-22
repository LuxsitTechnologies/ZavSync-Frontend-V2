# ZavSync Phase A — Core Accounting Engine (frontend conventions)

Read this before writing any accounting page. The foundation already exists; do
not re-create it, do not invent new patterns, do not import mock data directly.

## Architecture

```
page.vue → repository (src/services/accounting/*) → apiRequest() when VITE_API_BASE_URL is set
                                                  → preview adapter (src/services/mock/accounting-db.ts) otherwise
```

- Pages MUST NOT import `src/services/mock/accounting-db.ts` or `src/lib/mock-modules.ts`.
- Pages MUST NOT compute authoritative balances, FIFO costs or aging — render what the repository returns.
- Every repository call takes `companyId` first: `useCompanyStore().activeCompanyId`.
- Re-fetch when the company changes: `useAsyncData(loader, { watch: [() => company.activeCompanyId, ...] })`.

## Money

- `import type { Money } from "@/types/accounting"` — integer minor units (paisa). Never floats.
- Display: `formatMoney`, `formatMoneyOrDash`, `formatMoneyCompact`, `formatQuantity` from `@/lib/money`.
- Input: `<MoneyInput v-model="amount" label="…" :error="…" />` (`@/components/accounting/MoneyInput.vue`).
- Never `toFixed`, never `Number(x) * 1.15`, never sum with `+` on major-unit numbers.

## Data lifecycle (mandatory on every API-driven surface)

```ts
const company = useCompanyStore();
const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => accountsRepository.list(company.activeCompanyId, query),
  { watch: [() => company.activeCompanyId, () => query.search] },
);
```

```vue
<AsyncSection :loading="loading" :error="error" :empty="isEmpty" empty-title="…" empty-message="…" @retry="refresh">
  <DataTable … />
</AsyncSection>
```

`AsyncSection` covers loading, server error, permission denied, network and empty.
Mutations use `useMutation` from the same composable (`saving`, `error`, `fieldErrors`, `run`, `reset`)
and surface field errors through `:error="fieldErrors['field'] ?? null"` / `<ValidationMessage />`.

## Existing components (reuse, never duplicate)

`@/components/zs/`: AppShell, PageHeader (`#actions` slot), Panel (`title`, `description`, `bodyClass`, `#actions`),
StatCard (`label`, `value`, `hint`, `tone`), DataTable (`columns`, `rows`, `minWidth`, `empty`; slot per column key with `{ row }`, `#footer`),
Toolbar, SearchInput (`v-model`), Field, ZButton (`variant` primary|outline|ghost), StatusBadge (`status`, `label`),
AsyncSection, ValidationMessage, SidePanel (`open`, `title`, `description`, `width`, `#footer`, `@close`),
ConfirmDialog (`open`, `title`, `message`, `confirmLabel`, `tone`, `busy`, `@confirm`, `@cancel`).

`@/components/accounting/`: MoneyInput, AccountSelect (`v-model`, `types`, `postableOnly`, `label`, `error`),
DateRangeFilter (`v-model:from`, `v-model:to`), JournalLinesEditor (`v-model:lines`, `errors`, `disabled`),
AgingTable (`rows`, `partyLabel`), PaymentDialog (`open`, `mode` receipt|payment, `documentNumber`, `partyName`,
`total`, `paid`, `outstanding`, `saving`, `serverError`, `fieldErrors`, `@submit`, `@close`), AuditMeta.

## Page shape

```vue
<script setup lang="ts">
import { AppShell, PageHeader } from …  // AppShell.vue and PageHeader.vue are separate files
setPageMeta("Chart of Accounts", "Company-scoped chart of accounts with balances and hierarchy.");
</script>
<template>
  <AppShell>
    <PageHeader title="…" description="…"><template #actions>…</template></PageHeader>
    …summary StatCards… <Panel>…</Panel>
  </AppShell>
</template>
```

`setPageMeta` comes from `@/lib/page-meta`. Dates via `shortDate` from `@/lib/format`.

## Design rules

- Tokens only: `bg-surface`, `bg-surface-sunken`, `border-line`, `text-content`, `text-content-secondary`,
  `text-content-muted`, `text-content-brand`, `bg-primary`, `text-primary-foreground`, `bg-primary-subtle`,
  `text-success/warning/danger`. Never `text-white`, `bg-black`, or hex colours.
- Utility classes: `panel`, `field`, `label-caps`, `num` (tabular figures — use on every money/date/code cell),
  `zs-badge` + `badge-neutral|success|warning|danger|info|brand`, `table-head`, `table-row-zs`, `h-control`.
- Desktop-first, responsive: tables inside `DataTable` scroll horizontally via `minWidth`; filters wrap.
- Clean and compact. No decorative animation.

## Accounting rules the UI must honour

- Total debit must equal total credit before a journal can be posted; unbalanced = never posted.
- Posted records are immutable: no edit of accounting values, no delete. Offer **Reverse** instead,
  through `journalsRepository.reverse(...)`, behind a `ConfirmDialog`.
- Closed periods reject postings — the repositories throw; surface the message, don't swallow it.
- Accounts with `transaction_count > 0` or `is_system` must not offer destructive deletion — only deactivate,
  and system accounts cannot be deactivated.
- Negative amounts are rejected in workflows that don't support them; show an actionable message.
- Show audit fields (created/updated/posted by & at, source, reference) on detail views via `AuditMeta`.
- Where the backend owns document generation (statement PDFs), call the repository export method and show the
  returned error honestly — never fabricate a client-side PDF.
