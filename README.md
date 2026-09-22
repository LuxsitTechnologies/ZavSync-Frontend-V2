# ZavSync Frontend — Vue 3 + TypeScript + Vite

Complete ZavSync portal UI (design system, app shell, 26 screens) built with
Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia and Tailwind CSS v4.
All data is typed mock data — swap `src/lib/*` for API calls when the Laravel
backend is ready.

## Run

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # type-check + production build
```

## Structure

```
src/
  assets/            ZavSync logo (light + dark wordmark)
  components/zs/     Design-system components
    AppShell.vue     Sidebar + topbar + content frame
    Sidebar.vue      Grouped, collapsible module navigation
    Topbar.vue       Breadcrumbs, search, company switcher, theme toggle, user
    AuthLayout.vue   Split auth screen with brand panel
    DataTable.vue    Slot-driven table (columns + named cell slots)
    Panel.vue StatCard.vue Toolbar.vue SearchInput.vue StatusBadge.vue
    ZButton.vue PageHeader.vue Field.vue Logo.vue AreaChart.vue
  lib/
    format.ts        PKR money, dates, initials, status → tone mapping
    nav.ts           Single source of truth for nav + breadcrumbs
    mock-data.ts     Employees, invoices, companies, dashboard KPIs
    mock-modules.ts  Attendance, leave, teams, rotas, FBR, ledger, payroll,
                     expenses, inventory, CRM, AI history
    page-meta.ts     Per-page title/description/OG tags
    utils.ts         cn() class merge
  pages/             One SFC per screen
  router/index.ts    All routes
  styles/zavsync.css Tailwind v4 theme: brand teal, charcoal neutrals,
                     status tones, layout metrics, dark mode, utilities
```

## Screens

Dashboard · HRM (Employees, Attendance, Leave, Teams, Rotas) ·
Accounting (Invoices, FBR Invoices, Chart of Accounts, Ledger, Journal Entries,
Services) · Payroll (Dashboard, Batches, Runs, Allowances, Deductions) ·
Expenses · Inventory · CRM (Clients, Contacts, Leads) · ZavSync AI · Settings ·
Roles & Permissions · Login · Forgot Password · Set Password · 404

## Design system

Everything is a semantic token in `src/styles/zavsync.css` (`--primary`,
`--content`, `--surface`, `--line`, `--success`, `--chart-1`, `--sidebar`, …)
exposed to Tailwind through `@theme inline`. Never hardcode colours in
components — use the tokens so dark mode and rebranding stay one-file changes.

Utility classes: `panel`, `field`, `nav-item`, `zs-badge` + `badge-*`,
`table-head`, `table-row-zs`, `label-caps`, `num`.

Fonts: Audiowide (brand), Inter Tight (UI), JetBrains Mono (numerics).
