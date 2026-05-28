import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@.]{1,63}(\.[^\s@.]{1,63}){1,10}$/;
const TEL_REGEX   = /^\d{10}$/;

export const loginSchema = z.object({
  email:    z.string().regex(EMAIL_REGEX, "email inválido"),
  password: z.string().min(1, "password es requerido"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken es requerido"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken es requerido"),
});

export const crearAdminSchema = z.object({
  nombreCompleto: z.string().min(1, "nombreCompleto es obligatorio").max(200),
  email:          z.string().regex(EMAIL_REGEX, "email inválido"),
  idRol:          z.number({ coerce: true }).int().positive("idRol debe ser entero positivo"),
  password:       z.string().min(8, "password debe tener al menos 8 caracteres"),
  activo:         z.number({ coerce: true }).int().min(0).max(1).optional(),
  telefono:       z.string().regex(TEL_REGEX, "telefono debe tener 10 dígitos").nullable().optional(),
});

export const actualizarAdminSchema = z.object({
  nombreCompleto: z.string().min(1).max(200).optional(),
  email:          z.string().regex(EMAIL_REGEX, "email inválido").optional(),
  idRol:          z.number({ coerce: true }).int().positive().optional(),
  activo:         z.number({ coerce: true }).int().min(0).max(1).optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "Envía al menos un campo para actualizar",
});

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "passwordActual es requerido"),
  passwordNueva:  z.string().min(8, "passwordNueva debe tener al menos 8 caracteres"),
  codigo:         z.string().optional(),
});

export const recuperarPasswordSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "email inválido"),
});

export const resetPasswordSchema = z.object({
  email:         z.string().regex(EMAIL_REGEX, "email inválido"),
  codigo:        z.string().min(1, "codigo es requerido"),
  nuevaPassword: z.string().min(8, "nuevaPassword debe tener al menos 8 caracteres"),
});

export const actualizarTelefonoSchema = z.object({
  telefono: z.string().regex(TEL_REGEX, "telefono debe tener 10 dígitos").nullable().optional(),
});
