import { apiClient } from "@/lib/api-client"

export interface ArticuloInventario {
  clave: string | number
  descripcion: string
  unidad: string
  cuota: string
  cuotaB?: number | null
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
  idArticulo?: number
  descripcion: string
  unidad: string
  cuotaRecuperacion: number
  cuotaB?: number | null
  inventarioActual: number
  manejaInventario: "S" | "N"
  idCategoria: number
  stockMinimo?: number
  motivoAlta?: string
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
  const cuotaB = row.cuotaB != null ? Number(row.cuotaB) : null;
  const idCategoria = row.idCategoria != null ? Number(row.idCategoria) : undefined;
  const nombreCategoria = typeof row.nombreCategoria === "string" ? row.nombreCategoria : undefined;

  return { clave, descripcion, unidad, cuota, cuotaB, cantidad, minimo, idCategoria, nombreCategoria };
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
export function eliminarArticulo(idArticulo: string | number, motivo?: string) {
  const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ""
  return apiClient.delete<{ message: string }>(`/articulos/${idArticulo}${qs}`)
}

export interface ArticuloLogEntry {
  idLog: number
  idArticulo: number | null
  descripcionArticulo: string
  tipo: "ALTA" | "BAJA"
  motivo: string | null
  fecha: string
}

/** GET /articulos/log */
export function getArticulosLog(params?: { tipo?: string; dias?: number }) {
  const qs = params
    ? "?" + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join("&")
    : ""
  return apiClient.get<ArticuloLogEntry[]>(`/articulos/log${qs}`)
}
