import { apiClient } from "@/lib/api-client"

export interface Membresia {
  folio: string
  nombre: string
  fechaInicio: string
  vigencia: string
  estatus: "Activa" | "Vencida" | "Por vencer"
  ultimoPago: string
  monto: string
  porPagar: string
}

export interface RegistroPagoPayload {
  folio: string
  monto: number
  metodoPago: "efectivo" | "transferencia" | "tarjeta"
  observaciones?: string
}

/** GET /membresias */
export function getMembresias() {
  return apiClient.get<Membresia[]>("/membresias")
}

/** GET /membresias/:folio */
export function getMembresia(folio: string) {
  return apiClient.get<Membresia>(`/membresias/${folio}`)
}

/** POST /membresias/pago — registra un pago y renueva la vigencia */
export function registrarPago(payload: RegistroPagoPayload) {
  return apiClient.post<Membresia>("/membresias/pago", payload)
}
