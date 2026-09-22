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
        label: "HRM",
        icon: Users,
        children: [
          { label: "Employees", to: "/hrm/employees", icon: Users },
          { label: "Attendance", to: "/hrm/attendance", icon: CalendarCheck },
          { label: "Leave", to: "/hrm/leave", icon: CalendarOff, badge: "4" },
          { label: "Teams", to: "/hrm/teams", icon: UsersRound },
          { label: "Rotas", to: "/hrm/rotas", icon: CalendarRange },
        ],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Accounting",
        icon: Calculator,
        children: [
          { label: "Invoices", to: "/accounting/invoices", icon: FileText },
          { label: "FBR Invoices", to: "/accounting/fbr", icon: Landmark },
          { label: "Chart of Accounts", to: "/accounting/chart-of-accounts", icon: BookOpen },
          { label: "General Ledger", to: "/accounting/general-ledger", icon: ScrollText },
          { label: "Journals", to: "/accounting/journals", icon: NotebookPen },
          { label: "Receivables", to: "/accounting/receivables", icon: HandCoins },
          { label: "Payables", to: "/accounting/payables", icon: ReceiptText },
          { label: "Inventory Ledger", to: "/accounting/inventory-ledger", icon: Scale },
          { label: "Periods", to: "/accounting/periods", icon: Lock },
          { label: "Accounting Setup", to: "/accounting/setup", icon: Settings2 },
          { label: "Services", to: "/accounting/services", icon: Wrench },
          { label: "Financial Reports", to: "/accounting/reports", icon: BarChart3 },
          { label: "Cash Flow", to: "/accounting/cash-flow", icon: ChartNoAxesCombined },
          { label: "Budgeting", to: "/accounting/budgets", icon: CandlestickChart },
          { label: "Year-End Close", to: "/accounting/year-end", icon: Lock },
        ],
      },
      {
        label: "Payroll",
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
      { label: "Expenses", to: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", to: "/inventory", icon: Boxes },
      { label: "Purchases", to: "/purchases", icon: ShoppingCart },
      {
        label: "CRM",
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
          { label: "Capture Forms", to: "/crm/forms", icon: FormInput },
          { label: "Lead Scoring", to: "/crm/scoring", icon: Gauge },
        ],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "ZavSync AI",
        icon: Sparkles,
        children: [
          { label: "Ask ZavSync", to: "/ai", icon: Sparkles },
          { label: "Priorities", to: "/ai/priorities", icon: ListTodo },
          { label: "Smart Agenda", to: "/ai/calendar", icon: CalendarClock },
          { label: "Meeting Assistant", to: "/ai/meetings", icon: UsersRound },
          { label: "Predictive Analytics", to: "/ai/analytics", icon: BrainCircuit },
          { label: "Execution Copilot", to: "/copilot", icon: Bot },
        ],
      },
      {
        label: "Knowledge",
        icon: Library,
        children: [
          { label: "Documents", to: "/knowledge/documents", icon: FileText },
          { label: "Chat", to: "/knowledge/chat", icon: MessageSquareText },
          { label: "Security", to: "/knowledge/security", icon: ShieldCheck },
        ],
      },
      {
        label: "Outreach",
        icon: Mail,
        children: [
          { label: "Email Integrations", to: "/outreach/integrations", icon: Settings2 },
          { label: "AI Composer", to: "/outreach/compose", icon: Sparkles },
          { label: "Automations", to: "/outreach/automations", icon: Workflow },
          { label: "Email Tracking", to: "/outreach/tracking", icon: ChartNoAxesCombined },
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Roles & Permissions", to: "/roles", icon: ShieldCheck },
      { label: "Audit Log", to: "/audit-log", icon: History },
    ],
  },
];

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
