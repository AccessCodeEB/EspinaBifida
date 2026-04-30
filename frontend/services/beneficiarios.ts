import { apiClient } from "@/lib/api-client"

export interface Beneficiario {
  folio: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  curp?: string
  fechaNacimiento?: string
  genero?: string
  tipoSangre?: string
  nombrePadreMadre?: string
  calle?: string
  colonia?: string
  ciudad: string
  municipio?: string
  estado: string
  cp?: string
  telefonoCasa?: string
  telefonoCelular?: string
  correoElectronico?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  hospitalNacimiento?: string
  usaValvula?: boolean
  notas?: string
  fechaAlta?: string
  numeroCredencial?: string
  tipo: string
  estatus: string
  membresiaEstatus: string
  activo?: boolean
  /** Ruta o URL devuelta por el backend (p. ej. /uploads/profiles/...) */
  fotoPerfilUrl?: string | null
}

/** GET /beneficiarios */
export function getBeneficiarios() {
  return apiClient.get<Beneficiario[]>("/beneficiarios")
}

function encFolio(folio: string) {
  return encodeURIComponent(String(folio ?? "").trim())
}

/** GET /beneficiarios/:folio */
export function getBeneficiario(folio: string) {
  return apiClient.get<Beneficiario>(`/beneficiarios/${encFolio(folio)}`)
}

/** POST /beneficiarios */
export function createBeneficiario(data: Omit<Beneficiario, "folio">) {
  return apiClient.post<Beneficiario>("/beneficiarios", data)
}

/** POST /beneficiarios/solicitud-publica — alta como Inactivo + marcador en NOTAS (sitio público). */
export function createBeneficiarioPublicSolicitud(
  data: Omit<Beneficiario, "folio"> & { turnstileToken: string }
) {
  return apiClient.post<{ message: string }>("/beneficiarios/solicitud-publica", data)
}

/** POST /beneficiarios/:folio/aprobar-pre-registro */
export function aprobarPreRegistroBeneficiario(folio: string) {
  return apiClient.post<{ message: string }>(`/beneficiarios/${encFolio(folio)}/aprobar-pre-registro`, {})
}

/** DELETE /beneficiarios/:folio/pre-registro — solo solicitudes públicas pendientes */
export function rechazarPreRegistroBeneficiario(folio: string) {
  return apiClient.delete<{ message: string }>(`/beneficiarios/${encFolio(folio)}/pre-registro`)
}

/** PUT /beneficiarios/:folio */
export function updateBeneficiario(folio: string, data: Partial<Beneficiario>) {
  return apiClient.put<Beneficiario>(`/beneficiarios/${encFolio(folio)}`, data)
}

/** PATCH /beneficiarios/:folio/estatus */
export function updateEstatusBeneficiario(folio: string, estatus: "Activo" | "Inactivo") {
  return apiClient.patch<{ message: string }>(`/beneficiarios/${encFolio(folio)}/estatus`, { estatus })
}

/** DELETE /beneficiarios/:folio — ocultar/baja lógica */
export function deactivateBeneficiario(folio: string) {
  return apiClient.delete<{ message: string }>(`/beneficiarios/${encFolio(folio)}`)
}

/** DELETE /beneficiarios/:folio/eliminar — eliminación permanente (solo Baja) */
export function deleteBeneficiario(folio: string) {
  return apiClient.delete<{ message: string }>(`/beneficiarios/${encFolio(folio)}/eliminar`)
}

/** POST multipart /beneficiarios/:curp/foto-perfil — campo de archivo: `foto` */
export function uploadBeneficiarioFotoPerfil(curp: string, file: File) {
  const fd = new FormData()
  fd.append("foto", file)
  return apiClient.postFormData<{ message: string; fotoPerfilUrl: string }>(
    `/beneficiarios/${encodeURIComponent(curp)}/foto-perfil`,
    fd
  )
}

/** DELETE /beneficiarios/:curp/foto-perfil — quita foto en servidor y archivo */
export function deleteBeneficiarioFotoPerfil(curp: string) {
  return apiClient.delete<{ message: string; fotoPerfilUrl: null }>(
    `/beneficiarios/${encodeURIComponent(curp)}/foto-perfil`
  )
}
