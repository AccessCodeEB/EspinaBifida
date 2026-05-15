"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, SlidersHorizontal, Calendar, User, ChevronUp, ChevronDown, X, CheckCircle2, Clock, XCircle } from "lucide-react"
import type { Cita } from "@/services/citas"
import type { Beneficiario } from "@/services/beneficiarios"

interface Props {
  citas: Cita[]
  beneficiarios: Beneficiario[]
}

type SortField = "fecha" | "beneficiario" | "especialista" | "estatus"
type SortDir = "asc" | "desc"
type FilterEstatus = "Todos" | Cita["estatus"]

const STATUS_CONFIG: Record<string, { dot: string; cls: string; Icon: typeof CheckCircle2 }> = {
  Confirmada: { dot: "bg-emerald-500", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", Icon: CheckCircle2 },
  Pendiente:  { dot: "bg-amber-500",   cls: "border-amber-500/30  bg-amber-500/10  text-amber-400",   Icon: Clock        },
  Completada: { dot: "bg-blue-400",    cls: "border-border/60     bg-muted/30      text-muted-foreground", Icon: CheckCircle2 },
  Cancelada:  { dot: "bg-red-500",     cls: "border-red-500/30    bg-red-500/10    text-red-400",     Icon: XCircle      },
}

const STATUS_DOT: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.dot])
)

/** Bordered pill with icon, matching agenda hoy style */
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <span className="text-[11px] text-muted-foreground">{status}</span>
  const Icon = cfg.Icon
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="size-3 shrink-0" />
      {status}
    </span>
  )
}

function SortIndicator({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  const active = current === field
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden>
      {active && dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
    </span>
  )
}

const STATUSES: FilterEstatus[] = ["Todos", "Pendiente", "Confirmada", "Completada", "Cancelada"]

export function CitasListView({ citas, beneficiarios }: Props) {
  const [query, setQuery]               = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterEstatus>("Todos")
  const [filterFecha, setFilterFecha]   = useState("")
  const [sortField, setSortField]       = useState<SortField>("fecha")
  const [sortDir, setSortDir]           = useState<SortDir>("desc")
  const [showFilters, setShowFilters]   = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    if (showFilters) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showFilters])

  const benefMap = useMemo(() => {
    const m = new Map<string, string>()
    beneficiarios.forEach(b => m.set(`${b.nombres} ${b.apellidoPaterno}`.toLowerCase(), b.tipo ?? ""))
    return m
  }, [beneficiarios])

  const filtered = useMemo(() => {
    let list = [...citas]
    if (filterStatus !== "Todos") list = list.filter(c => c.estatus === filterStatus)
    if (filterFecha) list = list.filter(c => c.fecha === filterFecha)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c =>
        c.beneficiario?.toLowerCase().includes(q) ||
        c.especialista?.toLowerCase().includes(q) ||
        c.folio?.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      let va = "", vb = ""
      if (sortField === "fecha")        { va = a.fecha + a.hora; vb = b.fecha + b.hora }
      else if (sortField === "beneficiario") { va = a.beneficiario; vb = b.beneficiario }
      else if (sortField === "especialista") { va = a.especialista; vb = b.especialista }
      else { va = a.estatus; vb = b.estatus }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [citas, query, filterStatus, filterFecha, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const activeFilterCount = [
    filterStatus !== "Todos",
    !!filterFecha,
    !!query,
  ].filter(Boolean).length

  function clearFilters() {
    setFilterStatus("Todos")
    setFilterFecha("")
    setQuery("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
          {/* Filter button */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={[
                "relative flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
                showFilters || activeFilterCount > 0
                  ? "border-[#0f4c81] bg-[#0f4c81]/10 text-[#0f4c81] dark:text-blue-400"
                  : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-[#0f4c81] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter panel dropdown */}
            {showFilters && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-border/60 bg-card p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtros</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      <X className="size-3" />Limpiar
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Estatus</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                          className={[
                            "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all",
                            filterStatus === s
                              ? "border-[#0f4c81] bg-[#0f4c81] text-white"
                              : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                          ].join(" ")}>
                          {s !== "Todos" && (
                            <span className={`size-1.5 rounded-full ${filterStatus === s ? "bg-white" : STATUS_DOT[s]}`} />
                          )}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />Fecha exacta
                    </label>
                    <input
                      type="date"
                      value={filterFecha}
                      onChange={e => setFilterFecha(e.target.value)}
                      className="h-8 w-full rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                    />
                    {filterFecha && (
                      <button onClick={() => setFilterFecha("")} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <X className="size-3" />Quitar fecha
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Paciente, doctor o folio..."
              className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Result count */}
          <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            {filtered.length} de {citas.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[24%]" />
              <col className="w-[30%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 pr-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folio</th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("beneficiario")}>
                    <User className="size-3" />Paciente <SortIndicator field="beneficiario" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("especialista")}>
                    Doctor <SortIndicator field="especialista" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("fecha")}>
                    <Calendar className="size-3" />Fecha <SortIndicator field="fecha" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 pl-2 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("estatus")}>
                    Estatus <SortIndicator field="estatus" current={sortField} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-xs text-muted-foreground">
                    No se encontraron citas con esos criterios.
                  </td>
                </tr>
              ) : (
                filtered.map(cita => {
                  const diagnosisKey = cita.beneficiario?.toLowerCase() ?? ""
                  const diagnosis = benefMap.get(diagnosisKey)
                  return (
                    <tr key={cita.id} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 pl-5 pr-2">
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{cita.folio || "—"}</p>
                      </td>
                      <td className="py-3 px-2 min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{cita.beneficiario}</p>
                        {diagnosis && <p className="truncate text-[10px] text-muted-foreground">{diagnosis}</p>}
                      </td>
                      <td className="py-3 px-2">
                        <p className="truncate text-xs text-foreground">{cita.especialista || "—"}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-xs text-foreground">{cita.fecha}</p>
                        <p className="text-[10px] text-muted-foreground">{cita.hora}</p>
                      </td>
                      <td className="py-3 pl-2 pr-5"><StatusPill status={cita.estatus} /></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/40 px-5 py-2.5">
          <p className="text-[11px] text-muted-foreground">{filtered.length} de {citas.length} citas</p>
        </div>
      </div>
    </div>
  )
}
