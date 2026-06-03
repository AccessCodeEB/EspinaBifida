import { z } from "zod";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

const consumoSchema = z.object({
  idArticulo: z.number({ coerce: true }).int().positive().optional(),
  idProducto: z.number({ coerce: true }).int().positive().optional(),
  cantidad:   z.number({ coerce: true }).int().positive("cantidad debe ser entero positivo"),
}).refine(d => d.idArticulo !== undefined || d.idProducto !== undefined, {
  
}).refine(d => d.idArticulo !== undefined || d.idProducto !== undefined, {
  message: "consumo debe incluir idArticulo o idProducto",
});

export const crearServicioSchema = z.object({
  curp:                    z.string().regex(CURP_REGEX, "CURP inválida"),
  idTipoServicio:          z.number({ coerce: true }).int().positive("idTipoServicio debe ser entero positivo"),
  costo:                   z.number({ coerce: true }).nonnegative("costo debe ser >= 0").optional(),
  montoPagado:             z.number({ coerce: true }).nonnegative("montoPagado debe ser >= 0").optional(),
  referenciaId:            z.number({ coerce: true }).int().positive().nullable().optional(),
  referenciaTipo:          z.string().max(50).nullable().optional(),
  notas:                   z.string().max(1000).nullable().optional(),
  consumos:                z.array(consumoSchema).optional(),
  estatus:                 z.enum(["COMPLETADO"]).optional(),
});

export const actualizarServicioSchema = z.object({
  montoPagado: z.number({ coerce: true }).nonnegative("montoPagado debe ser >= 0").optional(),
  notas:       z.string().max(1000).nullable().optional(),
}).refine((d) => d.montoPagado !== undefined || d.notas !== undefined, {
  message: "Envía al menos montoPagado o notas",
});
