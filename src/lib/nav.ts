import type { EffectiveNavigation } from "@/types/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarOff,
  UsersRound,
  CalendarRange,
  Calculator,
  FileText,
  Landmark,
  BookOpen,
  NotebookPen,
  Wrench,
  Wallet,
  Layers,
  PlayCircle,
  PlusCircle,
  MinusCircle,
  BarChart3,
  Receipt,
  Boxes,
  Building2,
  Contact,
  Target,
  Settings,
  ShieldCheck,
  Sparkles,
  ScrollText,
  HandCoins,
  ReceiptText,
  Scale,
  Lock,
  Settings2,
  Activity,
  ListTodo,
  KanbanSquare,
  Upload,
  FormInput,
  Gauge,
  Mail,
  Workflow,
  ChartNoAxesCombined,
  ShoppingCart,
  CreditCard,
  GitCompareArrows,
  CandlestickChart,
  History,
  CalendarClock,
  BrainCircuit,
  Library,
  MessageSquareText,
  Bot,
} from "lucide-vue-next";
import type { Component } from "vue";

export interface NavItem {
  label: string;
  to?: string;
  icon?: Component;
  badge?: string;
  children?: NavItem[];
  module?: string;
  platformAdmin?: boolean;
  permission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, breadcrumbs and command palette. */
export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      {
        label: "HRM", module:"payroll",
        icon: Users,
        children: [
          { label: "Employees", to: "/hrm/employees", icon: Users },
        ],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "FBR Invoicing",
        icon: ReceiptText, module: "invoicing",
        children: [
          { label: "Invoice register", to: "/fbr-invoicing", icon: FileText },
          { label: "FBR configuration", to: "/fbr-invoicing/configuration", icon: Settings2 },
          { label: "Migration administration", to: "/fbr-invoicing/migrations", icon: History },
        ],
      },
      {
        label: "Accounting",
        icon: Calculator,
        children: [
          { label: "Invoices", to: "/accounting/invoices", icon: FileText, module:"invoicing" },
          { label: "Customers", to: "/accounting/customers", icon: Building2, module:"receivables" },
          { label: "FBR Invoices", to: "/accounting/fbr", icon: Landmark, module:"invoicing" },
          { label: "Chart of Accounts", to: "/accounting/chart-of-accounts", icon: BookOpen, module:"accounting" },
          { label: "General Ledger", to: "/accounting/general-ledger", icon: ScrollText, module:"accounting" },
          { label: "Journals", to: "/accounting/journals", icon: NotebookPen, module:"accounting" },
          { label: "Receivables", to: "/accounting/receivables", icon: HandCoins, module:"receivables" },
          { label: "Payables", to: "/accounting/payables", icon: ReceiptText, module:"payables" },
          { label: "Inventory Ledger", to: "/accounting/inventory-ledger", icon: Scale, module:"inventory" },
          { label: "Periods", to: "/accounting/periods", icon: Lock, module:"accounting" },
          { label: "Accounting Setup", to: "/accounting/setup", icon: Settings2, module:"accounting" },
          { label: "Financial Reports", to: "/accounting/reports", icon: BarChart3, module:"accounting" },
          { label: "Cash Flow", to: "/accounting/cash-flow", icon: ChartNoAxesCombined, module:"banking" },
          { label: "Budgeting", to: "/accounting/budgets", icon: CandlestickChart, module:"budgeting" },
          { label: "Year-End Close", to: "/accounting/year-end", icon: Lock, module:"budgeting" },
        ],
      },
      {
        label: "Payroll", module:"payroll",
        icon: Wallet,
        children: [
          { label: "Payroll Dashboard", to: "/payroll", icon: BarChart3 },
          { label: "Payroll Batches", to: "/payroll/batches", icon: Layers },
          { label: "Payroll Runs", to: "/payroll/runs", icon: PlayCircle },
          { label: "Allowances", to: "/payroll/allowances", icon: PlusCircle },
          { label: "Deductions", to: "/payroll/deductions", icon: MinusCircle },
          { label: "Accounting Posting", to: "/payroll/posting", icon: Landmark },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", to: "/inventory", icon: Boxes, module:"inventory" },
      { label: "Purchases", to: "/purchases", icon: ShoppingCart, module:"procurement" },
      {
        label: "CRM", module:"crm",
        icon: Building2,
        children: [
          { label: "Overview", to: "/crm", icon: LayoutDashboard },
          { label: "Companies", to: "/crm/companies", icon: Building2 },
          { label: "Contacts", to: "/crm/contacts", icon: Contact },
          { label: "Leads", to: "/crm/leads", icon: Target },
          { label: "Pipeline", to: "/crm/pipeline", icon: KanbanSquare },
          { label: "Deals", to: "/crm/deals", icon: HandCoins },
          { label: "Activities", to: "/crm/activities", icon: Activity },
          { label: "Tasks", to: "/crm/tasks", icon: ListTodo },
          { label: "Lead Capture", to: "/crm/capture", icon: Upload },
          { label: "Lead Scoring", to: "/crm/scoring", icon: Gauge },
        ],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "ZavSync AI", module:"ai",
        icon: Sparkles,
        children: [
          { label: "Ask ZavSync", to: "/ai", icon: Sparkles, permission: "ai.copilot.use" },
          { label: "Priorities", to: "/ai/priorities", icon: ListTodo, permission: "intelligence.view" },
          { label: "Management Briefing", to: "/ai/briefing", icon: FileText, permission: "intelligence.briefings.view" },
          { label: "Predictive Analytics", to: "/ai/analytics", icon: BrainCircuit, permission: "intelligence.anomalies.view" },
          { label: "AI Operations", to: "/ai/operations", icon: Activity, permission: "intelligence.observability.view" },
          { label: "Action Review", to: "/ai/actions", icon: ShieldCheck, permission: "ai.actions.review" },
          { label: "Smart Agenda", to: "/ai/calendar", icon: CalendarClock, permission: "intelligence.calendar.manage" },
          { label: "Meeting Assistant", to: "/ai/meetings", icon: UsersRound, permission: "intelligence.calendar.manage" },
          { label: "Execution Copilot", to: "/copilot", icon: Bot, permission: "ai.actions.review" },
        ],
      },
      {
        label: "Knowledge", module:"ai",
        icon: Library,
        children: [
          { label: "Documents", to: "/knowledge/documents", icon: FileText, permission: "ai.knowledge.view" },
          { label: "Chat", to: "/knowledge/chat", icon: MessageSquareText, permission: "ai.copilot.use" },
          { label: "Governance", to: "/knowledge/security", icon: ShieldCheck, permission: "ai.providers.view" },
        ],
      },
      {
        label: "Outreach", module:"outreach",
        icon: Mail,
        children: [
          { label: "Providers & Senders", to: "/outreach/integrations", icon: Settings2, permission: "outreach.providers.manage" },
          { label: "Templates & Composer", to: "/outreach/compose", icon: Sparkles, permission: "outreach.templates.manage" },
          { label: "Sequences & Enrollments", to: "/outreach/automations", icon: Workflow, permission: "outreach.sequences.manage" },
          { label: "Dashboard & Tracking", to: "/outreach/tracking", icon: ChartNoAxesCombined, permission: "outreach.reports.view" },
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & Invitations", to: "/users", icon: Users, permission: "platform.users.view" },
      { label: "Navigation visibility", to: "/settings/navigation", icon: Settings2 },
      { label: "Settings", to: "/settings", icon: Settings, permission: "platform.settings.view" },
      { label: "Roles & Permissions", to: "/roles", icon: ShieldCheck, permission: "platform.roles.view" },
      { label: "Audit Log", to: "/audit-log", icon: History, permission: "platform.audit.view" },
      { label: "Security Center", to: "/security", icon: Lock, permission: "platform.security.view" },
      { label: "System Health", to: "/system-health", icon: Activity, platformAdmin: true, permission: "platform.jobs.view" },
    ],
  },
];

/** Exact presentation identities from the certified backend; routes/icons stay local. */
export const presentationKeyForRoute: Record<string, string> = {
  "/hrm/employees": "hrm.employees",
  "/fbr-invoicing": "fbr.invoicing",
  "/fbr-invoicing/configuration": "fbr.configuration",
  "/fbr-invoicing/migrations": "fbr.migrations",
  "/accounting/invoices": "accounting.invoices",
  "/accounting/chart-of-accounts": "accounting.chart",
  "/accounting/general-ledger": "accounting.ledger",
  "/accounting/journals": "accounting.journals",
  "/accounting/periods": "accounting.periods",
  "/accounting/setup": "accounting.setup",
  "/accounting/reports": "accounting.reports",
  "/accounting/customers": "receivables.customers",
  "/accounting/receivables": "receivables.register",
  "/accounting/payables": "payables.register",
  "/accounting/inventory-ledger": "inventory.ledger",
  "/accounting/cash-flow": "banking.cashflow",
  "/accounting/budgets": "budgeting.workspace",
  "/accounting/year-end": "budgeting.year_end",
  "/payroll": "payroll.dashboard",
  "/payroll/batches": "payroll.batches",
  "/payroll/runs": "payroll.runs",
  "/payroll/allowances": "payroll.allowances",
  "/payroll/deductions": "payroll.deductions",
  "/payroll/posting": "payroll.posting",
  "/inventory": "inventory.workspace",
  "/purchases": "procurement.purchases",
  "/crm": "crm.dashboard",
  "/crm/companies": "crm.companies",
  "/crm/contacts": "crm.contacts",
  "/crm/leads": "crm.leads",
  "/crm/pipeline": "crm.pipeline",
  "/crm/deals": "crm.deals",
  "/crm/activities": "crm.activities",
  "/crm/tasks": "crm.tasks",
  "/crm/capture": "crm.capture",
  "/crm/scoring": "crm.scoring",
  "/ai": "ai.copilot",
  "/ai/priorities": "ai.priorities",
  "/ai/briefing": "ai.briefing",
  "/ai/analytics": "ai.analytics",
  "/ai/operations": "ai.operations",
  "/ai/actions": "ai.actions",
  "/ai/calendar": "ai.calendar",
  "/ai/meetings": "ai.meetings",
  "/copilot": "ai.execution",
  "/knowledge/documents": "ai.knowledge_documents",
  "/knowledge/chat": "ai.knowledge_chat",
  "/knowledge/security": "ai.knowledge_governance",
  "/outreach/integrations": "outreach.providers",
  "/outreach/compose": "outreach.templates",
  "/outreach/automations": "outreach.sequences",
  "/outreach/tracking": "outreach.tracking",
};

export function navigationForModules(modules:string[],isPlatformAdmin=false,permissions:string[]=[],effective?:EffectiveNavigation):NavGroup[]{
  const filter=(items:NavItem[]):NavItem[]=>items.flatMap(item=>{
    const key = item.to ? presentationKeyForRoute[item.to] : undefined;
    if (effective && key && !effective.visible_keys.includes(key)) return [];
    if(item.module&&!modules.includes(item.module))return [];
    if(item.platformAdmin&&!isPlatformAdmin)return [];
    const permission = item.permission ?? (item.to ? permissionForPath(item.to) : null);
    if(permission&&!permissions.includes('*')&&!permissions.includes(permission))return [];
    const children=item.children?filter(item.children):undefined;
    if(item.children&&!children?.length)return [];
    return [{...item,children}];
  });
  return navigation.map(group=>({...group,items:filter(group.items)})).filter(group=>group.items.length>0);
}

/** Minimum read permission required to enter each production area. */
export function permissionForPath(path: string): string | null {
  if (path === "/employee/payroll" || path.startsWith("/employee/payroll/")) return "employee.payroll.view";
  if (path === "/fbr-invoicing/configuration") return "fbr.configuration.view";
  if (path.startsWith("/fbr-invoicing/migrations")) return "migration.view";
  if (path === "/fbr-invoicing/new" || (path.startsWith("/fbr-invoicing/") && path.endsWith("/edit"))) return "pakistan_fbr.manage";
  if (path.startsWith("/fbr-invoicing")) return "pakistan_fbr.view";
  if (path.startsWith("/hrm") || path.startsWith("/payroll")) return "payroll.view";
  if (path.startsWith("/accounting/payables/suppliers")) return "suppliers.view";
  if (path.startsWith("/accounting/payables")) return "payables.view";
  if (path === "/accounting/inventory-ledger" || path === "/inventory") return "inventory.view";
  if (path.startsWith("/purchases")) return "purchase_orders.view";
  if (path.startsWith("/banking/settlements")) return "banking.settlements";
  if (path.startsWith("/banking")) return "banking.view";
  if (path === "/accounting/cash-flow") return "banking.cashflow";
  if (path === "/accounting/budgets") return "budget.view";
  if (path === "/accounting/year-end") return "accounting.close.view";
  if (path.startsWith("/accounting")) return "accounting.view";
  if (path === "/crm/capture") return "crm.import";
  if (path.startsWith("/crm")) return "crm.view";
  if (path.startsWith("/outreach/integrations")) return "outreach.providers.manage";
  if (path.startsWith("/outreach/compose")) return "outreach.templates.manage";
  if (path.startsWith("/outreach/automations")) return "outreach.sequences.manage";
  if (path.startsWith("/outreach/tracking")) return "outreach.reports.view";
  if (path === "/ai") return "ai.copilot.use";
  if (path.startsWith("/ai/priorities")) return "intelligence.view";
  if (path.startsWith("/ai/briefing")) return "intelligence.briefings.view";
  if (path.startsWith("/ai/actions") || path === "/copilot") return "ai.actions.review";
  if (path.startsWith("/ai/operations")) return "intelligence.observability.view";
  if (path.startsWith("/ai/calendar") || path.startsWith("/ai/meetings")) return "intelligence.calendar.manage";
  if (path.startsWith("/ai/analytics")) return "intelligence.anomalies.view";
  if (path.startsWith("/knowledge/documents")) return "ai.knowledge.view";
  if (path.startsWith("/knowledge/chat")) return "ai.copilot.use";
  if (path.startsWith("/knowledge/security")) return "ai.providers.view";
  if (/^\/users\/[^/]+\/employee-link$/.test(path)) return "employee.links.manage";
  if (path === "/users") return "platform.users.view";
  if (path === "/settings") return "platform.settings.view";
  if (path === "/roles") return "platform.roles.view";
  if (path === "/audit-log") return "platform.audit.view";
  if (path === "/security") return "platform.security.view";
  if (path === "/system-health") return "platform.jobs.view";
  return null;
}

export function moduleForPath(path:string):string|null{
  if(path==='/employee/payroll'||path.startsWith('/employee/payroll/'))return 'payroll';
  if(path.startsWith("/fbr-invoicing"))return "invoicing";
  if(path.startsWith('/payroll')||path.startsWith('/hrm'))return 'payroll';
  if(path.startsWith('/crm'))return 'crm';
  if(path.startsWith('/purchases'))return 'procurement';
  if(path==='/inventory'||path.includes('inventory'))return 'inventory';
  if(path.includes('receivable')||path.includes('/customers'))return 'receivables';
  if(path.includes('payable')||path.includes('/suppliers'))return 'payables';
  if(path.includes('/invoices')||path.includes('/fbr'))return 'invoicing';
  if(path.startsWith('/banking')||path.includes('cash-flow'))return 'banking';
  if(path.includes('budgets')||path.includes('year-end'))return 'budgeting';
  if(path.startsWith('/accounting'))return 'accounting';
  if(path.startsWith('/outreach'))return 'outreach';
  if(path.startsWith('/ai')||path==='/copilot')return 'ai';
  if(path.startsWith('/knowledge'))return 'ai';
  return null;
}

/** Breadcrumb trail for a path, derived from the same tree. */
export function breadcrumbFor(path: string): { label: string; to?: string }[] {
  const trail: { label: string; to?: string }[] = [];
  const walk = (items: NavItem[], parents: NavItem[]): boolean => {
    for (const item of items) {
      if (item.to && item.to === path) {
        trail.push(...parents.map((p) => ({ label: p.label })), {
          label: item.label,
          to: item.to,
        });
        return true;
      }
      if (item.children && walk(item.children, [...parents, item])) return true;
    }
    return false;
  };
  for (const group of navigation) {
    if (walk(group.items, [])) {
      trail.unshift({ label: group.label });
      break;
    }
  }
  return trail;
}
