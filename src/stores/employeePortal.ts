import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { identityRepository } from "@/services/identity.repository";
import { platformRepository } from "@/services/platform/repository";
import { ApiError } from "@/services/api/client";
import { useCompanyStore } from "@/stores/company";
import type { EmployeeSelf } from "@/types/identity";
import type { NotificationInbox, NotificationPreference } from "@/types/platform";

const requestError = (error: unknown): ApiError => error instanceof ApiError
  ? error
  : new ApiError("The Employee Portal could not load. Please retry.");

export const useEmployeePortalStore = defineStore("employeePortal", () => {
  const company = useCompanyStore();
  const employee = ref<EmployeeSelf | null>(null);
  const inbox = ref<NotificationInbox | null>(null);
  const preferences = ref<NotificationPreference[] | null>(null);
  const employeeLoading = ref(false);
  const notificationsLoading = ref(false);
  const preferencesLoading = ref(false);
  const employeeError = ref<ApiError | null>(null);
  const notificationsError = ref<ApiError | null>(null);
  const preferencesError = ref<ApiError | null>(null);
  let controller: AbortController | null = null;
  let generation = 0;

  const canViewEmployee = computed(() => company.hasPermission("employee.self.view"));
  const current = (id: string, version: number, claim: number): boolean =>
    !company.switching && company.authenticated && company.activeCompanyId === id
    && company.contextVersion === version && generation === claim;

  function clear(): void {
    controller?.abort();
    controller = null;
    generation += 1;
    employee.value = null;
    inbox.value = null;
    preferences.value = null;
    employeeLoading.value = false;
    notificationsLoading.value = false;
    preferencesLoading.value = false;
    employeeError.value = null;
    notificationsError.value = null;
    preferencesError.value = null;
  }

  function claim(): { id: string; version: number; generation: number; signal: AbortSignal } | null {
    if (company.switching || !company.authenticated || !company.activeCompanyId || !controller) return null;
    return { id: company.activeCompanyId, version: company.contextVersion, generation, signal: controller.signal };
  }

  async function loadEmployee(): Promise<void> {
    const context = claim();
    if (!context || !canViewEmployee.value) return;
    employee.value = null;
    employeeError.value = null;
    employeeLoading.value = true;
    try {
      const response = await identityRepository.employee(context.id, context.signal);
      if (current(context.id, context.version, context.generation)) employee.value = response;
    } catch (error) {
      if (current(context.id, context.version, context.generation)) employeeError.value = requestError(error);
    } finally {
      if (current(context.id, context.version, context.generation)) employeeLoading.value = false;
    }
  }

  async function loadNotifications(): Promise<void> {
    const context = claim();
    if (!context) return;
    inbox.value = null;
    notificationsError.value = null;
    notificationsLoading.value = true;
    try {
      const response = await platformRepository.notifications(context.id, context.signal);
      if (current(context.id, context.version, context.generation)) inbox.value = response;
    } catch (error) {
      if (current(context.id, context.version, context.generation)) notificationsError.value = requestError(error);
    } finally {
      if (current(context.id, context.version, context.generation)) notificationsLoading.value = false;
    }
  }

  async function loadMoreNotifications(): Promise<void> {
    const context = claim();
    const currentPage = inbox.value?.notifications.current_page ?? 0;
    const lastPage = inbox.value?.notifications.last_page ?? 0;
    if (!context || !inbox.value || currentPage >= lastPage || notificationsLoading.value) return;
    notificationsError.value = null;
    notificationsLoading.value = true;
    try {
      const response = await platformRepository.notifications(context.id, context.signal, currentPage + 1);
      if (current(context.id, context.version, context.generation) && inbox.value) {
        inbox.value = { ...response, notifications: { ...response.notifications, data: [...inbox.value.notifications.data, ...response.notifications.data] } };
      }
    } catch (error) {
      if (current(context.id, context.version, context.generation)) notificationsError.value = requestError(error);
    } finally {
      if (current(context.id, context.version, context.generation)) notificationsLoading.value = false;
    }
  }

  async function loadPreferences(): Promise<void> {
    const context = claim();
    if (!context) return;
    preferences.value = null;
    preferencesError.value = null;
    preferencesLoading.value = true;
    try {
      const response = await platformRepository.notificationPreferences(context.id, context.signal);
      if (current(context.id, context.version, context.generation)) preferences.value = response;
    } catch (error) {
      if (current(context.id, context.version, context.generation)) preferencesError.value = requestError(error);
    } finally {
      if (current(context.id, context.version, context.generation)) preferencesLoading.value = false;
    }
  }

  async function readNotification(id: string): Promise<void> {
    const context = claim();
    if (!context) return;
    await platformRepository.readNotification(context.id, id, context.signal);
    if (current(context.id, context.version, context.generation)) await loadNotifications();
  }

  async function readAllNotifications(): Promise<void> {
    const context = claim();
    if (!context) return;
    await platformRepository.readAllNotifications(context.id, context.signal);
    if (current(context.id, context.version, context.generation)) await loadNotifications();
  }

  async function savePreferences(value: NotificationPreference[]): Promise<void> {
    const context = claim();
    if (!context) return;
    const response = await platformRepository.saveNotificationPreferences(context.id, value, context.signal);
    if (current(context.id, context.version, context.generation)) preferences.value = response;
  }

  watch(
    () => [company.switching, company.activeCompanyId, company.contextVersion, company.authenticated, canViewEmployee.value] as const,
    () => {
      clear();
      if (company.switching || !company.authenticated || !company.activeCompanyId) return;
      controller = new AbortController();
      if (canViewEmployee.value) void loadEmployee();
      void loadNotifications();
    },
    { immediate: true, flush: "sync" },
  );

  return {
    employee, inbox, preferences, employeeLoading, notificationsLoading, preferencesLoading,
    employeeError, notificationsError, preferencesError, canViewEmployee,
    clear, loadEmployee, loadNotifications, loadMoreNotifications, loadPreferences, readNotification, readAllNotifications, savePreferences,
  };
});
