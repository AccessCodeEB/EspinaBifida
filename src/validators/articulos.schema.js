import { z } from "zod";

export const crearArticuloSchema = z.object({
  idArticulo:        z.number({ coerce: true }).int().positive().nullable().optional(),
  descripcion:       z.string().min(1, "descripcion es obligatoria").max(150),
  unidad:            z.string().min(1, "unidad es obligatoria").max(50),
  cuotaRecuperacion: z.number({ coerce: true }).nonnegative("cuotaRecuperacion debe ser >= 0").optional(),
  inventarioActual:  z.number({ coerce: true }).nonnegative("inventarioActual debe ser >= 0").optional(),
  manejaInventario:  z.enum(["S", "N"]).optional(),
  idCategoria:       z.number({ coerce: true }).int().positive().optional(),
  stockMinimo:       z.number({ coerce: true }).nonnegative("stockMinimo debe ser >= 0").optional(),
  cuotaB:            z.number({ coerce: true }).nonnegative("cuotaB debe ser >= 0").nullable().optional(),
});

export const actualizarArticuloSchema = z.object({
  descripcion:       z.string().min(1).max(150).optional(),
  unidad:            z.string().min(1).max(50).optional(),
  cuotaRecuperacion: z.number({ coerce: true }).nonnegative().optional(),
  inventarioActual:  z.number({ coerce: true }).nonnegative().optional(),
  manejaInventario:  z.enum(["S", "N"]).optional(),
  idCategoria:       z.number({ coerce: true }).int().positive().optional(),
  stockMinimo:       z.number({ coerce: true }).nonnegative().optional(),
  cuotaB:            z.number({ coerce: true }).nonnegative().nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "Envía al menos un campo para actualizar",
});
