"use client"

import { useState } from "react"
import { Search, Check, ChevronsUpDown } from "lucide-react"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { TipoServicioCompleto } from "@/services/servicios"
import type { Beneficiario } from "@/services/beneficiarios"
import type { ArticuloInventario } from "@/services/inventario"

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

  // Catálogo dinámico + artículo específico
  catalogoServicios: TipoServicioCompleto[]
  esComodato: boolean
  requiereArticulo: boolean
  articulosFiltrados: ArticuloInventario[]
  loadingArticulos: boolean
  idArticuloSeleccionado: string
  setIdArticuloSeleccionado: (v: string) => void
  fechaDevolucionEsperada: string
  setFechaDevolucionEsperada: (v: string) => void

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
  catalogoServicios,
  esComodato,
  requiereArticulo,
  articulosFiltrados,
  loadingArticulos,
  idArticuloSeleccionado,
  setIdArticuloSeleccionado,
  fechaDevolucionEsperada,
  setFechaDevolucionEsperada,
  onRegistrar,
}: ServicioFormDialogProps) {
  const [articuloPickerOpen, setArticuloPickerOpen] = useState(false)
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const tipoLabel = esComodato ? "comodato" : "consumible"

  const normalizeForSearch = (v: string) =>
    String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

  const articuloLabel = idArticuloSeleccionado
    ? articulosFiltrados.find(a => String(a.clave) === idArticuloSeleccionado)?.descripcion ?? "Seleccionar"
    : esComodato ? "Seleccionar equipo..." : "Seleccionar artículo..."
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                setIdArticuloSeleccionado("")
                const tipo = catalogoServicios.find(t => t.idTipoServicio === Number(value))
                const nuevoMonto = tipo?.montoSugerido ?? null
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
                {catalogoServicios.map((tipo) => (
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
          </div>

          {/* Selector de artículo con búsqueda — COMODATO y CONSUMIBLE */}
          {requiereArticulo && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {esComodato ? "Equipo a prestar *" : "Artículo a entregar (opcional)"}
              </label>
              {loadingArticulos ? (
                <p className="text-xs text-muted-foreground">Cargando inventario...</p>
              ) : articulosFiltrados.length === 0 ? (
                <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {esComodato
                    ? "Sin equipos disponibles en inventario."
                    : "Sin artículos disponibles en inventario — el servicio se registrará sin descuento de stock."}
                </p>
              ) : (
                <Popover open={articuloPickerOpen} onOpenChange={setArticuloPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm text-foreground hover:bg-muted transition-colors ${
                        intentoEnvio && !idArticuloSeleccionado
                          ? "border-red-400 bg-red-50/50 dark:bg-red-950/10"
                          : "border-border/70 bg-background"
                      }`}
                    >
                      <span className="truncate text-left">{articuloLabel}</span>
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[440px] max-h-[280px] p-0 overflow-hidden" align="start">
                    <Command shouldFilter>
                      <CommandInput placeholder="Buscar por nombre..." />
                      <CommandList className="max-h-[240px] overflow-y-auto">
                        <CommandEmpty>No se encontraron artículos.</CommandEmpty>
                        <CommandGroup>
                          {articulosFiltrados.map(a => (
                            <CommandItem
                              key={String(a.clave)}
                              value={normalizeForSearch(a.descripcion)}
                              keywords={[normalizeForSearch(a.descripcion)]}
                              onSelect={() => {
                                setIdArticuloSeleccionado(String(a.clave))
                                setArticuloPickerOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 size-4", idArticuloSeleccionado === String(a.clave) ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1">{a.descripcion}</span>
                              <span className="ml-3 text-[10px] text-muted-foreground">{a.cantidad} disp.</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {/* Fecha de devolución esperada — solo para COMODATO */}
          {esComodato && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Fecha esperada de devolución *
              </label>
              <input
                type="date"
                min={hoy}
                value={fechaDevolucionEsperada}
                onChange={e => setFechaDevolucionEsperada(e.target.value)}
                className={`h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 ${
                  intentoEnvio && !fechaDevolucionEsperada
                    ? "border-red-400 bg-red-50/50 focus:border-red-400 focus:ring-red-100"
                    : "border-border/70 bg-background focus:border-[#0f4c81] focus:ring-[#0f4c81]/10"
                }`}
              />
              <p className="text-[11px] text-muted-foreground">¿Cuándo se espera que regrese el equipo?</p>
            </div>
          )}

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
              onClick={() => { setIntentoEnvio(true); onRegistrar() }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
