"use client"

import { useState, useEffect } from "react"
import { Plus, CalendarDays, Check, Clock, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { getCitas, type Cita } from "@/services/citas"

const DIAS_SEMANA    = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
const DIAS_CALENDARIO = Array.from({ length: 28 }, (_, i) => i + 1)

function getCitasForDay(citasList: Cita[], day: number) {
  return citasList.filter((c) => {
    if (!c.fecha) return false
    return new Date(c.fecha + "T12:00:00").getDate() === day
  })
}

function CitaStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; Icon: typeof Check }> = {
    Confirmada: { color: "bg-emerald-500", Icon: Check },
    Pendiente:  { color: "bg-amber-500",   Icon: Clock },
    Completada: { color: "bg-[#005bb5]",   Icon: Check },
    Cancelada:  { color: "bg-red-600",     Icon: X },
  }
  const c = config[status]
  if (!c) return null
  return (
    <div className={`flex size-6 items-center justify-center rounded-full ${c.color} text-white shadow-sm shrink-0`}>
      <c.Icon className="size-3.5 stroke-[3]" />
    </div>
  )
}

export function CitasSection() {
  const [citas, setCitas]         = useState<Cita[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [selectedDay, setSelectedDay]           = useState<number | null>(null)
  const [showNuevaCitaDialog, setShowNuevaCitaDialog] = useState(false)

  useEffect(() => {
    getCitas()
      .then(data => {
        setCitas(data)
        const firstDate = data[0]?.fecha
        if (firstDate) setSelectedDay(new Date(firstDate).getDate())
      })
      .catch(err => setError(err?.message ?? "Error al cargar citas"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground text-sm">Cargando citas...</p></div>
  if (error)   return <div className="flex h-64 items-center justify-center"><p className="text-destructive text-sm">{error}</p></div>

  const citasDelDia = selectedDay ? getCitasForDay(citas, selectedDay) : []

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Citas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de citas con especialistas.</p>
        </div>
        <Button className="gap-2 shadow-sm" onClick={() => setShowNuevaCitaDialog(true)}>
          <Plus className="size-4" />Nueva Cita
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="border-border/60 shadow-sm lg:col-span-4 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              <CardTitle className="text-lg font-bold">Febrero 2026</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-7 gap-y-4 gap-x-1 mt-4">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="pb-2 text-center text-xs font-semibold text-muted-foreground">{dia}</div>
              ))}
              <div className="p-2" />
              {DIAS_CALENDARIO.map((dia) => {
                const citasDia  = getCitasForDay(citas, dia)
                const isSelected = selectedDay === dia
                const isToday    = dia === 26
                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDay(dia)}
                    className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm transition-all
                      ${isSelected ? "bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90" : "text-foreground font-medium hover:bg-muted"}
                      ${isToday && !isSelected ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
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
              {selectedDay ? `${selectedDay} de Febrero` : "Seleccione un día"}
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
              <div className="flex flex-col gap-3">
                {citasDelDia.map((cita) => (
                  <div key={cita.id} className="rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-bold text-foreground">{cita.hora}</p>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{cita.beneficiario}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{cita.especialista}</p>
                      </div>
                      <CitaStatusBadge status={cita.estatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl">
        <CardHeader className="px-6 py-5 border-b border-border/40">
          <CardTitle className="text-lg font-bold">Próximas Citas</CardTitle>
          <CardDescription>Todas las citas programadas en el sistema.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            {citas.map((cita) => (
              <div
                key={cita.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
              >
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
        </CardContent>
      </Card>

      <Dialog open={showNuevaCitaDialog} onOpenChange={setShowNuevaCitaDialog}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/10">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Agendar Nueva Cita</DialogTitle>
              <DialogDescription>Programe una visita con un especialista médico.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="beneficiario" className="text-sm font-semibold">Beneficiario</Label>
              <Input id="beneficiario" placeholder="Buscar por folio o nombre..." className="bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="especialista" className="text-sm font-semibold">Especialista</Label>
              <Select>
                <SelectTrigger id="especialista" className="bg-muted/30">
                  <SelectValue placeholder="Seleccionar doctor o especialista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mendez">Dr. Roberto Méndez - Neurología</SelectItem>
                  <SelectItem value="solis">Dra. Patricia Solís - Rehabilitación</SelectItem>
                  <SelectItem value="ruiz">Lic. Carmen Ruiz - Psicología</SelectItem>
                  <SelectItem value="torres">Dr. Miguel Torres - Urología</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fecha" className="text-sm font-semibold">Fecha</Label>
                <Input id="fecha" type="date" className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hora" className="text-sm font-semibold">Hora</Label>
                <Input id="hora" type="time" className="bg-muted/30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notas" className="text-sm font-semibold">Notas u Observaciones</Label>
              <Input id="notas" placeholder="Opcional" className="bg-muted/30" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowNuevaCitaDialog(false)}>Cancelar</Button>
            <Button type="button" onClick={() => setShowNuevaCitaDialog(false)}>Guardar Cita</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
