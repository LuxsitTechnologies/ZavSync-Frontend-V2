import { computed, ref, shallowRef, watch, type Ref, type WatchSource } from "vue";

import { ApiError } from "@/services/api/client";

export interface AsyncState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<ApiError | null>;
  /** True once a request finished and returned nothing meaningful. */
  isEmpty: Ref<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Standard data lifecycle for every API-driven accounting screen:
 * loading → success | empty | validation error | server error | permission denied.
 * A request always settles, so the UI never hangs in a loading state.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  options: {
    watch?: WatchSource[];
    immediate?: boolean;
    isEmpty?: (data: T) => boolean;
    timeoutMs?: number;
  } = {},
): AsyncState<T> {
  const data = shallowRef<T | null>(null);
  const loading = ref(false);
  const error = ref<ApiError | null>(null);
  let token = 0;

  async function refresh() {
    const current = ++token;
    loading.value = true;
    error.value = null;
    data.value = null;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ApiError("The server took too long to respond. Please retry.", "network")),
        options.timeoutMs ?? 15000,
      ),
    );
    try {
      const result = await Promise.race([loader(), timeout]);
      if (current !== token) return;
      data.value = result;
    } catch (err) {
      if (current !== token) return;
      data.value = null;
      error.value =
        err instanceof ApiError
          ? err
          : new ApiError(err instanceof Error ? err.message : "Something went wrong.", "server");
    } finally {
      if (current === token) loading.value = false;
    }
  }

  const isEmpty = computed(() => {
    if (loading.value || error.value || data.value === null) return false;
    if (options.isEmpty) return options.isEmpty(data.value);
    return Array.isArray(data.value) ? data.value.length === 0 : false;
  });

  if (options.watch?.length) {
    watch(options.watch, () => void refresh(), { flush: "sync" });
  }
  if (options.immediate !== false) void refresh();

  return { data, loading, error, isEmpty, refresh };
}

/** Mutation lifecycle for create/update/post actions with field-level validation. */
export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const saving = ref(false);
  const error = ref<ApiError | null>(null);
  const fieldErrors = computed(() => error.value?.fields ?? {});

  async function run(...args: TArgs): Promise<TResult | null> {
    saving.value = true;
    error.value = null;
    try {
      return await action(...args);
    } catch (err) {
      error.value =
        err instanceof ApiError
          ? err
          : new ApiError(err instanceof Error ? err.message : "Something went wrong.", "server");
      return null;
    } finally {
      saving.value = false;
    }
  }

  function reset() {
    error.value = null;
  }

  return { run, saving, error, fieldErrors, reset };
}
