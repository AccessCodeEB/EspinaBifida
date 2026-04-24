import { apiClient } from "@/lib/api-client"

export interface LoginResponse {
  token: string
  admin: {
    idAdmin:        number
    idRol:          number
    nombreRol:      string
    nombreCompleto: string
    email:          string
    fotoPerfilUrl?: string | null
  }
}

export function loginAdmin(email: string, password: string) {
  return apiClient.post<LoginResponse>("/administradores/login", { email, password })
}

export interface Admin {
  idAdmin:        number
  idRol:          number
  nombreCompleto: string
  email:          string
  activo:         number
  fechaCreacion:  string
  nombreRol:      string
  fotoPerfilUrl?: string | null
}

export interface UpdateAdminBody {
  idRol:          number
  nombreCompleto: string
  email:          string
}

export interface ChangePasswordBody {
  passwordActual: string
  passwordNueva:  string
}

export function getAdmin(id: number) {
  return apiClient.get<Admin>(`/administradores/${id}`)
}

export function updateAdmin(id: number, body: UpdateAdminBody) {
  return apiClient.put<{ message: string }>(`/administradores/${id}`, body)
}

export function changePassword(id: number, body: ChangePasswordBody) {
  return apiClient.patch<{ message: string }>(`/administradores/${id}/password`, body)
}

/** POST multipart /administradores/:id/foto-perfil — campo de archivo: `foto` */
export function uploadAdminFotoPerfil(idAdmin: number, file: File) {
  const fd = new FormData()
  fd.append("foto", file)
  return apiClient.postFormData<{ message: string; fotoPerfilUrl: string }>(
    `/administradores/${idAdmin}/foto-perfil`,
    fd
  )
}

/**
 * Prepared for future email verification flow.
 * When implemented the backend will send a one-time code to the admin's email.
 * Backend endpoint to add: POST /administradores/:id/request-password-code
 */
export function requestPasswordCode(_id: number): Promise<{ message: string }> {
  return Promise.reject(new Error("NOT_IMPLEMENTED"))
}
