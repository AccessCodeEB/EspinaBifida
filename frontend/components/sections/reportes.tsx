"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  FileText,
  FileSpreadsheet,
  Download,
  Users,
  CreditCard,
  ClipboardList,
  Package,
  CalendarDays,
  Loader2,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Eye,
} from "lucide-react"
import { downloadReporte, fetchReporteUrl, getHistorico, type ReporteHistorico } from "@/services/reportes"

// ── Tipos de reporte disponibles ──────────────────────────────────────────────

const reportTypes = [
  {
    id: "estadisticas",
    title: "Reporte Estadístico",
    description: "Resumen estadístico: género, edad, procedencia y servicios por periodo",
    icon: BarChart3,
    disponible: true,
  },
  {
    id: "beneficiarios",
    title: "Reporte de Beneficiarios",
    description: "Listado completo de beneficiarios con datos demográficos",
    icon: Users,
    disponible: true,
  },
  {
    id: "membresias",
    title: "Reporte de Membresías",
    description: "Estado de membresías activas, por vencer y vencidas",
    icon: CreditCard,
    disponible: true,
  },
  {
    id: "servicios",
    title: "Reporte de Servicios",
    description: "Historial de servicios prestados por periodo",
    icon: ClipboardList,
    disponible: true,
  },
  {
    id: "inventario",
    title: "Reporte de Inventario",
    description: "Stock actual y movimientos de productos",
    icon: Package,
    disponible: true,
  },
  {
    id: "citas",
    title: "Reporte de Citas",
    description: "Agenda de citas por especialista y periodo",
    icon: CalendarDays,
    disponible: true,
  },
]

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function calcularFechas(periodo: string): { fechaInicio: string; fechaFin: string } | null {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth() // 0-indexed

  switch (periodo) {
    case "mes-actual": {
      const inicio = new Date(y, m, 1)
      const fin = new Date(y, m + 1, 0)
      return { fechaInicio: toISO(inicio), fechaFin: toISO(fin) }
    }
    case "mes-anterior": {
      const inicio = new Date(y, m - 1, 1)
      const fin = new Date(y, m, 0)
      return { fechaInicio: toISO(inicio), fechaFin: toISO(fin) }
    }
    case "trimestre": {
      const inicio = new Date(y, m - 3, 1)
      const fin = new Date(y, m + 1, 0)
      return { fechaInicio: toISO(inicio), fechaFin: toISO(fin) }
    }
    case "semestre": {
      const inicio = new Date(y, m - 6, 1)
      const fin = new Date(y, m + 1, 0)
      return { fechaInicio: toISO(inicio), fechaFin: toISO(fin) }
    }
    case "anual": {
      return { fechaInicio: `${y - 1}-01-01`, fechaFin: `${y - 1}-12-31` }
    }
    default:
      return null // personalizado — el usuario ingresa las fechas
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ReportesSection() {
  const [selectedReport, setSelectedReport] = useState<string | null>("estadisticas")
  const [selectedPeriod, setSelectedPeriod] = useState("mes-actual")
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "xlsx">("pdf")
  const [customInicio, setCustomInicio] = useState("")
  const [customFin, setCustomFin] = useState("")

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewBlobRef = useRef<string | null>(null)

  const [historico, setHistorico] = useState<ReporteHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Cargar historial al montar
  const cargarHistorico = useCallback(async () => {
    setLoadingHistorico(true)
    try {
      const res = await getHistorico()
      setHistorico(res.data)
    } catch {
      // Si falla (sin permisos, sin datos), mostrar vacío
      setHistorico([])
    } finally {
      setLoadingHistorico(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorico()
  }, [cargarHistorico])

  const handleDescargar = async () => {
    setDownloadError(null)
    const fechas = getFechas()
    if (!fechas) {
      setDownloadError(
        selectedPeriod === "personalizado"
          ? "Ingresa un rango de fechas válido."
          : "No se pudo calcular el periodo."
      )
      return
    }

    setIsDownloading(true)
    try {
      await downloadReporte(fechas.fechaInicio, fechas.fechaFin, selectedFormat, selectedReport ?? "estadisticas")
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Error al generar el reporte.")
    } finally {
      setIsDownloading(false)
    }
  }

  const getFechas = (): { fechaInicio: string; fechaFin: string } | null => {
    if (selectedPeriod === "personalizado") {
      if (!customInicio || !customFin || customInicio > customFin) return null
      return { fechaInicio: customInicio, fechaFin: customFin }
    }
    return calcularFechas(selectedPeriod)
  }

  const handlePreview = async () => {
    setDownloadError(null)
    const fechas = getFechas()
    if (!fechas) {
      setDownloadError(
        selectedPeriod === "personalizado"
          ? "Ingresa un rango de fechas válido para la vista previa."
          : "No se pudo calcular el periodo."
      )
      return
    }
    setIsPreviewing(true)
    try {
      // Liberar blob anterior si existe
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current)
        previewBlobRef.current = null
      }
      const url = await fetchReporteUrl(fechas.fechaInicio, fechas.fechaFin, "pdf", selectedReport ?? "estadisticas")
      previewBlobRef.current = url
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Error al generar la vista previa.")
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current)
      previewBlobRef.current = null
    }
    setPreviewUrl(null)
  }

  const currentReport = reportTypes.find(r => r.id === selectedReport)

  const fechasCalculadas = selectedPeriod !== "personalizado"
    ? calcularFechas(selectedPeriod)
    : (customInicio && customFin ? { fechaInicio: customInicio, fechaFin: customFin } : null)

  return (
    <div className="space-y-6">
      {/* Selección de tipo de reporte */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Seleccionar Tipo de Reporte</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`transition-all ${
                report.disponible
                  ? `cursor-pointer hover:border-primary hover:shadow-md ${
                      selectedReport === report.id ? "border-2 border-primary bg-primary/5" : ""
                    }`
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={() => report.disponible && setSelectedReport(report.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex size-12 items-center justify-center rounded-lg ${
                    selectedReport === report.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <report.icon className="size-6" />
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    {!report.disponible && (
                      <Badge variant="secondary" className="shrink-0 text-xs">Próximamente</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{report.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuración y descarga */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5" />
              Configurar Reporte: {currentReport?.title}
            </CardTitle>
            <CardDescription>
              Selecciona el periodo y formato de exportación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Periodo */}
              <div className="space-y-2">
                <Label htmlFor="periodo" className="text-base font-medium">Periodo</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="periodo" className="h-12 text-base">
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes-actual">Mes Actual</SelectItem>
                    <SelectItem value="mes-anterior">Mes Anterior</SelectItem>
                    <SelectItem value="trimestre">Último Trimestre</SelectItem>
                    <SelectItem value="semestre">Último Semestre</SelectItem>
                    <SelectItem value="anual">Año Anterior</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Formato */}
              <div className="space-y-2">
                <Label htmlFor="formato" className="text-base font-medium">Formato</Label>
                <Select
                  value={selectedFormat}
                  onValueChange={(v) => setSelectedFormat(v as "pdf" | "xlsx")}
                >
                  <SelectTrigger id="formato" className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-red-500" />
                        PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="xlsx">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-green-600" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botones de acción */}
              <div className="flex items-end gap-3 sm:col-span-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 flex-1 text-base"
                  onClick={handlePreview}
                  disabled={isPreviewing || isDownloading}
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 size-5" />
                      Vista Previa
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="h-12 flex-1 text-base"
                  onClick={handleDescargar}
                  disabled={isDownloading || isPreviewing}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 size-5" />
                      Descargar {selectedFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Rango personalizado */}
            {selectedPeriod === "personalizado" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Fecha inicio</Label>
                  <Input
                    type="date"
                    className="h-12 text-base"
                    value={customInicio}
                    onChange={(e) => setCustomInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Fecha fin</Label>
                  <Input
                    type="date"
                    className="h-12 text-base"
                    value={customFin}
                    onChange={(e) => setCustomFin(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Rango calculado (info) */}
            {fechasCalculadas && (
              <p className="text-sm text-muted-foreground">
                Periodo: <span className="font-medium text-foreground">{fechasCalculadas.fechaInicio}</span>
                {" "}al{" "}
                <span className="font-medium text-foreground">{fechasCalculadas.fechaFin}</span>
              </p>
            )}

            {/* Error */}
            {downloadError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {downloadError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de reportes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="size-5" />
                Reportes Generados Automáticamente
              </CardTitle>
              <CardDescription>
                Reportes guardados por el sistema (mensual, semestral, anual)
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cargarHistorico}
              disabled={loadingHistorico}
            >
              {loadingHistorico
                ? <Loader2 className="size-4 animate-spin" />
                : "Actualizar"
              }
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistorico ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Cargando historial...
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <FileText className="size-10 opacity-30" />
              <p className="text-sm">No hay reportes generados automáticamente todavía.</p>
              <p className="text-xs">El sistema generará reportes según el calendario configurado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Fecha generación</TableHead>
                  <TableHead className="text-right">Descargar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((r) => (
                  <TableRow key={r.ID_REPORTE}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.TIPO}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.FECHA_INICIO} — {r.FECHA_FIN}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.FECHA_GENERACION
                        ? new Date(r.FECHA_GENERACION).toLocaleDateString("es-MX")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.RUTA_PDF && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Descargar PDF"
                            onClick={async () => {
                              try {
                                const token = (await import("@/lib/token")).tokenStorage.get()
                                const { resolveApiFetchUrl } = await import("@/lib/api-base")
                                const url = resolveApiFetchUrl(`/api/v1/reportes/${r.ID_REPORTE}/descargar?formato=pdf`)
                                const res = await fetch(url, {
                                  credentials: "include",
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                })
                                if (!res.ok) return
                                const blob = await res.blob()
                                const a = document.createElement("a")
                                a.href = URL.createObjectURL(blob)
                                a.download = `reporte-${r.FECHA_INICIO}-${r.FECHA_FIN}.pdf`
                                a.click()
                                URL.revokeObjectURL(a.href)
                              } catch { /* ignorar */ }
                            }}
                          >
                            <FileText className="size-4 text-red-500" />
                          </Button>
                        )}
                        {r.RUTA_XLSX && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Descargar Excel"
                            onClick={async () => {
                              try {
                                const token = (await import("@/lib/token")).tokenStorage.get()
                                const { resolveApiFetchUrl } = await import("@/lib/api-base")
                                const url = resolveApiFetchUrl(`/api/v1/reportes/${r.ID_REPORTE}/descargar?formato=xlsx`)
                                const res = await fetch(url, {
                                  credentials: "include",
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                })
                                if (!res.ok) return
                                const blob = await res.blob()
                                const a = document.createElement("a")
                                a.href = URL.createObjectURL(blob)
                                a.download = `reporte-${r.FECHA_INICIO}-${r.FECHA_FIN}.xlsx`
                                a.click()
                                URL.revokeObjectURL(a.href)
                              } catch { /* ignorar */ }
                            }}
                          >
                            <FileSpreadsheet className="size-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Modal de vista previa — PDF real en iframe */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview() }}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-5 text-red-500" />
              Vista Previa — {currentReport?.title}
            </DialogTitle>
            <DialogDescription>
              {fechasCalculadas
                ? `Periodo: ${fechasCalculadas.fechaInicio} al ${fechasCalculadas.fechaFin}`
                : "Reporte generado"}
            </DialogDescription>
          </DialogHeader>

          {/* iframe ocupa todo el espacio restante */}
          <div className="min-h-0 flex-1">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="size-full border-0"
                title="Vista previa del reporte"
              />
            )}
          </div>

          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="lg" onClick={handleClosePreview}>
                Cerrar
              </Button>
              <Button
                size="lg"
                onClick={async () => {
                  handleClosePreview()
                  await handleDescargar()
                }}
                disabled={isDownloading}
              >
                <Download className="mr-2 size-5" />
                Descargar {selectedFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
