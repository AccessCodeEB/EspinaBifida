import { apiClient } from "@/lib/api-client"

export interface LoginResponse {
  token: string
  refreshToken: string
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

export function refreshAccessToken(refreshToken: string) {
  return apiClient.post<{ token: string; refreshToken: string }>(
    "/administradores/refresh",
    { refreshToken }
  )
}

export function logoutAdmin(refreshToken: string) {
  return apiClient.post<void>("/administradores/logout", { refreshToken })
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
  telefono?:      string | null
}

export interface UpdateAdminBody {
  idRol:          number
  nombreCompleto: string
  email:          string
}

export interface ChangePasswordBody {
  passwordActual: string
  passwordNueva:  string
  codigo:         string
}

export function getAllAdmins() {
  return apiClient.get<Admin[]>("/administradores")
}

export function getAdmin(id: number) {
  return apiClient.get<Admin>(`/administradores/${id}`)
}

export interface CreateAdminBody {
  idRol:          number
  nombreCompleto: string
  email:          string
  password:       string
}

export function createAdmin(body: CreateAdminBody) {
  return apiClient.post<{ message: string }>("/administradores", body)
}

export function deactivateAdmin(id: number) {
  return apiClient.delete<{ message: string }>(`/administradores/${id}`)
}

export function updateAdmin(id: number, body: UpdateAdminBody) {
  return apiClient.put<{ message: string }>(`/administradores/${id}`, body)
}

export function changePassword(id: number, body: ChangePasswordBody) {
  return apiClient.patch<{ message: string }>(`/administradores/${id}/password`, body)
}

export function solicitarCodigo(id: number) {
  return apiClient.post<{ message: string; codigoDev?: string }>(
    `/administradores/${id}/solicitar-codigo`,
    {}
  )
}

export function updateTelefono(id: number, telefono: string | null) {
  return apiClient.patch<{ message: string }>(`/administradores/${id}/telefono`, { telefono })
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

export function solicitarRecuperacion(email: string) {
  return apiClient.post<{ message: string; codigoDev?: string }>(
    "/administradores/forgot-password",
    { email }
  )
}

export function resetPasswordPublico(
  email: string,
  codigo: string,
  nuevaPassword: string
) {
  return apiClient.patch<{ message: string }>(
    "/administradores/forgot-password/reset",
    { email, codigo, nuevaPassword }
  )
}
