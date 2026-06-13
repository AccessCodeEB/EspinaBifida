"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, SlidersHorizontal, Calendar as CalendarIcon, User, ChevronUp, ChevronDown, X, CheckCircle, CheckCircle2, Clock, XCircle, Hash, Stethoscope, MoreVertical, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { type Cita, deleteCitaPermanente, updateCita } from "@/services/citas"
import type { Beneficiario } from "@/services/beneficiarios"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useRouter } from "next/navigation"

const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const GLOBAL_OPTIMISTIC_DELETED_CITAS = new Set<number>()

interface Props {
  citas: Cita[]
  beneficiarios: Beneficiario[]
  onReload?: () => void
}

type SortField = "fecha" | "beneficiario" | "especialista" | "estatus"
type SortDir = "asc" | "desc"
type FilterEstatus = "Todos" | Cita["estatus"]

const STATUS_CONFIG: Record<string, { dot: string; cls: string; Icon: typeof CheckCircle2 }> = {
  Confirmada: { dot: "bg-emerald-500", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", Icon: CheckCircle2 },
  Pendiente:  { dot: "bg-amber-500",   cls: "border-amber-500/30  bg-amber-500/10  text-amber-400",   Icon: Clock        },
  Completada: { dot: "bg-blue-500",    cls: "border-blue-500/30   bg-blue-500/10   text-blue-400",    Icon: CheckCircle2 },
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

export function CitasListView({ citas: initialCitas, beneficiarios, onReload }: Props) {
  const router = useRouter()
  const [query, setQuery]                   = useState("")
  const [filterStatuses, setFilterStatuses] = useState<Set<FilterEstatus>>(new Set(["Todos"]))
  const [filterFechas, setFilterFechas]     = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters]       = useState(false)
  const [sortField, setSortField]           = useState<SortField>("fecha")
  const [sortDir, setSortDir]               = useState<SortDir>("desc")
  const panelRef = useRef<HTMLDivElement>(null)
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState<"cancel"|"complete"|"delete"|null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  const [citas, setCitasState] = useState<Cita[]>(initialCitas.filter(c => !GLOBAL_OPTIMISTIC_DELETED_CITAS.has(c.id)))

  useEffect(() => {
    setCitasState(initialCitas.filter(c => !GLOBAL_OPTIMISTIC_DELETED_CITAS.has(c.id)))
  }, [initialCitas])

  const setCitas = (updater: (prev: Cita[]) => Cita[]) => {
    setCitasState(prev => updater(prev))
  }

  const [optimisticCancelledIds, setOptimisticCancelledIds] = useState<Set<number>>(new Set())

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
    let list = citas
      .map(c => optimisticCancelledIds.has(c.id) ? { ...c, estatus: "Cancelada" as const } : c)
      
    if (!filterStatuses.has("Todos")) {
      list = list.filter(c => filterStatuses.has(c.estatus))
    }
    
    if (filterFechas.size > 0) {
      list = list.filter(c => filterFechas.has(c.fecha))
    }
    
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c =>
        c.beneficiario?.toLowerCase().includes(q) ||
        c.especialista?.toLowerCase().includes(q) ||
        c.folio?.toLowerCase().includes(q)
      )
    }
    
    list.sort((a, b) => {
      if (sortField !== "estatus") {
        if (a.estatus === "Cancelada" && b.estatus !== "Cancelada") return 1
        if (b.estatus === "Cancelada" && a.estatus !== "Cancelada") return -1
      }
      
      let va = "", vb = ""
      if (sortField === "fecha")        { va = a.fecha + a.hora; vb = b.fecha + b.hora }
      else if (sortField === "beneficiario") { va = a.beneficiario; vb = b.beneficiario }
      else if (sortField === "especialista") { va = a.especialista; vb = b.especialista }
      else { va = a.estatus; vb = b.estatus }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [citas, optimisticCancelledIds, query, filterStatuses, filterFechas, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const activeFilterCount = [
    !filterStatuses.has("Todos") ? filterStatuses.size : 0,
    filterFechas.size > 0 ? filterFechas.size : 0,
    !!query ? 1 : 0,
  ].reduce((acc, curr) => acc + curr, 0)

  function clearFilters() {
    setFilterStatuses(new Set(["Todos"]))
    setFilterFechas(new Set())
    setQuery("")
  }

  function toggleStatus(s: FilterEstatus) {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      if (s === "Todos") return new Set(["Todos"])
      
      next.delete("Todos")
      if (next.has(s)) next.delete(s)
      else next.add(s)
      
      if (next.size === 0) return new Set(["Todos"])
      return next
    })
  }

  function addDate(d: string) {
    if (!d) return
    setFilterFechas(prev => {
      const n = new Set(prev)
      n.add(d)
      return n
    })
  }

  function removeDate(d: string) {
    setFilterFechas(prev => {
      const n = new Set(prev)
      n.delete(d)
      return n
    })
  }

  async function handleDelete(id: number) {
    if (!id) return
    const cita = citas.find(c => c.id === id)
    if (!cita) return
    
    setDeleteConfirmId(null)
    GLOBAL_OPTIMISTIC_DELETED_CITAS.add(id)
    setCitas(prev => prev.filter(c => c.id !== id))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })

    let seconds = 10
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout

    const undo = () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      GLOBAL_OPTIMISTIC_DELETED_CITAS.delete(id)
      setCitas(prev => [...prev, cita])
    }

    const toastId = toast.warning(`Eliminando cita permanentemente...`, {
      description: `Tienes ${seconds} segundos para deshacer esta acción.`,
      duration: 10500,
      action: { label: "Deshacer", onClick: undo }
    })

    intervalId = setInterval(() => {
      seconds--
      if (seconds <= 0) {
        clearInterval(intervalId)
      } else {
        toast.warning(`Eliminando cita permanentemente...`, {
          id: toastId,
          description: `Tienes ${seconds} segundos para deshacer esta acción.`,
          duration: seconds * 1000 + 500,
          action: { label: "Deshacer", onClick: undo }
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      try {
        await deleteCitaPermanente(id)
        GLOBAL_OPTIMISTIC_DELETED_CITAS.delete(id)
        toast.success("Cita eliminada permanentemente", {
          id: toastId,
          description: "Eliminada automáticamente de Servicios.",
          action: {
            label: "Ir a servicios",
            onClick: () => router.push(`/panel?section=servicios`),
          },
          duration: 8000,
        })
        onReload?.()
      } catch (err) {
        toast.error("Error al eliminar la cita", { id: toastId })
        console.error(err)
        onReload?.()
      }
    }, 10000)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const count = ids.length
    const deletedCitas = citas.filter(c => ids.includes(c.id))
    ids.forEach(id => GLOBAL_OPTIMISTIC_DELETED_CITAS.add(id))
    setCitas(prev => prev.filter(c => !ids.includes(c.id)))
    setSelectedIds(new Set())
    setSelectionMode(false)

    let seconds = 10
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout

    const undo = () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      ids.forEach(id => GLOBAL_OPTIMISTIC_DELETED_CITAS.delete(id))
      setCitas(prev => [...prev, ...deletedCitas])
    }

    const toastId = toast.warning(`Eliminando ${count} citas permanentemente...`, {
      description: `Tienes ${seconds} segundos para deshacer esta acción.`,
      duration: 10500,
      action: { label: "Deshacer", onClick: undo }
    })

    intervalId = setInterval(() => {
      seconds--
      if (seconds <= 0) {
        clearInterval(intervalId)
      } else {
        toast.warning(`Eliminando ${count} citas permanentemente...`, {
          id: toastId,
          description: `Tienes ${seconds} segundos para deshacer esta acción.`,
          duration: seconds * 1000 + 500,
          action: { label: "Deshacer", onClick: undo }
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      try {
        for (const id of ids) {
          await deleteCitaPermanente(id).catch(console.error)
          GLOBAL_OPTIMISTIC_DELETED_CITAS.delete(id)
        }
        onReload?.()
      } catch (err) {
        console.error("Error en eliminación masiva:", err)
        toast.error("Hubo un error al eliminar algunas citas")
        onReload?.()
      }
    }, 10000)
  }

  const handleBulkCancel = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const count = ids.length
    
    setOptimisticCancelledIds(prev => new Set([...prev, ...ids]))
    setSelectedIds(new Set())
    setSelectionMode(false)

    let seconds = 10
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout

    const undo = () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      setOptimisticCancelledIds(prev => {
        const n = new Set(prev)
        ids.forEach(id => n.delete(id))
        return n
      })
    }

    const toastId = toast.warning(`Cancelando ${count} citas...`, {
      description: `Tienes ${seconds} segundos para deshacer esta acción.`,
      duration: 10500,
      action: { label: "Deshacer", onClick: undo }
    })

    intervalId = setInterval(() => {
      seconds--
      if (seconds <= 0) {
        clearInterval(intervalId)
      } else {
        toast.warning(`Cancelando ${count} citas...`, {
          id: toastId,
          description: `Tienes ${seconds} segundos para deshacer esta acción.`,
          duration: seconds * 1000 + 500,
          action: { label: "Deshacer", onClick: undo }
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      try {
        for (const id of ids) {
          await updateCita(id, { estatus: "Cancelada" }).catch(console.error)
        }
        onReload?.()
      } catch (err) {
        console.error("Error al cancelar masivamente:", err)
        toast.error("Hubo un error al cancelar algunas citas")
        onReload?.()
      }
    }, 10000)
  }

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setSelectionMode(false)
    setSelectedIds(new Set())
    
    let successCount = 0
    let lastError = ""
    for (const id of ids) {
      try {
        await updateCita(id, { estatus: "Completada" })
        successCount++
      } catch (err: any) {
        lastError = err?.message || "Error desconocido"
        console.error("Error al completar cita:", err)
      }
    }
    
    if (successCount === ids.length) {
      toast.success(`${ids.length} citas marcadas como completadas`)
    } else {
      toast.error(`Error al completar ${ids.length - successCount} citas`, { description: lastError })
      if (successCount > 0) toast.success(`${successCount} citas completadas con éxito`)
    }
    onReload?.()
  }

  const selectedCitas = citas.filter(c => selectedIds.has(c.id))
  const canCancelSelected = selectedCitas.length > 0 && selectedCitas.every(c => c.estatus === "Pendiente" || c.estatus === "Confirmada")
  const canCompleteSelected = selectedCitas.length > 0 && selectedCitas.every(c => c.estatus === "Pendiente" || c.estatus === "Confirmada")

  return (
    <>
      <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">

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
                        <button key={s} onClick={() => toggleStatus(s)}
                          className={[
                            "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all",
                            filterStatuses.has(s)
                              ? "border-[#0f4c81] bg-[#0f4c81] text-white"
                              : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                          ].join(" ")}>
                          {s !== "Todos" && (
                            <span className={`size-1.5 rounded-full ${filterStatuses.has(s) ? "bg-white" : STATUS_DOT[s]}`} />
                          )}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="size-3" />Fecha(s)
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex h-8 w-full items-center justify-between rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground outline-none hover:bg-muted focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10">
                          <span>{filterFechas.size === 0 ? "Seleccionar fechas..." : `${filterFechas.size} fechas seleccionadas`}</span>
                          <CalendarIcon className="size-3.5 opacity-60" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          selected={Array.from(filterFechas).map(d => {
                            const [y, m, day] = d.split("-").map(Number)
                            return new Date(y, m - 1, day)
                          })}
                          onSelect={(dates) => {
                            if (!dates) {
                              setFilterFechas(new Set())
                              return
                            }
                            setFilterFechas(new Set(dates.map(d => toLocalDateStr(d))))
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {filterFechas.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.from(filterFechas).map(d => (
                          <span key={d} className="inline-flex items-center gap-1 bg-muted border border-border/50 px-2 py-0.5 rounded text-[10px] text-foreground">
                            {d}
                            <button onClick={() => removeDate(d)} className="hover:text-red-500 ml-0.5"><X className="size-3"/></button>
                          </span>
                        ))}
                      </div>
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

          <button
            onClick={() => {
              setSelectionMode(prev => !prev)
              setSelectedIds(new Set())
            }}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              selectionMode
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectionMode ? "Cancelar selección" : "Seleccionar"}
          </button>

          {/* Result count */}
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {filtered.length} de {citas.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              {selectionMode && <col className="w-12" />}
              <col className="w-[16%]" />
              <col className="w-[24%]" />
              <col className="w-[30%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                {selectionMode && (
                  <th className="py-3 pl-4 pr-2 text-center w-8">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded-sm border-border/50 text-[#0f4c81] focus:ring-[#0f4c81] cursor-pointer"
                      checked={filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const n = new Set(selectedIds)
                          filtered.forEach(c => n.add(c.id))
                          setSelectedIds(n)
                        } else {
                          const n = new Set(selectedIds)
                          filtered.forEach(c => n.delete(c.id))
                          setSelectedIds(n)
                        }
                      }}
                    />
                  </th>
                )}
                <th className={`py-3 ${selectionMode ? 'px-2' : 'pl-5 pr-4'} text-left text-[10px] font-bold uppercase tracking-widest text-foreground`}><span className="inline-flex items-center gap-1"><Hash className="size-3" />FOLIO</span></th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold tracking-widest text-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity" onClick={() => toggleSort("beneficiario")}>
                    <User className="size-3" />PACIENTE <SortIndicator field="beneficiario" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold tracking-widest text-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity" onClick={() => toggleSort("especialista")}>
                    <Stethoscope className="size-3" />DOCTOR <SortIndicator field="especialista" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 px-2 text-left text-[10px] font-bold tracking-widest text-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity" onClick={() => toggleSort("fecha")}>
                    <CalendarIcon className="size-3" />FECHA <SortIndicator field="fecha" current={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2.5 pl-2 pr-5 text-left text-[10px] font-bold tracking-widest text-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity" onClick={() => toggleSort("estatus")}>
                    <CheckCircle2 className="size-3" />ESTATUS <SortIndicator field="estatus" current={sortField} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 bg-card">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-xs text-muted-foreground">
                    No se encontraron citas con esos criterios.
                  </td>
                </tr>
              ) : (
                filtered.map((cita) => {
                  const diagnosisKey = cita.beneficiario?.toLowerCase() ?? ""
                  const diagnosis = benefMap.get(diagnosisKey)
                  return (
                  <tr key={cita.id} 
                    onClick={() => {
                      if (!selectionMode) return
                      const n = new Set(selectedIds)
                      if (n.has(cita.id)) n.delete(cita.id)
                      else n.add(cita.id)
                      setSelectedIds(n)
                    }}
                    className={`group transition-colors hover:bg-muted/30 ${selectionMode ? "cursor-pointer" : ""} ${selectedIds.has(cita.id) ? "bg-[#0f4c81]/5 dark:bg-[#0f4c81]/20" : ""}`}>
                    {selectionMode && (
                      <td className="py-3.5 pl-4 pr-2 text-center w-8">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded-sm border-border/50 text-[#0f4c81] focus:ring-[#0f4c81] cursor-pointer"
                          checked={selectedIds.has(cita.id)}
                          readOnly
                        />
                      </td>
                    )}
                    <td className={`py-3.5 ${selectionMode ? 'px-2' : 'pl-5 pr-4'}`}>
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
                      <td className="py-3 pl-2 pr-5">
                        <div className="flex items-center justify-between">
                          <StatusPill status={cita.estatus} />
                        </div>
                      </td>
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

      <AlertDialog open={deleteConfirmId !== null || bulkConfirm !== null} onOpenChange={(o) => { if (!o) { setDeleteConfirmId(null); setBulkConfirm(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === "delete" ? "¿Eliminar citas permanentemente?" :
               bulkConfirm === "cancel" ? "¿Cancelar citas seleccionadas?" :
               bulkConfirm === "complete" ? "¿Completar citas seleccionadas?" :
               "¿Eliminar cita permanentemente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm === "delete" ? "Al confirmar, tendrás 10 segundos para deshacer esta acción antes de que las citas se eliminen de forma permanente y definitiva del sistema." :
               bulkConfirm === "cancel" ? "¿Estás seguro que deseas cancelar las citas seleccionadas?" :
               bulkConfirm === "complete" ? "¿Estás seguro que deseas marcar como completadas las citas seleccionadas?" :
               "Al confirmar, tendrás 10 segundos para deshacer esta acción antes de que se elimine de forma permanente y definitiva del sistema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                if (deleteConfirmId !== null) {
                  handleDelete(deleteConfirmId)
                } else if (bulkConfirm !== null) {
                  const action = bulkConfirm
                  setBulkConfirm(null)
                  if (action === "delete") handleBulkDelete()
                  else if (action === "cancel") handleBulkCancel()
                  else if (action === "complete") handleBulkComplete()
                }
              }}
              className={bulkConfirm === "delete" || deleteConfirmId !== null ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700" : ""}
            >
              {bulkConfirm === "delete" || deleteConfirmId !== null ? "Eliminar" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Barra de acción masiva */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 h-0 w-full overflow-visible pointer-events-none">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-max z-50 flex items-center gap-4 rounded-full border border-border/40 bg-background/95 px-6 py-3 shadow-xl backdrop-blur-md pointer-events-auto">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <div className="flex items-center gap-2 border-l border-border/50 pl-4">
            {canCancelSelected && (
              <button
                onClick={() => setBulkConfirm("cancel")}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-colors"
              >
                <XCircle className="size-3.5" />
                Cancelar
              </button>
            )}
            {canCompleteSelected && (
              <button
                onClick={() => setBulkConfirm("complete")}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <CheckCircle className="size-3.5" />
                Completar
              </button>
            )}
            <button
              onClick={() => {
                if (selectedIds.size === 1) {
                  setDeleteConfirmId(selectedIds.values().next().value ?? null)
                } else {
                  setBulkConfirm("delete")
                }
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors ml-1"
            >
              <X className="size-4" />
            </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
