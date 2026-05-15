"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Search, CreditCard, Banknote, Building2, RefreshCw,
  Users, AlertTriangle, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import {
  getPagosRecientes, registrarPago, syncEstados,
  MONTO_PREDETERMINADO, type PagoReciente,
} from "@/services/membresias"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"

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

// ─── Dialog de pago ───────────────────────────────────────────────────────────

const CARD_TYPES = ["Visa", "Mastercard", "American Express", "Otra"] as const
type CardType = typeof CARD_TYPES[number]

function PagoDialog({ open, beneficiario, onClose, onSuccess }: {
  open: boolean; beneficiario: Beneficiario | null
  onClose: () => void; onSuccess: () => void
}) {
  const [meses, setMeses]           = useState(1)
  const [metodo, setMetodo]         = useState<"efectivo" | "transferencia" | "tarjeta" | "">("")
  const [referencia, setReferencia] = useState("")
  const [observaciones, setObs]     = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Transferencia
  const [banco, setBanco]           = useState("")
  const [comprobante, setComprobante] = useState("")

  // Tarjeta
  const [tipoTarjeta, setTipoTarjeta]   = useState<CardType>("Visa")
  const [ultimos4, setUltimos4]         = useState("")
  const [vencimiento, setVencimiento]   = useState("")
  const [nombreTarjeta, setNombreTarjeta] = useState("")
  const [autorizacion, setAutorizacion] = useState("")

  const montoTotal = meses * MONTO_PREDETERMINADO

  useEffect(() => {
    if (open) {
      setMeses(1); setMetodo(""); setReferencia(""); setObs("")
      setBanco(""); setComprobante("")
      setTipoTarjeta("Visa"); setUltimos4(""); setVencimiento(""); setNombreTarjeta(""); setAutorizacion("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!beneficiario) return
    if (!metodo) { setError("Selecciona un método de pago."); return }
    if (metodo === "transferencia" && !comprobante.trim()) {
      setError("Ingresa el número de comprobante de la transferencia.")
      return
    }

    // Componer referencia y observaciones según método
    let refFinal = referencia.trim() || undefined
    let obsFinal = observaciones.trim() || undefined

    if (metodo === "transferencia") {
      refFinal = comprobante.trim()
      const partes = [banco.trim() && `Banco: ${banco.trim()}`, observaciones.trim()].filter(Boolean)
      obsFinal = partes.join(" | ") || undefined
    }
    if (metodo === "tarjeta") {
      const digits = ultimos4.replace(/\s/g, "")
      const masked = digits.length >= 4 ? `****${digits.slice(-4)}` : digits
      refFinal = `${tipoTarjeta} ${masked}`
      const partes = [
        nombreTarjeta.trim() && `Titular: ${nombreTarjeta.trim()}`,
        vencimiento && `Venc: ${vencimiento}`,
        autorizacion.trim() && `Auth: ${autorizacion.trim()}`,
        observaciones.trim(),
      ].filter(Boolean)
      obsFinal = partes.join(" | ") || undefined
    }

    setLoading(true); setError(null)
    try {
      await registrarPago({
        curp: beneficiario.curp ?? beneficiario.folio,
        meses, monto: montoTotal, metodo_pago: metodo,
        referencia: refFinal,
        observaciones: obsFinal,
      })
      toast.success("Pago registrado correctamente", {
        description: `${meses} ${meses === 1 ? "mes" : "meses"} · ${formatMonto(montoTotal)}`,
      })
      onSuccess(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago.")
      toast.error(e instanceof Error ? e.message : "Error al registrar el pago.")
    } finally { setLoading(false) }
  }

  const nombre = beneficiario ? `${beneficiario.nombres} ${beneficiario.apellidoPaterno}` : ""

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Registrar Pago</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-foreground">{nombre}</span>
            {" · "}{beneficiario?.curp ?? beneficiario?.folio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Meses + total */}
          <div>
            <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Meses a pagar
            </Label>
            <div className="flex items-stretch gap-3">
              <div className="flex items-center overflow-hidden rounded-lg border border-border">
                <button type="button" onClick={() => setMeses(m => Math.max(1, m - 1))} disabled={meses <= 1}
                  className="flex size-10 items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">−</button>
                <span className="min-w-[5rem] px-2 text-center text-sm font-semibold tabular-nums">
                  {meses} {meses === 1 ? "mes" : "meses"}
                </span>
                <button type="button" onClick={() => setMeses(m => Math.min(12, m + 1))} disabled={meses >= 12}
                  className="flex size-10 items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">+</button>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-lg border border-border bg-muted/30 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="text-lg font-bold tabular-nums text-foreground">{formatMonto(montoTotal)}</span>
                <span className="text-[10px] text-muted-foreground">${MONTO_PREDETERMINADO}/mes × {meses}</span>
              </div>
            </div>
          </div>

          {/* Método */}
          <div>
            <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Método de pago
            </Label>
            <Select value={metodo} onValueChange={(v) => { setMetodo(v as typeof metodo); setReferencia("") }}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo"><span className="flex items-center gap-2"><Banknote className="size-4" />Efectivo</span></SelectItem>
                <SelectItem value="transferencia"><span className="flex items-center gap-2"><Building2 className="size-4" />Transferencia bancaria</span></SelectItem>
                <SelectItem value="tarjeta"><span className="flex items-center gap-2"><CreditCard className="size-4" />Tarjeta</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Transferencia bancaria ── */}
          {metodo === "transferencia" && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 border-b border-blue-200/60 pb-3 dark:border-blue-800/60">
                <Building2 className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Datos de transferencia</span>
              </div>
              {/* Info cuenta destino */}
              <div className="rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs dark:border-blue-700 dark:bg-slate-900">
                <p className="font-bold text-slate-500 dark:text-slate-400 mb-1">Cuenta destino</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Banco</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Banorte</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Cuenta</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">0001617086-5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CLABE</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">072 580 00016170865 0</span>
                </div>
              </div>
              {/* Campos */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                    No. Comprobante <span className="text-red-500">*</span>
                  </label>
                  <Input className="h-9 text-sm" placeholder="Folio o referencia" value={comprobante}
                    onChange={(e) => setComprobante(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                    Banco emisor
                  </label>
                  <Input className="h-9 text-sm" placeholder="Ej. BBVA, HSBC..." value={banco}
                    onChange={(e) => setBanco(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Tarjeta ── */}
          {metodo === "tarjeta" && (() => {
            const brandColor: Record<CardType, string> = {
              "Visa":             "#1A1FCE",
              "Mastercard":       "#EB001B",
              "American Express": "#015FD0",
              "Otra":             "#475569",
            }
            const c = brandColor[tipoTarjeta]
            const hex20 = `${c}33` // ~20% opacity para fondos y bordes
            return (
            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: `${c}55`, backgroundColor: `${c}08` }}>
              <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: `${c}33` }}>
                <CreditCard className="size-4" style={{ color: c }} />
                <span className="text-xs font-bold" style={{ color: c }}>Datos de tarjeta</span>
              </div>

              {/* Vista previa tipo tarjeta física */}
              <div className="relative overflow-hidden rounded-xl p-5 text-white transition-all duration-500 min-h-[160px] flex flex-col justify-between"
                style={{ background: {
                  "Visa":             "linear-gradient(135deg, #1A1FCE 0%, #2228e0 60%, #3b42f5 100%)",
                  "Mastercard":       "linear-gradient(135deg, #EB001B 0%, #c5001a 40%, #F79E1B 100%)",
                  "American Express": "linear-gradient(135deg, #015FD0 0%, #0270f5 60%, #1a84ff 100%)",
                  "Otra":             "linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)",
                }[tipoTarjeta] }}>
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                      {tipoTarjeta}
                    </span>
                    <CreditCard className="size-5 opacity-60" />
                  </div>
                  <p className="mt-3 font-mono text-base tracking-widest">
                    {ultimos4 || "0000 0000 0000 0000"}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-60">Titular</p>
                      <p className="text-xs font-semibold tracking-wide uppercase">{nombreTarjeta || "NOMBRE APELLIDO"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-widest opacity-60">Vencimiento</p>
                      <p className="font-mono text-sm">{vencimiento || "MM/AA"}</p>
                    </div>
                    {autorizacion && (
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-widest opacity-60">Auth</p>
                        <p className="font-mono text-xs">{autorizacion}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Red de tarjeta */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: c }}>
                  Red de tarjeta
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CARD_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setTipoTarjeta(t)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
                      style={tipoTarjeta === t
                        ? { borderColor: c, backgroundColor: c, color: "#fff" }
                        : { borderColor: "#e2e8f0", backgroundColor: "#fff", color: "#0f172a" }
                      }>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre en tarjeta */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: c }}>
                  Nombre en la tarjeta
                </label>
                <Input className="h-9 text-sm uppercase" placeholder="NOMBRE APELLIDO"
                  value={nombreTarjeta}
                  onChange={(e) => setNombreTarjeta(e.target.value.toUpperCase())} />
              </div>

              {/* Número */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: c }}>
                  Número de tarjeta <span className="text-red-500">*</span>
                </label>
                <Input
                  className="h-9 font-mono text-sm"
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  value={ultimos4}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 16)
                    const formatted = digits.replace(/(.{4})/g, "$1 ").trim()
                    setUltimos4(formatted)
                  }}
                />
              </div>

              {/* Vencimiento + Autorización */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: c }}>
                    Vencimiento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-9 font-mono text-sm"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={vencimiento}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 4)
                      const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw
                      setVencimiento(formatted)
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: c }}>
                    Código de autorización
                  </label>
                  <Input className="h-9 text-sm" placeholder="Opcional" value={autorizacion}
                    onChange={(e) => setAutorizacion(e.target.value)} />
                </div>
              </div>
            </div>
          )})()}

          {/* Observaciones generales */}
          <div>
            <Label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Observaciones</Label>
            <Input className="h-10 text-sm" placeholder="Notas adicionales (opcional)" value={observaciones} onChange={(e) => setObs(e.target.value)} />
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
              {loading ? "Registrando..." : "Confirmar pago"}
            </button>
          </div>
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
  const [showPagoDialog, setShowPagoDialog] = useState(false)
  const [selectedBenef, setSelectedBenef]   = useState<Beneficiario | null>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await syncEstados().catch(() => {})
      const [benef, pagosData] = await Promise.all([getBeneficiarios(), getPagosRecientes(20)])
      setTodosBeneficiarios(benef)
      setPagos(pagosData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar membresías")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const beneficiarios = todosBeneficiarios.filter(b => b.estatus !== "Baja")
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
            Control de pagos mensuales · ${MONTO_PREDETERMINADO}/mes por beneficiario
          </p>
        </div>
        <button onClick={cargarDatos}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="size-3.5" />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
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

      {/* Tabla de membresías */}
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
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">CURP</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Nombre</th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">Ciudad</th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Estatus</th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  >
                    Tiempo restante
                    {sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </th>
                <th className="py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">Acción</th>
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
                  const estatus  = getMembresiaEstatus(b)
                  const nombre   = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno ?? ""}`.trim()
                  const folio    = b.curp ?? b.folio ?? "—"
                  const dias     = diasBadge(b.diasRestantes)
                  const est      = estatusBadge(estatus)

                  return (
                    <tr key={folio} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 pl-5 font-mono text-[11px] text-foreground">{folio}</td>
                      <td className="py-3 text-xs font-medium text-foreground">{nombre}</td>
                      <td className="hidden py-3 text-xs text-foreground md:table-cell">{b.ciudad ?? "—"}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${est.cls}`}>
                          <span className={`size-1.5 rounded-full ${est.dot}`} />
                          {estatus}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs font-semibold tabular-nums ${dias.cls}`}>
                          {dias.text}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-right">
                        {estatus !== "Cancelada" && (
                          <button
                            onClick={() => { setSelectedBenef(b); setShowPagoDialog(true) }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: NAVY }}
                          >
                            <CreditCard className="size-3.5" />
                            Pago
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

      {/* Últimos pagos */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Últimos pagos</p>
          <p className="text-[11px] text-muted-foreground">Movimientos recientes de membresía</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[28%]" />
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Fecha</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Beneficiario</th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground sm:table-cell">Período</th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Monto</th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">No hay pagos registrados aún.</td>
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
                        {p.metodoPago === "transferencia" && <Building2 className="size-3.5" style={{ color: NAVY }} />}
                        {p.metodoPago === "tarjeta" && <CreditCard className="size-3.5" style={{ color: AMBER }} />}
                        {labelMetodo(p.metodoPago)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PagoDialog
        open={showPagoDialog}
        beneficiario={selectedBenef}
        onClose={() => setShowPagoDialog(false)}
        onSuccess={cargarDatos}
      />
    </div>
  )
}
