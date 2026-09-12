import { clearSession, getSessionToken } from "@/lib/auth";
import type { PageMeta } from "@/lib/types";

// Thin client for the Express API. Every response uses the same envelope:
//   { success: true, data, meta? } | { success: false, message, errors? }
// While NEXT_PUBLIC_API_URL is unset the backoffice runs in demo mode.

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const isDemoMode = !API_URL;

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: FieldError[],
  ) {
    super(message);
  }
}

export type ApiResult<T> = { data: T; meta?: PageMeta };

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  if (!API_URL) throw new ApiError(0, "API not configured (demo mode)");

  const token = getSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  let body: { success?: boolean; data?: T; meta?: PageMeta; message?: string; errors?: FieldError[] } = {};
  try {
    body = await response.json();
  } catch {
    // empty or non-JSON body
  }

  if (response.status === 401 && token) {
    // Session expired or account deactivated: drop it and go back to sign-in.
    clearSession();
    if (typeof window !== "undefined") window.location.assign("/login");
  }

  if (!response.ok) {
    throw new ApiError(response.status, body.message || `Request failed with status ${response.status}`, body.errors);
  }

  return { data: body.data as T, meta: body.meta };
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, payload?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: payload === undefined ? undefined : JSON.stringify(payload) }),
  patch: <T>(path: string, payload?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: payload === undefined ? undefined : JSON.stringify(payload) }),
  put: <T>(path: string, payload?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: payload === undefined ? undefined : JSON.stringify(payload) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

// Multipart upload (media library). The browser sets the multipart boundary,
// so no Content-Type header here.
export async function apiUpload<T>(path: string, form: FormData, method: "POST" | "PUT" = "POST"): Promise<ApiResult<T>> {
  if (!API_URL) throw new ApiError(0, "API not configured (demo mode)");
  const token = getSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  let body: { success?: boolean; data?: T; message?: string; errors?: FieldError[] } = {};
  try {
    body = await response.json();
  } catch {
    // empty body
  }
  if (response.status === 401 && token) {
    clearSession();
    if (typeof window !== "undefined") window.location.assign("/login");
  }
  if (!response.ok) throw new ApiError(response.status, body.message || `Upload failed with status ${response.status}`, body.errors);
  return { data: body.data as T };
}

// Authenticated file download (CSV exports). Streams the response into a blob
// and triggers the browser's save dialog with the server's filename.
export async function apiDownload(path: string, fallbackName = "export.csv") {
  if (!API_URL) throw new ApiError(0, "API not configured (demo mode)");
  const token = getSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Export failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not JSON
    }
    throw new ApiError(response.status, message);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
