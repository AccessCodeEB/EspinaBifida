import { z } from "zod";

const CURP_REGEX  = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const TEL_REGEX   = /^\d{10}$/;
const CP_REGEX    = /^\d{5}$/;
const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@.]{1,63}(\.[^\s@.]{1,63}){1,10}$/;
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const optTel = (label) =>
  z.union([z.string().regex(TEL_REGEX, `${label} debe tener 10 dígitos`), z.literal(""), z.null()]).optional()

const camposPersona = {
  nombres:           z.string().min(1, "nombres es obligatorio").max(100),
  apellidoPaterno:   z.string().min(1, "apellidoPaterno es obligatorio").max(100),
  apellidoMaterno:   z.string().max(100).nullable().optional(),
  fechaNacimiento:   z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fechaNacimiento debe ser YYYY-MM-DD"), z.null()]).optional(),
  genero:            z.string().max(20).nullable().optional(),
  tipoSangre:        z.enum(TIPOS_SANGRE).nullable().optional(),
  nombrePadreMadre:  z.string().max(200).nullable().optional(),
  calle:             z.string().max(200).nullable().optional(),
  colonia:           z.string().max(100).nullable().optional(),
  ciudad:            z.string().max(100).nullable().optional(),
  municipio:         z.string().max(100).nullable().optional(),
  estado:            z.string().max(100).nullable().optional(),
  cp:                z.union([z.string().regex(CP_REGEX, "cp debe tener 5 dígitos"), z.literal(""), z.null()]).optional(),
  telefonoCasa:      optTel("telefonoCasa"),
  telefonoCelular:   optTel("telefonoCelular"),
  correoElectronico: z.union([z.string().regex(EMAIL_REGEX, "correoElectronico inválido"), z.literal(""), z.null()]).optional(),
  contactoEmergencia:  z.string().max(200).nullable().optional(),
  telefonoEmergencia:  optTel("telefonoEmergencia"),
  hospitalNacimiento:  z.string().max(200).nullable().optional(),
  usaValvula:        z.union([z.boolean(), z.enum(["S", "N", "1", "0"])]).optional(),
  notas:             z.string().max(500).nullable().optional(),
  tipo:              z.string().max(50).nullable().optional(),
  // Control interno: cuota A (menor) o B (mayor). NULL = sin asignar.
  tipoCuota:         z.enum(["A", "B"]).nullable().optional(),
};

export const crearBeneficiarioSchema = z.object({
  curp: z.string().regex(CURP_REGEX, "CURP inválida").optional(),
  ...camposPersona,
});

export const actualizarBeneficiarioSchema = z.object({
  curp: z.string().regex(CURP_REGEX, "CURP inválida").optional(),
  ...camposPersona,
  nombres:         z.string().min(1).max(100).optional(),
  apellidoPaterno: z.string().min(1).max(100).optional(),
});

export const actualizarEstatusSchema = z.object({
  estatus: z.enum(["Activo", "Inactivo", "Baja"], {
    errorMap: () => ({ message: "estatus debe ser Activo, Inactivo o Baja" }),
  }),
});

export const solicitudPublicaSchema = z.object({
  turnstileToken: z.string().min(1, "turnstileToken es requerido"),
  nombres:        z.string().min(1, "nombres es obligatorio").max(100),
  apellidoPaterno: z.string().min(1, "apellidoPaterno es obligatorio").max(100),
  apellidoMaterno: z.string().max(100).optional(),
  curp:           z.string().regex(CURP_REGEX, "CURP inválida").optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fechaNacimiento debe ser YYYY-MM-DD").optional(),
  genero:         z.string().max(20).optional(),
  ciudad:         z.string().max(100).optional(),
  municipio:      z.string().max(100).optional(),
  estado:         z.string().max(100).optional(),
  cp:             z.string().regex(CP_REGEX, "cp debe tener 5 dígitos").optional(),
  telefonoCelular: z.string().regex(TEL_REGEX, "telefonoCelular debe tener 10 dígitos").optional(),
  correoElectronico: z.string().regex(EMAIL_REGEX, "correoElectronico inválido").optional(),
  notas:          z.string().max(500).optional(),
}).catchall(z.unknown());
