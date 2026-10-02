import { defineStore } from "pinia";
import { ref, watch } from "vue";

import { ApiError } from "@/services/api/client";
import { employeePayrollRepository } from "@/services/employeePayroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { EmployeePayrollPage, EmployeePayslip } from "@/types/employeePayroll";

const requestError = (error: unknown): ApiError => error instanceof ApiError
  ? error : new ApiError("Your payroll could not be loaded. Please retry.");

export const useEmployeePayrollStore = defineStore("employeePayroll", () => {
  const company = useCompanyStore();
  const history = ref<EmployeePayrollPage | null>(null);
  const detail = ref<EmployeePayslip | null>(null);
  const historyLoading = ref(false);
  const detailLoading = ref(false);
  const historyError = ref<ApiError | null>(null);
  const detailError = ref<ApiError | null>(null);
  let historyController: AbortController | null = null;
  let detailController: AbortController | null = null;
  let generation = 0;

  function clear(): void {
    historyController?.abort();
    detailController?.abort();
    historyController = null;
    detailController = null;
    generation += 1;
    history.value = null;
    detail.value = null;
    historyLoading.value = false;
    detailLoading.value = false;
    historyError.value = null;
    detailError.value = null;
  }

  function current(id: string, version: number, claim: number, controller: AbortController, kind: "history" | "detail"): boolean {
    return company.authenticated && !company.switching && company.activeCompanyId === id
      && company.contextVersion === version && generation === claim
      && (kind === "history" ? historyController : detailController) === controller;
  }

  async function loadHistory(page = 1): Promise<void> {
    if (company.switching || !company.activeCompanyId || !company.hasPermission("employee.payroll.view") || !company.hasModule("payroll")) return;
    historyController?.abort();
    const controller = new AbortController();
    historyController = controller;
    const id = company.activeCompanyId;
    const version = company.contextVersion;
    const claim = generation;
    history.value = null;
    historyError.value = null;
    historyLoading.value = true;
    try {
      const response = await employeePayrollRepository.history(id, page, controller.signal);
      if (current(id, version, claim, controller, "history")) history.value = response;
    } catch (error) {
      if (current(id, version, claim, controller, "history")) historyError.value = requestError(error);
    } finally {
      if (current(id, version, claim, controller, "history")) historyLoading.value = false;
    }
  }

  async function loadDetail(entryId: string): Promise<void> {
    if (company.switching || !company.activeCompanyId || !company.hasPermission("employee.payroll.view") || !company.hasModule("payroll")) return;
    detailController?.abort();
    const controller = new AbortController();
    detailController = controller;
    const id = company.activeCompanyId;
    const version = company.contextVersion;
    const claim = generation;
    detail.value = null;
    detailError.value = null;
    detailLoading.value = true;
    try {
      const response = await employeePayrollRepository.detail(id, entryId, controller.signal);
      if (current(id, version, claim, controller, "detail")) detail.value = response;
    } catch (error) {
      if (current(id, version, claim, controller, "detail")) detailError.value = requestError(error);
    } finally {
      if (current(id, version, claim, controller, "detail")) detailLoading.value = false;
    }
  }

  watch(() => [company.switching, company.activeCompanyId, company.contextVersion, company.authenticated] as const, clear, { flush: "sync" });

  return { history, detail, historyLoading, detailLoading, historyError, detailError, clear, loadHistory, loadDetail };
});
