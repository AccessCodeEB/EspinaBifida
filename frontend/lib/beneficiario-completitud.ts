import type { Beneficiario } from "@/services/beneficiarios"

/** Umbral mínimo (inclusive): al menos este % de campos llenos = expediente “bien” sin alerta. */
export const UMBRAL_EXPEDIENTE_COMPLETO_PCT = 80

function strOk(v: string | undefined | null): boolean {
  return String(v ?? "").trim().length > 0
}

function curpOk(b: Beneficiario): boolean {
  return strOk(b.curp) || strOk(b.folio)
}

function usaValvulaOk(b: Beneficiario): boolean {
  return b.usaValvula === true || b.usaValvula === false
}

function fotoOk(b: Beneficiario): boolean {
  return strOk(b.fotoPerfilUrl ?? undefined)
}

/**
 * Campos del expediente clínico/administrativo que deben estar cubiertos
 * (misma idea que la ficha completa en el panel; sin estatus ni membresía).
 */
const CAMPOS_EXPEDIENTE: Array<(b: Beneficiario) => boolean> = [
  (b) => strOk(b.nombres),
  (b) => strOk(b.apellidoPaterno),
  (b) => strOk(b.apellidoMaterno),
  (b) => curpOk(b),
  (b) => strOk(b.fechaNacimiento),
  (b) => strOk(b.genero),
  (b) => strOk(b.tipoSangre),
  (b) => strOk(b.nombrePadreMadre),
  (b) => strOk(b.calle),
  (b) => strOk(b.colonia),
  (b) => strOk(b.ciudad),
  (b) => strOk(b.municipio),
  (b) => strOk(b.estado),
  (b) => strOk(b.cp),
  (b) => strOk(b.telefonoCasa),
  (b) => strOk(b.telefonoCelular),
  (b) => strOk(b.correoElectronico),
  (b) => strOk(b.contactoEmergencia),
  (b) => strOk(b.telefonoEmergencia),
  (b) => strOk(b.hospitalNacimiento),
  (b) => strOk(b.tipo),
  (b) => usaValvulaOk(b),
  (b) => strOk(b.notas),
  (b) => fotoOk(b),
]

export type CompletitudExpediente = {
  /** Campos con dato */
  llenos: number
  /** Total de campos considerados */
  total: number
  /** 0–100, redondeado */
  porcentaje: number
  /** true si porcentaje >= UMBRAL_EXPEDIENTE_COMPLETO_PCT */
  cumpleUmbral: boolean
}

export function calcularCompletitudExpediente(b: Beneficiario): CompletitudExpediente {
  const total = CAMPOS_EXPEDIENTE.length
  const llenos = CAMPOS_EXPEDIENTE.reduce((n, fn) => n + (fn(b) ? 1 : 0), 0)
  const porcentaje = total === 0 ? 100 : Math.round((llenos / total) * 100)
  const cumpleUmbral = porcentaje >= UMBRAL_EXPEDIENTE_COMPLETO_PCT
  return { llenos, total, porcentaje, cumpleUmbral }
}

/** Muestra alerta en tarjeta si el expediente está por debajo del umbral. */
export function expedienteRequiereAlertaCompletitud(b: Beneficiario): boolean {
  return !calcularCompletitudExpediente(b).cumpleUmbral
}
