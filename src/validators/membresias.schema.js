import { z } from "zod";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const crearMembresiaSchema = z.object({
  curp: z.string().regex(CURP_REGEX, "CURP inválida"),
  tipo: z.enum(["nuevo_ingreso", "reinscripcion"]).optional(),
  anios: z.number({ coerce: true }).int().positive("anios debe ser un entero positivo").optional(),
  monto: z.number({ coerce: true }).nonnegative("monto debe ser >= 0").optional(),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]).nullable().optional(),
  metodoPago:  z.enum(["efectivo", "transferencia", "tarjeta"]).nullable().optional(),
  referencia:       z.string().max(200).nullable().optional(),
  observaciones:    z.string().trim().min(1, "Las observaciones son obligatorias").max(500),
  numero_credencial: z.string().max(50).optional(),
  fecha_emision:          z.string().regex(FECHA_REGEX, "fecha_emision debe ser YYYY-MM-DD").optional(),
  fecha_vigencia_inicio:  z.string().regex(FECHA_REGEX, "fecha_vigencia_inicio debe ser YYYY-MM-DD").optional(),
  fecha_ultimo_pago:      z.string().regex(FECHA_REGEX, "fecha_ultimo_pago debe ser YYYY-MM-DD").optional(),
});
