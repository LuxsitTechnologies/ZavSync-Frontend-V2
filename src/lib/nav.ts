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
          { label: "Services", to: "/accounting/services", icon: Wrench, module:"accounting" },
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
      { label: "Expenses", to: "/expenses", icon: Receipt },
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
        label: "ZavSync AI", module:"ai",
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
        label: "Knowledge", module:"analytics",
        icon: Library,
        children: [
          { label: "Documents", to: "/knowledge/documents", icon: FileText, permission: "platform.documents.view" },
          { label: "Chat", to: "/knowledge/chat", icon: MessageSquareText },
          { label: "Security", to: "/knowledge/security", icon: ShieldCheck },
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
      { label: "Settings", to: "/settings", icon: Settings, permission: "platform.settings.view" },
      { label: "Roles & Permissions", to: "/roles", icon: ShieldCheck, permission: "platform.roles.view" },
      { label: "Audit Log", to: "/audit-log", icon: History, permission: "platform.audit.view" },
      { label: "Security Center", to: "/security", icon: Lock, permission: "platform.security.view" },
      { label: "System Health", to: "/system-health", icon: Activity, platformAdmin: true, permission: "platform.jobs.view" },
    ],
  },
];

export function navigationForModules(modules:string[],isPlatformAdmin=false,permissions:string[]=[]):NavGroup[]{
  const filter=(items:NavItem[]):NavItem[]=>items.flatMap(item=>{
    if(item.module&&!modules.includes(item.module))return [];
    if(item.platformAdmin&&!isPlatformAdmin)return [];
    if(item.permission&&!permissions.includes('*')&&!permissions.includes(item.permission))return [];
    const children=item.children?filter(item.children):undefined;
    if(item.children&&!children?.length)return [];
    return [{...item,children}];
  });
  return navigation.map(group=>({...group,items:filter(group.items)})).filter(group=>group.items.length>0);
}

export function moduleForPath(path:string):string|null{
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
  if(path.startsWith('/knowledge'))return 'analytics';
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
