import { badRequest } from "./httpErrors.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Secreto de prueba Cloudflare (solo desarrollo si no hay TURNSTILE_SECRET_KEY).
 * Acepta tokens dummy generados por cualquier site key de prueba (incl. la que fuerza desafío interactivo).
 * @see https://developers.cloudflare.com/turnstile/reference/testing/
 */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

/**
 * Verifica el token de Cloudflare Turnstile antes de aceptar la solicitud pública.
 * @param {string|undefined} token
 * @param {string|undefined} remoteip IP del cliente (opcional)
 */
export async function verifyTurnstileToken(token, remoteip) {
  const isProd = process.env.NODE_ENV === "production";
  let secret = String(process.env.TURNSTILE_SECRET_KEY ?? "").trim();

  if (!secret) {
    if (isProd) {
      throw badRequest(
        "Verificación humana no configurada en el servidor. Contacta al administrador.",
        "CAPTCHA_CONFIG"
      );
    }
    secret = TURNSTILE_TEST_SECRET;
  }

  const t = String(token ?? "").trim();
  if (!t) {
    throw badRequest("Completa la verificación humana antes de enviar.", "CAPTCHA_REQUIRED");
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", t);
  if (remoteip) body.set("remoteip", String(remoteip).trim());

  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (json.success === true) return;

  throw badRequest(
    "La verificación humana no pudo validarse. Vuelve a intentarlo.",
    "CAPTCHA_FAILED",
    json["error-codes"]
  );
}
