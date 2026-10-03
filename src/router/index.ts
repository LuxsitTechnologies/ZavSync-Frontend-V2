import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { moduleForPath, permissionForPath } from "@/lib/nav";
import {useCompanyStore} from "@/stores/company";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "dashboard", component: () => import("@/pages/Dashboard.vue") },

  // Employee self-service is part of this authenticated V2 application.
  { path: "/employee", component: () => import("@/pages/employee/EmployeeDashboard.vue") },
  { path: "/employee/profile", component: () => import("@/pages/employee/EmployeeProfile.vue") },
  { path: "/employee/notifications", component: () => import("@/pages/employee/EmployeeNotifications.vue") },
  { path: "/employee/attendance", component: () => import("@/pages/employee/EmployeeAttendance.vue") },
  { path: "/employee/payroll", component: () => import("@/pages/employee/EmployeePayroll.vue") },
  { path: "/employee/payroll/:entry", component: () => import("@/pages/employee/EmployeePayslip.vue") },

  // HRM
  { path: "/hrm/employees", component: () => import("@/pages/HrmEmployees.vue") },
  { path: "/hrm/attendance", component: () => import("@/pages/HrmAttendance.vue") },
  { path: "/hrm/leave", component: () => import("@/pages/HrmLeave.vue") },
  { path: "/hrm/teams", component: () => import("@/pages/HrmTeams.vue") },
  { path: "/hrm/rotas", component: () => import("@/pages/HrmRotas.vue") },

  // Dedicated FBR Invoicing
  ...["/fbr-invoicing", "/fbr-invoicing/new", "/fbr-invoicing/configuration", "/fbr-invoicing/migrations", "/fbr-invoicing/migrations/:run", "/fbr-invoicing/:id/edit", "/fbr-invoicing/:id"].map(path => ({ path, component: () => import("@/pages/FbrInvoicing.vue") })),

  // Accounting
  { path: "/accounting/invoices", component: () => import("@/pages/AccountingInvoices.vue") },
  { path: "/accounting/invoices/:id", component: () => import("@/pages/AccountingInvoiceDetail.vue") },
  { path: "/accounting/customers", component: () => import("@/pages/AccountingCustomers.vue") },
  { path: "/accounting/fbr", component: () => import("@/pages/AccountingFbr.vue") },
  {
    path: "/accounting/chart-of-accounts",
    component: () => import("@/pages/AccountingChartOfAccounts.vue"),
  },
  { path: "/accounting/services", component: () => import("@/pages/AccountingServices.vue") },

  // Phase A — core accounting engine
  { path: "/accounting/general-ledger", component: () => import("@/pages/AccountingGeneralLedger.vue") },
  { path: "/accounting/journals", component: () => import("@/pages/AccountingJournals.vue") },
  { path: "/accounting/journals/new", component: () => import("@/pages/AccountingJournalNew.vue") },
  { path: "/accounting/journals/:id", component: () => import("@/pages/AccountingJournalDetail.vue") },
  { path: "/accounting/periods", component: () => import("@/pages/AccountingPeriods.vue") },
  { path: "/accounting/setup", component: () => import("@/pages/AccountingSetup.vue") },
  { path: "/accounting/receivables", component: () => import("@/pages/AccountingReceivables.vue") },
  { path: "/accounting/receivables/aging", component: () => import("@/pages/AccountingReceivablesAging.vue") },
  {
    path: "/accounting/receivables/statements",
    component: () => import("@/pages/AccountingCustomerStatements.vue"),
  },
  { path: "/accounting/payables", component: () => import("@/pages/AccountingPayables.vue") },
  { path: "/accounting/payables/suppliers", component: () => import("@/pages/AccountingSuppliers.vue") },
  { path: "/accounting/payables/aging", component: () => import("@/pages/AccountingPayablesAging.vue") },
  {
    path: "/accounting/payables/statements",
    component: () => import("@/pages/AccountingSupplierStatements.vue"),
  },
  { path: "/accounting/inventory-ledger", component: () => import("@/pages/AccountingInventoryLedger.vue") },
  { path: "/accounting/reports", component: () => import("@/pages/FinancialReports.vue") },
  { path: "/banking/accounts", component: () => import("@/pages/BankingAccounts.vue") },
  { path: "/banking/reconciliation", component: () => import("@/pages/BankingReconciliation.vue") },
  { path: "/banking/settlements", component: () => import("@/pages/BankingSettlements.vue") },
  { path: "/accounting/cash-flow", component: () => import("@/pages/CashFlow.vue") },
  { path: "/accounting/budgets", component: () => import("@/pages/Budgeting.vue") },
  { path: "/accounting/year-end", component: () => import("@/pages/YearEndClose.vue") },

  // Legacy paths kept working
  { path: "/accounting/ledger", redirect: "/accounting/general-ledger" },
  { path: "/accounting/journal-entries", redirect: "/accounting/journals" },

  // Payroll
  { path: "/payroll", component: () => import("@/pages/PayrollDashboard.vue") },
  { path: "/payroll/batches", component: () => import("@/pages/PayrollBatches.vue") },
  { path: "/payroll/runs", component: () => import("@/pages/PayrollRuns.vue") },
  { path: "/payroll/allowances", component: () => import("@/pages/PayrollAllowances.vue") },
  { path: "/payroll/deductions", component: () => import("@/pages/PayrollDeductions.vue") },
  { path: "/payroll/posting", component: () => import("@/pages/PayrollPosting.vue") },

  // Operations
  { path: "/expenses", component: () => import("@/pages/Expenses.vue") },
  { path: "/inventory", component: () => import("@/pages/Inventory.vue") },
  { path: "/purchases", component: () => import("@/pages/Purchases.vue") },
  { path: "/purchases/:id", component: () => import("@/pages/PurchaseDetail.vue") },

  // CRM + lead intelligence
  { path: "/crm", component: () => import("@/pages/CrmOverview.vue") },
  { path: "/crm/companies", component: () => import("@/pages/CrmClients.vue") },
  { path: "/crm/clients", redirect: "/crm/companies" },
  { path: "/crm/companies/:id", component: () => import("@/pages/CrmCompanyDetail.vue") },
  { path: "/crm/contacts", component: () => import("@/pages/CrmContacts.vue") },
  { path: "/crm/contacts/:id", component: () => import("@/pages/CrmContactDetail.vue") },
  { path: "/crm/leads", component: () => import("@/pages/CrmLeads.vue") },
  { path: "/crm/leads/:id", component: () => import("@/pages/CrmLeadDetail.vue") },
  { path: "/crm/pipeline", component: () => import("@/pages/CrmPipeline.vue") },
  { path: "/crm/deals", component: () => import("@/pages/CrmDeals.vue") },
  { path: "/crm/deals/:id", component: () => import("@/pages/CrmDealDetail.vue") },
  { path: "/crm/activities", component: () => import("@/pages/CrmActivities.vue") },
  { path: "/crm/tasks", component: () => import("@/pages/CrmTasks.vue") },
  { path: "/crm/capture", component: () => import("@/pages/CrmCapture.vue") },
  { path: "/crm/forms", component: () => import("@/pages/CrmFormBuilder.vue") },
  { path: "/crm/scoring", component: () => import("@/pages/CrmScoring.vue") },
  { path: "/outreach/integrations", component: () => import("@/pages/OutreachIntegrations.vue") },
  { path: "/outreach/compose", component: () => import("@/pages/OutreachComposer.vue") },
  { path: "/outreach/automations", component: () => import("@/pages/OutreachAutomations.vue") },
  { path: "/outreach/automations/:id", component: () => import("@/pages/OutreachAutomationDetail.vue") },
  { path: "/outreach/tracking", component: () => import("@/pages/OutreachTracking.vue") },

  // Intelligence & administration
  { path: "/ai", component: () => import("@/pages/Ai.vue") },
  { path: "/ai/priorities", component: () => import("@/pages/AiPriorities.vue") },
  { path: "/ai/briefing", component: () => import("@/pages/AiBriefing.vue") },
  { path: "/ai/actions", component: () => import("@/pages/AiActions.vue") },
  { path: "/ai/operations", component: () => import("@/pages/AiOperations.vue") },
  { path: "/ai/calendar", component: () => import("@/pages/AiCalendar.vue") },
  { path: "/ai/meetings", component: () => import("@/pages/AiMeetings.vue") },
  { path: "/ai/analytics", component: () => import("@/pages/PredictiveAnalytics.vue") },
  { path: "/knowledge/documents", component: () => import("@/pages/KnowledgeDocuments.vue") },
  { path: "/knowledge/security", component: () => import("@/pages/KnowledgeSecurity.vue") },
  { path: "/knowledge/chat", component: () => import("@/pages/KnowledgeChatIndex.vue") },
  { path: "/knowledge/chat/:threadId", component: () => import("@/pages/KnowledgeChat.vue") },
  { path: "/copilot", component: () => import("@/pages/Copilot.vue") },
  { path: "/settings/navigation", component: () => import("@/pages/NavigationSettings.vue") },
  { path: "/settings", component: () => import("@/pages/Settings.vue") },
  { path: "/profile", component: () => import("@/pages/UserProfile.vue") },
  { path: "/users/:membership/employee-link", component: () => import("@/pages/EmployeeLinkSettings.vue") },
  { path: "/users", component: () => import("@/pages/Users.vue") },
  { path: "/roles", component: () => import("@/pages/Roles.vue") },
  { path: "/audit-log", component: () => import("@/pages/AuditLog.vue") },
  { path: "/security", component: () => import("@/pages/Security.vue") },
  { path: "/system-health", component: () => import("@/pages/SystemHealth.vue") },

  // Auth
  { path: "/login", component: () => import("@/pages/Login.vue") },
  { path: "/forgot-password", component: () => import("@/pages/ForgotPassword.vue") },
  { path: "/set-password", component: () => import("@/pages/SetPassword.vue") },
  { path: "/accept-invitation", component: () => import("@/pages/SetPassword.vue") },

  { path: "/:pathMatch(.*)*", component: () => import("@/pages/NotFound.vue") },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const publicPaths = new Set(["/login", "/forgot-password", "/set-password", "/accept-invitation"]);
  const company = useCompanyStore();
  if (publicPaths.has(to.path)) {
    return company.authenticated && to.path === "/login" ? "/" : true;
  }
  if (!company.authenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.path === "/profile") return true;
  if (!company.activeCompanyId) return to.path === "/" ? true : "/";

  // The dedicated module renders explicit permission/entitlement states.
  if (to.path.startsWith("/fbr-invoicing")) return true;

  const module = moduleForPath(to.path);
  const permission = permissionForPath(to.path);
  if (to.path === "/system-health" && !company.isPlatformAdmin) return "/";
  if (permission && !company.hasPermission(permission)) return "/";
  if (module && !company.hasModule(module)) return "/";
  return true;
});
