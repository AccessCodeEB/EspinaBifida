"use client"

import { createPortal } from "react-dom"
import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, Package, CreditCard, AlertTriangle, CheckCheck, Loader2, RefreshCw, ClipboardList, UserX, CalendarClock, FileText, X, ChevronRight, RotateCcw } from "lucide-react"
import {
  type Notificacion,
  type TipoNotificacion,
  getPendientes,
  getCount,
  marcarLeida,
  marcarTodasLeidas,
} from "@/services/notificaciones"
import { getInventario, type ArticuloInventario } from "@/services/inventario"
import { getComodatos, type Comodato } from "@/services/comodatos"

const TIPO_CONFIG: Record<TipoNotificacion, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  STOCK_BAJO:         { label: "Stock bajo",           icon: Package,       color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  SIN_STOCK:          { label: "Sin stock",            icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30"      },
  MEMBRESIA_PROXIMA:  { label: "Membresía próxima",    icon: CreditCard,    color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  MEMBRESIA_VENCIDA:  { label: "Membresía vencida",    icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30"     },
  PREREGISTRO_NUEVO:  { label: "Pre-registro nuevo",   icon: ClipboardList, color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30"   },
  BENEFICIARIO_BAJA:  { label: "Beneficiario de baja", icon: UserX,         color: "text-gray-500",   bg: "bg-gray-50 dark:bg-gray-950/30"   },
  CITA_HOY:           { label: "Cita sin confirmar",   icon: CalendarClock, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  REPORTE_GENERADO:     { label: "Reporte generado",     icon: FileText,      color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950/30"   },
  COMODATO_POR_VENCER:  { label: "Préstamo por vencer",  icon: RotateCcw,     color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30"   },
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export function NotificacionesPanel() {
  const [open, setOpen]                     = useState(false)
  const [count, setCount]                   = useState(0)
  const [items, setItems]                   = useState<Notificacion[]>([])
  const [loadingItems, setLoadingItems]     = useState(false)
  const [markingId, setMarkingId]           = useState<number | null>(null)
  const [dropdownPos, setDropdownPos]       = useState<{ top: number; right: number } | null>(null)
  const wrapperRef                          = useRef<HTMLDivElement>(null)
  const buttonRef                           = useRef<HTMLButtonElement>(null)
  const dropdownRef                         = useRef<HTMLDivElement>(null)

  const [detailNotif, setDetailNotif]           = useState<Notificacion | null>(null)
  const [detailArticulos, setDetailArticulos]   = useState<ArticuloInventario[]>([])
  const [detailComodatos, setDetailComodatos]   = useState<Comodato[]>([])
  const [loadingDetail, setLoadingDetail]       = useState(false)

  const fetchCount = useCallback(async () => {
    try {
      const res = await getCount()
      setCount(res.total)
    } catch {
      // silencioso
    }
  }, [])

  const fetchItems = useCallback(async () => {
    setLoadingItems(true)
    try {
      const res = await getPendientes()
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }, [])

  // Cuenta inicial y refresco cada 2 minutos
  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, 120_000)
    return () => clearInterval(t)
  }, [fetchCount])

  // Al abrir: calcular posición del dropdown y cargar items
  useEffect(() => {
    if (!open) return
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    fetchItems()
  }, [open, fetchItems])

  // Cerrar con click fuera (wrapper + dropdown portal)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inWrapper  = wrapperRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inWrapper && !inDropdown) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleMarcarLeida = async (id: number) => {
    setMarkingId(id)
    try {
      await marcarLeida(id)
      setItems(prev => prev.filter(n => n.idNotificacion !== id))
      setCount(prev => Math.max(0, prev - 1))
    } catch {
      // silencioso
    } finally {
      setMarkingId(null)
    }
  }

  const handleMarcarTodas = async () => {
    try {
      await marcarTodasLeidas()
      setItems([])
      setCount(0)
    } catch {
      // silencioso
    }
  }

  const handleAbrirDetalle = async (n: Notificacion) => {
    setDetailNotif(n)
    if (n.tipo === "STOCK_BAJO") {
      setLoadingDetail(true)
      try {
        const inv = await getInventario()
        setDetailArticulos(inv.filter(a => a.cantidad > 0 && a.minimo > 0 && a.cantidad <= a.minimo))
      } catch {
        setDetailArticulos([])
      } finally {
        setLoadingDetail(false)
      }
    } else if (n.tipo === "SIN_STOCK") {
      setLoadingDetail(true)
      try {
        const inv = await getInventario()
        setDetailArticulos(inv.filter(a => a.cantidad === 0))
      } catch {
        setDetailArticulos([])
      } finally {
        setLoadingDetail(false)
      }
    } else if (n.tipo === "COMODATO_POR_VENCER") {
      setLoadingDetail(true)
      try {
        const hoy = new Date()
        const limite = new Date(hoy); limite.setDate(hoy.getDate() + 5)
        const res = await getComodatos({ estatus: "Activo", limit: 200 })
        const porVencer = (res.data ?? []).filter(c => {
          if (!c.fechaDevolucionEsperada) return false
          const fecha = new Date(c.fechaDevolucionEsperada)
          return fecha <= limite
        }).sort((a, b) =>
          new Date(a.fechaDevolucionEsperada ?? "").getTime() -
          new Date(b.fechaDevolucionEsperada ?? "").getTime()
        )
        setDetailComodatos(porVencer)
      } catch {
        setDetailComodatos([])
      } finally {
        setLoadingDetail(false)
      }
    }
  }

  const cerrarDetalle = () => {
    setDetailNotif(null)
    setDetailArticulos([])
    setDetailComodatos([])
  }

  // Modal de detalle
  const detailModal = detailNotif
    ? createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onMouseDown={e => { if (e.target === e.currentTarget) cerrarDetalle() }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl flex flex-col max-h-[80vh]">
            {/* Header del modal */}
            {(() => {
              const cfg = TIPO_CONFIG[detailNotif.tipo] ?? TIPO_CONFIG.STOCK_BAJO
              const Icon = cfg.icon
              return (
                <div className={`flex items-center gap-3 rounded-t-xl px-5 py-4 border-b border-border ${cfg.bg}`}>
                  <div className={`flex size-8 items-center justify-center rounded-lg bg-background/80 ${cfg.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtFecha(detailNotif.fechaCreacion)}</p>
                  </div>
                  <button
                    onClick={cerrarDetalle}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )
            })()}

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {detailNotif.tipo === "STOCK_BAJO" ? (
                loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailArticulos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay artículos con stock bajo en este momento.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      {detailArticulos.length} artículo{detailArticulos.length !== 1 ? "s" : ""} afectado{detailArticulos.length !== 1 ? "s" : ""}
                    </p>
                    {detailArticulos.map((a, i) => {
                      const sinStock = a.cantidad === 0
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                            sinStock
                              ? "bg-red-50 dark:bg-red-950/30"
                              : "bg-amber-50 dark:bg-amber-950/20"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{a.descripcion}</p>
                            <p className="text-[10px] text-muted-foreground">Mínimo: {a.minimo} {a.unidad}</p>
                          </div>
                          <span className={`ml-3 shrink-0 text-sm font-bold tabular-nums ${
                            sinStock ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {a.cantidad} {a.unidad}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : detailNotif.tipo === "SIN_STOCK" ? (
                loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailArticulos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay artículos sin stock en este momento.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      {detailArticulos.length} artículo{detailArticulos.length !== 1 ? "s" : ""} sin stock
                    </p>
                    {detailArticulos.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-red-50 dark:bg-red-950/30">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{a.descripcion}</p>
                          <p className="text-[10px] text-muted-foreground">{a.unidad}</p>
                        </div>
                        <span className="ml-3 shrink-0 text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                          0 <span className="text-[10px] font-normal text-muted-foreground">{a.unidad}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : detailNotif.tipo === "COMODATO_POR_VENCER" ? (
                loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailComodatos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay comodatos por vencer en los próximos 5 días.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      {detailComodatos.length} comodato{detailComodatos.length !== 1 ? "s" : ""} por vencer o vencido{detailComodatos.length !== 1 ? "s" : ""}
                    </p>
                    {detailComodatos.map((c) => {
                      const hoy = new Date()
                      const fecha = c.fechaDevolucionEsperada ? new Date(c.fechaDevolucionEsperada) : null
                      const dias = fecha ? Math.round((fecha.getTime() - hoy.setHours(0,0,0,0)) / 86400000) : null
                      const vencido = dias !== null && dias < 0
                      const hoyMismo = dias === 0
                      return (
                        <div
                          key={c.idComodato}
                          className={`rounded-lg px-3 py-2.5 ${vencido ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/20"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{c.beneficiario ?? c.curp}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{c.articulo ?? "Equipo médico"}</p>
                            </div>
                            <span className={`shrink-0 text-[11px] font-bold tabular-nums ${vencido ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {vencido
                                ? `Vencido hace ${Math.abs(dias!)} día${Math.abs(dias!) !== 1 ? "s" : ""}`
                                : hoyMismo
                                  ? "Vence hoy"
                                  : `${dias} día${dias !== 1 ? "s" : ""}`
                              }
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{detailNotif.mensaje}</p>
              )}
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <button
                onClick={cerrarDetalle}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  await handleMarcarLeida(detailNotif.idNotificacion)
                  cerrarDetalle()
                }}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-80 transition-opacity"
              >
                <CheckCheck className="size-3.5" />
                Marcar como leída
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  const dropdown = open && dropdownPos
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-80 rounded-xl border border-border bg-popover shadow-lg"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notificaciones</span>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchItems}
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Recargar"
              >
                <RefreshCw className="size-3.5" />
              </button>
              {items.length > 1 && (
                <button
                  onClick={handleMarcarTodas}
                  className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <Bell className="size-7 opacity-30" />
                <p className="text-xs">Sin notificaciones pendientes</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map(n => {
                  const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.STOCK_BAJO
                  const Icon = cfg.icon
                  const isMarking = markingId === n.idNotificacion
                  return (
                    <li key={n.idNotificacion} className="flex gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                      <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                        <Icon className="size-4" />
                      </div>
                      {/* Cuerpo clickeable — abre detalle */}
                      <button
                        className="flex-1 min-w-0 text-left group"
                        onClick={() => handleAbrirDetalle(n)}
                      >
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-foreground leading-snug">{cfg.label}</p>
                          <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{n.mensaje}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">{fmtFecha(n.fechaCreacion)}</p>
                      </button>
                      <button
                        onClick={() => handleMarcarLeida(n.idNotificacion)}
                        disabled={isMarking}
                        className="shrink-0 self-center rounded p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        title="Marcar como leída"
                      >
                        {isMarking
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <CheckCheck className="size-3.5" />
                        }
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <p className="text-center text-[10px] text-muted-foreground">
                {items.length} pendiente{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={wrapperRef} className="relative">
      {/* Botón campana */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Notificaciones"
      >
        <Bell className="size-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {dropdown}
      {detailModal}
    </div>
  )
}
