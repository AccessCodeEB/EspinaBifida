"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateEstatusCita, type Cita } from "@/services/citas"

// ─── Constants ────────────────────────────────────────────────────────────────
const DIAS_CORTO  = ["L", "M", "X", "J", "V", "S", "D"]
const DIAS_LARGO  = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES       = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const START_HOUR  = 7   // grid starts 07:00
const END_HOUR    = 22  // grid ends   22:00
const CELL_H      = 48  // px per hour  ← reduced (was 64)
const HOURS       = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)
const GRID_H      = CELL_H * (END_HOUR - START_HOUR)

// ─── Status palette ───────────────────────────────────────────────────────────
const S_BG: Record<string, string> = {
  Confirmada: "bg-emerald-900/40 border-emerald-500/30 text-emerald-200",
  Pendiente:  "bg-amber-900/40  border-amber-500/30  text-amber-200",
  Completada: "bg-sky-900/40    border-sky-500/30    text-sky-200",
  Cancelada:  "bg-red-900/30    border-red-500/25    text-red-200",
}
const S_DOT: Record<string, string> = {
  Confirmada: "bg-emerald-400", Pendiente: "bg-amber-400",
  Completada: "bg-sky-400",     Cancelada: "bg-red-400",
}
const S_ACCENT: Record<string, string> = {
  Confirmada: "bg-emerald-400", Pendiente: "bg-amber-400",
  Completada: "bg-sky-400",     Cancelada: "bg-red-500",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1   // Mon=0
}
function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

/**
 * Returns the Monday of the week that contains `date`.
 * FIX #1 — single source of truth: we always derive weekDates from a `weekAnchor` (the Monday).
 */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDatesFrom(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function citasForDay(list: Cita[], y: number, m: number, d: number) {
  return list.filter(c => {
    if (!c.fecha) return false
    const dt = new Date(c.fecha + "T12:00:00")
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d
  })
}

/** Minutes from midnight for a "HH:MM" string */
function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

/** Top offset in px from START_HOUR */
function timeToTop(hora: string): number {
  const mins = toMinutes(hora)
  return ((mins - START_HOUR * 60) / 60) * CELL_H
}

/**
 * FIX #5 — Overlap layout.
 * Returns { top, height, left, width } in px for each cita in a day.
 * Overlapping citas get split into columns (like Google Calendar).
 */
interface LayoutItem { cita: Cita; top: number; height: number; left: number; width: number }

function computeLayout(dayCitas: Cita[]): LayoutItem[] {
  const DEFAULT_DURATION = 30 // minutes assumed when no end time
  const items = dayCitas.map(c => ({
    cita: c,
    start: toMinutes(c.hora || "08:00"),
    end:   toMinutes(c.hora || "08:00") + DEFAULT_DURATION,
  }))

  // Build columns
  const columns: (typeof items[0])[][] = []

  for (const item of items) {
    let placed = false
    for (const col of columns) {
      const lastInCol = col[col.length - 1]
      if (lastInCol.end <= item.start) {
        col.push(item)
        placed = true
        break
      }
    }
    if (!placed) columns.push([item])
  }

  const totalCols = columns.length
  const colW = 100 / totalCols

  const result: LayoutItem[] = []
  columns.forEach((col, colIdx) => {
    col.forEach(item => {
      const top    = ((item.start - START_HOUR * 60) / 60) * CELL_H
      const height = Math.max(((item.end - item.start) / 60) * CELL_H, 22) // min 22px
      result.push({
        cita:   item.cita,
        top,
        height,
        left:   colIdx * colW,
        width:  colW,
      })
    })
  })
  return result
}

// ─── Current time indicator ───────────────────────────────────────────────────
function CurrentTimeLine() {
  const [now, setNow] = useState(new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // FIX #4 — scroll into view on mount
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const top = timeToTop(
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
  )
  if (top < 0 || top > GRID_H) return null

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}
    >
      <span className="size-2.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_2px_rgba(99,102,241,0.5)]" />
      <div className="h-[1.5px] flex-1 bg-primary/80 shadow-[0_0_4px_rgba(99,102,241,0.4)]" />
    </div>
  )
}

// ─── Appointment pop-card ─────────────────────────────────────────────────────
function AppCard({ cita, height, onAction, updatingId }: {
  cita: Cita; height: number
  onAction: (id: number, estatus: Cita["estatus"]) => void
  updatingId: number | null
}) {
  const [open, setOpen] = useState(false)
  const dot    = S_DOT[cita.estatus]    ?? "bg-muted-foreground"
  const bg     = S_BG[cita.estatus]     ?? "bg-muted/30 border-border/40 text-foreground"
  const accent = S_ACCENT[cita.estatus] ?? "bg-primary"
  const compact = height < 40

  return (
    <div
      className="relative group select-none"
      style={{ zIndex: open ? 40 : 1 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Compact card */}
      <div
        className={`w-full h-full rounded-md border px-1.5 py-1 text-[11px] leading-tight overflow-hidden cursor-pointer transition-opacity duration-150 ${bg}
          ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="flex items-center gap-1 font-bold truncate">
          <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
          {cita.hora}
        </div>
        {!compact && <p className="truncate opacity-80 mt-0.5">{cita.beneficiario}</p>}
      </div>

      {/* Pop-out (glassmorphism) */}
      {open && (
        <div
          className={`absolute left-0 top-0 z-50 min-w-[190px] max-w-[230px] rounded-xl border shadow-2xl backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-150 ${bg}`}
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)" }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className={`h-1 w-full rounded-t-xl ${accent}`} />
          <div className="p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${dot}`} />
              <span className="font-bold">{cita.hora}</span>
              <span className="ml-auto rounded-full border border-current px-1.5 py-px text-[9px] font-semibold opacity-70">
                {cita.estatus}
              </span>
            </div>
            <p className="font-semibold leading-snug">{cita.beneficiario}</p>
            {cita.especialista && <p className="opacity-50 text-[10px]">{cita.especialista}</p>}
            {cita.notas && (
              <p className="italic opacity-40 text-[10px] border-t border-current/20 pt-1.5">"{cita.notas}"</p>
            )}
            <div className="flex flex-wrap gap-1 pt-1">
              {cita.estatus === "Pendiente" && (
                <>
                  <ABtn label="Confirmar" color="emerald" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Confirmada")} />
                  <ABtn label="Cancelar" color="red" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Cancelada")} />
                </>
              )}
              {cita.estatus === "Confirmada" && (
                <>
                  <ABtn label="Completar" color="sky" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Completada")} />
                  <ABtn label="Cancelar" color="red" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Cancelada")} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ABtn({ label, color, onClick, disabled }: {
  label: string; color: string; onClick: () => void; disabled: boolean
}) {
  const c: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35",
    red:     "bg-red-500/20     text-red-300     border-red-500/40     hover:bg-red-500/35",
    sky:     "bg-sky-500/20     text-sky-300     border-sky-500/40     hover:bg-sky-500/35",
  }
  return (
    <button disabled={disabled} onClick={e => { e.stopPropagation(); onClick() }}
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40 ${c[color]}`}>
      {label}
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  citas: Cita[]
  onReload: () => void
  stats: { hoy: number; semana: number; pendientes: number }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CitasCalendarView({ citas, onReload, stats }: Props) {
  // FIX #1 — single source of truth: weekAnchor is always the Monday of the visible week
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => getMondayOf(new Date()))

  // Mini-calendar navigation (month/year displayed, independent of weekAnchor)
  const [calYear, setCalYear]   = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const weekDates = useMemo(() => getWeekDatesFrom(weekAnchor), [weekAnchor])

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay    = getFirstDayOfWeek(calYear, calMonth)

  /** Navigate mini-calendar month */
  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  /** FIX #1 — clicking a day in mini-calendar syncs the weekly grid */
  function handleDayClick(d: Date) {
    setWeekAnchor(getMondayOf(d))
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  // Citas per week-day
  const citasSemana = useMemo(() =>
    weekDates.map(d => ({
      date:  d,
      items: computeLayout(
        citasForDay(citas, d.getFullYear(), d.getMonth(), d.getDate())
          .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""))
      ),
    })),
    [citas, weekDates]
  )

  const isThisWeek = weekDates.some(d => sameDay(d, today))

  // Confirm dialog
  const [updatingId, setUpdatingId]       = useState<number | null>(null)
  const [confirmPending, setConfirmPending] = useState<{ id: number; estatus: Cita["estatus"]; name: string } | null>(null)

  async function doUpdate(id: number, estatus: Cita["estatus"]) {
    setUpdatingId(id)
    try {
      await updateEstatusCita(id, estatus)
      toast.success(`Cita marcada como ${estatus}`)
      onReload()
      setConfirmPending(null)
    } catch {
      toast.error("No se pudo actualizar el estatus.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Mini-calendar */}
        <div className="rounded-2xl border border-border/50 bg-card p-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-bold">{MESES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DIAS_CORTO.map(d => (
              <span key={d} className="text-[9px] font-semibold text-muted-foreground">{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dia => {
              const d = new Date(calYear, calMonth, dia)
              const dayCitas = citasForDay(citas, calYear, calMonth, dia)
              // FIX #2 — colored dots by status
              const dotColors = [
                dayCitas.some(c => c.estatus === "Pendiente")  ? "bg-amber-400"   : null,
                dayCitas.some(c => c.estatus === "Confirmada") ? "bg-emerald-400" : null,
                dayCitas.some(c => c.estatus === "Completada") ? "bg-sky-400"     : null,
              ].filter(Boolean) as string[]

              const isInWeek  = weekDates.some(w => sameDay(w, d))
              const isToday   = sameDay(d, today)
              return (
                <div key={dia} className="flex flex-col items-center">
                  <button
                    onClick={() => handleDayClick(d)}
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium transition-all
                      ${isToday   ? "bg-primary text-primary-foreground shadow-sm"
                        : isInWeek ? "bg-primary/20 text-primary"
                        : "text-foreground hover:bg-muted"}`}
                  >
                    {dia}
                  </button>
                  {/* FIX #2 — dots */}
                  <div className="flex gap-px h-1.5 items-center mt-0.5">
                    {dotColors.slice(0, 3).map((c, i) => (
                      <span key={i} className={`size-1 rounded-full ${c}`} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Résumen */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumen</p>
          {[
            { label: "Hoy",          val: stats.hoy,         color: "text-foreground" },
            { label: "Esta semana",  val: stats.semana,      color: "text-primary"    },
            { label: "Pendientes",   val: stats.pendientes,  color: "text-amber-400"  },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-xl font-bold tabular-nums ${color}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col min-h-0">

        {/* Week nav bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <span className="text-sm font-semibold">
              {weekDates[0].getDate()} – {weekDates[6].getDate()} {MESES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekAnchor(w => { const p = new Date(w); p.setDate(w.getDate()-7); return p })}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            ><ChevronLeft className="size-4" /></button>
            <button
              onClick={() => { const m = getMondayOf(new Date()); setWeekAnchor(m); setCalYear(m.getFullYear()); setCalMonth(m.getMonth()) }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >Hoy</button>
            <button
              onClick={() => setWeekAnchor(w => { const n = new Date(w); n.setDate(w.getDate()+7); return n })}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            ><ChevronRight className="size-4" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>

          {/* Hours column */}
          <div className="shrink-0 w-14 border-r border-border/30 relative" style={{ height: `${GRID_H}px` }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground/50 font-medium leading-none"
                style={{ top: `${i * CELL_H - 7}px` }}  // -7 to center on the line
              >
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(7, minmax(0,1fr))` }}>

            {citasSemana.map(({ date, items }, colIdx) => {
              const isToday  = sameDay(date, today)
              const isInWeek = weekDates.some(w => sameDay(w, date))
              return (
                <div
                  key={colIdx}
                  className={`flex flex-col border-r border-border/20 last:border-r-0 ${isToday ? "bg-primary/[0.035]" : ""}`}
                >
                  {/* Day header */}
                  <div
                    className={`sticky top-0 z-10 flex flex-col items-center py-2 border-b border-border/30 cursor-pointer shrink-0
                      ${isToday ? "bg-primary/10" : "bg-card"}`}
                    onClick={() => handleDayClick(date)}
                  >
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{DIAS_LARGO[colIdx]}</span>
                    <span className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold
                      ${isToday ? "bg-primary text-primary-foreground" : isInWeek ? "text-primary" : "text-foreground"}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Timed body */}
                  <div className="relative" style={{ height: `${GRID_H}px` }}>
                    {/* Hour grid lines */}
                    {HOURS.map((_, i) => (
                      <div key={i} className="absolute left-0 right-0 border-t border-border/15"
                        style={{ top: `${i * CELL_H}px` }} />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map((_, i) => (
                      <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-border/[0.07]"
                        style={{ top: `${i * CELL_H + CELL_H / 2}px` }} />
                    ))}

                    {/* FIX #4 — current time line (only on today's column) */}
                    {isToday && isThisWeek && <CurrentTimeLine />}

                    {/* FIX #5 — Appointment cards with overlap layout */}
                    {items.map(({ cita, top, height, left, width }) => (
                      <div
                        key={cita.id}
                        className="absolute px-px"
                        style={{
                          top:    `${top}px`,
                          height: `${height}px`,
                          left:   `${left}%`,
                          width:  `${width}%`,
                        }}
                      >
                        <AppCard
                          cita={cita}
                          height={height}
                          updatingId={updatingId}
                          onAction={(id, estatus) =>
                            setConfirmPending({ id, estatus, name: cita.beneficiario })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Confirm dialog ───────────────────────────────────────────────── */}
      {confirmPending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold mb-2">Confirmar cambio</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Marcar la cita de <strong className="text-foreground">{confirmPending.name}</strong> como{" "}
              <strong className="text-foreground">{confirmPending.estatus}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmPending(null)} disabled={updatingId !== null}>
                Cancelar
              </Button>
              <Button size="sm"
                variant={confirmPending.estatus === "Cancelada" ? "destructive" : "default"}
                disabled={updatingId !== null}
                onClick={() => doUpdate(confirmPending.id, confirmPending.estatus)}
              >
                {updatingId !== null ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
