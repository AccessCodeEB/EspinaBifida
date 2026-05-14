/**
 * Resuelve la URL del backend para fetch e imágenes.
 *
 * En el **navegador** se usa el prefijo `/api`: `next.config.mjs` reescribe a Express
 * (`NEXT_PUBLIC_API_URL`, p. ej. `http://localhost:3000`). Así el login y el resto de
 * la API funcionan al abrir el panel desde `http://192.168.x.x:3001` sin que el cliente
 * intente `localhost:3000` (que en otro dispositivo no existe).
 *
 * En **SSR** (sin `window`) se usa la URL absoluta de env.
 */
export function resolveApiFetchUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (typeof window !== "undefined") {
    return `/api${normalized}`
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "")
  return `${base}${normalized}`
}

/** Origen para prefijar rutas `/uploads/...` en `<img>` (mismo criterio que la API). */
export function resolveApiMediaOrigin(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`.replace(/\/$/, "")
  }
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "")
}
