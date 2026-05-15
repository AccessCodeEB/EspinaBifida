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

  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Reportes</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Generación y descarga de reportes del sistema</p>
      </div>

      {/* Layout principal: tipos a la izquierda, configuración a la derecha */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">

        {/* Tipos de reporte — 4 cols */}
        <div className="lg:col-span-4 lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/40 px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Tipo de reporte</p>
              <p className="text-[11px] text-muted-foreground">Selecciona el reporte a generar</p>
            </div>
            <div className="flex-1 divide-y divide-border/30">
              {reportTypes.map((report) => {
                const active = selectedReport === report.id
                return (
                  <button
                    key={report.id}
                    onClick={() => report.disponible && setSelectedReport(report.id)}
                    disabled={!report.disponible}
                    className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors
                      ${active ? "bg-[#0f4c81]/5" : "hover:bg-muted/30"}
                      ${!report.disponible ? "cursor-not-allowed opacity-40" : ""}
                    `}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors
                      ${active ? "text-white" : "bg-muted text-muted-foreground"}`}
                      style={active ? { backgroundColor: NAVY } : {}}
                    >
                      <report.icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${active ? "text-foreground" : "text-foreground"}`}>
                        {report.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{report.description}</p>
                    </div>
                    {active && (
                      <div className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: NAVY }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Configuración — 8 cols */}
        <div className="flex flex-col gap-4 lg:col-span-8">

          {/* Panel de configuración */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {currentReport?.title ?? "Selecciona un reporte"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Configura el periodo y formato</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Periodo + Formato en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Periodo</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-10 text-sm">
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
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Formato</label>
                  <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as "pdf" | "xlsx")}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <span className="flex items-center gap-2"><FileText className="size-4 text-red-500" />PDF</span>
                      </SelectItem>
                      <SelectItem value="xlsx">
                        <span className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-emerald-600" />Excel (.xlsx)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rango personalizado */}
              {selectedPeriod === "personalizado" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Desde</label>
                    <Input type="date" className="h-10 text-sm" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Hasta</label>
                    <Input type="date" className="h-10 text-sm" value={customFin} onChange={(e) => setCustomFin(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Rango calculado */}
              {fechasCalculadas && (
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">Periodo:</span>
                  <span className="text-[11px] font-semibold text-foreground">{fechasCalculadas.fechaInicio}</span>
                  <span className="text-[11px] text-muted-foreground">—</span>
                  <span className="text-[11px] font-semibold text-foreground">{fechasCalculadas.fechaFin}</span>
                </div>
              )}

              {/* Error */}
              {downloadError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="mt-px size-3.5 shrink-0" />{downloadError}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 border-t border-border/40 pt-4">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing || isDownloading || !selectedReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/70 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  {isPreviewing ? "Cargando..." : "Vista previa"}
                </button>
                <button
                  onClick={handleDescargar}
                  disabled={isDownloading || isPreviewing || !selectedReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {isDownloading ? "Generando..." : `Descargar ${selectedFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>

          {/* Historial */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Reportes automáticos</p>
                <p className="text-[11px] text-muted-foreground">Generados por el sistema (mensual, semestral, anual)</p>
              </div>
              <button onClick={cargarHistorico} disabled={loadingHistorico}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
                {loadingHistorico ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Actualizar
              </button>
            </div>

            {loadingHistorico ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />Cargando historial...
              </div>
            ) : historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <FileText className="size-8 opacity-20 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No hay reportes automáticos generados aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Tipo</th>
                      <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Periodo</th>
                      <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Generado</th>
                      <th className="py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">Descargar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {historico.map((r) => (
                      <tr key={r.ID_REPORTE} className="transition-colors hover:bg-muted/20">
                        <td className="py-3 pl-5">
                          <span className="inline-flex items-center rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                            {r.TIPO}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-foreground">
                          {r.FECHA_INICIO} — {r.FECHA_FIN}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {r.FECHA_GENERACION ? new Date(r.FECHA_GENERACION).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.RUTA_PDF && (
                              <button title="Descargar PDF"
                                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                                onClick={async () => {
                                  try {
                                    const token = (await import("@/lib/token")).tokenStorage.get()
                                    const { resolveApiFetchUrl } = await import("@/lib/api-base")
                                    const url = resolveApiFetchUrl(`/api/v1/reportes/${r.ID_REPORTE}/descargar?formato=pdf`)
                                    const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} })
                                    if (!res.ok) return
                                    const blob = await res.blob()
                                    const a = document.createElement("a")
                                    a.href = URL.createObjectURL(blob)
                                    a.download = `reporte-${r.FECHA_INICIO}-${r.FECHA_FIN}.pdf`
                                    a.click()
                                    URL.revokeObjectURL(a.href)
                                  } catch { /* ignorar */ }
                                }}>
                                <FileText className="size-3.5" />PDF
                              </button>
                            )}
                            {r.RUTA_XLSX && (
                              <button title="Descargar Excel"
                                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                onClick={async () => {
                                  try {
                                    const token = (await import("@/lib/token")).tokenStorage.get()
                                    const { resolveApiFetchUrl } = await import("@/lib/api-base")
                                    const url = resolveApiFetchUrl(`/api/v1/reportes/${r.ID_REPORTE}/descargar?formato=xlsx`)
                                    const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} })
                                    if (!res.ok) return
                                    const blob = await res.blob()
                                    const a = document.createElement("a")
                                    a.href = URL.createObjectURL(blob)
                                    a.download = `reporte-${r.FECHA_INICIO}-${r.FECHA_FIN}.xlsx`
                                    a.click()
                                    URL.revokeObjectURL(a.href)
                                  } catch { /* ignorar */ }
                                }}>
                                <FileSpreadsheet className="size-3.5" />Excel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal vista previa */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview() }}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileText className="size-4 text-red-500" />
              Vista previa — {currentReport?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {fechasCalculadas ? `${fechasCalculadas.fechaInicio} al ${fechasCalculadas.fechaFin}` : "Reporte generado"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {previewUrl && <iframe src={previewUrl} className="size-full border-0" title="Vista previa del reporte" />}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
            <button onClick={handleClosePreview}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cerrar
            </button>
            <button onClick={async () => { handleClosePreview(); await handleDescargar() }} disabled={isDownloading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}>
              <Download className="size-4" />
              Descargar {selectedFormat.toUpperCase()}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
