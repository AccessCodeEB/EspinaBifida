import { apiClient } from "@/lib/api-client"

export interface EspecialidadHorario {
  idEspecialidad:  number
  nombre:          string
  diaSemana:       number   // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  horaInicio:      string   // "HH:MM"
  horaFin:         string | null
  capacidadMax:    number | null
  tipoFrecuencia:  "SEMANAL" | "MENSUAL_PRIMER_DIA"
  activo:          boolean
  notas:           string | null
}

export interface ExcepcionEspecialidad {
  idExcepcion:     number
  idEspecialidad:  number
  fecha:           string   // "YYYY-MM-DD"
  motivo:          string | null
  createdAt:       string
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const

/** Texto legible del horario, ej: "Jueves 09:30 – 12:00 (máx. 3)" */
export function descripcionHorario(esp: EspecialidadHorario): string {
  const dia = DIAS[esp.diaSemana]
  const frecTxt = esp.tipoFrecuencia === "MENSUAL_PRIMER_DIA"
    ? `Primer ${dia} del mes`
    : dia.charAt(0).toUpperCase() + dia.slice(1)
  const horaTxt = esp.horaFin
    ? `${esp.horaInicio} – ${esp.horaFin}`
    : `desde las ${esp.horaInicio}`
  const capTxt = esp.capacidadMax ? ` (máx. ${esp.capacidadMax})` : ""
  return `${frecTxt} · ${horaTxt}${capTxt}`
}

/**
 * Devuelve true si la fecha (YYYY-MM-DD) es un día válido para la especialidad.
 * Se usa en el frontend como primera capa de UX antes de enviar al backend.
 */
export function esFechaValidaFrontend(esp: EspecialidadHorario, fecha: string): boolean {
  const [y, mo, d] = fecha.split("-").map(Number)
  const fechaObj = new Date(y, mo - 1, d)
  const diaSemana = fechaObj.getDay()

  if (esp.tipoFrecuencia === "SEMANAL") {
    return diaSemana === esp.diaSemana
  }
  if (esp.tipoFrecuencia === "MENSUAL_PRIMER_DIA") {
    return diaSemana === esp.diaSemana && fechaObj.getDate() <= 7
  }
  return false
}

/**
 * Devuelve true si la hora 'HH:MM' cae dentro del rango de la especialidad.
 */
export function esHoraValidaFrontend(esp: EspecialidadHorario, hora: string): boolean {
  if (!esp.horaFin) return hora >= esp.horaInicio
  return hora >= esp.horaInicio && hora <= esp.horaFin
}

/** GET /especialidades-horario — admin: todos=true incluye inactivas */
export function getEspecialidadesHorario(todos = false) {
  const qs = todos ? "?todos=true" : ""
  return apiClient.get<EspecialidadHorario[]>(`/especialidades-horario${qs}`)
}

/** PUT /especialidades-horario/:id */
export function updateEspecialidadHorario(id: number, data: Partial<EspecialidadHorario>) {
  return apiClient.put<{ message: string; data: EspecialidadHorario }>(
    `/especialidades-horario/${id}`,
    data
  )
}

/** GET /especialidades-horario/:id/excepciones */
export function getExcepciones(idEspecialidad: number) {
  return apiClient.get<ExcepcionEspecialidad[]>(
    `/especialidades-horario/${idEspecialidad}/excepciones`
  )
}

/** POST /especialidades-horario/:id/excepciones */
export function createExcepcion(idEspecialidad: number, fecha: string, motivo?: string) {
  return apiClient.post<{ message: string }>(
    `/especialidades-horario/${idEspecialidad}/excepciones`,
    { fecha, motivo }
  )
}

/** DELETE /especialidades-horario/:id/excepciones/:idExc */
export function deleteExcepcion(idEspecialidad: number, idExcepcion: number) {
  return apiClient.delete<{ message: string }>(
    `/especialidades-horario/${idEspecialidad}/excepciones/${idExcepcion}`
  )
}

/** GET /especialidades-horario/:id/citas-futuras — cuántas citas pendientes tiene la especialidad */
export function getCitasFuturasCount(idEspecialidad: number) {
  return apiClient.get<{ count: number }>(`/especialidades-horario/${idEspecialidad}/citas-futuras`)
}

/** GET /especialidades-horario/:id/citas-en-fecha?fecha=YYYY-MM-DD — cuántas citas hay ese día */
export function getCitasEnFechaCount(idEspecialidad: number, fecha: string) {
  return apiClient.get<{ count: number }>(
    `/especialidades-horario/${idEspecialidad}/citas-en-fecha?fecha=${fecha}`
  )
}
