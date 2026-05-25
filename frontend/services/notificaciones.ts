import { apiClient } from "@/lib/api-client"

export type TipoNotificacion = "STOCK_BAJO" | "MEMBRESIA_PROXIMA" | "MEMBRESIA_VENCIDA" | "PREREGISTRO_NUEVO" | "BENEFICIARIO_BAJA" | "CITA_HOY"
export type EstatusNotificacion = "PENDIENTE" | "LEIDA"

export interface Notificacion {
  idNotificacion: number
  tipo: TipoNotificacion
  estatus: EstatusNotificacion
  referenciaId?: number
  referenciaTipo?: string
  curp?: string
  mensaje: string
  fechaCreacion: string
  fechaLectura?: string
}

export function getNotificaciones() {
  return apiClient.get<{ data: Notificacion[] }>("/notificaciones")
}

export function getPendientes() {
  return apiClient.get<{ data: Notificacion[] }>("/notificaciones/pendientes")
}

export function getCount() {
  return apiClient.get<{ total: number }>("/notificaciones/count")
}

export function marcarLeida(id: number) {
  return apiClient.patch<{ message: string }>(`/notificaciones/${id}/leer`, {})
}

export function marcarTodasLeidas() {
  return apiClient.patch<{ message: string }>("/notificaciones/leer-todas", {})
}

export function runJob() {
  return apiClient.post<{ message: string; data: Record<string, number> }>("/notificaciones/run-job", {})
}
