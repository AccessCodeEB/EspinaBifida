"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, CalendarDays, List, AlertCircle, ChevronDown, Sparkles, Clock, Users, X } from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCitas, createCita, COSTO_PRIMERA_CITA, COSTO_SUBSECUENTE_CITA, type Cita } from "@/services/citas"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import { createServicio, getCatalogoServicios, type TipoServicioCompleto } from "@/services/servicios"
import {
  getEspecialidadesHorario,
  esFechaValidaFrontend,
  esHoraValidaFrontend,
  descripcionHorario,
  type EspecialidadHorario,
} from "@/services/especialidades-horario"
import { CitasCalendarView, validateSlot } from "@/components/sections/citas-calendar-view"
import { CitasListView } from "@/components/sections/citas-list-view"
import { cn } from "@/lib/utils"

const DISPONIBILIDAD_DIAS_BUSQUEDA = 7
const SERVICIO_DRAFT_KEY = "servicioDraftFromCita"
const CITA_PREFILL_KEY = "prefillCitaFromServicio"

// 30-min time slots 08:00 – 20:00
const TIME_SLOTS = Array.from({length: 25}, (_,i) => {
  const h = 8 + Math.floor(i / 2), m = i % 2 === 0 ? "00" : "30"
  return `${String(h).padStart(2,"0")}:${m}`
}).filter(t => {
  const [h] = t.split(":").map(Number); return h < 17
})

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseSlotLocal(fecha: string, hora: string): Date {
  const [y, mo, day] = fecha.split("-").map(Number)
  const [h, mi] = hora.split(":").map(Number)
  return new Date(y, mo - 1, day, h, mi, 0, 0)
}

/** true si el inicio del slot ya pasó (hora local del navegador). */
function isSlotInPast(fecha: string, hora: string, now = new Date()): boolean {
  return parseSlotLocal(fecha, hora).getTime() <= now.getTime()
}

const EMPTY_FORM = { curp: "", idTipoServicio: "", especialista: "", fecha: "", hora: "", notas: "" }

function buildNotasServicioDesdeCita(form: typeof EMPTY_FORM) {
  const partes = [
    form.especialista ? `Especialidad: ${form.especialista}` : null,
    form.fecha ? `Fecha cita: ${form.fecha}` : null,
    form.hora ? `Hora cita: ${form.hora}` : null,
    form.notas?.trim() ? `Notas cita: ${form.notas.trim()}` : null,
  ].filter((valor): valor is string => Boolean(valor))

  return partes.join(" | ") || "Registro generado desde una cita programada"
}

type ActiveView = "calendar" | "list"

export function CitasSection() {
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("citas_activeView")
      if (saved === "calendar" || saved === "list") return saved
    }
    return "calendar"
  })
  const [viewVisible, setViewVisible] = useState(true)

  // Scroll to top when entering the Citas section
  useEffect(() => {
    const main = document.querySelector("main")
    if (main) main.scrollTo({ top: 0, behavior: "instant" })
  }, [])

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
  const [catalogoServicios, setCatalogoServicios] = useState<TipoServicioCompleto[]>([])
  const [especialidades, setEspecialidades] = useState<EspecialidadHorario[]>([])
  const [origenServicio, setOrigenServicio] = useState<{ registrarServicio: boolean; idTipoServicio: number | null } | null>(null)
  const [bannerCancelarServicio, setBannerCancelarServicio] = useState(false)

  const loadCitas = useCallback((silent=false) => {
    if(!silent) setLoading(true)
    getCitas()
      .then(setCitas)
      .catch(err => setError(friendlyError(err, "No se pudo cargar las citas")))
      .finally(() => { if(!silent) setLoading(false) })
  }, [])

  /** Updates citas in-place without triggering the loading spinner */
  const silentUpdate = useCallback((updater:(prev:Cita[])=>Cita[]) => {
    setCitas(updater)
  }, [])

  useEffect(() => {
    loadCitas()
    getBeneficiarios().then(setBeneficiarios).catch(() => {})
    getCatalogoServicios().then(setCatalogoServicios).catch(() => {})
    getEspecialidadesHorario().then(setEspecialidades).catch(() => {})
  }, [loadCitas])

  const bloqueadoDesdeServicios = Boolean(origenServicio?.registrarServicio)

  useEffect(() => {
    if (!form.curp || buscaBenef) return
    const beneficiario = beneficiarios.find((b) => String(b.curp ?? "").trim() === String(form.curp).trim())
    if (beneficiario) {
      setBuscaBenef(`${beneficiario.nombres} ${beneficiario.apellidoPaterno} ${beneficiario.apellidoMaterno}`.replace(/\s+/g, " ").trim())
    }
  }, [beneficiarios, buscaBenef, form.curp])

  // Prefill desde otro flujo (por ejemplo: registrar servicio → programar cita)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CITA_PREFILL_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      const pre = {
        curp: d.curp ?? "",
        idTipoServicio: d.idTipoServicio ? String(d.idTipoServicio) : "",
        especialista: d.especialista ?? "",
        fecha: d.fecha ?? "",
        hora: d.hora ?? "",
        notas: d.notas ?? "",
      }
      setForm(pre)
      setOrigenServicio({
        registrarServicio: Boolean(d.registrarServicio),
        idTipoServicio: d.idTipoServicio ? Number(d.idTipoServicio) : null,
      })
      setShowDialog(true)
      sessionStorage.removeItem(CITA_PREFILL_KEY)
    } catch (e) {
      // ignore
    }
  }, [])

  const today = useMemo(() => new Date(), [])

  // Especialidad seleccionada y sus restricciones
  const espSeleccionada = useMemo(
    () => especialidades.find(e => e.nombre === form.especialista) ?? null,
    [especialidades, form.especialista]
  )

  // Filtrar slots de hora según el horario de la especialidad seleccionada
  const slotsDisponibles = useMemo(() => {
    if (!espSeleccionada) return TIME_SLOTS
    return TIME_SLOTS.filter(t => esHoraValidaFrontend(espSeleccionada, t))
  }, [espSeleccionada])

  // Advertencia de fecha fuera de día permitido
  const fechaFueraDeRango = useMemo(() => {
    if (!espSeleccionada || !form.fecha) return null
    if (!esFechaValidaFrontend(espSeleccionada, form.fecha)) {
      return descripcionHorario(espSeleccionada)
    }
    return null
  }, [espSeleccionada, form.fecha])

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

  // Smooth view transition + persist
  function switchView(view: ActiveView) {
    if (view === activeView) return
    setViewVisible(false)
    setTimeout(() => {
      setActiveView(view)
      setViewVisible(true)
      sessionStorage.setItem("citas_activeView", view)
    }, 180)
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
    if (!form.curp || !form.especialista) return

    setIsFindingSlot(true)
    setSmartSuggestion(null)
    setSaveError(null)

    // Siempre buscar desde HOY, sin importar la fecha que ya esté en el form
    const now = new Date()
    const todayStart = startOfDayLocal(now)

    let found = false
    for (let dayOffset = 0; dayOffset < DISPONIBILIDAD_DIAS_BUSQUEDA && !found; dayOffset++) {
      const d = new Date(todayStart)
      d.setDate(todayStart.getDate() + dayOffset)
      const fechaStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-")

      // Verificar que la fecha sea válida para la especialidad
      if (espSeleccionada && !esFechaValidaFrontend(espSeleccionada, fechaStr)) continue

      // Slots válidos según horario del especialista
      const slotsABuscar = espSeleccionada
        ? TIME_SLOTS.filter(t => esHoraValidaFrontend(espSeleccionada, t))
        : TIME_SLOTS

      for (const hora of slotsABuscar) {
        // Hoy: solo slots a partir de la hora actual. Días futuros: todos los slots.
        if (isSlotInPast(fechaStr, hora, now)) continue
        const error = validateSlot(citas, fechaStr, hora, form.especialista, form.curp)
        if (!error) {
          setForm(f => ({ ...f, fecha: fechaStr, hora }))
          const daysAhead = dayOffset
          const label = daysAhead === 0 ? "hoy" : daysAhead === 1 ? "mañana" : `en ${daysAhead} días`
          setSmartSuggestion(`✨ Horario ideal encontrado: ${fechaStr} a las ${hora} (${label})`)
          toast.success("¡Horario ideal encontrado y aplicado!", { description: `${fechaStr} · ${hora}` })
          found = true
          break
        }
      }
    }

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
    if (!form.especialista) missing.push("especialidad")
    if (!form.fecha) missing.push("fecha")
    if (!form.hora) missing.push("hora")
    if (missing.length > 0) { setSaveError(`Selecciona: ${missing.join(", ")}.`); return }
    if (isSlotInPast(form.fecha, form.hora)) {
      setSaveError("No puedes agendar una cita en un horario que ya pasó.")
      return
    }
    const slotError = validateSlot(citas, form.fecha, form.hora, form.especialista, form.curp)
    if (slotError) { setSaveError(slotError); return }
    setSaving(true); setSaveError(null)
    try {
      const citaCreada = await createCita({
        curp: form.curp,
        idTipoServicio: Number(form.idTipoServicio),
        especialista: form.especialista || undefined,
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas || undefined,
      })

      const citaId = Number(citaCreada?.result?.idCita ?? 0)

      // Optimistic update: add the new cita immediately so stats (hoy/semana/pendientes)
      // update instantly without waiting for the full loadCitas() reload
      const benef = beneficiarios.find(b => String(b.curp ?? b.folio ?? "").trim() === String(form.curp).trim())
      const nombreBenef = benef
        ? `${benef.nombres ?? ""} ${benef.apellidoPaterno ?? ""}`.trim()
        : form.curp
      const optimisticCita: Cita = {
        id: citaId || Date.now(),
        folio: form.curp,
        beneficiario: nombreBenef,
        especialista: form.especialista,
        fecha: form.fecha,
        hora: form.hora,
        estatus: "Pendiente",
        notas: form.notas || undefined,
      }
      setCitas(prev => [...prev, optimisticCita])

      let servicioRegistrado = false
      let servicioWarning: string | null = null

      if (origenServicio?.registrarServicio && origenServicio.idTipoServicio) {
        if (citaId > 0) {
          const tipoServicio = catalogoServicios.find((tipo) => tipo.idTipoServicio === origenServicio.idTipoServicio)
          const costo = tipoServicio?.montoSugerido ?? 0

          try {
            await createServicio({
              curp: form.curp,
              idTipoServicio: origenServicio.idTipoServicio,
              costo,
              montoPagado: 0,
              notas: buildNotasServicioDesdeCita(form),
              estatus: "PENDIENTE",
              referenciaId: citaId,
              referenciaTipo: "CITA",
            })
            servicioRegistrado = true
            sessionStorage.removeItem(SERVICIO_DRAFT_KEY)
          } catch (err) {
            servicioWarning = friendlyError(err, "Se guardó la cita, pero no se pudo registrar el servicio")
          }
        } else {
          servicioWarning = "Se guardó la cita, pero no se pudo vincular el servicio porque faltó el ID de cita."
        }
      }

      setShowDialog(false)
      loadCitas()
      if (servicioRegistrado) {
        toast.success("Cita agendada y servicio registrado correctamente", {
          description: `${form.fecha} · ${form.hora}`,
        })
      } else if (servicioWarning) {
        toast.warning("Cita agendada", { description: servicioWarning })
      } else {
        toast.success("Cita agendada correctamente", {
          description: `${form.fecha} · ${form.hora}`,
        })
      }
      setOrigenServicio(null)
    } catch (err: unknown) {
      const msg = friendlyError(err, "No se pudo guardar la cita")
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Citas</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Gestión y agenda de citas con especialistas</p>
      </div>

      {/* ── Toggle Agenda / Historial + Botón ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => switchView("calendar")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
              activeView === "calendar"
                ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
                : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
            }`}
          >
            <CalendarDays className="size-3.5" />Agenda
          </button>
          <button
            onClick={() => switchView("list")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
              activeView === "list"
                ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
                : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
            }`}
          >
            <List className="size-3.5" />Historial
          </button>
        </div>
        <button
          onClick={openDialog}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: NAVY }}
        >
          <Plus className="size-3.5" />Nueva Cita
        </button>
      </div>

      {/* ── KPI cards ── */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hoy",        value: stats.hoy,        icon: CalendarDays, color: NAVY,       bg: "#0f4c8115" },
            { label: "Esta semana",value: stats.semana,     icon: Users,        color: "#6FD6A8",  bg: "#6FD6A815" },
            { label: "Pendientes", value: stats.pendientes, icon: Clock,        color: "#FFD97A",  bg: "#FFD97A15" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{label}</span>
                <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
                  <Icon className="size-3.5" style={{ color }} />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}

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
          className={`flex flex-col ${viewVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
        >
          {activeView === "calendar" ? (
            <CitasCalendarView
              citas={citas}
              onReload={()=>loadCitas(true)}
              onSilentUpdate={silentUpdate}
              stats={stats}
              onCitaCancelada={() => setBannerCancelarServicio(true)}
            />
          ) : (
            <CitasListView citas={citas} beneficiarios={beneficiarios} />
          )}
        </div>
      )}

      {/* ── Dialog Nueva Cita ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent showCloseButton={false} className="max-w-lg p-0 gap-0 overflow-hidden">

          {/* Banner navy */}
          <div className="relative shrink-0 overflow-hidden" style={{ background: NAVY }}>
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative flex items-center justify-between gap-3 px-6 py-4">
              <div>
                <DialogTitle className="text-base font-bold text-white">Agendar nueva cita</DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-white/60">
                  Programa una visita con un especialista médico
                </DialogDescription>
              </div>
              <button onClick={() => setShowDialog(false)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Beneficiario */}
            <div className="relative space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Beneficiario</label>
              <div className="relative">
                <Input
                  placeholder="Buscar por folio o nombre..."
                  className="h-10 pr-8 text-sm"
                  disabled={bloqueadoDesdeServicios}
                  value={buscaBenef}
                  onChange={e => {
                    if (bloqueadoDesdeServicios) return
                    setBuscaBenef(e.target.value)
                    setForm(f => ({ ...f, curp: "" }))
                    setShowBenefList(true)
                    setSaveError(null)
                    setSmartSuggestion(null)
                  }}
                />
                {!bloqueadoDesdeServicios ? (
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setShowBenefList(v => !v)
                      // Al reabrir para cambiar, limpiamos la seleccion previa
                      if (!showBenefList && form.curp) {
                        setForm(f => ({ ...f, curp: "" }))
                        setBuscaBenef("")
                        setSmartSuggestion(null)
                      }
                    }}>
                    <ChevronDown className="size-4" />
                  </button>
                ) : null}
              </div>
              {showBenefList && benefFiltrados.length > 0 && (
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
              {form.curp && <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Seleccionado: {form.curp}</p>}
              {!form.curp && buscaBenef && <p className="text-[11px] text-amber-600 dark:text-amber-400">Selecciona un beneficiario de la lista</p>}
              {bloqueadoDesdeServicios && (
                <p className="text-[11px] text-muted-foreground">Estos datos vienen heredados desde el módulo de servicios y no pueden modificarse aquí.</p>
              )}
            </div>

            {/* Costo auto-detectado (solo lectura) — solo para Consulta Médica */}
            {form.curp && /consulta/i.test(catalogoServicios.find(t => String(t.idTipoServicio) === form.idTipoServicio)?.nombre ?? "") && (() => {
              const previas = citas.filter(c => c.folio === form.curp && c.estatus !== "Cancelada").length
              const esPrimera = previas === 0
              const costo = esPrimera ? COSTO_PRIMERA_CITA : COSTO_SUBSECUENTE_CITA
              return (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de consulta</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {esPrimera ? "Primera cita" : "Cita subsecuente"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Costo</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      ${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Tipo de Servicio */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de servicio</label>
              <Select value={form.idTipoServicio} onValueChange={v => { if (bloqueadoDesdeServicios) return; setForm(f => ({ ...f, idTipoServicio: v })); setSaveError(null) }} disabled={bloqueadoDesdeServicios}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {catalogoServicios.filter(t => /consulta/i.test(t.nombre) || /estudio/i.test(t.nombre)).map(t => <SelectItem key={t.idTipoServicio} value={String(t.idTipoServicio)}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              {bloqueadoDesdeServicios && (
                <p className="text-[11px] text-muted-foreground">El tipo de servicio ya fue definido en el módulo de servicios.</p>
              )}
            </div>

            {/* Especialista */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Especialidad</label>
              <Select
                value={form.especialista}
                onValueChange={v => {
                  setForm(f => ({ ...f, especialista: v, hora: "" }))
                  setSaveError(null)
                }}
              >
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar especialidad" /></SelectTrigger>
                <SelectContent>
                  {especialidades.map(e => (
                    <SelectItem key={e.idEspecialidad} value={e.nombre}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {espSeleccionada && (
                <p className="text-[11px] text-muted-foreground">
                  Horario: {descripcionHorario(espSeleccionada)}
                </p>
              )}
              {!espSeleccionada && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Selecciona una especialidad para ver los horarios disponibles
                </p>
              )}
            </div>

            {/* Fecha y Hora + Smart Slot */}
            <div className="space-y-2">
              {/* Botón IA — gradiente siempre visible, gris cuando está bloqueado */}
              {(() => {
                const isUnlocked = !!(form.curp && form.especialista)
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isUnlocked) {
                        toast.warning("Selecciona un beneficiario y especialista primero para buscar disponibilidad.")
                        return
                      }
                      handleSuggestSmartSlot()
                    }}
                    disabled={isFindingSlot}
                    className={cn(
                      "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-all duration-300 disabled:opacity-60",
                      isUnlocked
                        ? "cursor-pointer border border-sky-500/25 bg-gradient-to-br from-[#0f4c81]/12 via-sky-500/10 to-teal-500/15 hover:border-sky-500/45 hover:shadow-[0_0_16px_rgba(14,165,233,0.12)] dark:border-white/10 dark:from-[#0f4c81]/50 dark:via-[#0f4c81]/35 dark:to-teal-600/30 dark:hover:border-sky-500/50 dark:hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                        : "cursor-default border border-border bg-muted/50 text-muted-foreground dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0f4c81]/50 dark:via-[#0f4c81]/30 dark:to-teal-600/30 dark:saturate-0 dark:brightness-[0.6] dark:text-muted-foreground",
                    )}
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-sky-500/10 dark:to-teal-500/10" />
                    {isFindingSlot ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent dark:border-sky-400" />
                        <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-teal-400">
                          Buscando horario ideal...
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles
                          className={cn(
                            "size-3.5",
                            isUnlocked
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            isUnlocked
                              ? "bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-teal-400"
                              : "text-muted-foreground",
                          )}
                        >
                          Sugerir mejor horario
                        </span>
                      </>
                    )}
                  </button>
                )
              })()}

              {/* Inputs Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fecha</label>
                  <Input type="date" className="h-10 text-sm" value={form.fecha}
                    onChange={e => { setForm(f => ({ ...f, fecha: e.target.value, hora: "" })); setSaveError(null); setSmartSuggestion(null) }} />
                  {fechaFueraDeRango && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      ⚠ Esta fecha no corresponde al horario de la especialidad ({fechaFueraDeRango})
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Hora</label>
                  <select
                    className={`h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10 ${
                      !form.especialista ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground"
                    }`}
                    value={form.hora}
                    disabled={!form.especialista}
                    onChange={e => { setForm(f => ({ ...f, hora: e.target.value })); setSaveError(null); setSmartSuggestion(null) }}
                  >
                    <option value="">{form.especialista ? "Seleccionar hora" : "Primero elige especialidad"}</option>
                    {slotsDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.especialista && slotsDisponibles.length === 0 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400">Sin horarios disponibles para esta especialidad</p>
                  )}
                </div>
              </div>

              {/* Resultado de la sugerencia IA */}
              {smartSuggestion && (
                <div className="flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-700 dark:text-teal-400">
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

          </div>

          <div className="flex justify-end gap-2 border-t border-border/40 px-6 py-4">
            <button type="button" onClick={() => setShowDialog(false)} disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving || !!saveError}
              className="flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {saving ? "Guardando..." : "Guardar cita"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: cancelar servicio post-cancelación de cita */}
      <Dialog open={bannerCancelarServicio} onOpenChange={(open) => { if (!open) setBannerCancelarServicio(false) }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarDays className="size-4 text-[#0f4c81]" />
              ¿Cancelar el servicio?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <p className="text-sm text-muted-foreground">
              ¿Quieres ir a Servicios para cancelar también el servicio asociado a esta cita?
            </p>
            <div className="flex justify-end gap-2 border-t border-border/40 pt-2">
              <button
                onClick={() => setBannerCancelarServicio(false)}
                className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                No, gracias
              </button>
              <button
                onClick={() => {
                  router.push("/panel?section=servicios")
                  setBannerCancelarServicio(false)
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0f4c81" }}
              >
                Ir a Servicios
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
