/**
 * Cliente HTTP centralizado para comunicarse con el backend JS/Oracle.
 * Todas las llamadas a la API deben pasar por aquí para garantizar
 * consistencia en headers, manejo de errores y autenticación.
 */

import { resolveApiFetchUrl } from "@/lib/api-base"
import { tokenStorage } from "@/lib/token"

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return null

  if (isRefreshing) {
    return new Promise((resolve) => { refreshQueue.push(resolve) })
  }

  isRefreshing = true
  try {
    const url = resolveApiFetchUrl("/administradores/refresh")
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      tokenStorage.clearAll()
      refreshQueue.forEach((cb) => cb(null))
      refreshQueue = []
      return null
    }
    const data = (await res.json()) as { token: string; refreshToken: string }
    tokenStorage.set(data.token)
    tokenStorage.setRefresh(data.refreshToken)
    refreshQueue.forEach((cb) => cb(data.token))
    refreshQueue = []
    return data.token
  } catch {
    tokenStorage.clearAll()
    refreshQueue.forEach((cb) => cb(null))
    refreshQueue = []
    return null
  } finally {
    isRefreshing = false
  }
}

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

async function doFetch(url: string, options: RequestInit, token: string | null) {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "")

  if (!res.ok) {
    let message = text
    let code: string | undefined
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string; code?: string }
      if (typeof parsed?.message === "string") message = parsed.message
      else if (typeof parsed?.error === "string") message = parsed.error
      if (typeof parsed?.code === "string") code = parsed.code
    } catch { /* usar texto crudo */ }
    if (res.status >= 500) message = "El sistema tuvo un error inesperado. Inténtalo más tarde."
    throw new ApiError(res.status, message, code)
  }

  if (res.status === 204) return undefined as T
  const trimmed = text.trim()
  if (trimmed === "") return undefined as T

  try {
    return JSON.parse(trimmed) as T
  } catch {
    const htmlHint = trimmed.startsWith("<")
      ? " El servidor respondió HTML en lugar de JSON. Comprueba NEXT_PUBLIC_API_URL."
      : ""
    throw new ApiError(502, `Respuesta no JSON desde ${res.url}.${htmlHint}`)
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveApiFetchUrl(path)
  const token = tokenStorage.get()

  const res = await doFetch(url, options, token)

  // Interceptor 401: intenta refrescar el access token una sola vez
  if (res.status === 401 && !path.includes("/refresh") && !path.includes("/login")) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      const retryRes = await doFetch(url, options, newToken)
      return parseResponse<T>(retryRes)
    }
  }

  return parseResponse<T>(res)
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
    if (res.status >= 500) {
      message = "El sistema tuvo un error inesperado. Inténtalo más tarde."
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
