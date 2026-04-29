import type { Beneficiario } from "@/services/beneficiarios"

/**
 * Coincide con `MARCADOR_SOLICITUD_PUBLICA_PENDIENTE` en el backend.
 * Identifica solicitudes del sitio público pendientes de revisión (ESTATUS Inactivo + marcador).
 */
export const MARCADOR_SOLICITUD_PUBLICA_PENDIENTE = "[SOLICITUD_PUBLICA_PRE_REG]"

/** Legacy: algunas BD podrían tener literal "Pre-registro" en ESTATUS. */
export const ESTATUS_PRE_REGISTRO_LEGACY = "Pre-registro"

export function esSolicitudPublicaPendiente(b: Beneficiario): boolean {
  const est = String(b.estatus ?? "").trim()
  const notas = String(b.notas ?? "")
  if (est === ESTATUS_PRE_REGISTRO_LEGACY) return true
  return est === "Inactivo" && notas.includes(MARCADOR_SOLICITUD_PUBLICA_PENDIENTE)
}
