import { apiClient } from "@/lib/api-client"

export interface Servicio {
  id: number
  folio: string
  nombre: string
  servicio: string
  fecha: string
  monto: string
  membresia: string
  notas?: string
}

export interface NuevoServicioPayload {
  curp: string
  idTipoServicio: number
  costo: number
  montoPagado?: number
  notas?: string
}

/** GET /servicios */
export function getServicios() {
  return apiClient.get<Servicio[]>("/servicios")
}

/** POST /servicios */
export function createServicio(data: NuevoServicioPayload) {
  return apiClient.post<{ message: string; idServicio: number }>("/servicios", data)
}
