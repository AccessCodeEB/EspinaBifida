/**
 * Site key pública de Cloudflare Turnstile (solo esta variable va al cliente).
 * Si no está definida, el formulario público puede enviarse sin widget (útil en local).
 * En producción debe estar definida junto con TURNSTILE_SECRET_KEY en el servidor.
 */
export function getTurnstileSiteKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  return k || undefined
}
