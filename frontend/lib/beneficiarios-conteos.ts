import type { Beneficiario } from "@/services/beneficiarios"
import { esSolicitudPublicaPendiente } from "@/lib/solicitud-publica-beneficiario"

/** Expedientes que aparecen en la lista principal del panel (excluye solicitudes públicas pendientes). */
function esVisibleListaPrincipal(b: Beneficiario): boolean {
  return !esSolicitudPublicaPendiente(b)
}

/** Misma lógica que los chips de la sección Beneficiarios (`estatus` del registro). */
export function conteosEstatusBeneficiarios(rows: Beneficiario[]) {
  const visibles = rows.filter(esVisibleListaPrincipal)
  return {
    Todos: visibles.length,
    Activo: visibles.filter((b) => b.estatus === "Activo").length,
    Inactivo: visibles.filter((b) => b.estatus === "Inactivo").length,
    Baja: visibles.filter((b) => b.estatus === "Baja").length,
  }
}

/** Credencial en ventana ≤30 días (MEMBRESIA_ESTATUS = Por vencer). Excluye bajas. */
export function conteoMembresiasPorVencer(rows: Beneficiario[]): number {
  return rows.filter((b) => {
    if (b.estatus === "Baja") return false
    const m = String(b.membresiaEstatus ?? "").trim().toLowerCase()
    return m === "por vencer"
  }).length
}
