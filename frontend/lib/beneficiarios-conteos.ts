import type { Beneficiario } from "@/services/beneficiarios"

/** Misma lógica que los chips de la sección Beneficiarios (`estatus` del registro). */
export function conteosEstatusBeneficiarios(rows: Beneficiario[]) {
  return {
    Todos: rows.length,
    Activo: rows.filter((b) => b.estatus === "Activo").length,
    Inactivo: rows.filter((b) => b.estatus === "Inactivo").length,
    Baja: rows.filter((b) => b.estatus === "Baja").length,
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
