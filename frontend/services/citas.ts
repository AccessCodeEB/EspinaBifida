import { apiClient } from "@/lib/api-client"

export interface Cita {
  id: number
  beneficiario: string
  folio: string
  especialista: string
  fecha: string
  hora: string
  estatus: "Confirmada" | "Pendiente" | "Completada" | "Cancelada"
  notas?: string
}

export interface NuevaCitaPayload {
  folio: string
  especialista: string
  fecha: string
  hora: string
  notas?: string
}

/** GET /citas */
export function getCitas() {
  return apiClient.get<Cita[]>("/citas")
}

/** GET /citas?fecha=YYYY-MM-DD */
export function getCitasPorFecha(fecha: string) {
  return apiClient.get<Cita[]>(`/citas?fecha=${fecha}`)
}

/** POST /citas */
export function createCita(data: NuevaCitaPayload) {
  return apiClient.post<Cita>("/citas", data)
}

/** PATCH /citas/:id — actualiza el estatus */
export function updateEstatusCita(id: number, estatus: Cita["estatus"]) {
  return apiClient.patch<Cita>(`/citas/${id}`, { estatus })
}
