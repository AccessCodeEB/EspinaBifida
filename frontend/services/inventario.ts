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

  return {
    clave,
    descripcion,
    unidad,
    cuota,
    cantidad,
    minimo,
  };
}

/** GET /inventario */
export async function getInventario() {
  const rows = await apiClient.get<Record<string, unknown>[]>("/inventario")
  return rows.map(toArticuloInventario)
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
