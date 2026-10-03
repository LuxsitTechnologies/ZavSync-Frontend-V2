import { onBeforeUnmount, reactive, watch } from 'vue';
import { ApiError } from '@/services/api/client';
import { useCompanyStore } from '@/stores/company';

/** One request per channel, fenced by company, context revision and component lifetime. */
export function useLeaveContext(reset: () => void, reload: () => void) {
  const company = useCompanyStore();
  const busy = reactive<Record<string, boolean>>({});
  const errors = reactive<Record<string, ApiError | undefined>>({});
  const controllers = new Map<string, AbortController>();
  let generation = 0;
  let alive = true;
  function invalidate(channel: string) {
    controllers.get(channel)?.abort(); controllers.delete(channel);
    busy[channel] = false; errors[channel] = undefined;
  }
  function clear() {
    generation += 1;
    controllers.forEach(controller => controller.abort()); controllers.clear();
    Object.keys(busy).forEach(key => delete busy[key]);
    Object.keys(errors).forEach(key => delete errors[key]);
    reset();
  }
  async function run<T>(channel: string, operation: (id: string, signal: AbortSignal) => Promise<T>, accept: (value: T) => void): Promise<boolean> {
    if (!alive || company.switching || !company.authenticated || !company.activeCompanyId) return false;
    if (channel === 'mutation' && busy[channel]) return false;
    controllers.get(channel)?.abort();
    const controller = new AbortController(); controllers.set(channel, controller);
    const id = company.activeCompanyId, version = company.contextVersion, claim = generation;
    const current = () => alive && !company.switching && company.authenticated && id === company.activeCompanyId && version === company.contextVersion && claim === generation && controllers.get(channel) === controller;
    busy[channel] = true; errors[channel] = undefined;
    try {
      const value = await operation(id, controller.signal);
      if (!current()) return false;
      accept(value); return true;
    } catch (error) {
      if (current()) errors[channel] = error instanceof ApiError ? error : new ApiError('Leave could not be loaded. Please retry.', 'network');
      return false;
    } finally { if (current()) busy[channel] = false; }
  }
  watch(() => [company.switching, company.activeCompanyId, company.contextVersion, company.authenticated, company.activePermissions.join(','), company.activeModules.join(',')] as const,
    () => { clear(); if (alive && !company.switching && company.authenticated && company.activeCompanyId) reload(); }, { flush: 'sync' });
  onBeforeUnmount(() => { alive = false; clear(); });
  return { run, busy, errors, clear, invalidate };
}
