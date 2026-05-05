"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateEstatusCita, type Cita } from "@/services/citas"

// ─── Constants ───────────────────────────────────────────────────────────────
const DIAS_CORTO = ["L", "M", "X", "J", "V", "S", "D"]
const DIAS_LARGO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 07:00 – 20:00
const CELL_H = 64 // px per hour

// ─── Status config ───────────────────────────────────────────────────────────
const S_BG: Record<string, string> = {
  Confirmada: "bg-emerald-900/40 border-emerald-500/30 text-emerald-300",
  Pendiente:  "bg-amber-900/40 border-amber-500/30 text-amber-300",
  Completada: "bg-sky-900/40 border-sky-500/30 text-sky-300",
  Cancelada:  "bg-red-900/30 border-red-500/25 text-red-300",
}
const S_DOT: Record<string, string> = {
  Confirmada: "bg-emerald-400", Pendiente: "bg-amber-400", Completada: "bg-sky-400", Cancelada: "bg-red-400",
}
const S_ACCENT: Record<string, string> = {
  Confirmada: "bg-emerald-400", Pendiente: "bg-amber-400", Completada: "bg-sky-400", Cancelada: "bg-red-500",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfWeek(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

function getWeekDates(offset: number, ref: Date): Date[] {
  const day = ref.getDay()
  const mon = new Date(ref)
  mon.setDate(ref.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
}

function citasForDay(list: Cita[], y: number, m: number, d: number) {
  return list.filter(c => {
    if (!c.fecha) return false
    const dt = new Date(c.fecha + "T12:00:00")
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d
  }).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""))
}

/** Top offset in px from HOURS[0] (07:00) */
function timeToTop(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return ((h - HOURS[0]) + m / 60) * CELL_H
}

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function AppointmentCard({
  cita, onAction, updatingId,
}: {
  cita: Cita
  onAction: (id: number, estatus: Cita["estatus"]) => void
  updatingId: number | null
}) {
  const [hovered, setHovered] = useState(false)
  const colorCls = S_BG[cita.estatus] ?? "bg-muted/30 border-border/40 text-foreground"
  const dotCls = S_DOT[cita.estatus] ?? "bg-muted-foreground"
  const accentCls = S_ACCENT[cita.estatus] ?? "bg-primary"

  return (
    <div
      className="relative group"
      style={{ zIndex: hovered ? 40 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Compact card */}
      <div
        className={`rounded-lg border text-xs px-2 py-1.5 cursor-pointer overflow-hidden transition-all duration-200
          ${colorCls}
          ${hovered ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`size-1.5 rounded-full shrink-0 ${dotCls}`} />
          <span className="font-bold truncate">{cita.hora}</span>
        </div>
        <p className="truncate opacity-80 text-[11px] leading-tight mt-0.5">{cita.beneficiario}</p>
      </div>

      {/* Pop-out expanded card (glassmorphism) */}
      {hovered && (
        <div
          className={`absolute left-0 top-0 z-50 min-w-[200px] max-w-[240px] rounded-xl border shadow-2xl backdrop-blur-md text-xs
            transition-all duration-200 animate-in fade-in zoom-in-95
            ${colorCls} bg-opacity-80`}
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          {/* Accent bar */}
          <div className={`h-1 w-full rounded-t-xl ${accentCls}`} />
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${dotCls}`} />
              <span className="font-bold text-sm">{cita.hora}</span>
              <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold border opacity-80 border-current">
                {cita.estatus}
              </span>
            </div>
            <div>
              <p className="font-semibold leading-tight">{cita.beneficiario}</p>
              {cita.especialista && (
                <p className="opacity-60 text-[10px] mt-0.5">{cita.especialista}</p>
              )}
            </div>
            {cita.notas && (
              <p className="italic opacity-50 text-[10px] border-t border-current/20 pt-2">"{cita.notas}"</p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1 pt-1">
              {cita.estatus === "Pendiente" && (
                <>
                  <ActionBtn label="Confirmar" color="emerald" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Confirmada")} />
                  <ActionBtn label="Cancelar" color="red" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Cancelada")} />
                </>
              )}
              {cita.estatus === "Confirmada" && (
                <>
                  <ActionBtn label="Completar" color="sky" disabled={updatingId === cita.id}
                    onClick={() => onAction(cita.id, "Completada")} />
                  <ActionBtn label="Cancelar" color="red" disabled={updatingId === cita.id}
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

function ActionBtn({ label, color, onClick, disabled }: {
  label: string; color: string; onClick: () => void; disabled: boolean
}) {
  const c: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35",
    red:     "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/35",
    sky:     "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/35",
  }
  return (
    <button
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick() }}
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40 ${c[color]}`}
    >
      {label}
    </button>
  )
}

// ─── CurrentTimeLine ─────────────────────────────────────────────────────────
function CurrentTimeLine({ isThisWeek }: { isThisWeek: boolean }) {
  const [now, setNow] = useState(new Date())
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    lineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  if (!isThisWeek) return null
  const top = timeToTop(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
  if (top < 0 || top > CELL_H * HOURS.length) return null

  return (
    <div
      ref={lineRef}
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}
    >
      <span className="size-2.5 rounded-full bg-primary shrink-0 -ml-1.5 shadow-[0_0_6px_2px_rgba(99,102,241,0.5)]" />
      <div className="h-px flex-1 bg-primary/70 shadow-[0_0_4px_rgba(99,102,241,0.4)]" />
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  citas: Cita[]
  onReload: () => void
  stats: { hoy: number; semana: number; pendientes: number }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CitasCalendarView({ citas, onReload, stats }: Props) {
  const today = useMemo(() => new Date(), [])
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [confirmPending, setConfirmPending] = useState<{ id: number; estatus: Cita["estatus"]; name: string } | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekDates = useMemo(() => getWeekDates(weekOffset, today), [weekOffset, today])

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfWeek(calYear, calMonth)

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const citasSemana = useMemo(() =>
    weekDates.map(d => ({
      date: d,
      citas: citasForDay(citas, d.getFullYear(), d.getMonth(), d.getDate()),
    })),
    [citas, weekDates]
  )

  // Is this week containing today?
  const isThisWeek = weekDates.some(d => sameDay(d, today))

  async function doUpdateEstatus(id: number, estatus: Cita["estatus"]) {
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

  const gridH = CELL_H * HOURS.length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Mini calendario */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-bold">{MESES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {DIAS_CORTO.map(d => (
              <div key={d} className="text-[10px] font-semibold text-muted-foreground pb-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dia => {
              const d = new Date(calYear, calMonth, dia)
              const dayCitas = citasForDay(citas, calYear, calMonth, dia)
              const hasCitas = dayCitas.length > 0
              const sel = sameDay(d, selectedDay)
              const tod = sameDay(d, today)
              // Color dots by status
              const dots = [
                dayCitas.some(c => c.estatus === "Pendiente") ? "bg-amber-400" : null,
                dayCitas.some(c => c.estatus === "Confirmada") ? "bg-emerald-400" : null,
                dayCitas.some(c => c.estatus === "Completada") ? "bg-sky-400" : null,
              ].filter(Boolean) as string[]

              return (
                <div key={dia} className="flex flex-col items-center">
                  <button
                    onClick={() => { setSelectedDay(d); setWeekOffset(Math.floor((d.getTime() - today.getTime()) / (7 * 86400000))) }}
                    className={`relative flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all
                      ${sel ? "bg-primary text-primary-foreground shadow-sm"
                        : tod ? "ring-1 ring-primary/50 text-primary"
                        : "text-foreground hover:bg-muted"}`}
                  >
                    {dia}
                  </button>
                  {/* Status dots */}
                  <div className="flex gap-0.5 h-1.5 items-center mt-0.5">
                    {hasCitas && !sel && dots.slice(0, 3).map((dot, i) => (
                      <span key={i} className={`size-1 rounded-full ${dot}`} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Métricas */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen</p>
          {[
            { label: "Hoy", val: stats.hoy, color: "text-foreground" },
            { label: "Esta semana", val: stats.semana, color: "text-primary" },
            { label: "Pendientes", val: stats.pendientes, color: "text-amber-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-xl font-bold tabular-nums ${color}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
        {/* Week nav bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <span className="text-sm font-semibold">
              {weekDates[0].getDate()} – {weekDates[6].getDate()} {MESES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(o => o - 1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => { setWeekOffset(0); setSelectedDay(today) }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              Hoy
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable grid */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Hours column */}
          <div className="shrink-0 w-12 border-r border-border/30 relative" style={{ height: `${gridH}px` }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground/60 font-medium leading-none -translate-y-1/2"
                style={{ top: `${(h - HOURS[0]) * CELL_H}px` }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
            {citasSemana.map(({ date, citas: dayCitas }, idx) => {
              const tod = sameDay(date, today)
              const sel = sameDay(date, selectedDay)
              return (
                <div
                  key={idx}
                  className={`flex flex-col border-r border-border/20 last:border-r-0 ${tod ? "bg-primary/[0.04]" : ""}`}
                >
                  {/* Day header */}
                  <div
                    className={`sticky top-0 z-10 flex flex-col items-center py-2 border-b border-border/30 cursor-pointer shrink-0
                      ${tod ? "bg-primary/10" : "bg-card"}`}
                    onClick={() => setSelectedDay(date)}
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DIAS_LARGO[idx]}</span>
                    <span className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold
                      ${sel ? "bg-primary text-primary-foreground" : tod ? "text-primary" : "text-foreground"}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Timed grid body */}
                  <div className="relative flex-1" style={{ height: `${gridH}px` }}>
                    {/* Hour grid lines */}
                    {HOURS.map((h, i) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-border/20"
                        style={{ top: `${i * CELL_H}px` }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {tod && <CurrentTimeLine isThisWeek={isThisWeek} />}

                    {/* Appointment cards */}
                    {dayCitas.map(cita => {
                      if (!cita.hora) return null
                      const top = timeToTop(cita.hora)
                      if (top < 0 || top > gridH) return null
                      return (
                        <div
                          key={cita.id}
                          className="absolute left-1 right-1"
                          style={{ top: `${top}px` }}
                        >
                          <AppointmentCard
                            cita={cita}
                            updatingId={updatingId}
                            onAction={(id, estatus) => setConfirmPending({ id, estatus, name: cita.beneficiario })}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Confirm dialog ─────────────────────────────────────────────────── */}
      {confirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
              <Button
                size="sm"
                variant={confirmPending.estatus === "Cancelada" ? "destructive" : "default"}
                disabled={updatingId !== null}
                onClick={() => doUpdateEstatus(confirmPending.id, confirmPending.estatus)}
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
