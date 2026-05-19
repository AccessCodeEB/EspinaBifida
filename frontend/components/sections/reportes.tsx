"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  RefreshCw,
} from "lucide-react"
import { downloadReporte, fetchReporteUrl, fetchReporteSheets, getHistorico, type ReporteHistorico } from "@/services/reportes"

// ── Tipos de reporte ──────────────────────────────────────────────────────────

const reportTypes = [
  { id: "estadisticas",  title: "Estadístico",   description: "Resumen: género, edad, procedencia y servicios", icon: BarChart3,     disponible: true },
  { id: "beneficiarios", title: "Beneficiarios",  description: "Listado completo con datos demográficos",        icon: Users,         disponible: true },
  { id: "membresias",    title: "Membresías",     description: "Activas, por vencer y vencidas",                 icon: CreditCard,    disponible: true },
  { id: "servicios",     title: "Servicios",      description: "Historial de servicios por periodo",             icon: ClipboardList, disponible: true },
  { id: "inventario",    title: "Inventario",     description: "Stock actual y movimientos",                     icon: Package,       disponible: true },
  { id: "citas",         title: "Citas",          description: "Agenda por especialista y periodo",              icon: CalendarDays,  disponible: true },
]

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function calcularFechas(periodo: string): { fechaInicio: string; fechaFin: string } | null {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  switch (periodo) {
    case "mes-actual":   return { fechaInicio: toISO(new Date(y, m, 1)),   fechaFin: toISO(new Date(y, m + 1, 0)) }
    case "mes-anterior": return { fechaInicio: toISO(new Date(y, m - 1, 1)), fechaFin: toISO(new Date(y, m, 0)) }
    case "trimestre":    return { fechaInicio: toISO(new Date(y, m - 3, 1)), fechaFin: toISO(new Date(y, m + 1, 0)) }
    case "semestre":     return { fechaInicio: toISO(new Date(y, m - 6, 1)), fechaFin: toISO(new Date(y, m + 1, 0)) }
    case "anual":        return { fechaInicio: `${y - 1}-01-01`, fechaFin: `${y - 1}-12-31` }
    default:             return null
  }
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ReportesSection() {
  const [selectedReport, setSelectedReport] = useState("estadisticas")
  const [selectedPeriod, setSelectedPeriod] = useState("mes-actual")
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "xlsx">("pdf")
  const [customInicio, setCustomInicio] = useState("")
  const [customFin, setCustomFin]       = useState("")

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null)
  const [previewSheets, setPreviewSheets] = useState<{ nombre: string; headers: string[]; rows: (string | number | null)[][] }[] | null>(null)
  const [previewActiveSheet, setPreviewActiveSheet] = useState(0)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const [historico, setHistorico]           = useState<ReporteHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  const previewBlobRef = useRef<string | null>(null)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Necesario para que el debounce acceda a los valores actuales sin cerrar sobre state
  const stateRef = useRef({ selectedReport, selectedPeriod, selectedFormat, customInicio, customFin })
  stateRef.current = { selectedReport, selectedPeriod, selectedFormat, customInicio, customFin }

  // ── helpers ──

  const getFechas = useCallback((): { fechaInicio: string; fechaFin: string } | null => {
    if (selectedPeriod === "personalizado") {
      if (!customInicio || !customFin || customInicio > customFin) return null
      return { fechaInicio: customInicio, fechaFin: customFin }
    }
    return calcularFechas(selectedPeriod)
  }, [selectedPeriod, customInicio, customFin])

  const cargarHistorico = useCallback(async () => {
    setLoadingHistorico(true)
    try {
      const res = await getHistorico()
      setHistorico(res.data)
    } catch {
      setHistorico([])
    } finally {
      setLoadingHistorico(false)
    }
  }, [])

  // ── generar vista previa ──

  const generarPreview = useCallback(async () => {
    const { selectedReport: tipo, selectedPeriod: periodo, selectedFormat: formato, customInicio: ini, customFin: fin } = stateRef.current
    const fechas = periodo === "personalizado"
      ? (!ini || !fin || ini > fin ? null : { fechaInicio: ini, fechaFin: fin })
      : calcularFechas(periodo)
    if (!fechas) return

    setIsPreviewing(true)
    setPreviewError(null)

    // Revocar blob anterior
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current)
      previewBlobRef.current = null
    }

    try {
      if (formato === "xlsx") {
        const sheets = await fetchReporteSheets(fechas.fechaInicio, fechas.fechaFin, tipo)
        setPreviewSheets(sheets)
        setPreviewActiveSheet(0)
        setPreviewUrl(null)
      } else {
        const url = await fetchReporteUrl(fechas.fechaInicio, fechas.fechaFin, "pdf", tipo)
        previewBlobRef.current = url
        setPreviewUrl(url)
        setPreviewSheets(null)
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Error al generar la vista previa.")
      setPreviewUrl(null)
      setPreviewSheets(null)
    } finally {
      setIsPreviewing(false)
    }
  }, []) // sin dependencias — usa stateRef.current

  // ── auto-preview con debounce al cambiar config ──

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Periodo personalizado: esperar que ambas fechas estén completas
    if (selectedPeriod === "personalizado" && (!customInicio || !customFin || customInicio > customFin)) return
    debounceRef.current = setTimeout(generarPreview, 700)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [selectedReport, selectedPeriod, selectedFormat, customInicio, customFin, generarPreview])

  // ── carga inicial ──
  useEffect(() => {
    cargarHistorico()
  }, [cargarHistorico])

  // ── descarga ──

  const handleDescargar = async () => {
    const fechas = getFechas()
    if (!fechas) { setDownloadError("Ingresa un rango de fechas válido."); return }
    setIsDownloading(true); setDownloadError(null)
    try {
      await downloadReporte(fechas.fechaInicio, fechas.fechaFin, selectedFormat, selectedReport)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Error al generar el reporte.")
    } finally {
      setIsDownloading(false)
    }
  }

  const fechasCalculadas = getFechas()
  const currentReport    = reportTypes.find(r => r.id === selectedReport)
  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Reportes</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Vista previa automática · actualizada al momento</p>
      </div>

      {/* Layout: tipos | config + preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

        {/* Tipos — 3 cols */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/40 px-4 py-3">
              <p className="text-xs font-semibold text-foreground">Tipo de reporte</p>
            </div>
            <div className="divide-y divide-border/30">
              {reportTypes.map((report) => {
                const active = selectedReport === report.id
                return (
                  <button
                    key={report.id}
                    onClick={() => report.disponible && setSelectedReport(report.id)}
                    disabled={!report.disponible}
                    className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors
                      ${active ? "bg-[#0f4c81]/5" : "hover:bg-muted/30"}
                      ${!report.disponible ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors
                      ${active ? "text-white" : "bg-muted text-muted-foreground"}`}
                      style={active ? { backgroundColor: NAVY } : {}}>
                      <report.icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{report.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{report.description}</p>
                    </div>
                    {active && <div className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: NAVY }} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Config + Preview — 9 cols */}
        <div className="flex flex-col gap-4 lg:col-span-9">

          {/* Barra de config */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-wrap items-end gap-3 px-5 py-4">
              {/* Periodo */}
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Periodo</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
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

              {/* Fechas personalizadas */}
              {selectedPeriod === "personalizado" && (
                <>
                  <div className="min-w-[130px] space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Desde</label>
                    <Input type="date" className="h-9 text-sm" value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
                  </div>
                  <div className="min-w-[130px] space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hasta</label>
                    <Input type="date" className="h-9 text-sm" value={customFin} onChange={e => setCustomFin(e.target.value)} />
                  </div>
                </>
              )}

              {/* Formato */}
              <div className="min-w-[130px] space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Formato</label>
                <Select value={selectedFormat} onValueChange={v => setSelectedFormat(v as "pdf" | "xlsx")}>
                  <SelectTrigger className="h-9 text-sm">
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

              {/* Rango calculado */}
              {fechasCalculadas && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[11px]">
                  <span className="text-muted-foreground">Periodo:</span>
                  <span className="font-semibold text-foreground">{fmtFecha(fechasCalculadas.fechaInicio)}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="font-semibold text-foreground">{fmtFecha(fechasCalculadas.fechaFin)}</span>
                </div>
              )}

              {/* Botón actualizar + descargar */}
              <div className="flex items-end gap-2 ml-auto">
                <button
                  onClick={generarPreview}
                  disabled={isPreviewing}
                  title="Actualizar vista previa"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {isPreviewing
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <RefreshCw className="size-3.5" />}
                  {isPreviewing ? "Generando..." : "Actualizar"}
                </button>
                <button
                  onClick={handleDescargar}
                  disabled={isDownloading || isPreviewing}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  {isDownloading ? "Descargando..." : `Descargar ${selectedFormat.toUpperCase()}`}
                </button>
              </div>
            </div>

            {/* Error de descarga */}
            {downloadError && (
              <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-5 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />{downloadError}
              </div>
            )}
          </div>

          {/* Vista previa inline */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            {/* Cabecera con título y tabs xlsx */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <div className="flex items-center gap-2">
                {selectedFormat === "xlsx"
                  ? <FileSpreadsheet className="size-4 text-emerald-600" />
                  : <FileText className="size-4 text-red-500" />}
                <p className="text-sm font-semibold text-foreground">
                  {currentReport?.title} — Vista previa
                </p>
                {isPreviewing && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <Loader2 className="size-2.5 animate-spin" />Actualizando...
                  </span>
                )}
              </div>
              {/* Pestañas xlsx */}
              {previewSheets && previewSheets.length > 1 && (
                <div className="flex gap-1 overflow-x-auto">
                  {previewSheets.map((sheet, i) => (
                    <button
                      key={sheet.nombre}
                      onClick={() => setPreviewActiveSheet(i)}
                      className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors
                        ${i === previewActiveSheet
                          ? "border-[#0f4c81]/40 bg-[#0f4c81]/5 text-[#0f4c81]"
                          : "border-border/40 text-muted-foreground hover:bg-muted/40"}`}
                    >
                      {sheet.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Área de preview */}
            <div
              className="relative bg-muted/10"
              style={{ height: selectedFormat === "pdf" ? "calc(100vh - 360px)" : "auto", minHeight: 320 }}
            >
              {/* Estado: cargando (sin contenido aún) */}
              {isPreviewing && !previewUrl && !previewSheets && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin opacity-40" />
                  <p className="text-xs">Generando reporte...</p>
                </div>
              )}

              {/* Estado: error */}
              {previewError && !isPreviewing && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <AlertCircle className="size-8 text-red-400 opacity-60" />
                  <p className="text-xs text-red-600 dark:text-red-400">{previewError}</p>
                  <button
                    onClick={generarPreview}
                    className="mt-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Vista PDF */}
              {previewUrl && (
                <>
                  {isPreviewing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <iframe
                    src={previewUrl}
                    className="h-full w-full border-0"
                    style={{ height: "calc(100vh - 360px)", minHeight: 320 }}
                    title="Vista previa del reporte"
                  />
                </>
              )}

              {/* Vista tabla XLSX */}
              {previewSheets && (() => {
                const sheet = previewSheets[previewActiveSheet]
                if (!sheet) return null
                return (
                  <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
                    {isPreviewing && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-muted/90">
                        <tr>
                          {sheet.headers.map((h, i) => (
                            <th key={i} className="border border-border/40 px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.length === 0 ? (
                          <tr>
                            <td colSpan={sheet.headers.length} className="py-10 text-center text-muted-foreground">
                              Sin datos en este periodo
                            </td>
                          </tr>
                        ) : sheet.rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            {sheet.headers.map((_, ci) => (
                              <td key={ci} className="border border-border/20 px-3 py-1.5 whitespace-nowrap text-foreground">
                                {row[ci] != null ? String(row[ci]) : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Historial de reportes automáticos */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Reportes automáticos</p>
            <p className="text-[11px] text-muted-foreground">Generados por el sistema (mensual, semestral, anual)</p>
          </div>
          <button onClick={cargarHistorico} disabled={loadingHistorico}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
            {loadingHistorico ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Actualizar
          </button>
        </div>
        {loadingHistorico ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />Cargando historial...
          </div>
        ) : historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
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
                    <td className="py-3 text-xs text-foreground">{r.FECHA_INICIO} — {r.FECHA_FIN}</td>
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
                                a.click(); URL.revokeObjectURL(a.href)
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
                                a.click(); URL.revokeObjectURL(a.href)
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
  )
}
