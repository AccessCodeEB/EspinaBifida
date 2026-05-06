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

const STATUS_CONFIG: Record<string, { label: string; pill: string; Icon: typeof CheckCircle2 }> = {
  Confirmada:  { label: "Confirmada",  pill: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", Icon: CheckCircle2 },
  Pendiente:   { label: "Pendiente",   pill: "bg-amber-500/15 text-amber-400 border border-amber-500/30",       Icon: Clock },
  Completada:  { label: "Completada",  pill: "bg-sky-500/15 text-sky-400 border border-sky-500/30",             Icon: CheckCircle2 },
  Cancelada:   { label: "Cancelada",   pill: "bg-red-500/15 text-red-400 border border-red-500/30",             Icon: XCircle },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <span className="text-xs text-muted-foreground">{status}</span>
  const { Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.pill}`}>
      <Icon className="size-3" />
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
    <div className="flex flex-col gap-5">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar paciente, doctor o folio..."
            className="pl-9 bg-muted/30 border-border/50"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", val: citas.length, color: "text-foreground" },
          { label: "Pendientes", val: citas.filter(c => c.estatus === "Pendiente").length, color: "text-amber-400" },
          { label: "Confirmadas", val: citas.filter(c => c.estatus === "Confirmada").length, color: "text-emerald-400" },
          { label: "Completadas", val: citas.filter(c => c.estatus === "Completada").length, color: "text-sky-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_1fr_120px_130px] gap-4 px-5 py-3 bg-muted/30 border-b border-border/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Folio</span>
          <button type="button" className="group flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left" onClick={() => toggleSort("beneficiario")}>
            <User className="size-3.5 mr-1.5" />Paciente<SortIndicator field="beneficiario" current={sortField} dir={sortDir} />
          </button>
          <button type="button" className="group flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left" onClick={() => toggleSort("especialista")}>
            Doctor<SortIndicator field="especialista" current={sortField} dir={sortDir} />
          </button>
          <button type="button" className="group flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left" onClick={() => toggleSort("fecha")}>
            <Calendar className="size-3.5 mr-1.5" />Fecha<SortIndicator field="fecha" current={sortField} dir={sortDir} />
          </button>
          <button type="button" className="group flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left" onClick={() => toggleSort("estatus")}>
            Estatus<SortIndicator field="estatus" current={sortField} dir={sortDir} />
          </button>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No se encontraron citas con esos criterios.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map(cita => {
              const diagnosisKey = cita.beneficiario?.toLowerCase() ?? ""
              const diagnosis = benefMap.get(diagnosisKey)
              return (
                <div
                  key={cita.id}
                  className="grid grid-cols-[80px_1fr_1fr_120px_130px] gap-4 px-5 py-3.5 items-center hover:bg-muted/20 transition-colors"
                >
                  <span className="font-mono text-xs text-primary font-semibold truncate">{cita.folio}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{cita.beneficiario}</p>
                    {diagnosis && (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{diagnosis}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{cita.especialista || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/80">{cita.fecha}</p>
                    <p className="text-xs text-muted-foreground">{cita.hora}</p>
                  </div>
                  <StatusPill status={cita.estatus} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} de {citas.length} citas
      </p>
    </div>
  )
}
