"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Users, Inbox, ClipboardList, Package,
  RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, MapPin, Phone,
  Timer, CalendarDays, Banknote, CreditCard, Building2,
  CheckCircle2, Clock, XCircle, AlertCircle,
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import type { ArticuloInventario } from "@/services/inventario"
import type { PagoReciente }       from "@/services/membresias"
import type { Cita }               from "@/services/citas"
import { esSolicitudPublicaPendiente } from "@/lib/solicitud-publica-beneficiario"
import type { Beneficiario }       from "@/services/beneficiarios"
import { getInventario }           from "@/services/inventario"
import { getBeneficiarios }        from "@/services/beneficiarios"
import { getPagosRecientes }       from "@/services/membresias"
import { getCitas }                from "@/services/citas"
import { conteosEstatusBeneficiarios, conteoSolicitudesPendientes } from "@/lib/beneficiarios-conteos"
import { resolvePublicUploadUrl } from "@/lib/media-url"

const NAVY  = "#0f4c81"
const AMBER = "#E8B043"
const INVENTARIO_BAJO_UMBRAL = 3
const PAGE_SIZE = 5

function fmtDate() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function mesActualISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function mesAnteriorISO() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/* ── KPI ── */
function KpiCard({ label, value, sub, icon: Icon, color, trend, loading }: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; color: string
  trend?: "up" | "down" | "flat"; loading?: boolean
}) {
  const TrendIcon  = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-slate-400"
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <div className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="size-3.5" style={{ color }} />
        </div>
      </div>
      <div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : value}
          </span>
          {trend && !loading && <TrendIcon className={`mb-1 size-3.5 ${trendColor}`} />}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

/* ── Artículos bajos con paginación ── */
function ArticulosBajosPanel({ stockBajo, loading, umbral }: {
  stockBajo: ArticuloInventario[]; loading: boolean; umbral: number
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(stockBajo.length / PAGE_SIZE))
  const paginated  = stockBajo.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  useEffect(() => { setPage(0) }, [stockBajo])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Artículos bajos</p>
          <p className="text-[11px] text-muted-foreground">Con {umbral} unidades o menos</p>
        </div>
        {!loading && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            stockBajo.length === 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}>
            {stockBajo.length === 0 ? "Sin alertas" : `${stockBajo.length} alerta${stockBajo.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>
      <div className="flex-1 divide-y divide-border/40">
        {loading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="size-1.5 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 h-2.5 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-8 rounded bg-muted animate-pulse" />
              <div className="h-4 w-5 rounded bg-muted animate-pulse" />
            </div>
          ))
        ) : stockBajo.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <Package className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-foreground">Inventario en orden</p>
          </div>
        ) : (
          paginated.map((item) => {
            const qty    = Number(item.cantidad ?? 0)
            const isZero = qty === 0
            return (
              <div key={item.clave} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
                <div className={`size-1.5 shrink-0 rounded-full ${isZero ? "bg-red-500" : "bg-amber-500"}`} />
                <p className="flex-1 truncate text-xs text-foreground">{item.descripcion}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.unidad}</span>
                <span className={`w-6 shrink-0 text-right text-sm font-bold tabular-nums ${isZero ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {qty}
                </span>
              </div>
            )
          })
        )}
      </div>
      {!loading && (
        <div className="mt-auto flex items-center justify-between border-t border-border/40 px-5 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            {stockBajo.length === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, stockBajo.length)}`} de {stockBajo.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="min-w-[2.5rem] text-center text-[11px] font-medium text-foreground">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Dashboard ── */
export function DashboardSection() {
  const [inventarioBajoCount, setInventarioBajoCount] = useState<number | null>(null)
  const [stockBajo, setStockBajo]                     = useState<ArticuloInventario[]>([])
  const [loadingStock, setLoadingStock]               = useState(true)
  const [activosMembresia, setActivosMembresia]       = useState<number | null>(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number | null>(null)
  const [listaSolicitudes, setListaSolicitudes]       = useState<Beneficiario[]>([])
  const [loadingBenef, setLoadingBenef]               = useState(true)
  const [beneficiarios, setBeneficiarios]             = useState<Beneficiario[]>([])
  const [pagos, setPagos]                             = useState<PagoReciente[]>([])
  const [loadingPagos, setLoadingPagos]               = useState(true)
  const [citas, setCitas]                             = useState<Cita[]>([])
  const [loadingCitas, setLoadingCitas]               = useState(true)
  const [lastRefresh, setLastRefresh]                 = useState(new Date())

  function loadData() {
    setLoadingBenef(true); setLoadingStock(true)
    setLoadingPagos(true); setLoadingCitas(true)
    setLastRefresh(new Date())

    getInventario()
      .then((items) => {
        const bajos = items
          .filter((i) => Number(i.cantidad ?? 0) <= INVENTARIO_BAJO_UMBRAL)
          .sort((a, b) => Number(b.cantidad ?? 0) - Number(a.cantidad ?? 0))
        setInventarioBajoCount(bajos.length)
        setStockBajo(bajos)
      })
      .catch(() => { setInventarioBajoCount(null); setStockBajo([]) })
      .finally(() => setLoadingStock(false))

    getBeneficiarios()
      .then((b) => {
        const c = conteosEstatusBeneficiarios(b)
        setActivosMembresia(c.Activo)
        const pendientes = b.filter(esSolicitudPublicaPendiente)
        setSolicitudesPendientes(pendientes.length)
        setListaSolicitudes(pendientes)
        setBeneficiarios(b)
      })
      .catch(() => { setActivosMembresia(null); setSolicitudesPendientes(null); setListaSolicitudes([]); setBeneficiarios([]) })
      .finally(() => setLoadingBenef(false))

    getPagosRecientes(100)
      .then(setPagos)
      .catch(() => setPagos([]))
      .finally(() => setLoadingPagos(false))

    getCitas()
      .then(setCitas)
      .catch(() => setCitas([]))
      .finally(() => setLoadingCitas(false))
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Membresías por vencer ── */
  const membresiasPorVencer = useMemo(() => {
    return beneficiarios
      .filter((b) => b.estatus !== "Baja" && b.diasRestantes != null)
      .sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999))
      .slice(0, 100)
  }, [beneficiarios])

  /* ── Citas de hoy ── */
  const citasHoy = useMemo(() => {
    const hoy = todayISO()
    return citas
      .filter((c) => (c.fecha ?? "").startsWith(hoy))
      .sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
  }, [citas])

  /* ── Resumen financiero ── */
  const financiero = useMemo(() => {
    const mesActual  = mesActualISO()
    const mesAnterior = mesAnteriorISO()

    const pagosActual   = pagos.filter((p) => (p.ultimoPago ?? p.fechaEmision ?? "").startsWith(mesActual))
    const pagosAnterior = pagos.filter((p) => (p.ultimoPago ?? p.fechaEmision ?? "").startsWith(mesAnterior))

    const totalAnterior = pagosAnterior.reduce((s, p) => s + (Number(p.monto) || 0), 0)

    const porMetodo = {
      efectivo:      pagosActual.filter((p) => p.metodoPago === "efectivo").reduce((s, p) => s + (Number(p.monto) || 0), 0),
      transferencia: pagosActual.filter((p) => p.metodoPago === "transferencia").reduce((s, p) => s + (Number(p.monto) || 0), 0),
      tarjeta:       pagosActual.filter((p) => p.metodoPago === "tarjeta").reduce((s, p) => s + (Number(p.monto) || 0), 0),
    }

    // totalActual = suma de los tres métodos para que siempre cuadre
    const totalActual = porMetodo.efectivo + porMetodo.transferencia + porMetodo.tarjeta

    const diff = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0

    return { totalActual, totalAnterior, diff, porMetodo, count: pagosActual.length }
  }, [pagos])

  /* ── Datos mensuales para la gráfica (últimos 6 meses) ── */
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - i))
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("es-MX", { month: "short" })
        .replace(".", "")
        .replace(/^\w/, (c) => c.toUpperCase())
      const pagosDelMes = pagos.filter(
        (p) => (p.ultimoPago ?? p.fechaEmision ?? "").startsWith(key)
      )
      const ingresos  = pagosDelMes.reduce((s, p) => s + (Number(p.monto) || 0), 0)
      const miembros  = beneficiarios.filter(
        (b) => (b.fechaAlta ?? "").startsWith(key)
      ).length
      return { mes: label, ingresos: parseFloat(ingresos.toFixed(2)), nuevos: miembros }
    })
  }, [pagos, beneficiarios])

  const kpis = useMemo(() => [
    {
      label: "Beneficiarios activos", value: activosMembresia ?? "--",
      sub: "Con membresía vigente", icon: Users, color: NAVY,
      trend: "up" as const, loading: loadingBenef,
    },
    {
      label: "Solicitudes pendientes", value: solicitudesPendientes ?? "--",
      sub: "Pre-registros sin revisar", icon: Inbox, color: AMBER,
      trend: solicitudesPendientes && solicitudesPendientes > 0 ? "up" as const : "flat" as const,
      loading: loadingBenef,
    },
    {
      label: "Servicios este mes", value: "83",
      sub: "Cierre estimado: Febrero", icon: ClipboardList, color: "#10b981",
      trend: "up" as const, loading: false,
    },
    {
      label: "Artículos bajos", value: inventarioBajoCount ?? "--",
      sub: inventarioBajoCount === 0 ? "Sin alertas" : "Requieren reposición",
      icon: Package, color: inventarioBajoCount ? "#ef4444" : "#10b981",
      trend: inventarioBajoCount ? "down" as const : "flat" as const, loading: false,
    },
  ], [activosMembresia, solicitudesPendientes, inventarioBajoCount, loadingBenef])

  const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Agenda de hoy: badges con color por estatus (estilo del mockup)
  const agendaStatusStyle: Record<string, string> = {
    Confirmada: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    Pendiente:  "border-amber-500/30  bg-amber-500/10  text-amber-400",
    Completada: "border-blue-500/30   bg-blue-500/10   text-blue-400",
    Cancelada:  "border-red-500/30    bg-red-500/10    text-red-400",
  }
  const agendaItemIcon: Record<string, React.ElementType> = {
    Confirmada: CheckCircle2,
    Pendiente:  Clock,
    Completada: CheckCircle2,
    Cancelada:  XCircle,
  }

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Panel de control</h1>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">{fmtDate()}</p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="size-3.5" />
          Actualizar
          <span className="ml-1 text-[10px] opacity-60">
            {lastRefresh.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── Solicitudes en espera + Agenda del día ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Solicitudes en espera */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Solicitudes en espera</p>
              <p className="text-[11px] text-muted-foreground">Pre-registros pendientes de revisión</p>
            </div>
            {!loadingBenef && listaSolicitudes.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {listaSolicitudes.length} pendiente{listaSolicitudes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex-1 divide-y divide-border/40">
            {loadingBenef ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-2 w-2/3 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))
            ) : listaSolicitudes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                  <Inbox className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">Sin solicitudes</p>
                <p className="text-xs text-muted-foreground">No hay pre-registros en espera</p>
              </div>
            ) : (
              listaSolicitudes.map((b) => {
                const nombre  = `${b.nombres ?? ""} ${b.apellidoPaterno ?? ""}`.trim()
                const inicial = nombre.charAt(0).toUpperCase()
                const lugar   = [b.ciudad, b.estado].filter(Boolean).join(", ") || "—"
                const tel     = b.telefonoCelular || null
                return (
                  <div key={b.curp ?? b.folio} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/20">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>
                      {inicial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{nombre}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="size-3 shrink-0" />{lugar}</span>
                        {tel && <><span className="opacity-30">·</span><span className="flex items-center gap-1"><Phone className="size-3 shrink-0" />{tel}</span></>}
                      </div>
                    </div>
                    <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                      Pendiente
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Agenda del día */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Agenda de hoy</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border/40">
            {loadingCitas ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-8 w-10 rounded bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))
            ) : citasHoy.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <CalendarDays className="size-8 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">Sin citas programadas para hoy</p>
              </div>
            ) : (
              citasHoy.map((c) => {
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
                    <div className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-muted/50 py-1.5 text-center">
                      <span className="text-xs font-bold tabular-nums text-foreground leading-none">{(c.hora ?? "--").slice(0, 5)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{c.beneficiario}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.especialista || "—"}</p>
                    </div>
                    <div className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${agendaStatusStyle[c.estatus] ?? "border-border/60 bg-muted/30 text-muted-foreground"}`}>
                      {(() => { const Icon = agendaItemIcon[c.estatus] ?? AlertCircle; return <Icon className="size-3" /> })()}
                      {c.estatus}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Resumen financiero ── */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Resumen financiero</p>
          <p className="text-[11px] text-muted-foreground">Ingresos por membresías · mes actual vs anterior</p>
        </div>
        {loadingPagos ? (
          <div className="grid grid-cols-2 gap-px bg-border/30 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card px-6 py-5 space-y-2">
                <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-6 w-2/3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-y divide-border/40 sm:grid-cols-5 sm:divide-y-0">
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Este mes</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{fmt$(financiero.totalActual)}</p>
              <div className="mt-1 flex items-center gap-1">
                {financiero.diff >= 0
                  ? <TrendingUp className="size-3 text-emerald-500" />
                  : <TrendingDown className="size-3 text-red-500" />}
                <span className={`text-[11px] font-medium ${financiero.diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {financiero.diff >= 0 ? "+" : ""}{financiero.diff.toFixed(1)}% vs mes anterior
                </span>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mes anterior</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{fmt$(financiero.totalAnterior)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{financiero.count} pago{financiero.count !== 1 ? "s" : ""} este mes</p>
            </div>
            {[
              { label: "Efectivo",      val: financiero.porMetodo.efectivo,      icon: Banknote,   color: "#10b981" },
              { label: "Transferencia", val: financiero.porMetodo.transferencia, icon: Building2,  color: NAVY },
              { label: "Tarjeta",       val: financiero.porMetodo.tarjeta,       icon: CreditCard, color: AMBER },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="px-6 py-5">
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5" style={{ color }} />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{fmt$(val)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {financiero.totalActual > 0 ? Math.round((val / financiero.totalActual) * 100) : 0}% del total
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Control de membresías + Artículos bajos ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Control de membresías */}
        {(() => {
          const MEM_PAGE = 8
          const [memPage, setMemPage] = useState(0)
          const totalMemPages = Math.max(1, Math.ceil(membresiasPorVencer.length / MEM_PAGE))
          const paginatedMem = membresiasPorVencer.slice(memPage * MEM_PAGE, memPage * MEM_PAGE + MEM_PAGE)

          return (
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Control de membresías</p>
                  <p className="text-[11px] text-muted-foreground">Ordenado por proximidad de vencimiento</p>
                </div>
                <Timer className="size-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-border/40">
                {loadingBenef ? (
                  Array.from({ length: MEM_PAGE }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
                      <div className="size-7 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="h-2.5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
                      </div>
                      <div className="h-4 w-12 rounded bg-muted animate-pulse shrink-0" />
                    </div>
                  ))
                ) : membresiasPorVencer.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <CheckCircle2 className="size-8 text-emerald-500 opacity-50" />
                    <p className="text-xs text-muted-foreground">No hay membresías próximas a vencer</p>
                  </div>
                ) : (
                  paginatedMem.map((b) => {
                    const nombre  = `${b.nombres ?? ""} ${b.apellidoPaterno ?? ""}`.trim()
                    const inicial = nombre.charAt(0).toUpperCase()
                    const fotoUrl = resolvePublicUploadUrl(b.fotoPerfilUrl ?? undefined)
                    const estatusStyle = {
                      Activo:   { dot: "bg-emerald-500", cls: "text-emerald-700 dark:text-emerald-400" },
                      Inactivo: { dot: "bg-amber-500",   cls: "text-amber-700 dark:text-amber-400"     },
                      Baja:     { dot: "bg-red-500",     cls: "text-red-600 dark:text-red-400"         },
                    }[b.estatus] ?? { dot: "bg-slate-400", cls: "text-slate-500 dark:text-slate-400" }

                    return (
                      <div key={b.curp ?? b.folio} className="flex items-center gap-2.5 border-b border-border/40 px-4 py-3 transition-colors hover:bg-muted/20 last:border-b-0">
                        <div className="size-7 shrink-0 overflow-hidden rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: fotoUrl ? undefined : NAVY }}>
                          {fotoUrl
                            ? <img src={fotoUrl} alt="" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                            : inicial
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[11px] font-semibold text-foreground">{nombre}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{b.ciudad || "—"}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${estatusStyle.cls}`}>
                          <span className={`size-1.5 rounded-full ${estatusStyle.dot}`} />
                          {b.estatus}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
              {!loadingBenef && (
                <div className="mt-auto flex items-center justify-between border-t border-border/40 px-5 py-2.5">
                  <span className="text-[11px] text-muted-foreground">
                    {membresiasPorVencer.length === 0 ? "0" : `${memPage * MEM_PAGE + 1}–${Math.min((memPage + 1) * MEM_PAGE, membresiasPorVencer.length)}`} de {membresiasPorVencer.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMemPage(p => p - 1)} disabled={memPage === 0}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-[11px] font-medium text-foreground">{memPage + 1} / {totalMemPages}</span>
                    <button onClick={() => setMemPage(p => p + 1)} disabled={memPage >= totalMemPages - 1}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Artículos bajos */}
        <ArticulosBajosPanel stockBajo={stockBajo} loading={loadingStock} umbral={INVENTARIO_BAJO_UMBRAL} />
      </div>

      {/* ── Gráfica de rendimiento mensual ── */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Rendimiento mensual</p>
            <p className="text-[11px] text-muted-foreground">Ingresos y nuevos beneficiarios · últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: NAVY }} />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: AMBER }} />
              Nuevos
            </span>
          </div>
        </div>

        {loadingPagos ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : (
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 4"
                  stroke="currentColor"
                  strokeOpacity={0.07}
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  yAxisId="ingresos"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v === 0 ? "0" : `$${(v / 1000).toFixed(0)}k`}
                  width={42}
                />
                <YAxis
                  yAxisId="nuevos"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    padding: "8px 12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "ingresos"
                      ? [`$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, "Ingresos"]
                      : [value, "Nuevos beneficiarios"]
                  }
                />
                <Line
                  yAxisId="ingresos"
                  type="monotone"
                  dataKey="ingresos"
                  stroke={NAVY}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: NAVY, strokeWidth: 0 }}
                  activeDot={{ r: 5.5, fill: NAVY, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  yAxisId="nuevos"
                  type="monotone"
                  dataKey="nuevos"
                  stroke={AMBER}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3.5, fill: AMBER, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: AMBER, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  )
}
