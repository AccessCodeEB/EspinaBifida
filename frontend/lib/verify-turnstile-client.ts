/** Verifica el token de Turnstile contra nuestra API (el secreto nunca sale del servidor). */
export async function verifyTurnstileToken(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/turnstile/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, message: j.error ?? "No se pudo validar la verificación de seguridad." }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: "Error de red al validar el captcha." }
  }
}
