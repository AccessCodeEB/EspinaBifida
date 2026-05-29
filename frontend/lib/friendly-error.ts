/**
 * Convierte cualquier error capturado en un mensaje legible para el usuario final.
 *
 * Reglas:
 * - ApiError: el api-client ya procesa los mensajes (traduce 5xx a genérico, usa texto
 *   del backend para 4xx que suelen ser descriptivos en español). Se retorna err.message.
 * - TypeError de red ("Failed to fetch"): mensaje de sin conexión.
 * - Cualquier otro error: se usa el `fallback` proporcionado por el llamador.
 *
 * NUNCA exponer códigos HTTP numéricos ni stack traces al usuario.
 */

import { ApiError } from "@/lib/api-client"

const NETWORK_RE = /failed to fetch|networkerror|load failed|the internet connection appears/i

export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message || fallback
  }
  if (err instanceof TypeError && NETWORK_RE.test(err.message)) {
    return "Sin conexión. Verifica tu red e intenta de nuevo."
  }
  if (err instanceof Error && NETWORK_RE.test(err.message)) {
    return "Sin conexión. Verifica tu red e intenta de nuevo."
  }
  return fallback
}
