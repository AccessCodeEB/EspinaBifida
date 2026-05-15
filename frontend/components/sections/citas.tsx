"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, CalendarDays, List, AlertCircle, ChevronDown, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCitas, createCita, type Cita } from "@/services/citas"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import { TIPOS_SERVICIO_SUGERIDOS } from "@/services/servicios"
import { CitasCalendarView, validateSlot } from "@/components/sections/citas-calendar-view"
import { CitasListView } from "@/components/sections/citas-list-view"

// 30-min time slots 08:00 – 20:00
const TIME_SLOTS = Array.from({length: 25}, (_,i) => {
  const h = 8 + Math.floor(i / 2), m = i % 2 === 0 ? "00" : "30"
  return `${String(h).padStart(2,"0")}:${m}`
}).filter(t => {
  const [h] = t.split(":").map(Number); return h < 20
})
const ESPECIALISTAS = [
  "Dr. Roberto Méndez - Neurología",
  "Dra. Patricia Solís - Rehabilitación",
  "Lic. Carmen Ruiz - Psicología",
  "Dr. Miguel Torres - Urología",
]
const EMPTY_FORM = { curp: "", idTipoServicio: "", especialista: "", fecha: "", hora: "", notas: "" }

type ActiveView = "calendar" | "list"

export function CitasSection() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>("calendar")
  const [viewVisible, setViewVisible] = useState(true)

  // Dialog nueva cita
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null)
  const [isFindingSlot, setIsFindingSlot] = useState(false)

  // Beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [buscaBenef, setBuscaBenef] = useState("")
  const [showBenefList, setShowBenefList] = useState(false)

  const loadCitas = useCallback((silent=false) => {
    if(!silent) setLoading(true)
    getCitas()
      .then(setCitas)
      .catch(err => setError(err?.message ?? "Error al cargar citas"))
      .finally(() => { if(!silent) setLoading(false) })
  }, [])

  /** Updates citas in-place without triggering the loading spinner */
  const silentUpdate = useCallback((updater:(prev:Cita[])=>Cita[]) => {
    setCitas(updater)
  }, [])

  useEffect(() => {
    loadCitas()
    getBeneficiarios().then(setBeneficiarios).catch(() => {})
  }, [loadCitas])

  const today = useMemo(() => new Date(), [])

  const stats = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0]
    const hoy = citas.filter(c => c.fecha === todayStr).length
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      const day = today.getDay()
      const mon = new Date(today)
      mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
      d.setDate(mon.getDate() + i)
      weekDates.push(d.toISOString().split("T")[0])
    }
    const semana = citas.filter(c => weekDates.includes(c.fecha)).length
    const pendientes = citas.filter(c => c.estatus === "Pendiente").length
    return { hoy, semana, pendientes }
  }, [citas, today])

  // Smooth view transition
  function switchView(view: ActiveView) {
    if (view === activeView) return
    setViewVisible(false)
    setTimeout(() => { setActiveView(view); setViewVisible(true) }, 180)
  }

  const benefFiltrados = useMemo(() => {
    const sorted = [...beneficiarios].sort((a, b) => a.nombres.localeCompare(b.nombres))
    const q = buscaBenef.toLowerCase().trim()
    if (!q) return sorted
    return sorted.filter(b =>
      b.folio?.toLowerCase().includes(q) ||
      `${b.nombres} ${b.apellidoPaterno}`.toLowerCase().includes(q)
    )
  }, [beneficiarios, buscaBenef])

  function openDialog() {
    setForm(EMPTY_FORM)
    setSaveError(null)
    setSmartSuggestion(null)
    setBuscaBenef("")
    setShowBenefList(false)
    setShowDialog(true)
  }

  function handleSuggestSmartSlot() {
    // Guard - button should already be visually disabled, but double-check
    if (!form.curp || !form.especialista) return

    setIsFindingSlot(true)
    setSmartSuggestion(null)
    setSaveError(null)

    // Paso B: Búsqueda iterativa
    const startDate = form.fecha ? new Date(form.fecha + "T12:00:00") : new Date()
    const SLOTS: string[] = []
    for (let h = 8; h < 20; h++) {
      SLOTS.push(`${String(h).padStart(2, "0")}:00`)
      SLOTS.push(`${String(h).padStart(2, "0")}:30`)
    }

    let found = false
    for (let dayOffset = 0; dayOffset < 7 && !found; dayOffset++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + dayOffset)
      const fechaStr = d.toISOString().split("T")[0]

      for (const hora of SLOTS) {
        const error = validateSlot(citas, fechaStr, hora, form.especialista, form.curp)
        if (!error) {
          // Paso C: Hallazgo — aplicar al formulario
          setForm(f => ({ ...f, fecha: fechaStr, hora }))
          const label = dayOffset === 0 ? "hoy" : dayOffset === 1 ? "mañana" : `en ${dayOffset} días`
          setSmartSuggestion(`✨ Horario ideal encontrado: ${fechaStr} a las ${hora} (${label})`)
          toast.success("¡Horario ideal encontrado y aplicado!", { description: `${fechaStr} · ${hora}` })
          found = true
          break
        }
      }
    }

    // Paso D: Fallback si no encontró nada en 7 días
    if (!found) {
      toast.error("No se encontró disponibilidad en los próximos 7 días.")
      setSmartSuggestion(null)
    }

    setIsFindingSlot(false)
  }

  async function handleGuardar() {
    const missing: string[] = []
    if (!form.curp) missing.push("beneficiario")
    if (!form.idTipoServicio) missing.push("tipo de servicio")
    if (!form.fecha) missing.push("fecha")
    if (!form.hora) missing.push("hora")
    if (missing.length > 0) { setSaveError(`Selecciona: ${missing.join(", ")}.`); return }
    const slotError = validateSlot(citas, form.fecha, form.hora, form.especialista, form.curp)
    if (slotError) { setSaveError(slotError); return }
    setSaving(true); setSaveError(null)
    try {
      await createCita({
        curp: form.curp,
        idTipoServicio: Number(form.idTipoServicio),
        especialista: form.especialista || undefined,
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas || undefined,
      })
      setShowDialog(false)
      loadCitas()
      toast.success("Cita agendada correctamente", {
        description: `${form.fecha} · ${form.hora}`,
      })
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Error al guardar la cita.")
      toast.error((err as Error)?.message ?? "Error al guardar la cita.")
    } finally {
      setSaving(false)
    }
  }

  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Citas</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Gestión y agenda de citas con especialistas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* KPIs integrados */}
          {!loading && [
            { label: "Hoy",      value: stats.hoy,       color: NAVY },
            { label: "Semana",   value: stats.semana,    color: "#10b981" },
            { label: "Pendientes",value: stats.pendientes, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 shadow-sm">
              <div className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-xs font-semibold text-foreground">
                {value} <span className="font-medium text-muted-foreground ml-0.5">{label}</span>
              </p>
            </div>
          ))}

          <div className="hidden md:block w-px h-6 bg-border/40 mx-1" />

          {/* Toggle vista */}
          <div className="flex h-9 items-center rounded-lg border border-border/70 bg-card p-0.5 shadow-sm shrink-0">
            {(["calendar", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`flex h-full items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all ${
                  activeView === v
                    ? "bg-[#0f4c81] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "calendar" ? <><CalendarDays className="size-3.5" />Agenda</> : <><List className="size-3.5" />Historial</>}
              </button>
            ))}
          </div>

          <button
            onClick={openDialog}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-3.5" />Nueva Cita
          </button>
        </div>
      </div>

      {/* ── Main view (con fade) ── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground text-sm">Cargando citas...</p>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : (
        <div
          style={{ transition: "opacity 180ms ease, transform 180ms ease" }}
          className={viewVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
        >
          {activeView === "calendar" ? (
            <CitasCalendarView
              citas={citas}
              onReload={()=>loadCitas(true)}
              onSilentUpdate={silentUpdate}
              stats={stats}
            />
          ) : (
            <CitasListView citas={citas} beneficiarios={beneficiarios} />
          )}
        </div>
      )}

      {/* ── Dialog Nueva Cita ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="border-b border-border/40 px-6 py-4">
            <DialogTitle className="text-base font-bold">Agendar nueva cita</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">Programa una visita con un especialista médico</DialogDescription>
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Beneficiario */}
            <div className="relative space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Beneficiario</label>
              <div className="relative">
                <Input
                  placeholder="Buscar por folio o nombre..."
                  className="h-10 pr-8 text-sm"
                  value={buscaBenef}
                  onFocus={() => setShowBenefList(true)}
                  onChange={e => { setBuscaBenef(e.target.value); setForm(f => ({ ...f, curp: "" })); setShowBenefList(true); setSaveError(null) }}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowBenefList(!showBenefList)}>
                  <ChevronDown className="size-4" />
                </button>
              </div>
              {showBenefList && benefFiltrados.length > 0 && !form.curp && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-border/60 bg-background shadow-lg">
                  {benefFiltrados.map(b => (
                    <button key={b.folio} type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-muted transition-colors"
                      onClick={() => { setForm(f => ({ ...f, curp: b.folio })); setBuscaBenef(`${b.nombres} ${b.apellidoPaterno} (${b.folio})`); setShowBenefList(false); setSaveError(null) }}>
                      <span className="font-semibold text-foreground">{b.nombres} {b.apellidoPaterno}</span>
                      <span className="font-mono text-muted-foreground">{b.folio}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.curp && <p className="text-[11px] font-medium text-emerald-600">✓ Seleccionado: {form.curp}</p>}
              {!form.curp && buscaBenef && <p className="text-[11px] text-amber-600">Selecciona un beneficiario de la lista</p>}
            </div>

            {/* Tipo de Servicio */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de servicio</label>
              <Select value={form.idTipoServicio} onValueChange={v => { setForm(f => ({ ...f, idTipoServicio: v })); setSaveError(null) }}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICIO_SUGERIDOS.map(t => <SelectItem key={t.idTipoServicio} value={String(t.idTipoServicio)}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Especialista */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Especialista <span className="font-normal normal-case tracking-normal opacity-60">(opcional)</span></label>
              <Select value={form.especialista} onValueChange={v => { setForm(f => ({ ...f, especialista: v })); setSaveError(null) }}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar especialista" /></SelectTrigger>
                <SelectContent>
                  {ESPECIALISTAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y Hora + Smart Slot */}
            <div className="space-y-2">
              {/* Botón IA — locked hasta que se seleccione beneficiario + especialista */}
              {(() => {
                const isUnlocked = !!(form.curp && form.especialista)
                return (
                  <button
                    type="button"
                    onClick={isUnlocked ? handleSuggestSmartSlot : undefined}
                    disabled={isFindingSlot}
                    className={[
                      "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300",
                      isUnlocked
                        ? "border-white/10 hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] cursor-pointer"
                        : "border-border/30 cursor-not-allowed",
                    ].join(" ")}
                    style={isUnlocked
                      ? { background: "linear-gradient(135deg, rgba(15,76,129,0.5) 0%, rgba(13,148,136,0.3) 100%)", backdropFilter: "blur(8px)" }
                      : { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }
                    }
                    title={!isUnlocked ? "Selecciona un beneficiario y especialista para activar" : undefined}
                  >
                    {/* Hover glow - only when unlocked */}
                    {isUnlocked && <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}

                    {/* Lock icon when locked */}
                    {!isUnlocked && (
                      <svg className="size-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}

                    {isFindingSlot ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                        <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">Buscando horario ideal...</span>
                      </>
                    ) : isUnlocked ? (
                      <>
                        <Sparkles className="size-3.5 text-sky-400" />
                        <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">Sugerir mejor horario</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/50">Sugerir mejor horario</span>
                    )}
                  </button>
                )
              })()}

              {/* Inputs Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fecha</label>
                  <Input type="date" className="h-10 text-sm" value={form.fecha}
                    onChange={e => { setForm(f => ({ ...f, fecha: e.target.value })); setSaveError(null); setSmartSuggestion(null) }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Hora</label>
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                    value={form.hora}
                    onChange={e => { setForm(f => ({ ...f, hora: e.target.value })); setSaveError(null); setSmartSuggestion(null) }}
                  >
                    <option value="">Seleccionar</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Resultado de la sugerencia IA */}
              {smartSuggestion && (
                <div className="flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-400">
                  <Sparkles className="size-3.5 shrink-0" />
                  {smartSuggestion}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notas <span className="font-normal normal-case tracking-normal opacity-60">(opcional)</span></label>
              <Input className="h-10 text-sm" placeholder="Observaciones adicionales" value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="mt-px size-3.5 shrink-0" />{saveError}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/40 px-6 py-4">
            <button type="button" onClick={() => setShowDialog(false)} disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleGuardar} disabled={saving || !!saveError}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {saving ? "Guardando..." : "Guardar cita"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
