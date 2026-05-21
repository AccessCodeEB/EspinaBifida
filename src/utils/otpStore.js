/**
 * OTP en memoria para verificación SMS al cambiar contraseña.
 * Map<idAdmin, { code: string, expiresAt: number }>
 * Válido 5 minutos por defecto.
 */

const _store = new Map();
export const OTP_TTL_MS = 5 * 60 * 1000;

export function saveOtp(idAdmin, code, ttlMs = OTP_TTL_MS) {
  _store.set(idAdmin, { code: String(code), expiresAt: Date.now() + ttlMs });
}

export function verifyOtp(idAdmin, code) {
  const entry = _store.get(idAdmin);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { _store.delete(idAdmin); return false; }
  if (entry.code !== String(code)) return false;
  _store.delete(idAdmin);
  return true;
}

export function clearOtp(idAdmin) {
  _store.delete(idAdmin);
}

/** Solo para tests: acceso directo al store. */
export const _testStore = _store;
