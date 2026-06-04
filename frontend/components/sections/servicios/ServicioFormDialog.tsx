"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
const SERVICIO_DRAFT_KEY = "servicioDraftFromCita"
const CITA_PREFILL_KEY = "prefillCitaFromServicio"

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
  cantidadArticulo: string
  setCantidadArticulo: (v: string) => void
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
  esEstudioMedico: boolean
  tipoEstudio: string
  setTipoEstudio: (v: string) => void
  expedienteBloqueado: boolean

  // Catálogo dinámico + artículo específico
  catalogoServicios: TipoServicioCompleto[]
  requiereArticulo: boolean
  articulosFiltrados: ArticuloInventario[]
  loadingArticulos: boolean
  idArticuloSeleccionado: string
  setIdArticuloSeleccionado: (v: string) => void

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
  cantidadArticulo,
  setCantidadArticulo,
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
  esEstudioMedico,
  tipoEstudio,
  setTipoEstudio,
  expedienteBloqueado,
  catalogoServicios,
  requiereArticulo,
  articulosFiltrados,
  loadingArticulos,
  idArticuloSeleccionado,
  setIdArticuloSeleccionado,
  onRegistrar,
}: ServicioFormDialogProps) {
  const [articuloPickerOpen, setArticuloPickerOpen] = useState(false)
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const router = useRouter()

  const normalizeForSearch = (v: string) =>
    String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

  const articuloLabel = idArticuloSeleccionado
    ? articulosFiltrados.find(a => String(a.clave) === idArticuloSeleccionado)?.descripcion ?? "Seleccionar"
    : "Seleccionar artículo..."
  const cantidadNumero = Number(cantidadArticulo)
  const cantidadValida = cantidadArticulo.trim() !== "" && Number.isInteger(cantidadNumero) && cantidadNumero > 0
  const tipoNormalizado = tipoServicioSeleccionadoLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const requiereCita = tipoNormalizado.includes("consulta medica") || tipoNormalizado.includes("estudio medico")

  const guardarBorradorYProgramar = () => {
    if (!beneficiarioEncontrado) return

    const draft = {
      busquedaBeneficiario,
      beneficiarioEncontrado,
      tipoServicioSeleccionado,
      montoServicio,
      cantidadArticulo,
      descripcionOtro,
      fechaServicio,
      idArticuloSeleccionado,
    }

    const prefill = {
      curp: beneficiarioEncontrado.curp ?? "",
      idTipoServicio: Number(idTipoServicioNumerico) > 0 ? Number(idTipoServicioNumerico) : undefined,
      fecha: fechaServicio || undefined,
      notas: descripcionOtro?.trim() || undefined,
      registrarServicio: requiereCita,
    }

    try {
      sessionStorage.setItem(SERVICIO_DRAFT_KEY, JSON.stringify(draft))
      sessionStorage.setItem(CITA_PREFILL_KEY, JSON.stringify(prefill))
    } catch {
      // ignore storage errors
    }

    router.push("/panel?section=citas")
  }
  
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
            <div className={`rounded-lg border p-4 ${expedienteBloqueado ? "border-destructive/50 bg-destructive/5" : beneficiarioEncontrado.estatus === "Inactivo" ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20" : "border-success/50 bg-success/5"}`}>
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
                  Atencion: El beneficiario tiene estatus Baja y no puede recibir servicios.
                </p>
              ) : beneficiarioEncontrado.estatus === "Inactivo" ? (
                <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  Aviso: Membresía vencida o inactiva. Se recomienda renovar.
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-success">Beneficiario activo con membresía vigente.</p>
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
                if (tipo?.tipoServicio === "CONSUMIBLE") {
                  setMontoServicio("")
                  setCantidadArticulo("1")
                } else if (nuevoMonto !== null) {
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
          </div>

          {/* Selector de artículo con búsqueda — CONSUMIBLE */}
          {requiereArticulo && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Artículo a entregar</label>
              {loadingArticulos ? (
                <p className="text-xs text-muted-foreground">Cargando inventario...</p>
              ) : articulosFiltrados.length === 0 ? (
                <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Sin artículos disponibles en inventario para este tipo de servicio.
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
                  <PopoverContent className="w-[440px] max-h-[280px] p-0 overflow-hidden" align="start" onWheel={e => e.stopPropagation()}>
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

          {requiereArticulo && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cantidad</label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                className="h-10 text-sm"
                value={cantidadArticulo}
                onChange={(e) => {
                  setCantidadArticulo(e.target.value)
                  if (registroError) setRegistroError("")
                }}
              />
              {!cantidadValida && intentoEnvio && (
                <p className="text-xs font-medium text-destructive">La cantidad debe ser un entero mayor a 0.</p>
              )}
            </div>
          )}

          {/* Chips de precio — cuando hay artículo seleccionado */}
          {requiereArticulo && idArticuloSeleccionado && (() => {
            const art = articulosFiltrados.find(a => String(a.clave) === idArticuloSeleccionado)
            if (!art) return null
            const cuotaRec = parseFloat(String(art.cuota).replace(/[^0-9.]/g, "")) || 0
            const precioLista = art.cuotaB != null ? Number(art.cuotaB) : null
            const fmt = (v: number) => `$${v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            return (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Seleccionar precio</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMontoServicio(String(cuotaRec))}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                      montoServicio === String(cuotaRec)
                        ? "border-[#0f4c81] bg-[#0f4c81]/8 text-[#0f4c81] dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-border/70 bg-muted/20 hover:border-[#0f4c81]/50"
                    }`}
                  >
                    <p className="font-semibold text-foreground">Cuota de recuperación</p>
                    <p className="mt-0.5 text-muted-foreground">{fmt(cuotaRec)}</p>
                  </button>
                  {precioLista != null && (
                    <button
                      type="button"
                      onClick={() => setMontoServicio(String(precioLista))}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                        montoServicio === String(precioLista)
                          ? "border-[#0f4c81] bg-[#0f4c81]/8 text-[#0f4c81] dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                          : "border-border/70 bg-muted/20 hover:border-[#0f4c81]/50"
                      }`}
                    >
                      <p className="font-semibold text-foreground">Precio de lista</p>
                      <p className="mt-0.5 text-muted-foreground">{fmt(precioLista)}</p>
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Tipo de estudio médico */}
          {esEstudioMedico && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de estudio</label>
              <div className="relative">
                <input
                  list="tipos-estudio"
                  placeholder="Ej. Biometría hemática, TAC, Ultrasonido..."
                  className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                  value={tipoEstudio}
                  onChange={(e) => setTipoEstudio(e.target.value)}
                />
                <datalist id="tipos-estudio">
                  <option value="Biometría hemática" />
                  <option value="Biometría hemática completa" />
                  <option value="Química sanguínea" />
                  <option value="Cistograma" />
                  <option value="TAC" />
                  <option value="Resonancia magnética" />
                  <option value="Ultrasonido" />
                  <option value="Rayos X" />
                  <option value="Electrocardiograma" />
                  <option value="Urocultivo" />
                  <option value="Examen general de orina" />
                </datalist>
              </div>
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
                (!requiereArticulo && !montoEsValido) ||
                (requiereArticulo && !cantidadValida)
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
