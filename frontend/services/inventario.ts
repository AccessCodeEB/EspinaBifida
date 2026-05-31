import { apiClient } from "@/lib/api-client"

export interface ArticuloInventario {
  clave: string | number
  descripcion: string
  unidad: string
  cuota: string
  cantidad: number
  minimo: number
  idCategoria?: number
  nombreCategoria?: string
}

export interface CategoriaArticulo {
  id: number
  nombre: string
}

export interface MovimientoInventario {
  idMovimiento: number
  idArticulo: string | number
  descripcion: string
  tipo: "ENTRADA" | "SALIDA"
  cantidad: number
  motivo: string | null
  fecha: string
  stockResultante: number
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
  stockMinimo?: number
}

function toArticuloInventario(row: Record<string, unknown>): ArticuloInventario {
  const clave =
    (row.clave as string | number | undefined) ??
    (row.idProducto as string | number | undefined) ??
    (row.idArticulo as string | number | undefined) ??
    "";

  const descripcion =
    (row.descripcion as string | undefined) ??
    (row.nombre as string | undefined) ??
    "";

  const unidad = String(row.unidad ?? "PZA.");

  const cuotaRaw = row.cuota ?? row.cuotaRecuperacion ?? 0;
  const cuota =
    typeof cuotaRaw === "string"
      ? cuotaRaw
      : `$${Number(cuotaRaw || 0).toFixed(2)}`;

  const cantidadRaw = row.cantidad ?? row.stockActual ?? row.inventarioActual ?? row.stock ?? 0;
  const cantidad = Number(cantidadRaw || 0);

  const minimo = Number(row.minimo ?? 0);
  const idCategoria = row.idCategoria != null ? Number(row.idCategoria) : undefined;
  const nombreCategoria = typeof row.nombreCategoria === "string" ? row.nombreCategoria : undefined;

  return { clave, descripcion, unidad, cuota, cantidad, minimo, idCategoria, nombreCategoria };
}

/** GET /articulos/categorias */
export function getCategorias() {
  return apiClient.get<CategoriaArticulo[]>("/articulos/categorias")
}

/** GET /inventario */
export async function getInventario() {
  const rows = await apiClient.get<Record<string, unknown>[]>("/inventario")
  return rows.map(toArticuloInventario)
}

/** GET /inventario/movimientos */
export function getMovimientos(dias?: number) {
  const qs = dias ? `?dias=${dias}` : ""
  return apiClient.get<MovimientoInventario[]>(`/inventario/movimientos${qs}`)
}

/** POST /inventario/movimientos */
export function registrarMovimiento(data: MovimientoPayload) {
  return apiClient.post<{ message: string; data: MovimientoInventario }>("/inventario/movimientos", data)
}

/** POST /articulos */
export function crearArticulo(data: NuevoArticuloPayload) {
  return apiClient.post<{ message: string }>("/articulos", data)
}

/** PATCH /articulos/:id */
export function actualizarArticulo(idArticulo: string | number, data: Partial<NuevoArticuloPayload>) {
  return apiClient.put<{ message: string }>(`/articulos/${idArticulo}`, data)
}

/** DELETE /articulos/:id */
export function eliminarArticulo(idArticulo: string | number) {
  return apiClient.delete<{ message: string }>(`/articulos/${idArticulo}`)
}
