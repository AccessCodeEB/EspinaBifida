import { resolveApiFetchUrl } from "@/lib/api-base"
import { tokenStorage } from "@/lib/token"
import { apiClient } from "@/lib/api-client"

export interface ReporteHistorico {
  ID_REPORTE: number
  TIPO: string
  FECHA_INICIO: string
  FECHA_FIN: string
  FECHA_GENERACION?: string
  RUTA_PDF?: string | null
  RUTA_XLSX?: string | null
}

/**
 * Obtiene el reporte como blob URL para previsualizar en iframe.
 * El llamante es responsable de llamar URL.revokeObjectURL() al cerrar.
 */
export async function fetchReporteUrl(
  fechaInicio: string,
  fechaFin: string,
  formato: "pdf" | "xlsx",
  tipo = "estadisticas"
): Promise<string> {
  const token = tokenStorage.get()
  const path = `/api/v1/reportes/periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&formato=${formato}&tipo=${tipo}`
  const url = resolveApiFetchUrl(path)

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "Error desconocido")
    let message = text
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string }
      message = parsed.error ?? parsed.message ?? text
    } catch { /* usar texto crudo */ }
    throw new Error(message)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/**
 * Descarga el reporte como blob y lo dispara en el navegador.
 * Usa fetch directo porque necesitamos la respuesta como Blob (no JSON).
 */
export async function downloadReporte(
  fechaInicio: string,
  fechaFin: string,
  formato: "pdf" | "xlsx",
  tipo = "estadisticas"
): Promise<void> {
  const token = tokenStorage.get()
  const path = `/api/v1/reportes/periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&formato=${formato}&tipo=${tipo}`
  const url = resolveApiFetchUrl(path)

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "Error desconocido")
    let message = text
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string }
      message = parsed.error ?? parsed.message ?? text
    } catch { /* usar texto crudo */ }
    throw new Error(message)
  }

  const blob = await res.blob()

  // Extraer nombre de archivo del header Content-Disposition
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename="?([^";\n]+)"?/i)
  const filename = match?.[1] ?? `reporte-${fechaInicio}-${fechaFin}.${formato}`

  // Disparar descarga en el navegador
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objUrl)
}

/** GET /api/v1/reportes/historico */
export function getHistorico(page = 1, limit = 20) {
  return apiClient.get<{ data: ReporteHistorico[] }>(
    `/api/v1/reportes/historico?page=${page}&limit=${limit}`
  )
}
