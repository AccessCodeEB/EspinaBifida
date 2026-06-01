"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, CalendarOff, Plus, Trash2, Edit2, Check, X, AlertCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getEspecialidadesHorario,
  getExcepciones,
  createExcepcion,
  deleteExcepcion,
  updateEspecialidadHorario,
  descripcionHorario,
  type EspecialidadHorario,
  type ExcepcionEspecialidad,
} from "@/services/especialidades-horario"

const DIAS_NOMBRE = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]

const NAVY = "#0f4c81"

export function EspecialidadesConfigSection() {
  const [especialidades, setEspecialidades] = useState<EspecialidadHorario[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EspecialidadHorario | null>(null)

  // Excepciones del especialidad seleccionada
  const [excepciones, setExcepciones] = useState<ExcepcionEspecialidad[]>([])
  const [loadingExc, setLoadingExc] = useState(false)

  // Dialog de edición de horario
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState<Partial<EspecialidadHorario>>({})
  const [saving, setSaving] = useState(false)

  // Dialog de agregar excepción
  const [showExcDialog, setShowExcDialog] = useState(false)
  const [excForm, setExcForm] = useState({ fecha: "", motivo: "" })
  const [savingExc, setSavingExc] = useState(false)

  const loadEspecialidades = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEspecialidadesHorario()
      setEspecialidades(data)
      if (!selected && data.length > 0) setSelected(data[0])
    } catch (err) {
      toast.error(friendlyError(err, "No se pudieron cargar las especialidades"))
    } finally {
      setLoading(false)
    }
  }, [selected])

  const loadExcepciones = useCallback(async (id: number) => {
    setLoadingExc(true)
    try {
      const data = await getExcepciones(id)
      setExcepciones(data)
    } catch {
      setExcepciones([])
    } finally {
      setLoadingExc(false)
    }
  }, [])

  useEffect(() => { loadEspecialidades() }, [])

  useEffect(() => {
    if (selected) loadExcepciones(selected.idEspecialidad)
  }, [selected, loadExcepciones])

  function openEdit(esp: EspecialidadHorario) {
    setEditForm({
      diaSemana:      esp.diaSemana,
      horaInicio:     esp.horaInicio,
      horaFin:        esp.horaFin ?? undefined,
      capacidadMax:   esp.capacidadMax ?? undefined,
      tipoFrecuencia: esp.tipoFrecuencia,
      activo:         esp.activo,
      notas:          esp.notas ?? "",
    })
    setShowEditDialog(true)
  }

  async function handleSaveEdit() {
    if (!selected) return
    setSaving(true)
    try {
      const payload: Partial<EspecialidadHorario> = {
        diaSemana:      editForm.diaSemana,
        horaInicio:     editForm.horaInicio,
        horaFin:        editForm.horaFin || null,
        capacidadMax:   editForm.capacidadMax ?? null,
        tipoFrecuencia: editForm.tipoFrecuencia,
        activo:         editForm.activo,
        notas:          editForm.notas || null,
      }
      await updateEspecialidadHorario(selected.idEspecialidad, payload)
      toast.success("Horario actualizado correctamente")
      setShowEditDialog(false)
      loadEspecialidades()
    } catch (err) {
      toast.error(friendlyError(err, "No se pudo guardar el horario"))
    } finally {
      setSaving(false)
    }
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
    } finally {
      setSavingExc(false)
    }
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

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Especialidades</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Configura días, horarios y bloqueos por especialidad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Panel izquierdo: lista de especialidades */}
        <div className="flex flex-col gap-2">
          {especialidades.map(esp => (
            <button
              key={esp.idEspecialidad}
              onClick={() => setSelected(esp)}
              className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selected?.idEspecialidad === esp.idEspecialidad
                  ? "border-[#0f4c81] bg-[#0f4c81]/5"
                  : "border-border/70 bg-card hover:border-[#0f4c81]/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{esp.nombre}</span>
                <span className={`text-[10px] font-bold uppercase ${esp.activo ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {esp.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{descripcionHorario(esp)}</span>
            </button>
          ))}
        </div>

        {/* Panel derecho: detalle + excepciones */}
        {selected && (
          <div className="flex flex-col gap-4 lg:col-span-2">

            {/* Tarjeta de horario */}
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">{selected.nombre}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{descripcionHorario(selected)}</p>
                  {selected.notas && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{selected.notas}</p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(selected)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-[#0f4c81]/50 hover:text-foreground transition-colors"
                >
                  <Edit2 className="size-3.5" />Editar
                </button>
              </div>

              {/* Detalles en grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Día", value: DIAS_NOMBRE[selected.diaSemana] },
                  { label: "Hora inicio", value: selected.horaInicio },
                  { label: "Hora fin", value: selected.horaFin ?? "Sin límite" },
                  { label: "Capacidad", value: selected.capacidadMax ? `${selected.capacidadMax} pacientes` : "Sin límite" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fechas bloqueadas */}
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarOff className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Fechas bloqueadas</h3>
                </div>
                <button
                  onClick={() => { setExcForm({ fecha: "", motivo: "" }); setShowExcDialog(true) }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  <Plus className="size-3.5" />Agregar
                </button>
              </div>

              {loadingExc ? (
                <p className="text-xs text-muted-foreground">Cargando...</p>
              ) : excepciones.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay fechas bloqueadas para esta especialidad.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {excepciones.map(exc => (
                    <div key={exc.idExcepcion}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{exc.fecha}</span>
                        {exc.motivo && (
                          <span className="ml-2 text-xs text-muted-foreground">{exc.motivo}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleEliminarExcepcion(exc)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                        title="Eliminar excepción"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Dialog: editar horario */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar horario — {selected?.nombre}</DialogTitle>
            <DialogDescription>Modifica el día, franja horaria y capacidad.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Día de la semana</Label>
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
                <Label>Frecuencia</Label>
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
                <Label>Hora inicio</Label>
                <Input className="h-10" placeholder="09:30" value={editForm.horaInicio ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, horaInicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora fin <span className="text-xs font-normal opacity-60">(opcional)</span></Label>
                <Input className="h-10" placeholder="12:00" value={editForm.horaFin ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, horaFin: e.target.value || null }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Capacidad máxima <span className="text-xs font-normal opacity-60">(opcional)</span></Label>
              <Input type="number" min={1} className="h-10" placeholder="Sin límite"
                value={editForm.capacidadMax ?? ""}
                onChange={e => setEditForm(f => ({ ...f, capacidadMax: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input className="h-10" placeholder="Ej: Dr. Lines" value={editForm.notas ?? ""}
                onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo-esp" checked={editForm.activo ?? true}
                onChange={e => setEditForm(f => ({ ...f, activo: e.target.checked }))}
                className="size-4 rounded border-border" />
              <Label htmlFor="activo-esp">Especialidad activa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowEditDialog(false)} disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {saving ? "Guardando..." : <><Check className="size-4" />Guardar</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: agregar excepción */}
      <Dialog open={showExcDialog} onOpenChange={setShowExcDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear fecha — {selected?.nombre}</DialogTitle>
            <DialogDescription>El doctor no estará disponible este día.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" className="h-10" value={excForm.fecha}
                onChange={e => setExcForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo <span className="text-xs font-normal opacity-60">(opcional)</span></Label>
              <Input className="h-10" placeholder="Ej: Vacaciones, congreso..." value={excForm.motivo}
                onChange={e => setExcForm(f => ({ ...f, motivo: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowExcDialog(false)} disabled={savingExc}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleCrearExcepcion} disabled={savingExc || !excForm.fecha}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              {savingExc ? "Guardando..." : <><Plus className="size-4" />Bloquear fecha</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
