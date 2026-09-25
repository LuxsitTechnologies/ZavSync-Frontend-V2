/**
 * ZavSync API client.
 *
 * The accounting frontend never talks to a backend directly: every screen goes
 * through a repository in `src/services/accounting/*`. Each repository calls
 * `apiRequest()` when a real API base URL is configured, and otherwise falls
 * back to its in-memory preview adapter. Nothing here pretends mock data is
 * production data — `isApiConfigured()` is surfaced in the UI.
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

const BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export function isApiConfigured(): boolean {
  return BASE_URL.length > 0;
}

/** Where preview data comes from, so screens can label it honestly. */
export const dataSource: "api" | "preview" = isApiConfigured() ? "api" : "preview";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Active company — sent as a header AND a query param; backend enforces scope. */
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
  if (!isApiConfigured()) return;
  const origin = new URL(BASE_URL, window.location.origin).origin;
  const response = await fetch(`${origin}/sanctum/csrf-cookie`, { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw new ApiError("Could not initialize the secure sign-in session.", "network", {}, response.status);
}

function kindFor(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422 || status === 400) return "validation";
  return "server";
}

export async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("No accounting API is configured for this build.", "network");
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (options.companyId) url.searchParams.set("company_id", options.companyId);
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
    throw new ApiError(message, kindFor(response.status), fields, response.status, errorCode, response.headers.get("X-Request-Id")??undefined);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiDownload(path:string,companyId:string,filename:string):Promise<void>{
  if(!isApiConfigured())throw new ApiError("No ZavSync API is configured for this build.","network");
  const url=new URL(`${BASE_URL}${path}`);url.searchParams.set("company_id",companyId);
  const response=await fetch(url.toString(),{credentials:"include",headers:{Accept:"application/octet-stream","X-Company-Id":companyId,...(csrfToken()?{"X-XSRF-TOKEN":csrfToken() as string}:{})}});
  if(!response.ok)throw new ApiError("The document could not be downloaded.",kindFor(response.status),{},response.status,undefined,response.headers.get("X-Request-Id")??undefined);
  const link=document.createElement("a");link.href=URL.createObjectURL(await response.blob());link.download=filename;link.click();URL.revokeObjectURL(link.href);
}

/** Simulated latency for the preview adapters so loading states are real. */
export function previewDelay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}
