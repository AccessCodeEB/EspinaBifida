"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Eye, Clock, UserPlus, Loader2, X, Inbox, Check, Zap, Info } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PublicPreregistroSection } from "@/components/public-preregistro-section"
import {
  getBeneficiarios,
  aprobarPreRegistroBeneficiario,
  rechazarPreRegistroBeneficiario,
  type Beneficiario,
} from "@/services/beneficiarios"
import { esSolicitudPublicaPendiente, MARCADOR_SOLICITUD_PUBLICA_PENDIENTE } from "@/lib/solicitud-publica-beneficiario"

function nombreCompleto(b: Beneficiario): string {
  return `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.trim()
}

function notasSinMarcador(notas: string | undefined): string {
  const s = String(notas ?? "")
  const prefix = `${MARCADOR_SOLICITUD_PUBLICA_PENDIENTE}\n`
  if (s.startsWith(prefix)) return s.slice(prefix.length).trim()
  if (s === MARCADOR_SOLICITUD_PUBLICA_PENDIENTE) return ""
  return s.trim()
}

export function PreregistroSection() {
  const [rows, setRows] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDetalleDialog, setShowDetalleDialog] = useState(false)
  const [selected, setSelected] = useState<Beneficiario | null>(null)
  const [showFormularioPublico, setShowFormularioPublico] = useState(false)
  const [accionCurp, setAccionCurp] = useState<string | null>(null)
  
  // Estados para los pop-ups de confirmación
  const [confirmRechazar, setConfirmRechazar] = useState(false)
  const [confirmAprobar, setConfirmAprobar] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBeneficiarios()
      setRows(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pendientes = useMemo(
    () => rows.filter(esSolicitudPublicaPendiente),
    [rows]
  )

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return pendientes.filter((b) => {
      const nombre = nombreCompleto(b).toLowerCase()
      const folio = String(b.folio ?? "").toLowerCase()
      const mail = String(b.correoElectronico ?? "").toLowerCase()
      const ciudad = String(b.ciudad ?? "").toLowerCase()
      return (
        nombre.includes(term) ||
        folio.includes(term) ||
        mail.includes(term) ||
        ciudad.includes(term)
      )
    })
  }, [pendientes, searchTerm])

  const solicitudRapida = pendientes.length > 0 ? pendientes[0] : null;

  async function onAprobarConfirmado() {
    if (!selected) return
    const id = String(selected.folio ?? selected.curp ?? "").trim().toUpperCase()
    setAccionCurp(id)
    try {
      await aprobarPreRegistroBeneficiario(id)
      toast.success("Solicitud aprobada; el beneficiario quedó activo.")
      setConfirmAprobar(false)
      setShowDetalleDialog(false)
      setSelected(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo aprobar")
    } finally {
      setAccionCurp(null)
    }
  }

  async function onRechazarConfirmado() {
    if (!selected) return
    const id = String(selected.folio ?? selected.curp ?? "").trim().toUpperCase()
    setAccionCurp(id)
    try {
      await rechazarPreRegistroBeneficiario(id)
      toast.success("Solicitud cancelada y expediente eliminado.")
      setConfirmRechazar(false)
      setShowDetalleDialog(false)
      setSelected(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo cancelar")
    } finally {
      setAccionCurp(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Preregistro público
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Gestión de solicitudes recibidas desde el portal web.
          </p>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="gap-2 w-full sm:w-auto shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900"
          onClick={() => setShowFormularioPublico(true)}
        >
          <Eye className="size-5" />
          Ver formulario público
        </Button>
      </div>

      {/* BLOQUE SUPERIOR: Métricas a la izquierda, Revisión Rápida a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="flex flex-col gap-4 lg:col-span-4 h-full">
          <Card className="group flex-1 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-amber-200/60 dark:hover:border-amber-900/50">
            <CardContent className="flex items-center gap-5 p-5 h-full">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-500/20 dark:text-amber-400">
                <Clock className="size-6" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-muted-foreground tracking-tight">Pendientes de revisión</p>
                <p className="text-3xl font-bold tracking-tighter text-foreground leading-tight">{pendientes.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group flex-1 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-200/60 dark:hover:border-emerald-900/50">
            <CardContent className="flex items-center gap-5 p-5 h-full">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:bg-emerald-500/20 dark:text-emerald-400">
                <UserPlus className="size-6" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-muted-foreground tracking-tight">Filtrados en tabla</p>
                <p className="text-3xl font-bold tracking-tighter text-foreground leading-tight">{filtered.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Revisión Rápida */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {!loading && solicitudRapida && !searchTerm ? (
            <Card className="relative flex-1 flex flex-col border-border/60 shadow-md bg-white hover:shadow-lg transition-shadow duration-300 overflow-hidden dark:bg-slate-900">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500/90 rounded-l-xl"></div>
              
              <CardHeader className="pb-2 pt-5 pl-7">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Zap className="size-4 fill-current" />
                    Revisión Rápida
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">
                  Evalúa la siguiente solicitud en cola para agilizar el proceso.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-center pl-7 pb-6 pt-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 h-full">
                  
                  <div className="flex-1 w-full flex flex-col justify-center space-y-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Solicitante</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none mb-1.5">
                        {nombreCompleto(solicitudRapida)}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block size-1.5 rounded-full bg-muted-foreground/30"></span>
                        {solicitudRapida.ciudad ? `${solicitudRapida.ciudad}, ` : ""}{solicitudRapida.estado ?? "Sin ubicación"}
                      </p>
                    </div>
                    
                    <div className="relative pl-4 border-l-2 border-muted bg-slate-50/50 py-2.5 pr-4 rounded-r-lg dark:bg-slate-800/20">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                        Motivo / Notas breves
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-2">
                        "{notasSinMarcador(solicitudRapida.notas) || "Sin observaciones adicionales reportadas por el usuario."}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-border/40 dark:bg-slate-800/50">
                    {/* Botón Rechazar -> Abre Modal Confirmación */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-12 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                      disabled={accionCurp === String(solicitudRapida.folio).toUpperCase()}
                      onClick={() => {
                        setSelected(solicitudRapida)
                        setConfirmRechazar(true) // Lanza el pop-up de rechazar
                      }}
                      title="Rechazar solicitud"
                    >
                      <X className="size-6 stroke-[2.5]" />
                    </Button>

                    <div className="w-px h-8 bg-border/60 mx-1"></div>

                    {/* Botón Detalles */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-12 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                      onClick={() => {
                        setSelected(solicitudRapida)
                        setShowDetalleDialog(true)
                      }}
                      title="Ver detalles completos"
                    >
                      <Info className="size-5 stroke-[2.5]" />
                    </Button>

                    {/* Botón Aprobar -> Abre Modal Confirmación */}
                    <Button
                      size="icon"
                      className="size-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 ml-1"
                      disabled={accionCurp === String(solicitudRapida.folio).toUpperCase()}
                      onClick={() => {
                        setSelected(solicitudRapida)
                        setConfirmAprobar(true) // Lanza el pop-up de aprobar
                      }}
                      title="Aprobar solicitud"
                    >
                      {accionCurp === String(solicitudRapida.folio).toUpperCase() ? (
                        <Loader2 className="size-6 animate-spin" />
                      ) : (
                        <Check className="size-7 stroke-[3]" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 border-border/50 border-dashed bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center min-h-[220px] dark:bg-slate-900/20">
               <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mb-4 dark:bg-slate-800 ring-4 ring-slate-50 dark:ring-slate-900/50">
                <Check className="size-6 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-foreground">Todo al día</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[250px]">
                {searchTerm 
                  ? "Limpia la búsqueda en la tabla para volver a usar la revisión rápida." 
                  : "No tienes solicitudes pendientes en la cola de revisión."}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Todas las solicitudes</CardTitle>
              <CardDescription>
                {loading ? "Cargando datos..." : `Mostrando ${filtered.length} expediente(s)`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CURP, correo..."
                className="h-10 pl-9 pr-9 text-sm transition-colors focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-10 animate-spin text-primary/60 mb-4" />
              <p className="text-sm font-medium">Cargando solicitudes...</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-sm font-semibold h-12">Nombre</TableHead>
                    <TableHead className="text-sm font-semibold hidden md:table-cell">CURP</TableHead>
                    <TableHead className="text-sm font-semibold hidden lg:table-cell">Correo</TableHead>
                    <TableHead className="text-sm font-semibold hidden lg:table-cell">Teléfono</TableHead>
                    <TableHead className="text-sm font-semibold text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const curp = String(b.folio ?? b.curp ?? "").trim()
                    const busy = accionCurp === curp.toUpperCase()
                    return (
                      <TableRow key={curp} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{nombreCompleto(b)}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                          {curp}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {b.correoElectronico ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {b.telefonoCelular ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Ver detalle"
                              onClick={() => {
                                setSelected(b)
                                setShowDetalleDialog(true)
                              }}
                            >
                              <Eye className="size-4" />
                              <span className="sr-only">Ver detalle</span>
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs font-semibold"
                              disabled={busy}
                              onClick={() => {
                                setSelected(b)
                                setConfirmAprobar(true)
                              }}
                            >
                              {busy ? <Loader2 className="size-3 animate-spin" /> : "Aprobar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-3 text-xs font-semibold"
                              disabled={busy}
                              onClick={() => {
                                setSelected(b)
                                setConfirmRechazar(true)
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Inbox className="size-8 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">No se encontraron solicitudes</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {searchTerm 
                  ? "No hay expedientes que coincidan con tu búsqueda. Intenta con otros términos." 
                  : "Actualmente no hay solicitudes pendientes de revisión."}
              </p>
              {searchTerm && (
                <Button 
                  variant="link" 
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      <Dialog open={showDetalleDialog} onOpenChange={setShowDetalleDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Detalle de solicitud</DialogTitle>
            <DialogDescription>
              {selected?.fechaAlta ? `Fecha de registro: ${selected.fechaAlta}` : "Información de pre-registro enviada por el usuario"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4 py-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nombre completo</p>
                <p className="text-lg font-bold text-foreground">{nombreCompleto(selected)}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">CURP</p>
                  <p className="font-mono text-base font-medium">{selected.folio}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Estatus en BD</p>
                  <p className="text-base font-medium">{selected.estatus}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Correo Electrónico</p>
                  <p className="text-base font-medium break-all">{selected.correoElectronico ?? "No especificado"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Teléfono</p>
                  <p className="text-base font-medium">{selected.telefonoCelular ?? "No especificado"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Estado / Provincia</p>
                  <p className="text-base font-medium">{selected.estado ?? "No especificado"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ciudad</p>
                  <p className="text-base font-medium">{selected.ciudad ?? "No especificado"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notas / Motivo de consulta</p>
                <p className="text-base whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {notasSinMarcador(selected.notas) || "Sin observaciones adicionales."}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end border-t border-border mt-2">
                <Button variant="ghost" onClick={() => setShowDetalleDialog(false)}>
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  disabled={accionCurp === String(selected.folio).toUpperCase()}
                  onClick={() => setConfirmRechazar(true)}
                >
                  Cancelar solicitud
                </Button>
                <Button
                  className="bg-[#0f4c81] hover:bg-[#0a365c] text-white"
                  disabled={accionCurp === String(selected.folio).toUpperCase()}
                  onClick={() => setConfirmAprobar(true)}
                >
                  {accionCurp === String(selected.folio).toUpperCase() ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : null}
                  Aprobar expediente
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* POP-UP CONFIRMACIÓN: Rechazar / Eliminar */}
      <AlertDialog open={confirmRechazar} onOpenChange={setConfirmRechazar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar y eliminar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el expediente de <span className="font-semibold text-foreground">{selected ? nombreCompleto(selected) : "este usuario"}</span> de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void onRechazarConfirmado()}
            >
              Sí, eliminar expediente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* POP-UP CONFIRMACIÓN: Aprobar */}
      <AlertDialog open={confirmAprobar} onOpenChange={setConfirmAprobar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              El expediente de <span className="font-semibold text-foreground">{selected ? nombreCompleto(selected) : "este usuario"}</span> será aprobado y pasará a ser un beneficiario activo en el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              onClick={() => void onAprobarConfirmado()}
            >
              Sí, aprobar expediente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Formulario Público */}
      <Dialog open={showFormularioPublico} onOpenChange={setShowFormularioPublico}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0">
          <DialogHeader className="p-6 pb-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
            <DialogTitle className="text-2xl font-bold">Vista previa: Formulario público</DialogTitle>
            <DialogDescription>
              Así es exactamente como las familias visualizan el formulario en la web.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            <PublicPreregistroSection embedded hideIntro scrollTargetOnSuccess="panel-administrativo" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}