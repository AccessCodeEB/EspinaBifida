"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, CalendarDays, List, AlertCircle, ChevronDown } from "lucide-react"
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

  // Beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [buscaBenef, setBuscaBenef] = useState("")
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
    if (missing.length > 0) { setSaveError(`Selecciona: ${missing.join(", ")}.`); return }
    // PART 2 #1 #2 #3 — validate work hours + doctor overlap
    const slotError = validateSlot(citas, form.fecha, form.hora, form.especialista)
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
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Error al guardar la cita.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Citas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de citas con especialistas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Stats compactos */}
          {!loading && (
            <div className="hidden sm:flex items-center gap-3 mr-1 text-xs">
              <span className="flex items-center gap-1">
                <span className="font-bold text-foreground">{stats.hoy}</span>
                <span className="text-muted-foreground">hoy</span>
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-primary">{stats.semana}</span>
                <span className="text-muted-foreground">semana</span>
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-amber-400">{stats.pendientes}</span>
                <span className="text-muted-foreground">pendientes</span>
              </span>
            </div>
          )}
          {/* Toggle pill */}
          <div className="flex items-center rounded-xl border border-border/50 bg-muted/30 p-1 gap-1">
            <button
              onClick={() => switchView("calendar")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeView === "calendar"
                  ? "bg-background text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="size-3.5" />
              Agenda
            </button>
            <button
              onClick={() => switchView("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeView === "list"
                  ? "bg-background text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              Historial
            </button>
          </div>

          <Button className="gap-2 shadow-sm" onClick={openDialog}>
            <Plus className="size-4" />Nueva Cita
          </Button>
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
            <CitasCalendarView citas={citas} onReload={loadCitas} stats={stats} />
          ) : (
            <CitasListView citas={citas} beneficiarios={beneficiarios} />
          )}
        </div>
      )}

      {/* ── Dialog Nueva Cita ── */}
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
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowBenefList(!showBenefList)}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              {showBenefList && benefFiltrados.length > 0 && !form.curp && (
                <div className="absolute z-20 mt-1 w-full max-h-56 rounded-xl border border-border/60 bg-background shadow-lg overflow-y-auto">
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
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Seleccionar tipo de servicio" /></SelectTrigger>
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
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Seleccionar especialista (opcional)" /></SelectTrigger>
                <SelectContent>
                  {ESPECIALISTAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
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
                <AlertCircle className="size-4 shrink-0" />{saveError}
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
    </div>
  )
}
