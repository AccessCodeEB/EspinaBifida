import { HttpError, isHttpError, mapOracleError } from "../utils/httpErrors.js";

// Clase legada — conservada para compatibilidad con código existente.
export class AppError extends Error {
  constructor(message, statusCode, details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function statusToDefaultCode(status) {
  const map = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    500: "INTERNAL_ERROR",
  };
  return map[status] ?? "ERROR";
}

export function notFoundHandler(req, res, next) {
  const err = new HttpError(
    404,
    `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    "ROUTE_NOT_FOUND"
  );
  next(err);
}

export function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let code       = "INTERNAL_ERROR";
  let message    = "Error interno del servidor";
  let details;

  if (isHttpError(err)) {
    statusCode = err.statusCode;
    code       = err.code;
    message    = err.message;
    details    = err.details;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode ?? 500;
    code       = statusToDefaultCode(statusCode);
    message    = err.message;
    details    = err.details;
  } else if (err?.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    code       = "FILE_TOO_LARGE";
    message    = "El archivo supera el tamaño máximo permitido (2 MB).";
  } else {
    const mapped = mapOracleError(err);
    if (mapped) {
      statusCode = mapped.statusCode;
      code       = mapped.code;
      message    = mapped.message;
    } else if (err?.code === "NJS-044") {
      statusCode = 400;
      code       = "BIND_ERROR";
      message    = "Uno o más campos contienen un valor no aceptado. Revisa los datos e intenta de nuevo.";
    }
  }

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
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
