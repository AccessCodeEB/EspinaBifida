"use client"

import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { StatusIcon } from "@/components/ui/status-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TIPOS_SERVICIO_SUGERIDOS,
  getMontoSugeridoPorTipoServicio,
} from "@/services/servicios"
import type { Beneficiario } from "@/services/beneficiarios"

const NAVY = "#0f4c81"

export interface BeneficiarioEncontrado {
  curp: string
  nombre: string
  membresia: string
  estatus: string
}

interface ServicioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  // Búsqueda de beneficiario
  busquedaBeneficiario: string
  setBusquedaBeneficiario: (v: string) => void
  beneficiarioEncontrado: BeneficiarioEncontrado | null
  setBeneficiarioEncontrado: (v: BeneficiarioEncontrado | null) => void
  beneficiarios: Beneficiario[]
  loadingBeneficiarios: boolean
  showSugerencias: boolean
  setShowSugerencias: (v: boolean) => void
  sugerenciasBeneficiarios: Beneficiario[]
  onBuscarBeneficiario: () => void
  onSeleccionarSugerencia: (b: Beneficiario) => void

  // Campos del formulario
  tipoServicioSeleccionado: string
  setTipoServicioSeleccionado: (v: string) => void
  montoServicio: string
  setMontoServicio: (v: string) => void
  descripcionOtro: string
  setDescripcionOtro: (v: string) => void
  fechaServicio: string
  setFechaServicio: (v: string) => void
  fechaError: string
  setFechaError: (v: string) => void
  registroError: string
  setRegistroError: (v: string) => void
  registroLoading: boolean

  // Derived
  hoy: string
  fechaEsFutura: boolean
  idTipoServicioNumerico: number
  montoEsValido: boolean
  montoSugerido: number | null
  tipoServicioSeleccionadoLabel: string
  requiereDescripcionOtro: boolean
  expedienteBloqueado: boolean

  onRegistrar: () => void
}

export function ServicioFormDialog({
  open,
  onOpenChange,
  busquedaBeneficiario,
  setBusquedaBeneficiario,
  beneficiarioEncontrado,
  setBeneficiarioEncontrado,
  beneficiarios,
  loadingBeneficiarios,
  showSugerencias,
  setShowSugerencias,
  sugerenciasBeneficiarios,
  onBuscarBeneficiario,
  onSeleccionarSugerencia,
  tipoServicioSeleccionado,
  setTipoServicioSeleccionado,
  montoServicio,
  setMontoServicio,
  descripcionOtro,
  setDescripcionOtro,
  fechaServicio,
  setFechaServicio,
  fechaError,
  setFechaError,
  registroError,
  setRegistroError,
  registroLoading,
  hoy,
  fechaEsFutura,
  idTipoServicioNumerico,
  montoEsValido,
  montoSugerido,
  tipoServicioSeleccionadoLabel,
  requiereDescripcionOtro,
  expedienteBloqueado,
  onRegistrar,
}: ServicioFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Registrar Nuevo Servicio</DialogTitle>
          <DialogDescription className="text-xs">Busca al beneficiario y completa los datos del servicio</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Búsqueda de beneficiario */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Buscar beneficiario</label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  placeholder="CURP o nombre..."
                  className="h-10 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                  value={busquedaBeneficiario}
                  onFocus={() => setShowSugerencias(true)}
                  onChange={(e) => {
                    setBusquedaBeneficiario(e.target.value)
                    setShowSugerencias(true)
                    if (!e.target.value.trim()) setBeneficiarioEncontrado(null)
                  }}
                />
                <button
                  onClick={onBuscarBeneficiario}
                  className="flex items-center justify-center rounded-lg border border-border/70 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Search className="size-4" />
                </button>
              </div>

              {showSugerencias && busquedaBeneficiario.trim().toLowerCase() && (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {loadingBeneficiarios ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Cargando beneficiarios...</p>
                  ) : sugerenciasBeneficiarios.length > 0 ? (
                    sugerenciasBeneficiarios.map((b) => {
                      const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
                      return (
                        <button
                          key={b.curp ?? b.folio}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => onSeleccionarSugerencia(b)}
                        >
                          <span className="font-medium">{nombre}</span>
                          <span className="text-xs text-muted-foreground">{b.curp ?? "SIN CURP"}</span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta del beneficiario encontrado */}
          {beneficiarioEncontrado && (
            <div className={`rounded-lg border p-4 ${expedienteBloqueado ? "border-destructive/50 bg-destructive/5" : "border-success/50 bg-success/5"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{beneficiarioEncontrado.nombre}</p>
                  <p className="text-sm text-muted-foreground">{beneficiarioEncontrado.curp || "SIN CURP"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estatus: {beneficiarioEncontrado.estatus} | Membresia: {beneficiarioEncontrado.membresia}
                  </p>
                </div>
                <StatusIcon status={beneficiarioEncontrado.estatus} />
              </div>
              {expedienteBloqueado ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  Atencion: El beneficiario esta en estatus {beneficiarioEncontrado.estatus}. No se pueden registrar servicios.
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-success">Aviso: Membresia vigente por estatus Activo.</p>
              )}
            </div>
          )}

          {/* Tipo de servicio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de servicio</label>
            <Select
              value={tipoServicioSeleccionado}
              onValueChange={(value) => {
                setTipoServicioSeleccionado(value)
                setRegistroError("")
                const nuevoMonto = getMontoSugeridoPorTipoServicio(Number(value))
                if (nuevoMonto !== null) {
                  setMontoServicio(String(nuevoMonto.toFixed(2)))
                } else {
                  setMontoServicio("")
                }
              }}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SERVICIO_SUGERIDOS.map((tipo) => (
                  <SelectItem key={tipo.idTipoServicio} value={String(tipo.idTipoServicio)}>
                    {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {montoSugerido !== null && (
              <p className="text-sm text-muted-foreground">
                Monto sugerido para {tipoServicioSeleccionadoLabel}: ${montoSugerido.toFixed(2)}
              </p>
            )}
            {tipoServicioSeleccionadoLabel === "Otros" && (
              <p className="text-sm text-muted-foreground">Este servicio no tiene monto sugerido automatico.</p>
            )}
          </div>

          {/* Descripción para "Otros" */}
          {requiereDescripcionOtro && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Especificar servicio</label>
              <Input
                placeholder="Describe qué servicio se brindó..."
                className="h-10 text-sm"
                value={descripcionOtro}
                required
                onChange={(e) => {
                  setDescripcionOtro(e.target.value)
                  if (registroError) setRegistroError("")
                }}
              />
              <p className="text-sm text-muted-foreground">
                Campo obligatorio para registrar la informacion del servicio de tipo "Otros".
              </p>
            </div>
          )}

          {/* Fecha y monto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fecha</label>
              <Input
                type="date"
                className="h-10 text-sm"
                max={hoy}
                value={fechaServicio}
                onChange={(e) => {
                  setFechaServicio(e.target.value)
                  if (fechaError) setFechaError("")
                }}
              />
              {fechaError && <p className="text-sm font-medium text-destructive">{fechaError}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Monto</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="$0.00"
                className="h-10 text-sm"
                value={montoServicio}
                onChange={(e) => {
                  setMontoServicio(e.target.value)
                  if (registroError) setRegistroError("")
                }}
              />
            </div>
          </div>

          {/* Error de registro */}
          {registroError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {registroError}
            </p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={
                registroLoading ||
                !beneficiarioEncontrado ||
                expedienteBloqueado ||
                fechaEsFutura ||
                !Number.isInteger(idTipoServicioNumerico) ||
                idTipoServicioNumerico <= 0 ||
                !montoEsValido
              }
              onClick={onRegistrar}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {registroLoading ? "Registrando..." : "Registrar servicio"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
