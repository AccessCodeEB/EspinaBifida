"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, Package, CreditCard, AlertTriangle, CheckCheck, Loader2, RefreshCw } from "lucide-react"
import {
  type Notificacion,
  type TipoNotificacion,
  getPendientes,
  getCount,
  marcarLeida,
  marcarTodasLeidas,
} from "@/services/notificaciones"

const TIPO_CONFIG: Record<TipoNotificacion, { label: string; icon: React.ElementType; color: string }> = {
  STOCK_BAJO:         { label: "Stock bajo",          icon: Package,      color: "text-orange-500" },
  MEMBRESIA_PROXIMA:  { label: "Membresía próxima",   icon: CreditCard,   color: "text-yellow-500" },
  MEMBRESIA_VENCIDA:  { label: "Membresía vencida",   icon: AlertTriangle, color: "text-red-500"   },
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
  const panelRef                            = useRef<HTMLDivElement>(null)

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

  // Al abrir el panel, carga los items
  useEffect(() => {
    if (open) fetchItems()
  }, [open, fetchItems])

  // Cerrar con click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  return (
    <div ref={panelRef} className="relative">
      {/* Botón campana */}
      <button
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

      {/* Panel desplegable */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-popover shadow-lg">
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
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-snug">{cfg.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{n.mensaje}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">{fmtFecha(n.fechaCreacion)}</p>
                      </div>
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
        </div>
      )}
    </div>
  )
}
