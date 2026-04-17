"use client"

import { useState, useEffect } from "react"
import { getMe } from "@/services/auth"

export interface CurrentUser {
  name: string
  role: string
  initials: string
}

const FALLBACK_USER: CurrentUser = {
  name: "Lupita",
  role: "Administrador",
  initials: "LU",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser>(FALLBACK_USER)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Solo intenta la llamada si la variable de entorno está configurada
    if (!process.env.NEXT_PUBLIC_API_URL) return

    setLoading(true)
    getMe()
      .then((data) => {
        const name = data.nombre ?? FALLBACK_USER.name
        setUser({ name, role: data.rol ?? FALLBACK_USER.role, initials: getInitials(name) })
      })
      .catch(() => setUser(FALLBACK_USER))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
