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
  BarChart3,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { downloadReporte, fetchReporteUrl, fetchReporteSheets } from "@/services/reportes"
import { friendlyError } from "@/lib/friendly-error"

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
      setPreviewError(friendlyError(err, "No se pudo generar la vista previa del reporte"))
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

  // ── descarga ──

  const handleDescargar = async () => {
    const fechas = getFechas()
    if (!fechas) { setDownloadError("Ingresa un rango de fechas válido."); return }
    setIsDownloading(true); setDownloadError(null)
    try {
      await downloadReporte(fechas.fechaInicio, fechas.fechaFin, selectedFormat, selectedReport)
    } catch (err) {
      setDownloadError(friendlyError(err, "No se pudo descargar el reporte"))
    } finally {
      setIsDownloading(false)
    }
  }

  const fechasCalculadas = getFechas()
  const currentReport    = reportTypes.find(r => r.id === selectedReport)
  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8" data-section="reportes">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Reportes</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Selecciona el tipo, periodo y formato — la vista previa se actualiza automáticamente</p>
      </div>

      {/* Layout: tipos | config + preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

        {/* ── Panel izquierdo: tipo de reporte ── */}
        <div className="lg:col-span-3 lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de reporte</p>
            </div>
            <div className="divide-y divide-border/30">
              {reportTypes.map((report) => {
                const active = selectedReport === report.id
                return (
                  <button
                    key={report.id}
                    onClick={() => report.disponible && setSelectedReport(report.id)}
                    disabled={!report.disponible}
                    className={`relative flex w-full items-center gap-3 px-4 py-5 text-left transition-colors
                      ${active ? "bg-[#0f4c81]/5" : "hover:bg-muted/30"}
                      ${!report.disponible ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: NAVY }} />
                    )}
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors
                      ${active ? "text-white shadow-sm" : "bg-muted text-muted-foreground"}`}
                      style={active ? { backgroundColor: NAVY } : {}}>
                      <report.icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground/80"}`}>{report.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{report.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

          </div>
        </div>

        {/* ── Columna derecha: config + preview ── */}
        <div className="flex flex-col gap-4 lg:col-span-9">

          {/* Barra de configuración — una sola fila con 3 secciones */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-0 divide-x divide-border/50">

              {/* Sección 1: Periodo */}
              <div className="flex flex-1 items-center gap-3 px-5 py-4">
                <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Periodo</span>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-9 min-w-[148px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes-actual">Mes actual</SelectItem>
                    <SelectItem value="mes-anterior">Mes anterior</SelectItem>
                    <SelectItem value="trimestre">Último trimestre</SelectItem>
                    <SelectItem value="semestre">Último semestre</SelectItem>
                    <SelectItem value="anual">Año anterior</SelectItem>
                    <SelectItem value="personalizado">Personalizado…</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPeriod === "personalizado" ? (
                  <>
                    <Input type="date" className="h-9 w-32 text-sm" value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input type="date" className="h-9 w-32 text-sm" value={customFin} onChange={e => setCustomFin(e.target.value)} />
                  </>
                ) : fechasCalculadas ? (
                  <span className="rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {fmtFecha(fechasCalculadas.fechaInicio)} — {fmtFecha(fechasCalculadas.fechaFin)}
                  </span>
                ) : null}
              </div>

              {/* Sección 2: Acciones */}
              <div className="flex shrink-0 items-center gap-2 px-5 py-4">
                <button
                  onClick={generarPreview}
                  disabled={isPreviewing}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {isPreviewing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  {isPreviewing ? "Generando…" : "Actualizar"}
                </button>
                <button
                  onClick={handleDescargar}
                  disabled={isDownloading || isPreviewing || !fechasCalculadas}
                  className="flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: NAVY }}
                >
                  {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  {isDownloading ? "Generando..." : `Generar ${selectedFormat.toUpperCase()}`}
                </button>
              </div>

              {/* Sección 3: Formato */}
              <div className="flex shrink-0 items-center gap-3 px-5 py-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Formato</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFormat("pdf")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      selectedFormat === "pdf"
                        ? "border-red-300 bg-red-50 text-red-700 shadow-sm dark:border-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "border-border/70 bg-background text-muted-foreground hover:border-red-200 hover:text-red-600"
                    }`}
                  >
                    <FileText className="size-3.5" />PDF
                  </button>
                  <button
                    onClick={() => setSelectedFormat("xlsx")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      selectedFormat === "xlsx"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "border-border/70 bg-background text-muted-foreground hover:border-emerald-200 hover:text-emerald-600"
                    }`}
                  >
                    <FileSpreadsheet className="size-3.5" />Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Error de descarga */}
            {downloadError && (
              <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-5 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />{downloadError}
              </div>
            )}
          </div>

          {/* Vista previa */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  {selectedFormat === "xlsx"
                    ? <FileSpreadsheet className="size-4 text-emerald-600" />
                    : <FileText className="size-4 text-red-500" />}
                  <p className="text-sm font-semibold text-foreground">
                    {currentReport?.title} — Vista previa
                  </p>
                  {isPreviewing && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Loader2 className="size-2.5 animate-spin" />Actualizando…
                    </span>
                  )}
                </div>
                {fechasCalculadas && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtFecha(fechasCalculadas.fechaInicio)} — {fmtFecha(fechasCalculadas.fechaFin)}
                  </p>
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
            <div className="relative bg-muted/10" style={{ height: selectedFormat === "pdf" ? "calc(100vh - 400px)" : "auto", minHeight: 320 }}>
              {isPreviewing && !previewUrl && !previewSheets && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin opacity-40" />
                  <p className="text-xs">Generando reporte…</p>
                </div>
              )}
              {previewError && !isPreviewing && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <AlertCircle className="size-8 text-red-400 opacity-60" />
                  <p className="text-xs text-red-600 dark:text-red-400">{previewError}</p>
                  <button onClick={generarPreview} className="mt-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    Reintentar
                  </button>
                </div>
              )}
              {previewUrl && (
                <>
                  {isPreviewing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <iframe src={previewUrl} className="h-full w-full border-0" style={{ height: "calc(100vh - 400px)", minHeight: 320 }} title="Vista previa del reporte" />
                </>
              )}
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
                            <th key={i} className="border border-border/40 px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.length === 0 ? (
                          <tr><td colSpan={sheet.headers.length} className="py-10 text-center text-muted-foreground">Sin datos en este periodo</td></tr>
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

    </div>
  )
}
