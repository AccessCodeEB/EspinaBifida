import { apiClient } from "@/lib/api-client"

export interface Comodato {
  idComodato: number
  curp: string
  idArticulo: number
  montoTotal: number | null
  montoPagado: number
  montoExento: number
  estatus: "Activo" | "Pagado" | "Cancelado"
  fechaAlta: string
  notas: string | null
  beneficiario?: string
  articulo?: string
}

export interface ComodatoPago {
  idPago: number
  idComodato: number
  monto: number
  esExento: "S" | "N"
  fecha: string
  notas: string | null
}

export interface ComodatoDetalle extends Comodato {
  pagos: ComodatoPago[]
}

export interface ExencionReporte {
  curp: string
  beneficiario: string
  equipo: string
  totalExento: number
  numExenciones: number
}

export interface NuevoComodatoPayload {
  curp: string
  idArticulo: number
  montoTotal: number | null
  notas?: string
}

export interface NuevoPagoPayload {
  monto: number
  esExento: boolean
  notas?: string
}

/** GET /comodatos */
export function getComodatos(params: { page?: number; limit?: number; estatus?: string; curp?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.page)    qs.set("page",    String(params.page))
  if (params.limit)   qs.set("limit",   String(params.limit))
  if (params.estatus) qs.set("estatus", params.estatus)
  if (params.curp)    qs.set("curp",    params.curp)
  const q = qs.toString()
  return apiClient.get<{ data: Comodato[] }>(`/comodatos${q ? `?${q}` : ""}`)
}

/** GET /comodatos/reportes/exenciones */
export function getReporteExenciones(fechaInicio: string, fechaFin: string) {
  return apiClient.get<{ data: ExencionReporte[] }>(
    `/comodatos/reportes/exenciones?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
  )
}

/** GET /comodatos/beneficiario/:curp */
export function getComodatosByCurp(curp: string) {
  return apiClient.get<{ data: Comodato[] }>(`/comodatos/beneficiario/${curp}`)
}

/** GET /comodatos/:id */
export function getComodatoById(id: number) {
  return apiClient.get<{ data: ComodatoDetalle }>(`/comodatos/${id}`)
}

/** POST /comodatos */
export function crearComodato(data: NuevoComodatoPayload) {
  return apiClient.post<{ message: string; data: { idComodato: number; estatus: string } }>(
    "/comodatos",
    data
  )
}

/** PATCH /comodatos/:id */
export function actualizarNotas(id: number, notas: string) {
  return apiClient.patch<{ message: string }>(`/comodatos/${id}`, { notas })
}

/** DELETE /comodatos/:id */
export function cancelarComodato(id: number) {
  return apiClient.delete<{ message: string }>(`/comodatos/${id}`)
}

/** POST /comodatos/:id/pagos */
export function registrarPago(idComodato: number, data: NuevoPagoPayload) {
  return apiClient.post<{ message: string; data: { idPago: number; estatusResultante: string } }>(
    `/comodatos/${idComodato}/pagos`,
    data
  )
}
