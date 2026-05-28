import { z } from "zod";

export const crearMovimientoSchema = z.object({
  idArticulo: z.number({ coerce: true }).int().positive("idArticulo debe ser entero positivo").optional(),
  idProducto: z.number({ coerce: true }).int().positive("idProducto debe ser entero positivo").optional(),
  tipo:       z.enum(["ENTRADA", "SALIDA"], {
    errorMap: () => ({ message: "tipo debe ser ENTRADA o SALIDA" }),
  }),
  cantidad: z.number({ coerce: true }).int().positive("cantidad debe ser un entero mayor a 0"),
  motivo:   z.string().max(500).nullable().optional(),
}).refine((d) => d.idArticulo !== undefined || d.idProducto !== undefined, {
  message: "Envía idArticulo o idProducto",
});
