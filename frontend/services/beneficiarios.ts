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
  municipioNacimiento?: string
  hospitalNacimiento?: string
  usaValvula?: boolean
  notas?: string
  fechaAlta?: string
  numeroCredencial?: string
  tipo: string
  estatus: string
  membresiaEstatus: string
  activo?: boolean
}

/** GET /beneficiarios */
export function getBeneficiarios() {
  return apiClient.get<Beneficiario[]>("/beneficiarios")
}

/** GET /beneficiarios/:folio */
export function getBeneficiario(folio: string) {
  return apiClient.get<Beneficiario>(`/beneficiarios/${folio}`)
}

/** POST /beneficiarios */
export function createBeneficiario(data: Omit<Beneficiario, "folio">) {
  return apiClient.post<Beneficiario>("/beneficiarios", data)
}

/** PUT /beneficiarios/:folio */
export function updateBeneficiario(folio: string, data: Partial<Beneficiario>) {
  return apiClient.put<Beneficiario>(`/beneficiarios/${folio}`, data)
}

/** PATCH /beneficiarios/:folio/estatus */
export function updateEstatusBeneficiario(folio: string, estatus: "Activo" | "Inactivo") {
  return apiClient.patch<{ message: string }>(`/beneficiarios/${folio}/estatus`, { estatus })
}

/** DELETE /beneficiarios/:folio/eliminar — eliminación permanente (solo Baja) */
export function deleteBeneficiario(folio: string) {
  return apiClient.delete<{ message: string }>(`/beneficiarios/${folio}/eliminar`)
}
