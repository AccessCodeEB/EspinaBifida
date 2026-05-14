"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  Eye,
  ExternalLink,
  Clock,
  Loader2,
  RefreshCw,
  X,
  Inbox,
  Check,
  Info,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
} from "lucide-react"
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
import {
  getBeneficiarios,
  getBeneficiario,
  aprobarPreRegistroBeneficiario,
  rechazarPreRegistroBeneficiario,
  type Beneficiario,
} from "@/services/beneficiarios"
import { BeneficiariosEditDialog } from "@/components/beneficiarios-edit-dialog"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { esSolicitudPublicaPendiente, MARCADOR_SOLICITUD_PUBLICA_PENDIENTE } from "@/lib/solicitud-publica-beneficiario"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { labelTipoEspinaBifida } from "@/lib/beneficiario-alta"
import { cn } from "@/lib/utils"

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
  const [accionCurp, setAccionCurp] = useState<string | null>(null)
  
  // Estados para los pop-ups de confirmación
  const [confirmRechazar, setConfirmRechazar] = useState(false)
  const [confirmAprobar, setConfirmAprobar] = useState(false)
  /** Tras aprobar con éxito: ofrecer abrir el editor de expediente completo. */
  const [completarExpediente, setCompletarExpediente] = useState<{
    curp: string
    nombre: string
  } | null>(null)

  const [overlayAction, setOverlayAction] = useState<"baja" | "eliminar" | null>(null)
  const [removeFotoConfirmOpen, setRemoveFotoConfirmOpen] = useState(false)

  const {
    showEditDialog,
    setShowEditDialog,
    isSaving,
    saveError,
    setSaveError,
    editErrors,
    editForm,
    handleEditChange,
    handleSaveEdit,
    handleEditDelete,
    handleDarDeBaja,
    selectedBeneficiario,
    setSelectedBeneficiario,
    beneficiarios: beneficiariosEditList,
    fotoUploading,
    editFotoPreview,
    handleEditFotoSelected,
    handleDeleteFotoBeneficiario,
    openEdit,
  } = useBeneficiarios()

  /** Índice dentro de `pendientes` para la tarjeta «Revisión rápida» */
  const [quickReviewIndex, setQuickReviewIndex] = useState(0)

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

  useEffect(() => {
    setQuickReviewIndex((i) => {
      const n = pendientes.length
      if (n === 0) return 0
      return Math.min(i, n - 1)
    })
  }, [pendientes.length])

  const solicitudRapida =
    pendientes.length > 0 ? pendientes[quickReviewIndex] ?? pendientes[0] : null

  const goPrevQuick = useCallback(() => {
    setQuickReviewIndex((i) => {
      const n = pendientes.length
      if (n <= 1) return 0
      return i <= 0 ? n - 1 : i - 1
    })
  }, [pendientes.length])

  const goNextQuick = useCallback(() => {
    setQuickReviewIndex((i) => {
      const n = pendientes.length
      if (n <= 1) return 0
      return i >= n - 1 ? 0 : i + 1
    })
  }, [pendientes.length])

  const fotoRevisionRapidaSrc = useMemo(
    () =>
      solicitudRapida
        ? resolvePublicUploadUrl(
            solicitudRapida.fotoPerfilUrl ?? undefined,
            solicitudRapida.folio
          )
        : undefined,
    [solicitudRapida?.folio, solicitudRapida?.fotoPerfilUrl]
  )

  async function onAprobarConfirmado() {
    if (!selected) return
    const id = String(selected.folio ?? selected.curp ?? "").trim().toUpperCase()
    const nombre = nombreCompleto(selected)
    setAccionCurp(id)
    try {
      await aprobarPreRegistroBeneficiario(id)
      toast.success("Solicitud aprobada; el beneficiario quedó activo.")
      setConfirmAprobar(false)
      setShowDetalleDialog(false)
      setSelected(null)
      await load()
      setCompletarExpediente({ curp: id, nombre })
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
          <p className="mt-1 text-base text-foreground">
            Gestión de solicitudes recibidas desde el portal web.
          </p>
        </div>
        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900">
          <Link
            href="/#seccion-registro"
            className="inline-flex items-center justify-center gap-2 no-underline"
            title="Abrir el sitio público de la asociación"
          >
            <ExternalLink className="size-5 shrink-0" aria-hidden />
            Ver sitio público
          </Link>
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
                <p className="text-sm font-medium tracking-tight text-muted-foreground">Pendientes de revisión</p>
                <p className="text-3xl font-bold tracking-tighter leading-tight text-foreground">
                  {pendientes.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            className="group flex-1 cursor-pointer border-border/50 bg-background/50 backdrop-blur-sm shadow-sm outline-none transition-all duration-300 hover:border-sky-200/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:border-sky-900/50"
            onClick={() => window.location.reload()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                window.location.reload()
              }
            }}
            aria-label="Refrescar la página y volver a cargar las solicitudes"
          >
            <CardContent className="flex h-full items-center gap-5 p-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 transition-transform duration-300 group-hover:scale-110 group-active:scale-95 dark:bg-sky-500/20 dark:text-sky-400">
                <RefreshCw className="size-6" aria-hidden />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-sm font-semibold tracking-tight text-muted-foreground">Refrescar página</p>
                <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                  Click para recargar la pagina y ver los datos mas actualizados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Revisión Rápida */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {!loading && solicitudRapida ? (
            <Card
              id="revision-rapida-preregistro"
              className="relative flex min-h-[336px] scroll-mt-24 flex-col overflow-hidden border-border/60 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg dark:bg-slate-900 md:min-h-[380px]"
            >
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-xl bg-blue-500/90"></div>

              <CardContent className="flex min-h-0 flex-1 flex-col pl-7 pr-4 pb-4 pt-4">
                <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
                    <div className="flex shrink-0 items-center gap-4">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:size-16">
                        {fotoRevisionRapidaSrc ? (
                          <img
                            src={fotoRevisionRapidaSrc}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="size-7 text-slate-400" />
                        )}
                      </div>

                      {/* Datos del Solicitante */}
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Solicitante
                        </p>
                        <h3 className="mb-1.5 text-xl font-extrabold leading-none tracking-tight text-foreground sm:text-2xl">
                          {nombreCompleto(solicitudRapida)}
                        </h3>
                        <p className="flex items-center gap-1.5 text-sm font-normal leading-relaxed text-foreground">
                          <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
                          {solicitudRapida.ciudad ? `${solicitudRapida.ciudad}, ` : ""}
                          {solicitudRapida.estado ?? "Sin ubicación"}
                        </p>
                      </div>
                    </div>

                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-r-lg border-l-2 border-muted py-2.5 pl-4 pr-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Motivo / Notas breves
                      </p>
                      <div className="max-h-[72px] overflow-y-auto overscroll-contain pr-1">
                        <p className="text-sm font-normal leading-relaxed text-foreground">
                          &quot;
                          {notasSinMarcador(solicitudRapida.notas) ||
                            "Sin observaciones adicionales reportadas por el usuario."}
                          &quot;
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Tipo de espina bífida
                          </p>
                          <p className="text-sm font-normal leading-relaxed text-foreground">
                            {labelTipoEspinaBifida(solicitudRapida.tipo)}
                          </p>
                        </div>
                        <div>
                          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Número de teléfono
                          </p>
                          <p className="text-sm font-normal leading-relaxed text-foreground">
                            {solicitudRapida.telefonoCelular?.trim() || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 md:flex-nowrap md:gap-4">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-12 rounded-full border-2 border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      onClick={() => {
                        setSelected(solicitudRapida)
                        setShowDetalleDialog(true)
                      }}
                      title="Ver detalles completos"
                    >
                      <Info className="size-6 stroke-[2]" />
                    </Button>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-2xl border border-border/60 bg-slate-50 p-2 shadow-sm dark:bg-slate-800/50",
                        // Hover en X → el check pierde el bloque verde (solo icono gris)
                        "[&:has(.quick-review-reject:hover)_.quick-review-approve]:scale-100 [&:has(.quick-review-reject:hover)_.quick-review-approve]:bg-transparent [&:has(.quick-review-reject:hover)_.quick-review-approve]:shadow-none [&:has(.quick-review-reject:hover)_.quick-review-approve]:text-slate-500 [&:has(.quick-review-reject:hover)_.quick-review-approve:hover]:bg-transparent [&:has(.quick-review-reject:hover)_.quick-review-approve:hover]:text-slate-600 dark:[&:has(.quick-review-reject:hover)_.quick-review-approve]:text-slate-400 dark:[&:has(.quick-review-reject:hover)_.quick-review-approve:hover]:text-slate-300",
                        // Hover en check → la X solo en gris, sin contorno
                        "[&:has(.quick-review-approve:hover)_.quick-review-reject]:scale-100 [&:has(.quick-review-approve:hover)_.quick-review-reject]:border-transparent [&:has(.quick-review-approve:hover)_.quick-review-reject]:bg-transparent [&:has(.quick-review-approve:hover)_.quick-review-reject]:text-slate-500 [&:has(.quick-review-approve:hover)_.quick-review-reject]:shadow-none dark:[&:has(.quick-review-approve:hover)_.quick-review-reject]:text-slate-400"
                      )}
                    >
                      <Button
                        size="icon"
                        variant="outline"
                        className="quick-review-reject size-12 rounded-xl border-transparent bg-destructive/10 text-destructive shadow-md shadow-destructive/15 transition-all hover:scale-105 hover:border-transparent hover:bg-destructive/15 hover:text-destructive active:scale-95 dark:border-transparent dark:bg-destructive/15 dark:shadow-destructive/20 dark:hover:bg-destructive/20"
                        disabled={accionCurp === String(solicitudRapida.folio).toUpperCase()}
                        onClick={() => {
                          setSelected(solicitudRapida)
                          setConfirmRechazar(true)
                        }}
                        title="Rechazar solicitud"
                      >
                        <X className="size-6 stroke-[2.5]" />
                      </Button>

                      <Button
                        size="icon"
                        className="quick-review-approve size-12 rounded-xl bg-emerald-500 text-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_6px_16px_-4px_rgba(5,150,105,0.55)] transition-all hover:scale-105 hover:bg-emerald-600 active:scale-95 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35),0_6px_20px_-4px_rgba(52,211,153,0.45)]"
                        disabled={accionCurp === String(solicitudRapida.folio).toUpperCase()}
                        onClick={() => {
                          setSelected(solicitudRapida)
                          setConfirmAprobar(true)
                        }}
                        title="Aprobar solicitud"
                      >
                        {accionCurp === String(solicitudRapida.folio).toUpperCase() ? (
                          <Loader2 className="size-6 animate-spin" />
                        ) : (
                          <Check className="size-6 shrink-0" strokeWidth={2.5} aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Navegación entre solicitudes: inferior derecha */}
                <div className="mt-auto flex shrink-0 items-center justify-end gap-1 pt-2">
                  <span className="mr-1 text-sm font-normal leading-relaxed text-foreground">
                    {quickReviewIndex + 1}/{pendientes.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg border-border/80"
                    onClick={goPrevQuick}
                    disabled={pendientes.length <= 1}
                    aria-label="Solicitud anterior"
                    title="Anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg border-border/80"
                    onClick={goNextQuick}
                    disabled={pendientes.length <= 1}
                    aria-label="Siguiente solicitud"
                    title="Siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 border-border/50 border-dashed bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center min-h-[220px] dark:bg-slate-900/20">
               <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 mb-4 dark:bg-slate-800 ring-4 ring-slate-50 dark:ring-slate-900/50">
                <Check className="size-6 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">Todo al día</p>
              <p className="mt-1.5 max-w-[250px] text-sm text-foreground">
                No tienes solicitudes pendientes en la cola de revisión.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <Card className="border-border/60 text-foreground shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Todas las solicitudes</CardTitle>
              <CardDescription className="text-foreground">
                {loading ? "Cargando datos..." : `Mostrando ${filtered.length} expediente(s)`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground" />
              <Input
                id="preregistro-busqueda-solicitudes"
                placeholder="Buscar por nombre, CURP, correo..."
                className="h-10 pl-9 pr-9 text-sm text-foreground placeholder:text-neutral-700 dark:placeholder:text-neutral-300 transition-colors focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-foreground hover:bg-muted/60"
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
            <div className="flex flex-col items-center justify-center py-16 text-foreground">
              <Loader2 className="size-10 animate-spin text-foreground/80 mb-4" />
              <p className="text-sm font-medium text-foreground">Cargando solicitudes...</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="h-12 text-sm font-semibold text-muted-foreground">Nombre</TableHead>
                    <TableHead className="hidden h-12 text-sm font-semibold text-muted-foreground md:table-cell">
                      CURP
                    </TableHead>
                    <TableHead className="hidden h-12 text-sm font-semibold text-muted-foreground lg:table-cell">
                      Correo
                    </TableHead>
                    <TableHead className="hidden h-12 text-sm font-semibold text-muted-foreground lg:table-cell">
                      Teléfono
                    </TableHead>
                    <TableHead className="h-12 text-center text-sm font-semibold text-muted-foreground">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const curp = String(b.folio ?? b.curp ?? "").trim()
                    return (
                      <TableRow key={curp} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">{nombreCompleto(b)}</TableCell>
                        <TableCell className="hidden text-sm font-medium text-blue-600 dark:text-blue-400 md:table-cell">
                          {curp}
                        </TableCell>
                        <TableCell className="hidden text-sm text-foreground lg:table-cell">
                          {b.correoElectronico ?? "—"}
                        </TableCell>
                        <TableCell className="hidden text-sm text-foreground lg:table-cell">
                          {b.telefonoCelular ?? "—"}
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-foreground hover:bg-muted/60 hover:text-foreground"
                              title="Ver detalle"
                              onClick={() => {
                                setSelected(b)
                                setShowDetalleDialog(true)
                              }}
                            >
                              <Eye className="size-4 text-foreground" />
                              <span className="sr-only">Ver detalle</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-foreground hover:bg-muted/60 hover:text-foreground"
                              title="Seleccionar en revisión rápida para aceptar o rechazar"
                              onClick={() => {
                                const id = curp.toUpperCase()
                                const idx = pendientes.findIndex(
                                  (p) =>
                                    String(p.folio ?? p.curp ?? "")
                                      .trim()
                                      .toUpperCase() === id
                                )
                                if (idx < 0) return
                                setQuickReviewIndex(idx)
                                requestAnimationFrame(() => {
                                  document
                                    .getElementById("revision-rapida-preregistro")
                                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                                })
                              }}
                            >
                              <ArrowUp className="size-4 text-foreground" />
                              <span className="sr-only">Seleccionar en revisión rápida</span>
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
              <p className="text-lg font-semibold text-muted-foreground">No se encontraron solicitudes</p>
              <p className="mt-1 max-w-sm text-sm text-foreground">
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
            <DialogTitle className="text-2xl font-bold text-muted-foreground">Detalle de solicitud</DialogTitle>
            <DialogDescription className="text-foreground">
              {selected?.fechaAlta ? `Fecha de registro: ${selected.fechaAlta}` : "Información de pre-registro enviada por el usuario"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4 py-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre completo</p>
                <p className="text-lg font-bold text-foreground">{nombreCompleto(selected)}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CURP</p>
                  <p className="text-base font-medium text-blue-600 dark:text-blue-400">{selected.folio}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estatus en BD</p>
                  <p className="text-base font-medium text-foreground">{selected.estatus}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Correo Electrónico</p>
                  <p className="text-base font-medium break-all text-foreground">{selected.correoElectronico ?? "No especificado"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</p>
                  <p className="text-base font-medium text-foreground">{selected.telefonoCelular ?? "No especificado"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado / Provincia</p>
                  <p className="text-base font-medium text-foreground">{selected.estado ?? "No especificado"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</p>
                  <p className="text-base font-medium text-foreground">{selected.ciudad ?? "No especificado"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas / Motivo de consulta</p>
                <p className="text-base whitespace-pre-wrap leading-relaxed text-foreground">
                  {notasSinMarcador(selected.notas) || "Sin observaciones adicionales."}
                </p>
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de espina bífida</p>
                  <p className="text-base font-medium text-foreground">{labelTipoEspinaBifida(selected.tipo)}</p>
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-4 mt-2">
                <Button variant="outline" onClick={() => setShowDetalleDialog(false)}>
                  Cerrar
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
            <AlertDialogTitle className="text-muted-foreground">¿Rechazar y eliminar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Se eliminará el expediente de{" "}
              <span className="font-semibold text-foreground">
                {selected ? nombreCompleto(selected) : "este usuario"}
              </span>{" "}
              de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
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
            <AlertDialogTitle className="text-muted-foreground">¿Aprobar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              El expediente de{" "}
              <span className="font-semibold text-foreground">
                {selected ? nombreCompleto(selected) : "este usuario"}
              </span>{" "}
              será aprobado y pasará a ser un beneficiario activo en el sistema.
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

      <AlertDialog
        open={completarExpediente !== null}
        onOpenChange={(open) => {
          if (!open) setCompletarExpediente(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground">
              ¿Completar información del beneficiario?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-foreground">
                <p>
                  Puedes abrir ahora el editor del expediente para agregar domicilio completo, contacto de emergencia,
                  tipo de sangre y demás datos opcionales.
                </p>
                <p className="font-semibold text-foreground">
                  {completarExpediente?.nombre ?? ""}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              className="mt-0"
              onClick={() => setCompletarExpediente(null)}
            >
              Más tarde
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#005bb5] text-white hover:bg-[#004a94]"
              onClick={() => {
                const curp = completarExpediente?.curp
                setCompletarExpediente(null)
                if (!curp) return
                void (async () => {
                  try {
                    const b = await getBeneficiario(curp)
                    openEdit(b)
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "No se pudo cargar el expediente")
                  }
                })()
              }}
            >
              Llenar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BeneficiariosEditDialog
        inlineMode
        onEditDialogClose={() => void load()}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        isSaving={isSaving}
        overlayAction={overlayAction}
        setOverlayAction={setOverlayAction}
        handleDarDeBaja={handleDarDeBaja}
        handleEditDelete={handleEditDelete}
        editForm={editForm}
        handleEditChange={handleEditChange}
        editErrors={editErrors}
        saveError={saveError}
        setSaveError={setSaveError}
        handleSaveEdit={handleSaveEdit}
        selectedBeneficiario={selectedBeneficiario}
        setSelectedBeneficiario={setSelectedBeneficiario}
        beneficiarios={beneficiariosEditList}
        fotoUploading={fotoUploading}
        editFotoPreview={editFotoPreview}
        handleEditFotoSelected={handleEditFotoSelected}
        handleDeleteFotoBeneficiario={handleDeleteFotoBeneficiario}
        removeFotoConfirmOpen={removeFotoConfirmOpen}
        setRemoveFotoConfirmOpen={setRemoveFotoConfirmOpen}
      />

    </div>
  )
}