"use client"

/**
 * @deprecated Los datos del usuario ahora se leen directamente del JWT
 * a través de `useAuth().session`. Este hook se mantiene para compatibilidad
 * con cualquier importación existente, pero no realiza llamadas de red.
 */
export interface CurrentUser {
  name: string
  role: string
  initials: string
}

export function useCurrentUser(): { user: CurrentUser; loading: boolean } {
  // Los datos reales vienen de useAuth().session (ver page.tsx).
  // Retornamos valores vacíos para no romper imports pendientes.
  return {
    user: { name: "", role: "", initials: "" },
    loading: false,
  }
}
