import { ZodError } from "zod";

/**
 * Crea un middleware Express que valida req.body contra un schema Zod.
 * Devuelve 400 con la lista de errores si la validación falla.
 * Reemplaza req.body con el valor parseado (coerciones de Zod aplicadas).
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ error: "Datos inválidos", errors });
    }
    req.body = result.data;
    next();
  };
}
