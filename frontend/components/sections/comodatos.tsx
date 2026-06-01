"use client"

import { useEffect, useRef, useState } from "react"
import {
  Package, Plus, CreditCard, CheckCircle2, XCircle,
  Search, RefreshCw, ChevronDown, FileText, AlertCircle,
  Hash, User, DollarSign, Banknote, Gift, Tag,
  ArrowUpDown, ChevronUp, Check, ChevronsUpDown,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"

import {
  getComodatos, crearComodato, registrarPago, cancelarComodato,
  getReporteExenciones, getComodatoById,
  type Comodato, type ComodatoDetalle, type ExencionReporte,
} from "@/services/comodatos"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import { getInventario, type ArticuloInventario } from "@/services/inventario"

const NAVY = "#0f4c81"

type Tab = "lista" | "reporte"

function badge(estatus: string) {
  switch (estatus) {
    case "Activo":    return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
    case "Pagado":    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
    case "Cancelado": return "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
    default:          return "border-border/70 bg-muted text-muted-foreground"
  }
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return `$${Number(n).toFixed(2)}`
}

// ── Formulario Alta Comodato ──────────────────────────────────────────────────
function AltaComodatoDialog({
  open, onClose, onCreated,
  beneficiarios, articulos,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  beneficiarios: Beneficiario[]
  articulos: ArticuloInventario[]
}) {
  const [curp, setCurp]               = useState("")
  const [busqueda, setBusqueda]       = useState("")
  const [showSug, setShowSug]         = useState(false)
  const inputRef                      = useRef<HTMLInputElement>(null)
  const [idArticulo, setIdArticulo]   = useState("")
  const [equipoOpen, setEquipoOpen]   = useState(false)
  const [montoTotal, setMontoTotal]   = useState("")
  const [esGratis, setEsGratis]       = useState(false)
  const [notas, setNotas]             = useState("")
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const activos = beneficiarios.filter(b => b.estatus === "Activo")
  const busqNorm = busqueda.trim().toLowerCase()
  const sugerencias = busqNorm
    ? activos.filter(b => {
        const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`.trim().toLowerCase()
        return nombre.startsWith(busqNorm) || (b.curp ?? "").toLowerCase().startsWith(busqNorm)
      }).slice(0, 8)
    : []

  function seleccionar(b: Beneficiario) {
    setCurp(b.curp ?? "")
    setBusqueda(`${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`.replace(/\s+/g, " ").trim())
    setShowSug(false)
  }

  const reset = () => { setCurp(""); setBusqueda(""); setShowSug(false); setIdArticulo(""); setMontoTotal(""); setEsGratis(false); setNotas(""); setError(null) }
  const handleClose = () => { reset(); onClose() }

  async function handleSubmit() {
    if (!curp || !idArticulo) { setError("Selecciona un beneficiario y un artículo"); return }
    if (!esGratis && (!montoTotal || Number(montoTotal) <= 0)) {
      setError("Ingresa el monto de recuperación o marca como donación total"); return
    }
    setSaving(true); setError(null)
    try {
      await crearComodato({
        curp,
        idArticulo: Number(idArticulo),
        montoTotal: esGratis ? null : Number(montoTotal),
        notas: notas || undefined,
      })
      toast.success("Comodato registrado exitosamente")
      reset(); onCreated()
    } catch (e) {
      setError(friendlyError(e, "No se pudo registrar el comodato"))
    } finally { setSaving(false) }
  }

  const normalize = (v: string | number) => String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const articulosFiltrados = articulos.filter(a => !a.idCategoria || a.idCategoria === 4)
  const equipoLabel = idArticulo ? (articulosFiltrados.find(a => String(a.clave) === idArticulo)?.descripcion ?? "Seleccionar equipo...") : "Seleccionar equipo..."

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar comodato</DialogTitle>
          <DialogDescription>
            Financiamiento de equipo médico. El beneficiario conserva el equipo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Beneficiario */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Beneficiario</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por nombre o CURP..."
                value={busqueda}
                autoComplete="off"
                onChange={e => { setBusqueda(e.target.value); setCurp(""); setShowSug(true) }}
                onFocus={() => { if (busqueda) setShowSug(true) }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              />
              {showSug && sugerencias.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border/70 bg-background shadow-md overflow-hidden">
                  {sugerencias.map(b => (
                    <li
                      key={b.curp}
                      onMouseDown={() => seleccionar(b)}
                      className="flex items-center justify-between gap-4 cursor-pointer px-4 py-3 hover:bg-muted"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {b.nombres} {b.apellidoPaterno} {b.apellidoMaterno ?? ""}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{b.curp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Artículo */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Equipo médico</Label>
            <Popover open={equipoOpen} onOpenChange={setEquipoOpen}>
              <PopoverTrigger asChild>
                <button type="button" role="combobox"
                  className="flex h-9 w-full items-center justify-between rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground hover:bg-muted transition-colors">
                  <span className={cn("truncate text-left", !idArticulo && "text-muted-foreground")}>{equipoLabel}</span>
                  <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] max-h-[280px] p-0 overflow-hidden" align="start">
                <Command shouldFilter>
                  <CommandInput placeholder="Buscar equipo médico..." />
                  <CommandList className="max-h-[240px] overflow-y-auto">
                    <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                    <CommandGroup>
                      {articulosFiltrados.map(a => (
                        <CommandItem
                          key={String(a.clave)}
                          value={normalize(a.descripcion)}
                          keywords={[normalize(a.descripcion)]}
                          onSelect={() => { setIdArticulo(String(a.clave)); setEquipoOpen(false) }}
                        >
                          <Check className={cn("mr-2 size-4", idArticulo === String(a.clave) ? "opacity-100" : "opacity-0")} />
                          {a.descripcion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Monto */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cuota de recuperación</Label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={esGratis}
                value={montoTotal}
                onChange={e => setMontoTotal(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10 disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={esGratis}
                  onChange={e => setEsGratis(e.target.checked)}
                  className="size-3.5 rounded"
                />
                Donación total
              </label>
            </div>
          </div>

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notas (opcional)</Label>
            <textarea
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              placeholder="Observaciones del comodato..."
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleClose} className="rounded-lg border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {saving ? "Registrando..." : "Registrar comodato"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Formulario Registrar Pago ─────────────────────────────────────────────────
function PagoDialog({
  comodato, open, onClose, onPaid,
}: {
  comodato: Comodato | null
  open: boolean
  onClose: () => void
  onPaid: () => void
}) {
  const [monto, setMonto]       = useState("")
  const [esExento, setEsExento] = useState(false)
  const [notas, setNotas]       = useState("")
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const reset = () => { setMonto(""); setEsExento(false); setNotas(""); setError(null) }
  const handleClose = () => { reset(); onClose() }

  async function handleSubmit() {
    if (!comodato) return
    if (!monto || Number(monto) <= 0) { setError("El monto debe ser mayor a 0"); return }
    setSaving(true); setError(null)
    try {
      const res = await registrarPago(comodato.idComodato, {
        monto: Number(monto),
        esExento,
        notas: notas || undefined,
      })
      const msg = res.data.estatusResultante === "Pagado"
        ? "Pago registrado — comodato liquidado"
        : esExento ? "Exención registrada exitosamente" : "Pago registrado exitosamente"
      toast.success(msg)
      reset(); onPaid()
    } catch (e) {
      setError(friendlyError(e, "No se pudo registrar el pago"))
    } finally { setSaving(false) }
  }

  const pendiente = comodato?.montoTotal != null
    ? comodato.montoTotal - comodato.montoPagado - comodato.montoExento
    : null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago / exención</DialogTitle>
          {comodato && (
            <DialogDescription>
              {comodato.articulo ?? "Equipo"} · Pendiente: {fmt(pendiente)}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Monto</Label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-xs outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={esExento}
              onChange={e => setEsExento(e.target.checked)}
              className="size-3.5 rounded"
            />
            Este monto es una exención (monto perdonado por Lupita)
          </label>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notas (opcional)</Label>
            <textarea
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-xs outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              placeholder="Motivo del pago o exención..."
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleClose} className="rounded-lg border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: esExento ? "#6b7280" : NAVY }}
            >
              {saving ? "Registrando..." : esExento ? "Registrar exención" : "Registrar pago"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Sección principal ─────────────────────────────────────────────────────────
export function ComodatosSection() {
  const [comodatos, setComodatos]       = useState<Comodato[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [articulos, setArticulos]       = useState<ArticuloInventario[]>([])

  const [tab, setTab]                   = useState<Tab>("lista")
  const [search, setSearch]             = useState("")
  const [estatusFiltro, setEstatusFiltro] = useState<string>("todos")
  const [sortField, setSortField]       = useState<string>("idComodato")
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc")

  const [showAlta, setShowAlta]         = useState(false)
  const [pagandoComodato, setPagandoComodato] = useState<Comodato | null>(null)

  // Reporte exenciones
  const [fechaInicio, setFechaInicio]   = useState("")
  const [fechaFin, setFechaFin]         = useState("")
  const [reporte, setReporte]           = useState<ExencionReporte[]>([])
  const [loadingReporte, setLoadingReporte] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      getComodatos(),
      getBeneficiarios(),
      getInventario(),
    ])
      .then(([r, bens, arts]) => {
        setComodatos(r.data ?? [])
        setBeneficiarios(bens)
        setArticulos(arts)
      })
      .catch(e => setError(friendlyError(e, "No se pudo cargar los comodatos")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = comodatos.filter(c => {
    const matchSearch = !search ||
      (c.beneficiario ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.articulo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(c.idComodato).includes(search)
    const matchEstatus = estatusFiltro === "todos" || c.estatus === estatusFiltro
    return matchSearch && matchEstatus
  })

  function handleSort(field: string) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "idComodato":  return (a.idComodato - b.idComodato) * dir
      case "beneficiario": return (a.beneficiario ?? "").localeCompare(b.beneficiario ?? "") * dir
      case "equipo":      return (a.articulo ?? "").localeCompare(b.articulo ?? "") * dir
      case "total":       return ((a.montoTotal ?? 0) - (b.montoTotal ?? 0)) * dir
      case "pagado":      return (a.montoPagado - b.montoPagado) * dir
      case "exento":      return (a.montoExento - b.montoExento) * dir
      case "estatus":     return a.estatus.localeCompare(b.estatus) * dir
      default:            return 0
    }
  })

  function SortIcon({ f }: { f: string }) {
    if (sortField !== f) return <ArrowUpDown className="inline size-3 opacity-40" />
    return sortDir === "asc" ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />
  }

  const activos   = comodatos.filter(c => c.estatus === "Activo").length
  const pagados   = comodatos.filter(c => c.estatus === "Pagado").length
  const cancelados = comodatos.filter(c => c.estatus === "Cancelado").length

  async function handleBuscarReporte() {
    if (!fechaInicio || !fechaFin) { toast.error("Selecciona rango de fechas"); return }
    setLoadingReporte(true)
    try {
      const r = await getReporteExenciones(fechaInicio, fechaFin)
      setReporte(r.data ?? [])
    } catch (e) {
      toast.error(friendlyError(e, "No se pudo cargar el reporte"))
    } finally { setLoadingReporte(false) }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando comodatos...</p>
    </div>
  )
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Comodatos</h2>
          <p className="text-xs text-muted-foreground">Financiamiento de equipo médico por beneficiario</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
            <RefreshCw className="size-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => setShowAlta(true)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0f4c81" }}
          >
            <Plus className="size-4" />
            Nuevo comodato
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("lista")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-[180ms] border ${
            tab === "lista"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <Package className="size-3.5" />Lista
        </button>
        <button
          onClick={() => setTab("reporte")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-[180ms] border ${
            tab === "reporte"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />Reporte de exenciones
        </button>
      </div>

      {/* KPIs — solo en lista */}
      {tab === "lista" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total",      value: comodatos.length, color: NAVY,      icon: Package },
            { label: "Activos",    value: activos,          color: "#3b82f6", icon: CreditCard },
            { label: "Pagados",    value: pagados,          color: "#10b981", icon: CheckCircle2 },
            { label: "Cancelados", value: cancelados,       color: "#6b7280", icon: XCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{label}</span>
                <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="size-3.5" style={{ color }} />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Lista */}
      {tab === "lista" && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-foreground">
              {filtered.length} de {comodatos.length} comodatos
            </p>
            <div className="flex items-center gap-2">
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Beneficiario o equipo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                />
              </div>
              <Select value={estatusFiltro} onValueChange={setEstatusFiltro}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                  <SelectItem value="Activo" className="text-xs">Activos</SelectItem>
                  <SelectItem value="Pagado" className="text-xs">Pagados</SelectItem>
                  <SelectItem value="Cancelado" className="text-xs">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="py-2.5 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                    <button onClick={() => handleSort("idComodato")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <Hash className="size-3" />ID <SortIcon f="idComodato" />
                    </button>
                  </th>
                  <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                    <button onClick={() => handleSort("beneficiario")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <User className="size-3" />BENEFICIARIO <SortIcon f="beneficiario" />
                    </button>
                  </th>
                  <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                    <button onClick={() => handleSort("equipo")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <Package className="size-3" />EQUIPO <SortIcon f="equipo" />
                    </button>
                  </th>
                  <th className="hidden py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                    <button onClick={() => handleSort("total")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <DollarSign className="size-3" />TOTAL <SortIcon f="total" />
                    </button>
                  </th>
                  <th className="hidden py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                    <button onClick={() => handleSort("pagado")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <Banknote className="size-3" />PAGADO <SortIcon f="pagado" />
                    </button>
                  </th>
                  <th className="hidden py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                    <button onClick={() => handleSort("exento")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <Gift className="size-3" />EXENTO <SortIcon f="exento" />
                    </button>
                  </th>
                  <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                    <button onClick={() => handleSort("estatus")} className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                      <Tag className="size-3" />ESTATUS <SortIcon f="estatus" />
                    </button>
                  </th>
                  <th className="py-2.5 pr-5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                      No se encontraron comodatos.
                    </td>
                  </tr>
                ) : sorted.map(c => (
                  <tr key={c.idComodato} className="transition-colors hover:bg-muted/20">
                    <td className="py-3 pl-5 pr-3 font-mono text-[11px] text-foreground">{c.idComodato}</td>
                    <td className="py-3 max-w-[12rem]">
                      <p className="truncate text-xs font-medium text-foreground">{c.beneficiario ?? c.curp}</p>
                      <p className="text-[10px] text-muted-foreground md:hidden">{c.articulo}</p>
                    </td>
                    <td className="hidden py-3 max-w-[12rem] md:table-cell">
                      <p className="truncate text-xs text-foreground">{c.articulo}</p>
                    </td>
                    <td className="hidden py-3 pr-4 text-right text-xs tabular-nums text-foreground lg:table-cell">{fmt(c.montoTotal)}</td>
                    <td className="hidden py-3 pr-4 text-right text-xs tabular-nums text-emerald-700 dark:text-emerald-400 lg:table-cell">{fmt(c.montoPagado)}</td>
                    <td className="hidden py-3 pr-4 text-right text-xs tabular-nums text-amber-700 dark:text-amber-400 lg:table-cell">{fmt(c.montoExento)}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge(c.estatus)}`}>
                        {c.estatus}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-center">
                      {c.estatus === "Activo" && (
                        <button
                          onClick={() => setPagandoComodato(c)}
                          className="rounded-lg border border-[#0f4c81]/30 bg-[#0f4c81]/5 px-2.5 py-1.5 text-[10px] font-semibold text-[#0f4c81] transition-colors hover:bg-[#0f4c81]/10 dark:text-blue-400"
                        >
                          Pagar / Exentar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Reporte de exenciones */}
      {tab === "reporte" && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Reporte de exenciones</p>
              <p className="text-[11px] text-muted-foreground">Montos perdonados por período — informe para gobierno</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs outline-none focus:border-[#0f4c81]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs outline-none focus:border-[#0f4c81]"
                />
              </div>
              <button
                onClick={handleBuscarReporte}
                disabled={loadingReporte}
                className="mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                {loadingReporte ? "Buscando..." : "Generar reporte"}
              </button>
            </div>
          </div>

          {reporte.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {fechaInicio ? "Sin exenciones en el período seleccionado." : "Selecciona un rango de fechas para generar el reporte."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Beneficiario</th>
                    <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Equipo</th>
                    <th className="py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">Total exento</th>
                    <th className="py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">No. exenciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {reporte.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-3 pl-5 text-xs font-medium text-foreground">{r.beneficiario}</td>
                      <td className="py-3 text-xs text-foreground">{r.equipo}</td>
                      <td className="py-3 pr-4 text-right text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">{fmt(r.totalExento)}</td>
                      <td className="py-3 pr-5 text-right text-xs tabular-nums text-foreground">{r.numExenciones}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border/60 bg-muted/10">
                    <td colSpan={2} className="py-3 pl-5 text-xs font-bold text-foreground">Total</td>
                    <td className="py-3 pr-4 text-right text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
                      {fmt(reporte.reduce((s, r) => s + r.totalExento, 0))}
                    </td>
                    <td className="py-3 pr-5 text-right text-xs font-bold tabular-nums text-foreground">
                      {reporte.reduce((s, r) => s + r.numExenciones, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AltaComodatoDialog
        open={showAlta}
        onClose={() => setShowAlta(false)}
        onCreated={() => { setShowAlta(false); loadData() }}
        beneficiarios={beneficiarios}
        articulos={articulos}
      />
      <PagoDialog
        comodato={pagandoComodato}
        open={!!pagandoComodato}
        onClose={() => setPagandoComodato(null)}
        onPaid={() => { setPagandoComodato(null); loadData() }}
      />
    </div>
  )
}
