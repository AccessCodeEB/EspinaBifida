import { apiClient } from "@/lib/api-client"

export interface AuthUser {
  nombre: string
  rol: string
}

/** GET /auth/me — devuelve el usuario autenticado por cookie de sesión */
export function getMe() {
  return apiClient.get<AuthUser>("/auth/me")
}

/** POST /auth/login */
export function login(credentials: { usuario: string; contrasena: string }) {
  return apiClient.post<{ token?: string }>("/auth/login", credentials)
}

/** POST /auth/logout */
export function logout() {
  return apiClient.post<void>("/auth/logout", {})
}
