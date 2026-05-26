"use client"

import { AlertTriangle, ArrowUpDown, Eye, Search, Trash2 } from "lucide-react"
import type { ServicioDetallado, SortField } from "./types"

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value)
}

const PAGE_SIZE = 25

interface ServiciosTableProps {
  filtered: ServicioDetallado[]
  sortedFiltered: ServicioDetallado[]
  paginated: ServicioDetallado[]
  page: number
  totalPages: number
  currentPage: number
  start: number
  end: number

  searchTerm: string
  setSearchTerm: (v: string) => void
  tipoServicioFiltro: string
  setTipoServicioFiltro: (v: string) => void
  tiposServicioDistintos: string[]
  fechaInicioFiltro: string
  setFechaInicioFiltro: (v: string) => void
  fechaFinFiltro: string
  setFechaFinFiltro: (v: string) => void

  selectedMonth: string
  monthInputToLabel: (key: string) => string

  sortField: SortField
  sortDirection: "asc" | "desc"
  onSortBy: (field: SortField) => void
  onSortPreset: (preset: "recent" | "highest" | "nameAZ" | "pendingFirst") => void

  onApplyQuickRange: (preset: "full" | "firstHalf" | "secondHalf" | "last7") => void

  onViewDetalle: (s: ServicioDetallado) => void
  onEliminar: (s: ServicioDetallado) => void
  setPage: (fn: (p: number) => number) => void

  pendingDeleteFolio: string | null
  onUndoDelete: () => void
}

export function ServiciosTable({
  filtered,
  sortedFiltered,
  paginated,
  page,
  totalPages,
  currentPage,
  start,
  end,
  searchTerm,
  setSearchTerm,
  tipoServicioFiltro,
  setTipoServicioFiltro,
  tiposServicioDistintos,
  fechaInicioFiltro,
  setFechaInicioFiltro,
  fechaFinFiltro,
  setFechaFinFiltro,
  selectedMonth,
  monthInputToLabel,
  onSortBy,
  onSortPreset,
  onApplyQuickRange,
  onViewDetalle,
  onEliminar,
  setPage,
  pendingDeleteFolio,
  onUndoDelete,
}: ServiciosTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

      {/* Alerta undo */}
      {pendingDeleteFolio && (
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-xs text-amber-800 dark:text-amber-300">
            Servicio <span className="font-semibold">{pendingDeleteFolio}</span> marcado para eliminar. Puedes deshacer en 8 segundos.
          </p>
          <button onClick={onUndoDelete} className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400">
            Deshacer
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4">
        {/* Fila 1: título + búsqueda */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Servicios registrados</p>
            <p className="text-[11px] text-muted-foreground">{filtered.length} resultados · {monthInputToLabel(selectedMonth)}</p>
          </div>
          <div className="relative w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Folio, nombre o servicio..."
              className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Fila 2: fechas + rangos rápidos + ordenar + limpiar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fechaInicioFiltro}
            max={fechaFinFiltro || undefined}
            onChange={(e) => setFechaInicioFiltro(e.target.value)}
            className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs outline-none focus:border-[#0f4c81]"
          />
          <span className="text-[10px] text-muted-foreground">—</span>
          <input
            type="date"
            value={fechaFinFiltro}
            min={fechaInicioFiltro || undefined}
            onChange={(e) => setFechaFinFiltro(e.target.value)}
            className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs outline-none focus:border-[#0f4c81]"
          />

          <div className="h-5 w-px bg-border/60" />

          {([
            { label: "Este mes", fn: () => onApplyQuickRange("full") },
            { label: "Últimos 7d", fn: () => onApplyQuickRange("last7") },
          ] as const).map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              {label}
            </button>
          ))}

          <div className="h-5 w-px bg-border/60" />

          <select
            className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:border-[#0f4c81]"
            value={tipoServicioFiltro}
            onChange={(e) => setTipoServicioFiltro(e.target.value)}
          >
            <option value="">Todos los servicios</option>
            {tiposServicioDistintos.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-border/60" />

          <select
            className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:border-[#0f4c81]"
            onChange={(e) => onSortPreset(e.target.value as "recent" | "highest" | "nameAZ" | "pendingFirst")}
            defaultValue=""
          >
            <option value="" disabled>Ordenar por…</option>
            <option value="recent">Más reciente</option>
            <option value="highest">Mayor monto</option>
            <option value="nameAZ">Nombre A–Z</option>
            <option value="pendingFirst">Pendientes primero</option>
          </select>

          <button
            onClick={() => { setFechaInicioFiltro(""); setFechaFinFiltro(""); setSearchTerm(""); setTipoServicioFiltro("") }}
            className="ml-auto rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("folio")}>Folio <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("nombre")}>Nombre <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("servicio")}>Servicio <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("fecha")}>Fecha <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="hidden py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("monto")}>Monto <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => onSortBy("estatus")}>Estatus <ArrowUpDown className="size-3" /></button>
              </th>
              <th className="py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                  No hay servicios para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginated.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/20">
                  <td className="py-3 pl-5 font-mono text-[11px] text-foreground">{s.folio}</td>
                  <td className="py-3 text-xs font-medium text-foreground">{s.nombre}</td>
                  <td className="hidden py-3 text-xs text-foreground md:table-cell">{s.servicio}</td>
                  <td className="hidden py-3 text-xs text-foreground lg:table-cell">{s.fecha}</td>
                  <td className="hidden py-3 text-right text-xs font-semibold text-foreground lg:table-cell">{formatMoney(s.montoNumero)}</td>
                  <td className="py-3 text-center">
                    {(() => {
                      const cfg: Record<string, { dot: string; text: string }> = {
                        Activo:   { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
                        Inactivo: { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-400" },
                        Baja:     { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400" },
                      }
                      const c = cfg[s.estatus] ?? { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" }
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
                          <span className={`size-1.5 rounded-full ${c.dot}`} />
                          {s.estatus}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewDetalle(s)}
                        className="flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Eye className="size-3.5" />Ver
                      </button>
                      <button
                        onClick={() => onEliminar(s)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          {sortedFiltered.length === 0 ? 0 : start + 1}–{Math.min(end, sortedFiltered.length)} de {sortedFiltered.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="min-w-[4rem] text-center text-[11px] text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
