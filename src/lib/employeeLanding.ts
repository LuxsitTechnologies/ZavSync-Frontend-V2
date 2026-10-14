import type { useCompanyStore } from "@/stores/company";

/** A self-service candidate still needs employee/me to establish actual linkage. */
export function employeeOnlyCandidate(company: ReturnType<typeof useCompanyStore>): boolean {
  const workspacePermissions = [
    "accounting.view", "pakistan_fbr.view", "platform.settings.view", "payroll.view",
    "crm.view", "inventory.view", "billing.view", "platform.users.view", "ai.copilot.use",
  ];
  return !company.isPlatformAdmin && company.hasModule("payroll") && company.hasPermission("employee.self.view")
    && !workspacePermissions.some(permission => company.hasPermission(permission));
}
