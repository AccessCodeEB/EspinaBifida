import { apiClient } from "@/lib/api-client"

export const COSTO_PRIMERA_CITA     = 350
export const COSTO_SUBSECUENTE_CITA = 300

export interface Cita {
  id: number
  beneficiario: string
  folio: string
  especialista: string
  fecha: string
  hora: string
  estatus: "Confirmada" | "Pendiente" | "Completada" | "Cancelada"
  notas?: string
  costo?: number | null
}

export interface NuevaCitaPayload {
  curp: string
  idTipoServicio: number
  especialista?: string
  fecha: string
  hora: string
  notas?: string
}

export interface CreateCitaResponse {
  message: string
  result: {
    idCita: number
  }
}

/** GET /citas */
export function getCitas() {
  return apiClient.get<Cita[]>("/citas")
}

/** POST /citas */
export function createCita(data: NuevaCitaPayload) {
  return apiClient.post<CreateCitaResponse>("/citas", data)
}

/** PATCH /citas/:id — actualiza el estatus */
export function updateEstatusCita(id: number, estatus: Cita["estatus"]) {
  return apiClient.patch<{ message: string }>(`/citas/${id}`, { estatus })
}

/** PUT /citas/:id — actualización completa */
export function updateCita(id: number, data: Partial<NuevaCitaPayload & { estatus: string }>) {
  return apiClient.put<{ message: string }>(`/citas/${id}`, data)
}
