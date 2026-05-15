"use client"

import { useState, useMemo } from "react"
import { Search, Filter, Calendar, User, CheckCircle2, Clock, XCircle, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Cita } from "@/services/citas"
import type { Beneficiario } from "@/services/beneficiarios"

interface Props {
  citas: Cita[]
  beneficiarios: Beneficiario[]
}

type SortField = "fecha" | "beneficiario" | "especialista" | "estatus"
type SortDir = "asc" | "desc"
type FilterEstatus = "Todos" | Cita["estatus"]

const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string; Icon: typeof CheckCircle2 }> = {
  Confirmada:  { label: "Confirmada",  dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400", Icon: CheckCircle2 },
  Pendiente:   { label: "Pendiente",   dot: "bg-amber-500",   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",           Icon: Clock        },
  Completada:  { label: "Completada",  dot: "bg-blue-500",    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",                 Icon: CheckCircle2 },
  Cancelada:   { label: "Cancelada",   dot: "bg-red-500",     cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",                      Icon: XCircle      },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <span className="text-xs text-muted-foreground">{status}</span>
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
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

export function CitasListView({ citas, beneficiarios }: Props) {
  const [query, setQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterEstatus>("Todos")
  const [sortField, setSortField] = useState<SortField>("fecha")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Mapa folio -> tipo de diagnóstico (campo `tipo` del beneficiario, ej. "Mielomeningocele")
  const benefMap = useMemo(() => {
    const m = new Map<string, string>()
    beneficiarios.forEach(b => m.set(`${b.nombres} ${b.apellidoPaterno}`.toLowerCase(), b.tipo ?? ""))
    return m
  }, [beneficiarios])

  const filtered = useMemo(() => {
    let list = [...citas]
    if (filterStatus !== "Todos") list = list.filter(c => c.estatus === filterStatus)
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
      if (sortField === "fecha") { va = a.fecha + a.hora; vb = b.fecha + b.hora }
      else if (sortField === "beneficiario") { va = a.beneficiario; vb = b.beneficiario }
      else if (sortField === "especialista") { va = a.especialista; vb = b.especialista }
      else { va = a.estatus; vb = b.estatus }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [citas, query, filterStatus, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const STATUSES: FilterEstatus[] = ["Todos", "Pendiente", "Confirmada", "Completada", "Cancelada"]

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",       val: citas.length,                                           color: "#0f4c81" },
          { label: "Pendientes",  val: citas.filter(c => c.estatus === "Pendiente").length,   color: "#f59e0b" },
          { label: "Confirmadas", val: citas.filter(c => c.estatus === "Confirmada").length,  color: "#10b981" },
          { label: "Completadas", val: citas.filter(c => c.estatus === "Completada").length,  color: "#3b82f6" },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
            <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla card */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Paciente, doctor o folio..."
              className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUSES.map(s => {
              const active = filterStatus === s
              const cfg = STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                    active
                      ? "border-[#0f4c81] bg-[#0f4c81] text-white"
                      : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                  {s !== "Todos" && cfg && <span className={`mr-1 inline-block size-1.5 rounded-full ${active ? "bg-white" : cfg.dot}`} />}
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground w-24">Folio</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("beneficiario")}>
                    <User className="size-3" />Paciente <SortIndicator field="beneficiario" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                  <button className="inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("especialista")}>
                    Doctor <SortIndicator field="especialista" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("fecha")}>
                    <Calendar className="size-3" />Fecha <SortIndicator field="fecha" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:opacity-70" onClick={() => toggleSort("estatus")}>
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
                      <td className="py-3 pl-5 font-mono text-[11px] text-foreground">{cita.folio}</td>
                      <td className="py-3 min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{cita.beneficiario}</p>
                        {diagnosis && <p className="truncate text-[10px] text-muted-foreground">{diagnosis}</p>}
                      </td>
                      <td className="hidden py-3 text-xs text-foreground md:table-cell">{cita.especialista || "—"}</td>
                      <td className="py-3">
                        <p className="text-xs text-foreground">{cita.fecha}</p>
                        <p className="text-[10px] text-muted-foreground">{cita.hora}</p>
                      </td>
                      <td className="py-3 pr-5"><StatusPill status={cita.estatus} /></td>
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
