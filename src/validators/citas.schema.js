import { z } from "zod";

const CURP_REGEX  = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX  = /^\d{2}:\d{2}$/;

const estatusEnum = z.preprocess(
  v => (typeof v === "string" ? v.toUpperCase() : v),
  z.enum(["PROGRAMADA", "CONFIRMADA", "COMPLETADA", "CANCELADA"])
);

export const crearCitaSchema = z.object({
  curp:        z.string().regex(CURP_REGEX, "CURP inválida"),
  especialista: z.string().min(1, "especialista es obligatorio").max(100),
  fecha:       z.string().regex(FECHA_REGEX, "fecha debe ser YYYY-MM-DD"),
  hora:        z.string().regex(HORA_REGEX, "hora debe ser HH:MM").optional(),
  estatus:     estatusEnum.optional(),
  notas:       z.string().max(1000).nullable().optional(),
  idTipoServicio: z.number({ coerce: true }).int().positive().optional(),
  costo:       z.number({ coerce: true }).nonnegative("costo debe ser >= 0").optional(),
});

export const actualizarCitaSchema = z.object({
  curp:        z.preprocess(v => typeof v === "string" ? v.toUpperCase() : v, z.string().regex(CURP_REGEX, "CURP inválida")).optional(),
  especialista: z.string().min(1).max(100).optional(),
  fecha:       z.string().regex(FECHA_REGEX, "fecha debe ser YYYY-MM-DD").optional(),
  hora:        z.string().regex(HORA_REGEX, "hora debe ser HH:MM").optional(),
  estatus:     estatusEnum.optional(),
  notas:       z.string().max(1000).nullable().optional(),
  idTipoServicio: z.number({ coerce: true }).int().positive().optional(),
});
