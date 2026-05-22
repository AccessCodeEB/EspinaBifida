import { HttpError, isHttpError, mapOracleError } from "../utils/httpErrors.js";


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
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (isHttpError(err)) {
    statusCode = err.statusCode;
    code       = err.code;
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
    const safeMethod = String(req.method).replace(/[\r\n]/g, "");
    const safeUrl    = String(req.originalUrl).replace(/[\r\n]/g, "");
    console.error(`[${new Date().toISOString()}] ${safeMethod} ${safeUrl}`, err);
    /* istanbul ignore else */
    if (isDevelopment) {
      message = err?.message ? String(err.message) : message;
      details = {
        ...(details ?? {}),
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
