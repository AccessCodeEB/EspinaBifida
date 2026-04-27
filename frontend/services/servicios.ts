import { apiClient } from "@/lib/api-client"

export interface TipoServicioSugerido {
  idTipoServicio: number
  nombre: string
  montoSugerido?: number | null
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
}

/** GET /servicios */
export function getServicios() {
  return apiClient.get<Servicio[]>("/servicios")
}

/** POST /servicios */
export function createServicio(data: NuevoServicioPayload) {
  return apiClient.post<{ message: string; idServicio: number }>("/servicios", data)
}
