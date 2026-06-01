import { HttpError, isHttpError, mapOracleError } from "../utils/httpErrors.js";


export function notFoundHandler(req, res, next) {
  const err = new HttpError(
    404,
    `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    "ROUTE_NOT_FOUND"
  );
  next(err);
}

function classifyError(err) {
  if (isHttpError(err)) {
    return { statusCode: err.statusCode, code: err.code, message: err.message, details: err.details };
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return { statusCode: 400, code: "FILE_TOO_LARGE", message: "El archivo supera el tamaño máximo permitido (2 MB)." };
  }
  const mapped = mapOracleError(err);
  if (mapped) {
    return { statusCode: mapped.statusCode, code: mapped.code, message: mapped.message };
  }
  if (err?.code === "NJS-044") {
    return { statusCode: 400, code: "BIND_ERROR", message: "Uno o más campos contienen un valor no aceptado. Revisa los datos e intenta de nuevo." };
  }
  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Error interno del servidor" };
}

export function errorHandler(err, req, res, _next) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  let { statusCode, code, message, details } = classifyError(err);

  if (statusCode >= 400) {
    console.error(`[${new Date().toISOString()}] ${statusCode} error — ${message}`, err?.errorNum ? `ORA-${err.errorNum}` : err?.message ?? "");
  }
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] Internal server error`, err);
    /* istanbul ignore else */
    if (isDevelopment) {
      message = err?.message ? String(err.message) : message;
      details = {
        ...details,
        debug: {
          name: err?.name ?? "Error",
          message: err?.message ?? null,
          errorNum: err?.errorNum ?? null,
          code: err?.code ?? null,
        },
      };
    }
  }

  if (code === "INSUFFICIENT_STOCK") {
    return res.status(422).json({
      error: "Stock insuficiente",
      code: "INSUFFICIENT_STOCK",
      disponible: Number(details?.disponible ?? 0),
    });
  }

  const body = { code, message, error: message };
  if (details !== undefined) body.details = details;

  res.status(statusCode).json(body);
}
