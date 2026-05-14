import { resolveApiMediaOrigin } from "@/lib/api-base"

/**
 * Convierte ruta guardada en BD (/uploads/...), URL absoluta o data URL en src usable por <img>.
 * `cacheBust` fuerza recarga del navegador al reemplazar la imagen con una nueva URL en el mismo path.
 */
export function resolvePublicUploadUrl(
  stored: string | null | undefined,
  cacheBust?: string | number | null
): string | undefined {
  if (!stored) return undefined
  // data URL (base64): usar tal cual, sin prefijo de API
  if (stored.startsWith("data:")) return stored
  const API_BASE = resolveApiMediaOrigin()
  let base: string
  if (stored.startsWith("http://") || stored.startsWith("https://")) base = stored
  else base = `${API_BASE}${stored.startsWith("/") ? stored : `/${stored}`}`
  if (cacheBust == null || cacheBust === "" || Number(cacheBust) === 0) return base
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}v=${encodeURIComponent(String(cacheBust))}`
}
