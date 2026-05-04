/**
 * Cliente HTTP centralizado para comunicarse con el backend JS/Oracle.
 * Todas las llamadas a la API deben pasar por aquí para garantizar
 * consistencia en headers, manejo de errores y autenticación.
 */

import { resolveApiFetchUrl } from "@/lib/api-base"
import { tokenStorage } from "@/lib/token"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveApiFetchUrl(path)
  const token = tokenStorage.get()

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const text = await res.text().catch(() => "")

  if (!res.ok) {
    let message = text
    let code: string | undefined
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string; code?: string }
      if (typeof parsed?.message === "string") message = parsed.message
      else if (typeof parsed?.error === "string") message = parsed.error
      if (typeof parsed?.code === "string") code = parsed.code
    } catch {
      /* usar texto crudo */
    }
    throw new ApiError(res.status, message, code)
  }

  // 204 No Content — no intentar parsear JSON
  if (res.status === 204) return undefined as T

  const trimmed = text.trim()
  if (trimmed === "") return undefined as T

  try {
    return JSON.parse(trimmed) as T
  } catch {
    const htmlHint = trimmed.startsWith("<")
      ? " El servidor respondió HTML en lugar de JSON. Comprueba NEXT_PUBLIC_API_URL (debe ser el backend, p. ej. http://localhost:3000)."
      : ""
    throw new ApiError(
      502,
      `Respuesta no JSON desde ${url}.${htmlHint}`
    )
  }
}

async function requestFormData<T>(path: string, form: FormData, init: RequestInit = {}): Promise<T> {
  const url = resolveApiFetchUrl(path)
  const token = tokenStorage.get()

  const res = await fetch(url, {
    ...init,
    method: "POST",
    body: form,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  const text = await res.text().catch(() => "")

  if (!res.ok) {
    let message = text
    let code: string | undefined
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string; code?: string }
      if (typeof parsed?.message === "string") message = parsed.message
      else if (typeof parsed?.error === "string") message = parsed.error
      if (typeof parsed?.code === "string") code = parsed.code
    } catch {
      /* usar texto crudo */
    }
    throw new ApiError(res.status, message, code)
  }

  if (res.status === 204) return undefined as T

  const trimmed = text.trim()
  if (trimmed === "") return undefined as T

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new ApiError(502, `Respuesta no JSON desde ${url}`)
  }
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),

  postFormData: <T>(path: string, form: FormData, init?: RequestInit) =>
    requestFormData<T>(path, form, init),
}
