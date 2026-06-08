"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CalendarOff, Plus, Trash2, Edit2, Check,
  Clock, Users, RefreshCw, Stethoscope,
  CalendarDays, RotateCcw, CheckCircle2, XCircle,
  AlertCircle, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getEspecialidadesHorario,
  getExcepciones,
  createExcepcion,
  deleteExcepcion,
  updateEspecialidadHorario,
  getCitasFuturasCount,
  getCitasEnFechaCount,
  descripcionHorario,
  type EspecialidadHorario,
  type ExcepcionEspecialidad,
} from "@/services/especialidades-horario"

const DIAS_NOMBRE = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]
const DIAS_CORTO  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const NAVY = "#0f4c81"

function formatFecha(iso: string) {
  try {
    const [y, m, d] = iso.split("-")
    const fecha = new Date(Number(y), Number(m) - 1, Number(d))
    return fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return iso }
}

function diasHastaFecha(iso: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = iso.split("-")
  const fecha = new Date(Number(y), Number(m) - 1, Number(d))
  return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000)
}

export function EspecialidadesConfigSection() {
  const [especialidades, setEspecialidades] = useState<EspecialidadHorario[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<EspecialidadHorario | null>(null)

  const [excepciones, setExcepciones]   = useState<ExcepcionEspecialidad[]>([])
  const [loadingExc, setLoadingExc]     = useState(false)

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm]             = useState<Partial<EspecialidadHorario>>({})
  const [saving, setSaving]                 = useState(false)

  const [showExcDialog, setShowExcDialog] = useState(false)
  const [excForm, setExcForm]             = useState({ fecha: "", motivo: "" })
  const [savingExc, setSavingExc]         = useState(false)

  // Avisos de impacto antes de guardar
  const [citasFuturasAviso, setCitasFuturasAviso]       = useState<number | null>(null)
  const [checkingCitasFuturas, setCheckingCitasFuturas] = useState(false)
  const [citasEnFechaAviso, setCitasEnFechaAviso]       = useState<number | null>(null)
  const [checkingCitasEnFecha, setCheckingCitasEnFecha] = useState(false)

  const loadEspecialidades = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEspecialidadesHorario(true) // admin: incluir inactivas
      setEspecialidades(data)
      // Sincronizar selected con la versión fresca del array
      setSelected(prev => {
        if (!prev) return data.length > 0 ? data[0] : null
        return data.find(e => e.idEspecialidad === prev.idEspecialidad) ?? (data.length > 0 ? data[0] : null)
      })
    } catch (err) {
      toast.error(friendlyError(err, "No se pudieron cargar las especialidades"))
    } finally { setLoading(false) }
  }, [])

  const loadExcepciones = useCallback(async (id: number) => {
    setLoadingExc(true)
    try { setExcepciones(await getExcepciones(id)) }
    catch { setExcepciones([]) }
    finally { setLoadingExc(false) }
  }, [])

  useEffect(() => { loadEspecialidades() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected) loadExcepciones(selected.idEspecialidad) }, [selected, loadExcepciones])

  function openEdit(esp: EspecialidadHorario) {
    setEditForm({
      diaSemana:      esp.diaSemana,
      horaInicio:     esp.horaInicio,
      horaFin:        esp.horaFin ?? undefined,
      capacidadMax:   esp.capacidadMax ?? undefined,
      tipoFrecuencia: esp.tipoFrecuencia,
      activo:         esp.activo,
      notas:          esp.notas ?? "",
      duracionCita:   esp.duracionCita ?? 30,
    })
    setCitasFuturasAviso(null)
    setCheckingCitasFuturas(false)
    setShowEditDialog(true)
  }

  async function handleSaveEdit() {
    if (!selected) return
    setSaving(true)
    try {
      await updateEspecialidadHorario(selected.idEspecialidad, {
        diaSemana:      editForm.diaSemana,
        horaInicio:     editForm.horaInicio,
        horaFin:        editForm.horaFin || null,
        capacidadMax:   editForm.capacidadMax ?? null,
        tipoFrecuencia: editForm.tipoFrecuencia,
        activo:         editForm.activo,
        notas:          editForm.notas || null,
        duracionCita:   editForm.duracionCita ?? 30,
      })
      toast.success("Horario actualizado correctamente")
      setShowEditDialog(false)
      loadEspecialidades()
    } catch (err) {
      toast.error(friendlyError(err, "No se pudo guardar el horario"))
    } finally { setSaving(false) }
  }

  async function handleCrearExcepcion() {
    if (!selected || !excForm.fecha) return
    setSavingExc(true)
    try {
      await createExcepcion(selected.idEspecialidad, excForm.fecha, excForm.motivo || undefined)
      toast.success(`Fecha ${excForm.fecha} bloqueada correctamente`)
      setShowExcDialog(false)
      setExcForm({ fecha: "", motivo: "" })
      loadExcepciones(selected.idEspecialidad)
    } catch (err) {
      toast.error(friendlyError(err, "No se pudo crear la excepción"))
    } finally { setSavingExc(false) }
  }

  async function handleEliminarExcepcion(exc: ExcepcionEspecialidad) {
    if (!selected) return
    try {
      await deleteExcepcion(selected.idEspecialidad, exc.idExcepcion)
      toast.success(`Excepción del ${exc.fecha} eliminada`)
      loadExcepciones(selected.idEspecialidad)
    } catch (err) {
      toast.error(friendlyError(err, "No se pudo eliminar la excepción"))
    }
  }

  const proximasExcepciones = excepciones.filter(e => diasHastaFecha(e.fecha) >= 0).length
  const activasCount   = especialidades.filter(e => e.activo).length
  const inactivasCount = especialidades.length - activasCount

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Especialidades</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configura días, horarios y bloqueos por especialidad · {especialidades.length} registradas
          </p>
        </div>
        <button
          onClick={() => { loadEspecialidades(); if (selected) loadExcepciones(selected.idEspecialidad) }}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          Actualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Registradas",
            value: especialidades.length,
            color: NAVY,
            bg: `${NAVY}15`,
            icon: Stethoscope,
          },
          {
            label: "Activas",
            value: activasCount,
            color: "#10b981",
            bg: "#10b98115",
            icon: CheckCircle2,
          },
          {
            label: "Inactivas",
            value: inactivasCount,
            color: inactivasCount > 0 ? "#f59e0b" : "#6b7280",
            bg: inactivasCount > 0 ? "#f59e0b15" : "#6b728015",
            icon: XCircle,
          },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
                <Icon className="size-3.5" style={{ color }} />
              </div>
            </div>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">

        {/* ── Panel izquierdo: lista ── */}
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Especialidades ({especialidades.length})
          </p>

          {especialidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 py-10 text-center">
              <Stethoscope className="size-6 text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">Sin especialidades registradas</p>
            </div>
          ) : (
            especialidades.map(esp => {
              const isSelected = selected?.idEspecialidad === esp.idEspecialidad
              return (
                <button
                  key={esp.idEspecialidad}
                  onClick={() => setSelected(esp)}
                  className={`group relative flex flex-col gap-2 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-[#0f4c81]/30 bg-[#0f4c81]/5 shadow-sm"
                      : "border-border/60 bg-card hover:border-[#0f4c81]/30 hover:bg-muted/30"
                  }`}
                >
                  {/* Accent bar izquierda */}
                  <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl transition-all ${
                    isSelected ? "bg-[#0f4c81]" : "bg-transparent"
                  }`} />

                  {/* Fila 1: ícono + nombre + badge activo */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-[#0f4c81]/10" : "bg-muted/50"
                      }`}>
                        <Stethoscope className={`size-3.5 ${isSelected ? "text-[#0f4c81]" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`truncate text-sm font-semibold ${isSelected ? "text-[#0f4c81]" : "text-foreground"}`}>
                        {esp.nombre}
                      </span>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      esp.activo
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                    }`}>
                      {esp.activo
                        ? <><CheckCircle2 className="size-2.5" />Activo</>
                        : <><XCircle className="size-2.5" />Inactivo</>
                      }
                    </span>
                  </div>

                  {/* Fila 2: chips de metadatos */}
                  <div className="flex items-center gap-1.5 pl-9 flex-wrap">
                    {/* Día */}
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? "bg-[#0f4c81]/10 text-[#0f4c81]"
                        : "bg-muted/60 text-muted-foreground"
                    }`}>
                      <CalendarDays className="size-2.5 shrink-0" />
                      {DIAS_CORTO[esp.diaSemana]}
                    </span>

                    {/* Horario */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                      isSelected ? "text-[#0f4c81]/80" : "text-muted-foreground"
                    }`}>
                      <Clock className="size-2.5 shrink-0" />
                      {esp.horaInicio}{esp.horaFin ? `–${esp.horaFin}` : ""}
                    </span>

                    {/* Capacidad */}
                    {esp.capacidadMax && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                        isSelected ? "text-[#0f4c81]/80" : "text-muted-foreground"
                      }`}>
                        <Users className="size-2.5 shrink-0" />
                        {esp.capacidadMax} pac.
                      </span>
                    )}

                    {/* Badge mensual */}
                    {esp.tipoFrecuencia !== "SEMANAL" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        <RotateCcw className="size-2.5" />
                        Mensual
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* ── Panel derecho: detalle ── */}
        {selected ? (
          <div className="flex flex-col gap-4">

            {/* Tarjeta de horario */}
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

              {/* Header navy con patrón de puntos */}
              <div className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                <div className="relative flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                      <Stethoscope className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selected.nombre}</p>
                      <p className="text-[11px] text-white/60">{descripcionHorario(selected)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected.activo
                        ? "bg-white/15 text-white"
                        : "bg-white/10 text-white/60"
                    }`}>
                      {selected.activo
                        ? <><CheckCircle2 className="size-3" />Activo</>
                        : <><XCircle className="size-3" />Inactivo</>
                      }
                    </span>
                    <button
                      onClick={() => openEdit(selected)}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
                    >
                      <Edit2 className="size-3.5" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>

              {/* Datos del horario */}
              <div className="grid grid-cols-2 divide-x divide-border/40 sm:grid-cols-4">
                {[
                  { icon: CalendarDays, label: "Día",      value: DIAS_NOMBRE[selected.diaSemana],                        color: NAVY },
                  { icon: Clock,        label: "Inicio",   value: selected.horaInicio,                                    color: "#10b981" },
                  { icon: Clock,        label: "Fin",      value: selected.horaFin ?? "Sin límite",                       color: "#f59e0b" },
                  { icon: Users,        label: "Capacidad",value: selected.capacidadMax ? `${selected.capacidadMax} pac.` : "Sin límite", color: "#8b5cf6" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex flex-col gap-1 px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Icon className="size-3" style={{ color }} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              {/* Frecuencia + notas */}
              {(selected.tipoFrecuencia !== "SEMANAL" || selected.notas) && (
                <div className="flex items-center gap-4 border-t border-border/40 px-5 py-3">
                  {selected.tipoFrecuencia !== "SEMANAL" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <RotateCcw className="size-3" />
                      Primer {DIAS_NOMBRE[selected.diaSemana].toLowerCase()} del mes
                    </span>
                  )}
                  {selected.notas && (
                    <span className="text-xs text-muted-foreground italic">{selected.notas}</span>
                  )}
                </div>
              )}
            </div>

            {/* Fechas bloqueadas */}
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                    <CalendarOff className="size-3.5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Fechas bloqueadas</p>
                    <p className="text-[11px] text-muted-foreground">
                      {excepciones.length === 0
                        ? "Sin bloqueos registrados"
                        : `${excepciones.length} bloqueo${excepciones.length !== 1 ? "s" : ""} · ${proximasExcepciones} próximo${proximasExcepciones !== 1 ? "s" : ""}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExcForm({ fecha: "", motivo: "" })
                    setCitasEnFechaAviso(null)
                    setShowExcDialog(true)
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  <Plus className="size-3.5" />
                  Bloquear fecha
                </button>
              </div>

              {loadingExc ? (
                <div className="flex items-center gap-2 px-5 py-6">
                  <div className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                  <p className="text-xs text-muted-foreground">Cargando bloqueos...</p>
                </div>
              ) : excepciones.length === 0 ? (
                <div className="flex items-center gap-4 px-5 py-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40">
                    <CalendarOff className="size-4 text-muted-foreground opacity-40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Sin fechas bloqueadas</p>
                    <p className="text-[11px] text-muted-foreground">
                      ¿El doctor no estará disponible? Usa el botón para bloquear un día.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {excepciones
                    .slice()
                    .sort((a, b) => a.fecha.localeCompare(b.fecha))
                    .map(exc => {
                      const dias = diasHastaFecha(exc.fecha)
                      const pasada = dias < 0
                      return (
                        <div key={exc.idExcepcion}
                          className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/20 ${pasada ? "opacity-50" : ""}`}
                        >
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            pasada ? "bg-muted/50" : "bg-red-50 dark:bg-red-950/30"
                          }`}>
                            <CalendarOff className={`size-3.5 ${pasada ? "text-muted-foreground" : "text-red-500"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{formatFecha(exc.fecha)}</p>
                            {exc.motivo ? (
                              <p className="text-[11px] text-muted-foreground truncate">{exc.motivo}</p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground italic">Sin motivo especificado</p>
                            )}
                          </div>

                          {!pasada && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                              dias === 0
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                : dias <= 7
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              {dias === 0 ? "Hoy" : `${dias}d`}
                            </span>
                          )}
                          {pasada && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              Pasada
                            </span>
                          )}

                          <button
                            onClick={() => handleEliminarExcepcion(exc)}
                            className="shrink-0 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            title="Eliminar bloqueo"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )
                    })
                  }
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 py-20">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
              <AlertCircle className="size-5 text-muted-foreground opacity-40" />
            </div>
            <p className="text-sm font-medium text-foreground">Selecciona una especialidad</p>
            <p className="text-xs text-muted-foreground">Elige una especialidad de la lista para ver su configuración</p>
          </div>
        )}
      </div>

      {/* ── Dialog: editar horario ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar horario</DialogTitle>
            <DialogDescription className="text-xs">{selected?.nombre} · Modifica el día, franja horaria y capacidad</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Día de la semana</Label>
                <Select
                  value={String(editForm.diaSemana ?? "")}
                  onValueChange={v => setEditForm(f => ({ ...f, diaSemana: Number(v) }))}
                >
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_NOMBRE.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Frecuencia</Label>
                <Select
                  value={editForm.tipoFrecuencia ?? "SEMANAL"}
                  onValueChange={v => setEditForm(f => ({ ...f, tipoFrecuencia: v as "SEMANAL" | "MENSUAL_PRIMER_DIA" }))}
                >
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="MENSUAL_PRIMER_DIA">Primer día del mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hora inicio</Label>
                <Input className="h-10 text-sm" placeholder="09:30" value={editForm.horaInicio ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, horaInicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Hora fin <span className="font-normal opacity-50">(opcional)</span>
                </Label>
                <Input className="h-10 text-sm" placeholder="12:00" value={editForm.horaFin ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, horaFin: e.target.value || null }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Capacidad máxima <span className="font-normal opacity-50">(opcional)</span>
              </Label>
              <Input type="number" min={1} className="h-10 text-sm" placeholder="Sin límite"
                value={editForm.capacidadMax ?? ""}
                onChange={e => setEditForm(f => ({ ...f, capacidadMax: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duración de cita (min)</Label>
              <Select
                value={String(editForm.duracionCita ?? 30)}
                onValueChange={v => setEditForm(f => ({ ...f, duracionCita: Number(v) }))}
              >
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90].map(m => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas</Label>
              <Input className="h-10 text-sm" placeholder="Ej: Dr. Lines" value={editForm.notas ?? ""}
                onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                checked={editForm.activo ?? true}
                onChange={e => {
                  const nuevoActivo = e.target.checked
                  setEditForm(f => ({ ...f, activo: nuevoActivo }))
                  if (!nuevoActivo && selected) {
                    setCheckingCitasFuturas(true)
                    setCitasFuturasAviso(null)
                    getCitasFuturasCount(selected.idEspecialidad)
                      .then(r => setCitasFuturasAviso(r.count))
                      .catch(() => setCitasFuturasAviso(null))
                      .finally(() => setCheckingCitasFuturas(false))
                  } else {
                    setCitasFuturasAviso(null)
                  }
                }}
                className="size-4 rounded border-border accent-[#0f4c81]"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Especialidad activa</p>
                <p className="text-[11px] text-muted-foreground">Permite agendar citas en este horario</p>
              </div>
            </label>

            {/* Aviso: citas futuras pendientes al desactivar */}
            {checkingCitasFuturas && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-950/30">
                <div className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Revisando citas pendientes...</p>
              </div>
            )}
            {!checkingCitasFuturas && citasFuturasAviso !== null && citasFuturasAviso > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/30">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Esta especialidad tiene{" "}
                  <strong>{citasFuturasAviso} cita{citasFuturasAviso !== 1 ? "s" : ""} pendiente{citasFuturasAviso !== 1 ? "s" : ""}</strong>{" "}
                  próxima{citasFuturasAviso !== 1 ? "s" : ""}. Al desactivarla no se cancelarán automáticamente — cancélalas primero en la sección de Citas.
                </p>
              </div>
            )}
            {!checkingCitasFuturas && citasFuturasAviso === 0 && editForm.activo === false && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Sin citas pendientes. Puedes desactivarla sin problema.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
            <button onClick={() => setShowEditDialog(false)} disabled={saving}
              className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {saving ? "Guardando..." : <><Check className="size-3.5" />Guardar cambios</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: agregar excepción ── */}
      <Dialog open={showExcDialog} onOpenChange={setShowExcDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Bloquear fecha</DialogTitle>
            <DialogDescription className="text-xs">{selected?.nombre} · El doctor no estará disponible este día</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha</Label>
              <Input
                type="date"
                className="h-10 text-sm"
                value={excForm.fecha}
                onChange={e => {
                  const fecha = e.target.value
                  setExcForm(f => ({ ...f, fecha }))
                  if (fecha && selected) {
                    setCheckingCitasEnFecha(true)
                    setCitasEnFechaAviso(null)
                    getCitasEnFechaCount(selected.idEspecialidad, fecha)
                      .then(r => setCitasEnFechaAviso(r.count))
                      .catch(() => setCitasEnFechaAviso(null))
                      .finally(() => setCheckingCitasEnFecha(false))
                  } else {
                    setCitasEnFechaAviso(null)
                  }
                }}
              />
            </div>

            {/* Aviso: citas existentes en esa fecha */}
            {checkingCitasEnFecha && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-950/30">
                <div className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Revisando citas para esta fecha...</p>
              </div>
            )}
            {!checkingCitasEnFecha && citasEnFechaAviso !== null && citasEnFechaAviso > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/30">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Ya hay{" "}
                  <strong>{citasEnFechaAviso} cita{citasEnFechaAviso !== 1 ? "s" : ""} programada{citasEnFechaAviso !== 1 ? "s" : ""}</strong>{" "}
                  para esta fecha. Al bloquear el día no se cancelarán — ve a Citas y cancélalas manualmente.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Motivo <span className="font-normal opacity-50">(opcional)</span>
              </Label>
              <Input className="h-10 text-sm" placeholder="Ej: Vacaciones, congreso..." value={excForm.motivo}
                onChange={e => setExcForm(f => ({ ...f, motivo: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
            <button onClick={() => setShowExcDialog(false)} disabled={savingExc}
              className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleCrearExcepcion} disabled={savingExc || !excForm.fecha}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {savingExc ? "Guardando..." : <><Plus className="size-3.5" />Bloquear fecha</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
