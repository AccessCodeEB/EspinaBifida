import { apiClient } from "@/lib/api-client"

export interface TipoServicioSugerido {
  idTipoServicio: number
  nombre: string
  montoSugerido?: number | null
}

export interface TipoServicioCompleto extends TipoServicioSugerido {
  tipoServicio: "SERVICIO" | "CONSUMIBLE" | "COMODATO"
}

export const TIPOS_SERVICIO_SUGERIDOS: TipoServicioSugerido[] = [
  { idTipoServicio: 1, nombre: "Consulta Medica", montoSugerido: 300 },
  { idTipoServicio: 2, nombre: "Terapia Fisica", montoSugerido: 250 },
  { idTipoServicio: 3, nombre: "Donacion Material", montoSugerido: 150 },
  { idTipoServicio: 4, nombre: "Paquete de Panales", montoSugerido: 200 },
  { idTipoServicio: 5, nombre: "Silla de Ruedas", montoSugerido: 1200 },
  { idTipoServicio: 6, nombre: "Otros", montoSugerido: null },
]

export function getMontoSugeridoPorTipoServicio(idTipoServicio: number) {
  return TIPOS_SERVICIO_SUGERIDOS.find((tipo) => tipo.idTipoServicio === idTipoServicio)?.montoSugerido ?? null
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
}

export interface NuevoServicioPayload {
  curp: string
  idTipoServicio: number
  costo: number
  montoPagado?: number
  notas?: string
  estatus?: string
  fechaDevolucionEsperada?: string | null
  consumos?: { idProducto: number; cantidad: number }[]
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
  return apiClient.post<{ message: string; idServicio: number }>("/servicios", data)
}

/** DELETE /servicios/:id */
export function deleteServicio(id: number) {
  return apiClient.delete<{ message: string }>(`/servicios/${id}`)
}

export interface ComodatoActivo {
  idServicio: number
  curp: string
  nombreBeneficiario: string
  tipoServicio: string
  nombreArticulo: string | null
  idArticulo: number | null
  cantidad: number
  fecha: string | null
  fechaDevolucionEsperada: string | null
}

/** GET /servicios/comodatos */
export function getComodatos() {
  return apiClient.get<ComodatoActivo[]>("/servicios/comodatos")
}

/** PATCH /servicios/:id/devolucion */
export function confirmarDevolucion(id: number) {
  return apiClient.patch<{ message: string }>(`/servicios/${id}/devolucion`, {})
}
