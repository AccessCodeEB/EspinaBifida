import { apiClient } from "@/lib/api-client"

export const MONTO_PREDETERMINADO = 500

export interface Membresia {
  folio: string
  nombre: string
  fechaInicio: string
  vigencia: string
  estatus: "Activa" | "Vencida" | "Por vencer"
  diasRestantes: number | null
  ultimoPago: string | null
  monto: number | null
  metodoPago: "efectivo" | "transferencia" | "tarjeta" | null
  referencia: string | null
  numeroCredencial: string | null
  observaciones: string | null
}

export interface PagoReciente {
  idCredencial: number
  curp: string
  nombre: string
  fechaEmision: string | null
  fechaInicio: string | null
  vigencia: string | null
  ultimoPago: string | null
  monto: number | null
  metodoPago: "efectivo" | "transferencia" | "tarjeta" | null
  referencia: string | null
  observaciones: string | null
}

export interface RegistroPagoPayload {
  curp: string
  meses: number
  monto: number
  metodo_pago: "efectivo" | "transferencia" | "tarjeta"
  referencia?: string
  observaciones: string
}

/** GET /membresias — lista con membresía más reciente por beneficiario */
export function getMembresias() {
  return apiClient.get<Membresia[]>("/membresias")
}

/** GET /membresias/pagos/recientes — últimos 30 días */
export function getPagosRecientes() {
  return apiClient.get<PagoReciente[]>("/membresias/pagos/recientes")
}

/** GET /membresias/:folio */
export function getMembresia(folio: string) {
  return apiClient.get<Membresia>(`/membresias/${folio}`)
}

/** POST /membresias/sync-estados — actualiza estatus (Inactivo/Baja) según días vencidos */
export function syncEstados() {
  return apiClient.post<{ message: string }>("/membresias/sync-estados", {})
}

/** POST /membresias — registra pago y renueva vigencia por 1 mes */
export function registrarPago(payload: RegistroPagoPayload) {
  return apiClient.post<{ message: string; result: unknown }>("/membresias", payload)
}
