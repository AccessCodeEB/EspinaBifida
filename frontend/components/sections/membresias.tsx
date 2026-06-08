"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import {
  Search, CreditCard, Building2, RefreshCw,
  Users, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Plus,
  Banknote, History, Hash, MapPin, Clock, DollarSign, FileText, Settings2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import {
  getPagosRecientes, registrarPago, syncEstados,
  MONTO_NUEVO_INGRESO, MONTO_REINSCRIPCION, type PagoReciente,
} from "@/services/membresias"
import { getConfiguracion, updateConfiguracion } from "@/services/configuracion"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"
import { useAuth } from "@/hooks/useAuth"

const NAVY  = "#0f4c81"
const AMBER = "#E8B043"

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

type MetodoPago = "efectivo" | "transferencia"

function PagoDialog({ open, beneficiario, onClose, onSuccess, precioNuevo, precioReinsc }: {
  open: boolean; beneficiario: Beneficiario | null
  onClose: () => void; onSuccess: () => void
  precioNuevo: number; precioReinsc: number
}) {
  // Tipo auto-detectado: sin membresía previa → nuevo ingreso, con historial → re-inscripción
  const esNuevo   = beneficiario?.membresiaEstatus === "Sin membresia"
  const tipoLabel = esNuevo ? "Nuevo ingreso" : "Re-inscripción"
  const montoBase = esNuevo ? precioNuevo : precioReinsc

  const [anios, setAnios]           = useState(1)
  const [metodoPago, setMetodoPago] = useState<MetodoPago | "">("")
  const [observaciones, setObs]     = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const montoTotal = anios * montoBase

  useEffect(() => {
    if (open) {
      setAnios(1)
      setMetodoPago("")
      setObs("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!beneficiario) return
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
        anios,
        metodo_pago: metodoPago,
        observaciones: observaciones.trim(),
      })
      toast.success("Membresía registrada correctamente", {
        description: `${tipoLabel} · ${anios} año${anios > 1 ? "s" : ""} · $${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} · ${labelMetodo(metodoPago)}`,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Registrar membresía anual</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-foreground">{nombre}</span>
            {" · "}{beneficiario?.curp ?? beneficiario?.folio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Tipo auto-detectado + Años + Monto calculado (solo lectura) */}
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{tipoLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                ${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Años a renovar + Método de pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Años a renovar
              </Label>
              <div className="flex h-10 items-center rounded-lg border border-input bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAnios(a => Math.max(1, a - 1))}
                  disabled={anios <= 1}
                  className="flex h-full w-9 items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold">
                  {anios} año{anios > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setAnios(a => a + 1)}
                  className="flex h-full w-9 items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  +
                </button>
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
              {loading ? "Registrando..." : `Confirmar · $${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`}
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
  const { session } = useAuth()
  const esAdmin = session?.idRol === 1

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

  // Tarifas vigentes
  const [precioNuevo, setPrecioNuevo]     = useState<number>(MONTO_NUEVO_INGRESO)
  const [precioReinsc, setPrecioReinsc]   = useState<number>(MONTO_REINSCRIPCION)
  const [showTarifaDialog, setShowTarifaDialog] = useState(false)
  const [editandoClave, setEditandoClave] = useState<"PRECIO_MEMBRESIA_NUEVO_INGRESO" | "PRECIO_MEMBRESIA_REINSCRIPCION" | null>(null)
  const [nuevoValorInput, setNuevoValorInput] = useState("")
  const [confirmandoTarifa, setConfirmandoTarifa] = useState(false)
  const [savingTarifa, setSavingTarifa]   = useState(false)
  const [tarifaError, setTarifaError]     = useState<string | null>(null)

  const precioActualEditar = editandoClave === "PRECIO_MEMBRESIA_REINSCRIPCION" ? precioReinsc : precioNuevo
  const labelEditar = editandoClave === "PRECIO_MEMBRESIA_REINSCRIPCION" ? "Re-inscripción" : "Nuevo ingreso"

  function abrirEditorTarifa(clave: "PRECIO_MEMBRESIA_NUEVO_INGRESO" | "PRECIO_MEMBRESIA_REINSCRIPCION") {
    setEditandoClave(clave)
    setNuevoValorInput(String(clave === "PRECIO_MEMBRESIA_REINSCRIPCION" ? precioReinsc : precioNuevo))
    setTarifaError(null)
    setConfirmandoTarifa(false)
    setShowTarifaDialog(true)
  }

  function pedirConfirmacionTarifa() {
    const val = parseFloat(nuevoValorInput)
    if (isNaN(val) || val <= 0) {
      setTarifaError("Ingresa un monto válido mayor a $0")
      return
    }
    setTarifaError(null)
    setShowTarifaDialog(false)
    setConfirmandoTarifa(true)
  }

  async function ejecutarCambioTarifa() {
    if (!editandoClave) return
    const val = parseFloat(nuevoValorInput)
    setSavingTarifa(true); setTarifaError(null)
    try {
      await updateConfiguracion(editandoClave, val)
      if (editandoClave === "PRECIO_MEMBRESIA_NUEVO_INGRESO") setPrecioNuevo(val)
      else setPrecioReinsc(val)
      toast.success(`Tarifa de ${labelEditar} actualizada a $${val.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`)
      setShowTarifaDialog(false)
      setConfirmandoTarifa(false)
    } catch (e: unknown) {
      setTarifaError(friendlyError(e, "No se pudo actualizar la tarifa"))
      setConfirmandoTarifa(false)
    } finally { setSavingTarifa(false) }
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await syncEstados().catch(() => {})
      const [benef, pagosData, config] = await Promise.all([
        getBeneficiarios(),
        getPagosRecientes(),
        getConfiguracion().catch(() => ({} as Record<string, string>)),
      ])
      setTodosBeneficiarios(benef)
      setPagos(pagosData)
      const n = Number(config.PRECIO_MEMBRESIA_NUEVO_INGRESO)
      const r = Number(config.PRECIO_MEMBRESIA_REINSCRIPCION)
      if (!isNaN(n) && n > 0) setPrecioNuevo(n)
      if (!isNaN(r) && r > 0) setPrecioReinsc(r)
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
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
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
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Membresías</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Membresía anual · Nuevo ingreso ${precioNuevo.toLocaleString("es-MX")} · Re-inscripción ${precioReinsc.toLocaleString("es-MX")}
        </p>
      </div>

      {/* Tabs + Botones en la misma fila */}
      <div className="flex items-center justify-between gap-2">
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
        <div className="flex items-center gap-2">
          <button onClick={cargarDatos}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
            <RefreshCw className="size-3.5" />
            Actualizar
          </button>
          {esAdmin && (
            <button
              onClick={() => abrirEditorTarifa("PRECIO_MEMBRESIA_NUEVO_INGRESO")}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="size-3.5" />
              Tarifas
            </button>
          )}
          <button
            onClick={() => setShowNuevaDialog(true)}
            disabled={sinMembresia.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-3.5" />
            Nueva membresía
          </button>
        </div>
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

      {/* Dialog edición de tarifa */}
      <Dialog open={showTarifaDialog} onOpenChange={(v) => { if (!v) setShowTarifaDialog(false) }}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          {/* Header navy con título adentro */}
          <div className="relative flex h-14 items-center gap-3 rounded-t-2xl px-6" style={{ backgroundColor: NAVY }}>
            <div className="absolute inset-0 rounded-t-2xl opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <div className="relative z-10">
              <DialogTitle className="text-base font-bold text-white">Cambiar tarifa</DialogTitle>
              <DialogDescription className="text-[11px] text-white/70">
                {labelEditar} · precio actual: ${precioActualEditar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-2">
              {(["PRECIO_MEMBRESIA_NUEVO_INGRESO", "PRECIO_MEMBRESIA_REINSCRIPCION"] as const).map((clave) => {
                const label = clave === "PRECIO_MEMBRESIA_NUEVO_INGRESO" ? "Nuevo ingreso" : "Re-inscripción"
                const precio = clave === "PRECIO_MEMBRESIA_NUEVO_INGRESO" ? precioNuevo : precioReinsc
                const activa = editandoClave === clave
                return (
                  <button key={clave}
                    onClick={() => { setEditandoClave(clave); setNuevoValorInput(String(precio)); setTarifaError(null) }}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${activa ? "border-[#0f4c81] bg-[#0f4c81]/8 ring-1 ring-[#0f4c81]/20" : "border-border/70 bg-muted/20 hover:border-[#0f4c81]/40"}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    <span className="text-lg font-bold tabular-nums text-foreground">${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nuevo precio — {labelEditar}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                <Input
                  type="number" min="1" step="0.01"
                  className="pl-7 text-lg font-bold tabular-nums"
                  placeholder="0.00"
                  value={nuevoValorInput}
                  onChange={e => { setNuevoValorInput(e.target.value); setTarifaError(null) }}
                  onKeyDown={e => e.key === "Enter" && pedirConfirmacionTarifa()}
                />
              </div>
              {tarifaError && <p className="text-[11px] text-red-600 dark:text-red-400">{tarifaError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowTarifaDialog(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={pedirConfirmacionTarifa}
                style={{ backgroundColor: NAVY }} className="text-white hover:opacity-90">
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmación */}
      <AlertDialog open={confirmandoTarifa} onOpenChange={(v) => { if (!v && !savingTarifa) setConfirmandoTarifa(false) }}>
        <AlertDialogContent className="w-72 max-w-[90vw]">
          <AlertDialogHeader className="items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold">¿Deseas cambiar el precio?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground">{labelEditar}</AlertDialogDescription>
            <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-muted/30 py-4">
              <span className="text-sm font-bold tabular-nums text-muted-foreground line-through">
                ${precioActualEditar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-muted-foreground/50">→</span>
              <span className="text-base font-bold tabular-nums text-foreground">
                ${parseFloat(nuevoValorInput || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </AlertDialogHeader>
          {tarifaError && <p className="text-center text-[11px] text-red-600 dark:text-red-400">{tarifaError}</p>}
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={savingTarifa} className="flex-1">No</AlertDialogCancel>
            <AlertDialogAction
              onClick={ejecutarCambioTarifa}
              disabled={savingTarifa}
              style={{ backgroundColor: NAVY }}
              className="flex-1 text-white hover:opacity-90"
            >
              {savingTarifa ? "Guardando..." : "Sí, cambiar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                        {b.estatus !== "Baja" && (
                          b.diasRestantes != null ? (
                            <button
                              onClick={() => { setSelectedBenef(b); setShowPagoDialog(true) }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: NAVY }}
                            >
                              <CreditCard className="size-3.5" />
                              Renovar
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedBenef(b); setShowPagoDialog(true) }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: NAVY }}
                            >
                              <Plus className="size-3.5" />
                              Nueva membresía
                            </button>
                          )
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
        precioNuevo={precioNuevo}
        precioReinsc={precioReinsc}
      />
    </div>
  )
}
