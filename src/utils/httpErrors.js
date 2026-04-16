export class HttpError extends Error {
  constructor(statusCode, message, code, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest   = (msg, code = "BAD_REQUEST",   details) => new HttpError(400, msg, code, details);
export const unauthorized = (msg, code = "UNAUTHORIZED")            => new HttpError(401, msg, code);
export const forbidden    = (msg, code = "FORBIDDEN")               => new HttpError(403, msg, code);
export const notFound     = (msg, code = "NOT_FOUND")               => new HttpError(404, msg, code);
export const conflict     = (msg, code = "CONFLICT")                => new HttpError(409, msg, code);
export const internal     = (msg = "Error interno del servidor", code = "INTERNAL_ERROR") => new HttpError(500, msg, code);

export function isHttpError(err) {
  return err instanceof HttpError;
}

function getOracleErrorNum(err) {
  if (Number.isInteger(err?.errorNum)) return err.errorNum;
  const match = /ORA-(\d{5})/.exec(String(err?.message ?? ""));
  return match ? Number(match[1]) : null;
}

export function mapOracleError(err) {
  const n = getOracleErrorNum(err);
  if (!n) return null;

  if (n === 1)
    return conflict("Conflicto de datos: registro duplicado", "DUPLICATE_RECORD");
  if (n === 2291 || n === 2292)
    return conflict("Conflicto de integridad referencial", "REFERENTIAL_INTEGRITY");
  if (n === 1400)
    return badRequest("Faltan campos obligatorios", "MISSING_REQUIRED_FIELDS");
  if (n === 1722)
    return badRequest("Formato numérico inválido", "INVALID_NUMBER_FORMAT");
  if (n === 1830 || n === 1840 || n === 1841)
    return badRequest("Formato de fecha inválido", "INVALID_DATE_FORMAT");

  return null;
}
