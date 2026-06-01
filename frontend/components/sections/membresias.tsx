"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import {
  Search, CreditCard, Building2, RefreshCw,
  Users, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Plus,
  Banknote, History, Hash, MapPin, Clock, DollarSign, FileText,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import {
  getPagosRecientes, registrarPago, syncEstados,
  type PagoReciente,
} from "@/services/membresias"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"

const NAVY  = "#0f4c81"
const AMBER = "#E8B043"
const PAGOS_RECIENTES_LIMIT = 20

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMembresiaEstatus(b: Beneficiario): "Activa" | "Inactiva" | "Cancelada" {
  if (b.estatus === "Activo") return "Activa"
  if (b.estatus === "Inactivo") return "Inactiva"
  return "Cancelada"
}

function sortByDiasRestantes(list: Beneficiario[], dir: "asc" | "desc"): Beneficiario[] {
  return [...list].sort((a, b) => {
    const da = a.diasRestantes ?? Infinity
    const db = b.diasRestantes ?? Infinity
    return dir === "asc" ? da - db : db - da
  })
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
  } catch { return iso }
}

function formatMonto(v: number | null | undefined): string {
  if (v == null) return "—"
  return `$${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
}

function labelMetodo(m: string | null | undefined): string {
  if (m === "efectivo")      return "Efectivo"
  if (m === "transferencia") return "Transferencia"
  if (m === "tarjeta")       return "Tarjeta"
  return "—"
}

function diasBadge(dias: number | null | undefined) {
  if (dias == null) return { text: "Sin membresía", cls: "text-slate-400 dark:text-slate-500" }
  if (dias > 30)   return { text: `${dias} días`,   cls: "text-emerald-600 dark:text-emerald-400" }
  if (dias >= 0)   return { text: `${dias} días`,   cls: "text-amber-600 dark:text-amber-400" }
  return { text: `Vencida ${Math.abs(dias)}d`,       cls: "text-red-600 dark:text-red-400" }
}

function estatusBadge(estatus: "Activa" | "Inactiva" | "Cancelada") {
  if (estatus === "Activa")   return { dot: "bg-emerald-500", cls: "text-emerald-700 dark:text-emerald-400" }
  if (estatus === "Inactiva") return { dot: "bg-amber-500",   cls: "text-amber-700 dark:text-amber-400" }
  return { dot: "bg-slate-400", cls: "text-slate-500 dark:text-slate-400" }
}

// ─── Dialog de membresía ─────────────────────────────────────────────────────

type MetodoPago = "efectivo" | "transferencia" | "tarjeta"

function PagoDialog({ open, beneficiario, onClose, onSuccess }: {
  open: boolean; beneficiario: Beneficiario | null
  onClose: () => void; onSuccess: () => void
}) {
  const [meses, setMeses]           = useState(1)
  const [monto, setMonto]           = useState("")
  const [metodoPago, setMetodoPago] = useState<MetodoPago | "">("")
  const [observaciones, setObs]     = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (open) { setMeses(1); setMonto(""); setMetodoPago(""); setObs(""); setError(null) }
  }, [open])

  const handleConfirm = async () => {
    if (!beneficiario) return
    const montoNum = parseFloat(monto)
    if (monto.trim() === "" || isNaN(montoNum) || montoNum < 0) {
      setError("Ingresa un monto válido (puede ser $0 para donativos)")
      return
    }
    if (!metodoPago) {
      setError("Selecciona el método de pago")
      return
    }
    if (!observaciones.trim()) {
      setError("Las observaciones son obligatorias")
      return
    }
    setLoading(true); setError(null)
    try {
      await registrarPago({
        curp: beneficiario.curp ?? beneficiario.folio,
        meses,
        monto: montoNum,
        metodo_pago: metodoPago,
        observaciones: observaciones.trim(),
      })
      toast.success("Membresía registrada correctamente", {
        description: `${meses} ${meses === 1 ? "mes" : "meses"} · $${montoNum.toLocaleString("es-MX", { minimumFractionDigits: 2 })} · ${metodoPago}`,
      })
      onSuccess(); onClose()
    } catch (e: unknown) {
      const msg = friendlyError(e, "No se pudo registrar la membresía")
      setError(msg)
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const nombre = beneficiario ? `${beneficiario.nombres} ${beneficiario.apellidoPaterno}` : ""

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Registrar membresía</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-foreground">{nombre}</span>
            {" · "}{beneficiario?.curp ?? beneficiario?.folio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Meses */}
          <div>
            <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Meses de vigencia
            </Label>
            <div className="flex items-center overflow-hidden rounded-lg border border-border w-fit">
              <button type="button" onClick={() => setMeses(m => Math.max(1, m - 1))} disabled={meses <= 1}
                className="flex size-10 items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">−</button>
              <span className="min-w-[6rem] px-2 text-center text-sm font-semibold tabular-nums">
                {meses} {meses === 1 ? "mes" : "meses"}
              </span>
              <button type="button" onClick={() => setMeses(m => Math.min(12, m + 1))} disabled={meses >= 12}
                className="flex size-10 items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">+</button>
            </div>
          </div>

          {/* Monto + Método de pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Monto <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className="h-10 pl-6 text-sm"
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Método de pago <span className="text-red-500">*</span>
              </Label>
              <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Observaciones <span className="text-red-500">*</span>
            </Label>
            <Input className="h-10 text-sm" placeholder="Ej. Alta inicial, renovación anual, donativo…" value={observaciones} onChange={(e) => setObs(e.target.value)} />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm} disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {loading ? "Registrando..." : "Confirmar membresía"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog selector: beneficiarios sin membresía ────────────────────────────

function NuevaMembresiaDialog({ open, sinMembresia, onSelect, onClose }: {
  open: boolean
  sinMembresia: Beneficiario[]
  onSelect: (b: Beneficiario) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")

  useEffect(() => { if (open) setSearch("") }, [open])

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

  const filtrados = sinMembresia.filter(b => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`
    const t = norm(search)
    return norm(nombre).includes(t) || norm(b.curp ?? b.folio ?? "").includes(t)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Nueva membresía</DialogTitle>
          <DialogDescription className="text-xs">
            Selecciona el beneficiario al que deseas registrarle una membresía
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar nombre o CURP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border/40 rounded-lg border border-border/70">
          {filtrados.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {sinMembresia.length === 0
                ? "Todos los beneficiarios ya tienen membresía activa"
                : "No se encontraron resultados"}
            </p>
          ) : (
            filtrados.map(b => {
              const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`.trim()
              return (
                <button
                  key={b.curp ?? b.folio}
                  type="button"
                  onClick={() => onSelect(b)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {nombre[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{b.curp ?? b.folio}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MembresiasSection() {
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<Beneficiario[]>([])
  const [pagos, setPagos]         = useState<PagoReciente[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc")
  const [showPagoDialog, setShowPagoDialog]   = useState(false)
  const [selectedBenef, setSelectedBenef]     = useState<Beneficiario | null>(null)
  const [showNuevaDialog, setShowNuevaDialog] = useState(false)
  const [activeTab, setActiveTab]             = useState<"membresias" | "historial">("membresias")

  const cargarDatos = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await syncEstados().catch(() => {})
      const [benef, pagosData] = await Promise.all([getBeneficiarios(), getPagosRecientes()])
      setTodosBeneficiarios(benef)
      setPagos(pagosData)
    } catch (err: unknown) {
      setError(friendlyError(err, "No se pudo cargar la información de membresías"))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const beneficiarios  = todosBeneficiarios.filter(b => b.estatus !== "Baja")
  const sinMembresia   = beneficiarios.filter(b => b.diasRestantes == null)
  const filtered = beneficiarios.filter(b => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.toLowerCase()
    const folio  = (b.curp ?? b.folio ?? "").toLowerCase()
    return nombre.includes(searchTerm.toLowerCase()) || folio.includes(searchTerm.toLowerCase())
  })
  const ordenados = sortByDiasRestantes(filtered, sortDir)

  const conteos  = conteosEstatusBeneficiarios(todosBeneficiarios)
  const totalPagadoMes = pagos.reduce((s, p) => {
    const iso = p.ultimoPago ?? p.fechaEmision ?? ""
    const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    return iso.startsWith(mes) ? s + (Number(p.monto) || 0) : s
  }, 0)

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando membresías...</p>
    </div>
  )
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Membresías</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Control de pagos y renovaciones de membresías
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargarDatos}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
            <RefreshCw className="size-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => setShowNuevaDialog(true)}
            disabled={sinMembresia.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-3.5" />
            Nueva membresía
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("membresias")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "membresias"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" />
          Membresías
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "historial"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <History className="size-3.5" />
          Historial de pagos
        </button>
      </div>

      {/* KPIs — solo en tab Membresías */}
      {activeTab === "membresias" && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Activas",         value: conteos.Activo,   icon: Users,         color: "#10b981" },
          { label: "Inactivas",       value: conteos.Inactivo, icon: AlertTriangle, color: AMBER     },
          { label: "Total registros", value: conteos.Todos,    icon: Users,         color: NAVY      },
          { label: "Cobrado este mes",
            value: `$${totalPagadoMes.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`,
            icon: TrendingUp, color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
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

      {/* ── Tab: Membresías ── */}
      {activeTab === "membresias" && (
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Control de membresías</p>
            <p className="text-[11px] text-muted-foreground">{ordenados.length} registros · ordenados por vencimiento</p>
          </div>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar nombre o CURP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Hash className="size-3" />CURP</span></th>
                <th className="py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Users className="size-3" />NOMBRE</span></th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground md:table-cell"><span className="inline-flex items-center gap-1"><MapPin className="size-3" />CIUDAD</span></th>
                <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><AlertTriangle className="size-3" />ESTATUS</span></th>
                <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground">
                  <button className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
                    <Clock className="size-3" />TIEMPO RESTANTE
                    {sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </th>
                <th className="py-2.5 pr-5 text-right text-[10px] font-bold tracking-widest text-foreground">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {ordenados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    No se encontraron resultados.
                  </td>
                </tr>
              ) : (
                ordenados.map((b) => {
                  const nombre   = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`.trim()
                  const folio    = b.curp ?? b.folio ?? "—"
                  const dias     = diasBadge(b.diasRestantes)
                  const estatusStyle = {
                    Activo:   { dot: "bg-emerald-500", cls: "text-emerald-700 dark:text-emerald-400" },
                    Inactivo: { dot: "bg-amber-500",   cls: "text-amber-700 dark:text-amber-400"     },
                    Baja:     { dot: "bg-red-500",     cls: "text-red-600 dark:text-red-400"         },
                  }[b.estatus] ?? { dot: "bg-slate-400", cls: "text-slate-500 dark:text-slate-400" }

                  return (
                    <tr key={folio} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 pl-5 font-mono text-[11px] text-foreground">{folio}</td>
                      <td className="py-3 text-xs font-medium text-foreground">{nombre}</td>
                      <td className="hidden py-3 text-xs text-foreground md:table-cell">{b.ciudad ?? "—"}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${estatusStyle.cls}`}>
                          <span className={`size-1.5 rounded-full ${estatusStyle.dot}`} />
                          {b.estatus}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs font-semibold tabular-nums ${dias.cls}`}>
                          {dias.text}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-right">
                        {b.estatus !== "Baja" && b.diasRestantes != null && (
                          <button
                            onClick={() => { setSelectedBenef(b); setShowPagoDialog(true) }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: NAVY }}
                          >
                            <CreditCard className="size-3.5" />
                            Renovar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── Tab: Historial de pagos ── */}
      {activeTab === "historial" && (
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Historial de pagos</p>
          <p className="text-[11px] text-muted-foreground">
            {pagos.length === 0
              ? "Sin movimientos en los últimos 30 días"
              : `${pagos.length} movimiento${pagos.length !== 1 ? "s" : ""} en los últimos 30 días`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold tracking-widest text-foreground w-[12%]"><span className="inline-flex items-center gap-1"><Clock className="size-3" />FECHA</span></th>
                <th className="py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground w-[20%]"><span className="inline-flex items-center gap-1"><Users className="size-3" />BENEFICIARIO</span></th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground sm:table-cell w-[18%]"><span className="inline-flex items-center gap-1"><History className="size-3" />PERÍODO</span></th>
                <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground w-[10%]"><span className="inline-flex items-center gap-1"><DollarSign className="size-3" />MONTO</span></th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground md:table-cell w-[13%]"><span className="inline-flex items-center gap-1"><CreditCard className="size-3" />MÉTODO</span></th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground lg:table-cell w-[27%]"><span className="inline-flex items-center gap-1"><FileText className="size-3" />OBSERVACIONES</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">No hay pagos registrados en los últimos 30 días.</td>
                </tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.idCredencial} className="transition-colors hover:bg-muted/20">
                    <td className="py-3 pl-5 text-xs text-foreground">{formatFecha(p.ultimoPago ?? p.fechaEmision)}</td>
                    <td className="py-3 text-xs font-medium text-foreground">{p.nombre}</td>
                    <td className="hidden py-3 text-center text-[11px] text-foreground sm:table-cell">
                      {formatFecha(p.fechaInicio)} – {formatFecha(p.vigencia)}
                    </td>
                    <td className="py-3 text-center text-xs font-bold text-foreground">{formatMonto(p.monto)}</td>
                    <td className="hidden py-3 text-center text-xs text-foreground md:table-cell">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        {p.metodoPago === "efectivo"      && <Banknote  className="size-3.5 text-emerald-600" />}
                        {p.metodoPago === "transferencia" && <Building2 className="size-3.5" style={{ color: NAVY }} />}
                        {p.metodoPago === "tarjeta"       && <CreditCard className="size-3.5" style={{ color: AMBER }} />}
                        {labelMetodo(p.metodoPago)}
                      </span>
                    </td>
                    <td className="hidden py-3 pr-5 text-xs text-muted-foreground lg:table-cell">
                      {p.observaciones ?? <span className="italic opacity-50">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <NuevaMembresiaDialog
        open={showNuevaDialog}
        sinMembresia={sinMembresia}
        onSelect={(b) => { setShowNuevaDialog(false); setSelectedBenef(b); setShowPagoDialog(true) }}
        onClose={() => setShowNuevaDialog(false)}
      />

      <PagoDialog
        open={showPagoDialog}
        beneficiario={selectedBenef}
        onClose={() => setShowPagoDialog(false)}
        onSuccess={cargarDatos}
      />
    </div>
  )
}
