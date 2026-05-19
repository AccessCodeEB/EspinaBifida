import type { Servicio } from "@/services/servicios"

export type ServicioDetallado = Servicio & {
  fechaDate: Date | null
  montoNumero: number
  mesClave: string
}

export type SortField = "estatus" | "servicio" | "nombre" | "monto" | "folio" | "fecha"
export type SortDirection = "asc" | "desc"
export type RangoRapido = "full" | "firstHalf" | "secondHalf" | "last7"

export type PendingDelete = {
  servicio: ServicioDetallado
  timerId: ReturnType<typeof setTimeout>
}
