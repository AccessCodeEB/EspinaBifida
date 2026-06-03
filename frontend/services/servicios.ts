import { apiClient } from "@/lib/api-client"

export interface TipoServicioSugerido {
  idTipoServicio: number
  nombre: string
  montoSugerido?: number | null
}

export interface TipoServicioCompleto extends TipoServicioSugerido {
  tipoServicio: "SERVICIO" | "CONSUMIBLE" | "COMODATO"
}


export interface Servicio {
  id: number
  folio: string
  nombre: string
  servicio: string
  fecha: string
  monto: string
  membresia: string
  estatus: string
  notas?: string
  articuloEntregado?: string | null
  cantidadArticulo?: number | null
}

export interface NuevoServicioPayload {
  curp: string
  idTipoServicio: number
  costo?: number
  montoPagado?: number
  referenciaId?: number | null
  referenciaTipo?: string | null
  notas?: string
  estatus?: string
  fechaDevolucionEsperada?: string | null
  consumos?: { idProducto: number; cantidad: number }[]
}

export interface ActualizarServicioPayload {
  montoPagado?: number
  notas?: string
  estatus?: string
}

/** GET /servicios-catalogo — catálogo completo con tipoServicio */
export function getCatalogoServicios() {
  return apiClient.get<TipoServicioCompleto[]>("/servicios-catalogo")
}

/** GET /servicios */
export function getServicios() {
  return apiClient.get<Servicio[]>("/servicios")
}

/** POST /servicios */
export function createServicio(data: NuevoServicioPayload) {
  return apiClient.post<{ message: string; idServicio: number; warning?: string }>("/servicios", data)
}

/** DELETE /servicios/:id */
export function deleteServicio(id: number) {
  return apiClient.delete<{ message: string }>(`/servicios/${id}`)
}

/** PUT /servicios/:id */
export function updateServicio(id: number, data: ActualizarServicioPayload) {
  return apiClient.put<{ message: string }>(`/servicios/${id}`, data)
}

