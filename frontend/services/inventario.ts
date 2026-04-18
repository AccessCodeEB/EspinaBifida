import { apiClient } from "@/lib/api-client"

export interface ArticuloInventario {
  clave: string | number
  descripcion: string
  unidad: string
  cuota: string
  cantidad: number
  minimo: number
}

export interface MovimientoInventario {
  id: number
  idArticulo: string | number
  descripcion: string
  tipo: "ENTRADA" | "SALIDA"
  cantidad: number
  motivo: string
  fecha: string
}

export interface MovimientoPayload {
  idArticulo: string | number
  tipo: "ENTRADA" | "SALIDA"
  cantidad: number
  motivo: string
}

export interface NuevoArticuloPayload {
  idArticulo: number
  descripcion: string
  unidad: string
  cuotaRecuperacion: number
  inventarioActual: number
  manejaInventario: "S" | "N"
  idCategoria: number
}

/** GET /inventario */
export function getInventario() {
  return apiClient.get<ArticuloInventario[]>("/inventario")
}

/** GET /inventario/movimientos */
export function getMovimientos() {
  return apiClient.get<MovimientoInventario[]>("/inventario/movimientos")
}

/** POST /inventario/movimientos */
export function registrarMovimiento(data: MovimientoPayload) {
  return apiClient.post<{ message: string; data: MovimientoInventario }>("/inventario/movimientos", data)
}

/** POST /articulos */
export function crearArticulo(data: NuevoArticuloPayload) {
  return apiClient.post<{ message: string }>("/articulos", data)
}

/** DELETE /articulos/:id */
export function eliminarArticulo(idArticulo: string | number) {
  return apiClient.delete<{ message: string }>(`/articulos/${idArticulo}`)
}
