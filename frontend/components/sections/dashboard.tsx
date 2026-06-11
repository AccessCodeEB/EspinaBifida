"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Users, Inbox, ClipboardList, Package,
  RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, MapPin, Phone,
  Timer, CalendarDays,
  CheckCircle2, Clock, XCircle, AlertCircle,
} from "lucide-react"
import type { ArticuloInventario } from "@/services/inventario"
import type { Cita }               from "@/services/citas"
import { esSolicitudPublicaPendiente } from "@/lib/solicitud-publica-beneficiario"
import type { Beneficiario }       from "@/services/beneficiarios"
import { getInventario }           from "@/services/inventario"
import { getBeneficiarios }        from "@/services/beneficiarios"
import { getCitas }                from "@/services/citas"
import { getServicios, type Servicio } from "@/services/servicios"
import { conteosEstatusBeneficiarios, conteoSolicitudesPendientes } from "@/lib/beneficiarios-conteos"
import { buildEstadoOrigenCounts } from "@/lib/beneficiarios-origen"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { BeneficiariosOrigenMapCard } from "./dashboard/BeneficiariosOrigenMapCard"

const NAVY  = "#0f4c81"
const AMBER = "#E8B043"
const INVENTARIO_BAJO_UMBRAL = 3
const PAGE_SIZE = 5
const MEM_PAGE = 8
const AGENDA_PAGE_SIZE = 4

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
function ArticulosBajosPanel({ sinStock, stockBajo, loading }: {
  sinStock: ArticuloInventario[]; stockBajo: ArticuloInventario[]; loading: boolean
}) {
  // Agotados primero (más críticos), luego stock bajo
  const todos = [...sinStock, ...stockBajo]
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(todos.length / PAGE_SIZE))
  const paginated  = todos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  useEffect(() => { setPage(0) }, [sinStock, stockBajo])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Alertas de stock</p>
          <p className="text-[11px] text-muted-foreground">
            {sinStock.length > 0 && <span className="text-red-500 font-medium">{sinStock.length} sin stock</span>}
            {sinStock.length > 0 && stockBajo.length > 0 && <span className="text-muted-foreground"> · </span>}
            {stockBajo.length > 0 && <span className="text-amber-500 font-medium">{stockBajo.length} stock bajo</span>}
            {todos.length === 0 && "Sin alertas"}
          </p>
        </div>
        {!loading && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            todos.length === 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : sinStock.length > 0
                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          }`}>
            {todos.length === 0 ? "Todo bien" : `${todos.length} alerta${todos.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-4 py-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <Package className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-foreground">Inventario en orden</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {paginated.map((item) => {
              const qty    = Number(item.cantidad ?? 0)
              const isZero = qty === 0
              return (
                <div key={item.clave} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/20">
                  <div className={`size-1.5 shrink-0 rounded-full ${isZero ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.descripcion}</p>
                    {!isZero && item.minimo > 0 && (
                      <p className="text-[10px] text-muted-foreground">Mín: {item.minimo} {item.unidad}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${
                    isZero ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  }`}>{qty}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{item.unidad}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!loading && todos.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, todos.length)} de {todos.length}
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
  const [agotadosCount, setAgotadosCount]             = useState<number | null>(null)
  const [sinStock, setSinStock]                       = useState<ArticuloInventario[]>([])
  const [stockBajo, setStockBajo]                     = useState<ArticuloInventario[]>([])
  const [loadingStock, setLoadingStock]               = useState(true)
  const [activosMembresia, setActivosMembresia]       = useState<number | null>(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number | null>(null)
  const [listaSolicitudes, setListaSolicitudes]       = useState<Beneficiario[]>([])
  const [loadingBenef, setLoadingBenef]               = useState(true)
  const [beneficiarios, setBeneficiarios]             = useState<Beneficiario[]>([])
  const [citas, setCitas]                             = useState<Cita[]>([])
  const [loadingCitas, setLoadingCitas]               = useState(true)
  const [servicios, setServicios]                     = useState<Servicio[]>([])
  const [loadingServicios, setLoadingServicios]       = useState(true)
  const [lastRefresh, setLastRefresh]                 = useState(new Date())
  const [agendaPage, setAgendaPage]                   = useState(0)
  const [solicitudesPage, setSolicitudesPage]         = useState(0)

  function loadData() {
    setLoadingBenef(true); setLoadingStock(true)
    setLoadingCitas(true); setLoadingServicios(true)
    setLastRefresh(new Date())

    getInventario()
      .then((items) => {
        // Stock bajo: cantidad > 0 AND cantidad <= minimo (mismo criterio que backend)
        // Agotado: cantidad = 0 (se muestra aparte, más crítico)
        const bajos = items
          .filter((i) => {
            const qty = Number(i.cantidad ?? 0)
            const min = Number(i.minimo ?? 0)
            return qty > 0 && min > 0 && qty <= min
          })
          .sort((a, b) => Number(a.cantidad ?? 0) - Number(b.cantidad ?? 0))
        const agotados = items.filter((i) => Number(i.cantidad ?? 0) <= 0)
        setInventarioBajoCount(bajos.length)
        setAgotadosCount(agotados.length)
        setStockBajo(bajos)
        setSinStock(agotados)
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

    getCitas()
      .then(setCitas)
      .catch(() => setCitas([]))
      .finally(() => setLoadingCitas(false))

    getServicios()
      .then(setServicios)
      .catch(() => setServicios([]))
      .finally(() => setLoadingServicios(false))
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Membresías por vencer ── */
  const membresiasPorVencer = useMemo(() => {
    return beneficiarios
      .filter((b) => b.estatus !== "Baja")
      .sort((a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity))
  }, [beneficiarios])

  /* ── Citas de hoy ── */
  const citasHoy = useMemo(() => {
    const hoy = todayISO()
    return citas
      .filter((c) => (c.fecha ?? "").startsWith(hoy) && c.estatus !== "Cancelada")
      .sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
  }, [citas])

  useEffect(() => { setAgendaPage(0) }, [citasHoy])
  useEffect(() => { setSolicitudesPage(0) }, [listaSolicitudes])

  const stateCounts = useMemo(() => {
    const aprobados = beneficiarios.filter((b) => !esSolicitudPublicaPendiente(b))
    return buildEstadoOrigenCounts(aprobados)
  }, [beneficiarios])

  const serviciosEsteMes = useMemo(() => {
    const mesActual = mesActualISO()
    return servicios.filter((s) => (s.fecha ?? "").startsWith(mesActual)).length
  }, [servicios])

  const mesNomCapitalizado = useMemo(() => {
    const mesNom = new Date().toLocaleDateString("es-MX", { month: "long" })
    return mesNom.charAt(0).toUpperCase() + mesNom.slice(1)
  }, [])

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
      label: "Servicios este mes", value: serviciosEsteMes,
      sub: `Cierre estimado: ${mesNomCapitalizado}`, icon: ClipboardList, color: "#10b981",
      trend: serviciosEsteMes > 0 ? "up" as const : "flat" as const, loading: loadingServicios,
    },
    {
      label: "Artículos agotados", value: agotadosCount ?? "--",
      sub: agotadosCount === 0 ? "Sin agotados" : "Sin existencias",
      icon: Package, color: agotadosCount ? "#ef4444" : "#10b981",
      trend: agotadosCount ? "down" as const : "flat" as const, loading: loadingStock,
    },
  ], [activosMembresia, solicitudesPendientes, serviciosEsteMes, mesNomCapitalizado, agotadosCount, loadingBenef, loadingServicios, loadingStock])

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
          <span className="ml-1 text-[10px] leading-none opacity-60">
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
        {(() => {
          const totalSolPages = Math.max(1, Math.ceil(listaSolicitudes.length / AGENDA_PAGE_SIZE))
          const solicitudesPaginadas = listaSolicitudes.slice(solicitudesPage * AGENDA_PAGE_SIZE, solicitudesPage * AGENDA_PAGE_SIZE + AGENDA_PAGE_SIZE)
          return (
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
                  Array.from({ length: AGENDA_PAGE_SIZE }).map((_, i) => (
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
                  solicitudesPaginadas.map((b) => {
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
              {!loadingBenef && listaSolicitudes.length > AGENDA_PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5">
                  <span className="text-[11px] text-muted-foreground">
                    {solicitudesPage * AGENDA_PAGE_SIZE + 1}–{Math.min((solicitudesPage + 1) * AGENDA_PAGE_SIZE, listaSolicitudes.length)} de {listaSolicitudes.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSolicitudesPage(p => p - 1)} disabled={solicitudesPage === 0}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-[11px] font-medium text-foreground">{solicitudesPage + 1} / {totalSolPages}</span>
                    <button onClick={() => setSolicitudesPage(p => p + 1)} disabled={solicitudesPage >= totalSolPages - 1}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Agenda del día */}
        {(() => {
          const totalAgendaPages = Math.max(1, Math.ceil(citasHoy.length / AGENDA_PAGE_SIZE))
          const citasHoyPaginadas = citasHoy.slice(agendaPage * AGENDA_PAGE_SIZE, agendaPage * AGENDA_PAGE_SIZE + AGENDA_PAGE_SIZE)
          return (
            <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
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
                  Array.from({ length: AGENDA_PAGE_SIZE }).map((_, i) => (
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
                  citasHoyPaginadas.map((c) => (
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
                  ))
                )}
              </div>
              {!loadingCitas && citasHoy.length > AGENDA_PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5">
                  <span className="text-[11px] text-muted-foreground">
                    {agendaPage * AGENDA_PAGE_SIZE + 1}–{Math.min((agendaPage + 1) * AGENDA_PAGE_SIZE, citasHoy.length)} de {citasHoy.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAgendaPage(p => p - 1)} disabled={agendaPage === 0}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-[11px] font-medium text-foreground">{agendaPage + 1} / {totalAgendaPages}</span>
                    <button onClick={() => setAgendaPage(p => p + 1)} disabled={agendaPage >= totalAgendaPages - 1}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      <BeneficiariosOrigenMapCard stateCounts={stateCounts} loading={loadingBenef} />

      {/* ── Control de membresías + Artículos bajos ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Control de membresías */}
        {(() => {
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
                            ? <img src={fotoUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none" }} />
                            : inicial
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[11px] font-semibold text-foreground">{nombre}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{b.ciudad || "—"}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${estatusStyle.cls}`}>
                            <span className={`size-1.5 rounded-full ${estatusStyle.dot}`} />
                            {b.estatus}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {b.diasRestantes == null
                              ? "Sin membresía"
                              : b.diasRestantes < 0
                                ? `Vencida hace ${Math.abs(b.diasRestantes)}d`
                                : b.diasRestantes === 0
                                  ? "Vence hoy"
                                  : `${b.diasRestantes}d restantes`}
                          </span>
                        </div>
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
        <ArticulosBajosPanel sinStock={sinStock} stockBajo={stockBajo} loading={loadingStock} />
      </div>

    </div>
  )
}
