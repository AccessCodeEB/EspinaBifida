import { badRequest } from "./httpErrors.js";

export const CURP_REGEX  = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
// Cuantificadores acotados ({1,N}) eliminan backtracking catastrófico (ReDoS).
// RFC 5321: local-part ≤ 64 chars, domain label ≤ 63 chars.
export const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@.]{1,63}(\.[^\s@.]{1,63}){1,10}$/;
export const TEL_REGEX   = /^\d{10}$/;
export const CP_REGEX    = /^\d{5}$/;

/** Recorta espacios si es string; devuelve el valor tal cual si no. */
export function sanitizeString(val) {
  return typeof val === "string" ? val.trim() : val;
}

/** Convierte val a número >= 0. Lanza badRequest si es inválido. */
export function parsePositiveNumber(val, fieldName) {
  const num = Number(val);
  if (Number.isNaN(num) || num < 0)
    throw badRequest(`${fieldName} debe ser un número >= 0`);
  return num;
}

/**
 * Parsea fecha ISO YYYY-MM-DD. Devuelve Date (UTC) o null si val está vacío.
 * Lanza badRequest si el formato es incorrecto.
 */
export function parseISODate(val, fieldName) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val !== "string")
    throw badRequest(`${fieldName} debe ser una fecha ISO (YYYY-MM-DD)`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.test(val.trim());
  if (!m) throw badRequest(`${fieldName} debe tener formato YYYY-MM-DD`);
  const parts = val.trim().split("-");
  const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  /* istanbul ignore next */
  if (Number.isNaN(d.getTime())) throw badRequest(`${fieldName} es una fecha inválida`);
  return d;
}
