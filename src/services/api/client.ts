/**
 * ZavSync API client.
 *
 * Feature screens talk to ZavSync through domain repositories. The backend is
 * always authoritative; a missing or unreachable API is an error, never a
 * signal to substitute browser-side data.
 */

export type ApiErrorKind = "validation" | "permission" | "not_found" | "conflict" | "server" | "network";

export class ApiError extends Error {
  kind: ApiErrorKind;
  /** Field-level messages keyed by form field name. */
  fields: Record<string, string>;
  status?: number;
  errorCode?: string;
  requestId?: string;

  constructor(
    message: string,
    kind: ApiErrorKind = "server",
    fields: Record<string, string> = {},
    status?: number,
    errorCode?: string,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.fields = fields;
    this.status = status;
    this.errorCode = errorCode;
    this.requestId = requestId;
  }
}

export function validationError(message: string, fields: Record<string, string> = {}) {
  return new ApiError(message, "validation", fields);
}

const BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "/api/v1";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Active company. The backend resolves and authorizes this header. */
  companyId?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown | FormData;
  signal?: AbortSignal;
  idempotencyKey?: string;
}

function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="));
  return cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : undefined;
}

export async function ensureCsrfCookie(): Promise<void> {
  const origin = new URL(BASE_URL, window.location.origin).origin;
  const response = await fetch(`${origin}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError(
      "Could not initialize the secure sign-in session.",
      "network",
      {},
      response.status,
    );
  }
}

function kindFor(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422 || status === 400) return "validation";
  return "server";
}

export async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  let response: Response;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...(options.companyId ? { "X-Company-Id": options.companyId } : {}),
        ...(csrfToken() ? { "X-XSRF-TOKEN": csrfToken() as string } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body === undefined ? undefined : isFormData ? options.body as FormData : JSON.stringify(options.body),
      credentials: "include",
      signal: options.signal,
    });
  } catch {
    throw new ApiError("Could not reach the ZavSync server. Check your connection and retry.", "network");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let fields: Record<string, string> = {};
    let errorCode: string | undefined;
    try {
      const payload = (await response.json()) as { message?: string; error_code?:string; errors?: Record<string, string[]> };
      if (payload.message) message = payload.message;
      errorCode = payload.error_code;
      if (payload.errors) {
        fields = Object.fromEntries(
          Object.entries(payload.errors).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? "") : String(v)]),
        );
      }
    } catch {
      /* keep the default message */
    }
    const requestId = response.headers.get("X-Request-Id") ?? undefined;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zavsync:unauthenticated"));
    }
    throw new ApiError(message, kindFor(response.status), fields, response.status, errorCode, requestId);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiDownload(path: string, companyId: string, filename: string): Promise<void> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      Accept: "application/octet-stream",
      "X-Company-Id": companyId,
      ...(csrfToken() ? { "X-XSRF-TOKEN": csrfToken() as string } : {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zavsync:unauthenticated"));
    }
    throw new ApiError(
      "The document could not be downloaded.",
      kindFor(response.status),
      {},
      response.status,
      undefined,
      response.headers.get("X-Request-Id") ?? undefined,
    );
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
