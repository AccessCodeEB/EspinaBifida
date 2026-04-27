"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, CalendarDays, Check, Clock, X, ChevronLeft, ChevronRight, AlertCircle, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCitas, createCita, updateEstatusCita, type Cita } from "@/services/citas"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import { TIPOS_SERVICIO_SUGERIDOS } from "@/services/servicios"

const DIAS_SEMANA = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const ESPECIALISTAS = [
  "Dr. Roberto Méndez - Neurología",
  "Dra. Patricia Solís - Rehabilitación",
  "Lic. Carmen Ruiz - Psicología",
  "Dr. Miguel Torres - Urología",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Mon=0
}

function getCitasForDay(citasList: Cita[], year: number, month: number, day: number) {
  return citasList.filter((c) => {
    if (!c.fecha) return false
    const d = new Date(c.fecha + "T12:00:00")
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })
}

function CitaStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; Icon: typeof Check }> = {
    Confirmada: { color: "bg-emerald-500", Icon: Check },
    Pendiente: { color: "bg-amber-500", Icon: Clock },
    Completada: { color: "bg-[#005bb5]", Icon: Check },
    Cancelada: { color: "bg-red-600", Icon: X },
  }
  const c = config[status]
  if (!c) return null
  return (
    <div className={`flex size-6 items-center justify-center rounded-full ${c.color} text-white shadow-sm shrink-0`}>
      <c.Icon className="size-3.5 stroke-3" />
    </div>
  )
}

const EMPTY_FORM = { curp: "", idTipoServicio: "", especialista: "", fecha: "", hora: "", notas: "" }

export function CitasSection() {
  const today = new Date()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [buscaBenef, setBuscaBenef] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [confirmStatus, setConfirmStatus] = useState<{ id: number, estatus: Cita["estatus"], name: string } | null>(null)
  const [showBenefList, setShowBenefList] = useState(false)

  const loadCitas = useCallback(() => {
    setLoading(true)
    getCitas()
      .then(setCitas)
      .catch(err => setError(err?.message ?? "Error al cargar citas"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCitas()
    getBeneficiarios().then(setBeneficiarios).catch(() => { })
  }, [loadCitas])

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDayOfWeek = getFirstDayOfWeek(calYear, calMonth)

  const citasDelDia = useMemo(
    () => selectedDay ? getCitasForDay(citas, calYear, calMonth, selectedDay) : [],
    [citas, calYear, calMonth, selectedDay]
  )

  const proximas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return [...citas]
      .filter(c => c.estatus !== "Cancelada" && c.fecha && new Date(c.fecha + "T00:00:00") >= hoy)
      .sort((a, b) => {
        const ta = new Date(a.fecha + "T" + (a.hora || "00:00")).getTime()
        const tb = new Date(b.fecha + "T" + (b.hora || "00:00")).getTime()
        return ta - tb
      })
      .slice(0, 15)
  }, [citas])

  const benefFiltrados = useMemo(() => {
    const sorted = [...beneficiarios].sort((a, b) => a.nombres.localeCompare(b.nombres))
    const q = buscaBenef.toLowerCase().trim()
    if (!q) return sorted
    return sorted.filter(b =>
      b.folio?.toLowerCase().includes(q) ||
      `${b.nombres} ${b.apellidoPaterno}`.toLowerCase().includes(q)
    )
  }, [beneficiarios, buscaBenef])

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
    setSelectedDay(null)
  }

  function openDialog() {
    setForm(EMPTY_FORM)
    setSaveError(null)
    setBuscaBenef("")
    setShowBenefList(false)
    setShowDialog(true)
  }

  async function handleGuardar() {
    const missing: string[] = []
    if (!form.curp) missing.push("beneficiario")
    if (!form.idTipoServicio) missing.push("tipo de servicio")
    if (!form.fecha) missing.push("fecha")
    if (!form.hora) missing.push("hora")
    if (missing.length > 0) {
      setSaveError(`Selecciona: ${missing.join(", ")}.`)
      return
    }
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
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Error al guardar la cita.")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateEstatus(id: number, estatus: Cita["estatus"]) {
    setUpdatingId(id)
    try {
      await updateEstatusCita(id, estatus)
      toast.success(`Cita marcada como ${estatus}`)
      loadCitas()
      setConfirmStatus(null)
    } catch {
      toast.error("No se pudo actualizar el estatus de la cita.")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground text-sm">Cargando citas...</p></div>
  if (error) return <div className="flex h-64 items-center justify-center"><p className="text-destructive text-sm">{error}</p></div>

  const isToday = (day: number) =>
    day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Citas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de citas con especialistas.</p>
        </div>
        <Button className="gap-2 shadow-sm" onClick={openDialog}>
          <Plus className="size-4" />Nueva Cita
        </Button>
      </div>

      {/* Calendar + Day panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="border-border/60 shadow-sm lg:col-span-4 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" />
                <CardTitle className="text-lg font-bold">{MESES[calMonth]} {calYear}</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}><ChevronLeft className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}><ChevronRight className="size-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 mt-4">
              {DIAS_SEMANA.map(dia => (
                <div key={dia} className="pb-2 text-center text-xs font-semibold text-muted-foreground">{dia}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dia => {
                const citasDia = getCitasForDay(citas, calYear, calMonth, dia)
                const isSelected = selectedDay === dia
                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDay(dia)}
                    className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm transition-all
                      ${isSelected ? "bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90" : "text-foreground font-medium hover:bg-muted"}
                      ${isToday(dia) && !isSelected ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
                  >
                    <span>{dia}</span>
                    {citasDia.length > 0 && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                        {citasDia.slice(0, 3).map((_, i) => (
                          <div key={i} className={`size-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm lg:col-span-3 rounded-2xl bg-muted/10">
          <CardHeader className="pb-4 pt-6 px-6 border-b border-border/40">
            <CardTitle className="text-lg font-bold">
              {selectedDay ? `${selectedDay} de ${MESES[calMonth]}` : "Seleccione un día"}
            </CardTitle>
            <CardDescription>
              {citasDelDia.length} cita{citasDelDia.length !== 1 ? "s" : ""} programada{citasDelDia.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {citasDelDia.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">No hay citas para este día.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                {citasDelDia.map(cita => (
                  <div key={cita.id} className="rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-bold text-foreground">{cita.hora}</p>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{cita.beneficiario}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{cita.especialista}</p>
                      </div>
                      <CitaStatusBadge status={cita.estatus} />
                    </div>
                    {cita.estatus === "Pendiente" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-400 text-emerald-600 hover:bg-emerald-50"
                          disabled={updatingId === cita.id}
                          onClick={() => setConfirmStatus({ id: cita.id, estatus: "Confirmada", name: cita.beneficiario })}>
                          Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-600 hover:bg-red-50"
                          disabled={updatingId === cita.id}
                          onClick={() => setConfirmStatus({ id: cita.id, estatus: "Cancelada", name: cita.beneficiario })}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                    {cita.estatus === "Confirmada" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-blue-400 text-blue-600 hover:bg-blue-50"
                          disabled={updatingId === cita.id}
                          onClick={() => setConfirmStatus({ id: cita.id, estatus: "Completada", name: cita.beneficiario })}>
                          Marcar Completada
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-600 hover:bg-red-50"
                          disabled={updatingId === cita.id}
                          onClick={() => setConfirmStatus({ id: cita.id, estatus: "Cancelada", name: cita.beneficiario })}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximas Citas */}
      <Card className="border-border/60 shadow-sm rounded-2xl">
        <CardHeader className="px-6 py-5 border-b border-border/40">
          <CardTitle className="text-lg font-bold">Próximas Citas</CardTitle>
          <CardDescription>Citas programadas y confirmadas próximas.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay citas próximas programadas.</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
              {proximas.map(cita => (
                <div key={cita.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{cita.folio}</span>
                      <span className="text-sm font-bold text-foreground">{cita.beneficiario}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 opacity-70" />{cita.fecha}</span>
                      <span className="flex items-center gap-1.5"><Clock className="size-3.5 opacity-70" />{cita.hora}</span>
                      <span>{cita.especialista}</span>
                    </div>
                  </div>
                  <div className="self-end sm:self-center">
                    <CitaStatusBadge status={cita.estatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nueva Cita */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/10">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Agendar Nueva Cita</DialogTitle>
              <DialogDescription>Programme una visita con un especialista médico.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            {/* Beneficiario */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="buscaBenef" className="text-sm font-semibold">Beneficiario</Label>
              <div className="relative">
                <Input
                  id="buscaBenef"
                  placeholder="Buscar por folio o nombre..."
                  className="bg-muted/30 pr-8"
                  value={buscaBenef}
                  onFocus={() => setShowBenefList(true)}
                  onChange={e => { setBuscaBenef(e.target.value); setForm(f => ({ ...f, curp: "" })); setShowBenefList(true) }}
                />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowBenefList(!showBenefList)}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              {showBenefList && benefFiltrados.length > 0 && !form.curp && (
                <div className="absolute z-10 mt-1 w-full max-h-60 rounded-xl border border-border/60 bg-background shadow-lg overflow-y-auto">
                  {benefFiltrados.map(b => (
                    <button
                      key={b.folio}
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setForm(f => ({ ...f, curp: b.folio }))
                        setBuscaBenef(`${b.nombres} ${b.apellidoPaterno} (${b.folio})`)
                        setShowBenefList(false)
                      }}
                    >
                      <span className="font-semibold text-primary mr-2">{b.folio}</span>
                      {b.nombres} {b.apellidoPaterno}
                    </button>
                  ))}
                </div>
              )}
              {form.curp && <p className="text-xs text-emerald-600 font-medium">✓ CURP: {form.curp}</p>}
              {!form.curp && buscaBenef && (
                <p className="text-xs text-amber-600 font-medium">⚠ Selecciona un beneficiario de la lista</p>
              )}
            </div>

            {/* Tipo de Servicio */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Tipo de Servicio</Label>
              <Select value={form.idTipoServicio} onValueChange={v => setForm(f => ({ ...f, idTipoServicio: v }))}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Seleccionar tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICIO_SUGERIDOS.map(t => (
                    <SelectItem key={t.idTipoServicio} value={String(t.idTipoServicio)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Especialista */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Especialista</Label>
              <Select value={form.especialista} onValueChange={v => setForm(f => ({ ...f, especialista: v }))}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Seleccionar especialista (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {ESPECIALISTAS.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fecha-cita" className="text-sm font-semibold">Fecha</Label>
                <Input id="fecha-cita" type="date" className="bg-muted/30" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hora-cita" className="text-sm font-semibold">Hora</Label>
                <Input id="hora-cita" type="time" className="bg-muted/30" value={form.hora}
                  onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="notas-cita" className="text-sm font-semibold">Notas u Observaciones</Label>
              <Input id="notas-cita" placeholder="Opcional" className="bg-muted/30" value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            {saveError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {saveError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cita"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Estatus */}
      <Dialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estatus</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas marcar la cita de <strong>{confirmStatus?.name}</strong> como <span className="font-bold">{confirmStatus?.estatus}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmStatus(null)} disabled={updatingId !== null}>Cancelar</Button>
            <Button 
              variant={confirmStatus?.estatus === "Cancelada" ? "destructive" : "default"}
              onClick={() => confirmStatus && handleUpdateEstatus(confirmStatus.id, confirmStatus.estatus)} 
              disabled={updatingId !== null}
            >
              {updatingId !== null ? "Guardando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
