const PHONE_FIELDS = new Set(["telefonoCelular", "telefonoCasa", "telefonoEmergencia"]);
const REQUIRED_FIELDS = new Set(["nombres", "apellidoPaterno", "apellidoMaterno"]);

function deriveCode(issue) {
  const field = String(issue.path?.[0] ?? "");
  const code  = issue.code ?? "";

  if (field === "curp")                                    return "INVALID_CURP";
  if (REQUIRED_FIELDS.has(field) && code === "too_small")  return "MISSING_REQUIRED_FIELDS";
  if (field === "correoElectronico")                       return "INVALID_EMAIL";
  if (PHONE_FIELDS.has(field))                             return "INVALID_PHONE";
  if (field === "cp")                                      return "INVALID_CP";
  if (field === "tipo" && code === "invalid_value")        return "INVALID_MOVIMIENTO_TIPO";
  if (field === "cantidad" && code === "too_small")        return "INVALID_CANTIDAD";
  if (field === "idArticulo" && code === "invalid_type")   return "INVALID_ID";
  return undefined;
}

/**
 * Middleware Express que valida req.body contra un schema Zod.
 * Devuelve 400 con la lista de errores si la validación falla.
 * Reemplaza req.body con el valor parseado (coerciones de Zod aplicadas).
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues ?? [];
      const errors = issues.map((e) => ({ field: e.path.join("."), message: e.message }));
      const code   = deriveCode(issues[0]) ?? undefined;
      return res.status(400).json({ error: "Datos inválidos", errors, ...(code && { code }) });
    }
    req.body = result.data;
    next();
  };
}
