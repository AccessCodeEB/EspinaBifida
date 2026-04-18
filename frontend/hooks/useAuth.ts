"use client"

import { useState, useEffect, useCallback } from "react"
import { tokenStorage } from "@/lib/token"
import { loginAdmin, type LoginResponse } from "@/services/administradores"

export interface AuthSession {
  idAdmin:        number
  idRol:          number
  nombreRol:      string
  nombreCompleto: string
  email:          string
  token:          string
}

/**
 * Hook global de autenticación.
 * Centraliza login/logout y expone el estado de sesión para toda la app.
 * Usa el mismo mecanismo de tokenStorage (localStorage) ya establecido.
 */
export function useAuth() {
  const [session, setSession]           = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading]       = useState(true)   // true mientras hidrata desde localStorage
  const [isAuthenticated, setIsAuth]    = useState(false)

  /** Al montar, hidrata la sesión desde localStorage si el token existe */
  useEffect(() => {
    const token = tokenStorage.get()
    if (token) {
      try {
        // Decodificar el payload del JWT (sin verificar firma - solo para datos de display)
        const payload = JSON.parse(atob(token.split(".")[1]))
        const now     = Math.floor(Date.now() / 1000)

        if (payload.exp && payload.exp < now) {
          // Token expirado — limpiar
          tokenStorage.clear()
        } else {
          // Token vigente — restaurar sesión
          setSession({
            idAdmin:        payload.idAdmin,
            idRol:          payload.idRol,
            nombreRol:      payload.nombreRol      ?? "Administrador",
            nombreCompleto: payload.nombreCompleto ?? "",
            email:          payload.email          ?? "",
            token,
          })
          setIsAuth(true)
        }
      } catch {
        // Token malformado — limpiar
        tokenStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  /** Login: llama al endpoint existente POST /administradores/login */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res: LoginResponse = await loginAdmin(email.trim().toLowerCase(), password)
    tokenStorage.set(res.token)
    setSession({
      idAdmin:        res.admin.idAdmin,
      idRol:          res.admin.idRol,
      nombreRol:      res.admin.nombreRol,
      nombreCompleto: res.admin.nombreCompleto,
      email:          res.admin.email,
      token:          res.token,
    })
    setIsAuth(true)
  }, [])

  /** Logout: limpia token y sesión */
  const logout = useCallback(() => {
    tokenStorage.clear()
    setSession(null)
    setIsAuth(false)
  }, [])

  /**
   * Actualiza datos de display de la sesión sin re-login.
   * Usar tras un PUT exitoso al editar nombre/email del perfil.
   */
  const updateSession = useCallback((patch: Partial<Pick<AuthSession, "nombreCompleto" | "email">>) => {
    setSession((prev) => prev ? { ...prev, ...patch } : prev)
  }, [])

  return { session, isAuthenticated, isLoading, login, logout, updateSession }
}
