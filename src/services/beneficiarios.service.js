import * as BeneficiarioModel from "../models/beneficiarios.model.js";
import * as MembresiasModel from "../models/membresias.model.js";
import { badRequest, notFound, conflict } from "../utils/httpErrors.js";
import { publicPathForStoredFile, unlinkOldProfileIfSafe } from "../utils/profileFiles.js";

const CURP_REGEX   = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_REGEX    = /^\d{10}$/;
const CP_REGEX     = /^\d{5}$/;
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CAMPOS_OBLIGATORIOS = [
  "nombres",
  "apellidoPaterno",
  "apellidoMaterno",
];

function sanitizar(data) {
  const campos = [
    "nombres", "apellidoPaterno", "apellidoMaterno",
    "nombrePadreMadre", "calle", "colonia", "ciudad",
    "municipio", "estado", "contactoEmergencia",
    "municipioNacimiento", "hospitalNacimiento",
  ];
  for (const campo of campos) {
    if (data[campo]) data[campo] = String(data[campo]).trim();
  }
  if (Object.prototype.hasOwnProperty.call(data, "tipoSangre")) {
    const t = String(data.tipoSangre ?? "").trim();
    data.tipoSangre = t === "" ? null : t;
  }
  return data;
}

function validarCamposObligatorios(data) {
  const faltantes = CAMPOS_OBLIGATORIOS.filter(
    (campo) => !data[campo] || String(data[campo]).trim() === ""
  );
  if (faltantes.length > 0) {
    throw badRequest(
      `Campos obligatorios faltantes: ${faltantes.join(", ")}`,
      "MISSING_REQUIRED_FIELDS"
    );
  }
}

function validarCurp(curp) {
  if (!curp || !CURP_REGEX.test(curp)) {
    throw badRequest("CURP con formato inválido", "INVALID_CURP");
  }
}

/**
 * CURP oficial (18) o clave alfanumérica ya guardada como PK (registros legados).
 * No usar {8} solo: palabras como "INVALIDA" pasarían; mínimo 9 o exactamente 18.
 */
const CURP_RUTA_LEGADO_REGEX = /^[A-Z0-9]{9,24}$/;

function normalizarCurpRuta(curp) {
  return String(curp ?? "").trim().toUpperCase();
}

/** Valida el identificador que viene en la URL (params). Más permiso que `validarCurp` del cuerpo en alta. */
function validarCurpRuta(curp) {
  const c = normalizarCurpRuta(curp);
  if (!c) throw badRequest("CURP con formato inválido", "INVALID_CURP");
  if (CURP_REGEX.test(c)) return c;
  if (CURP_RUTA_LEGADO_REGEX.test(c)) return c;
  // 8 caracteres solo si incluye al menos un dígito (evita palabras tipo "INVALIDA")
  if (c.length === 8 && /^[A-Z0-9]{8}$/.test(c) && /\d/.test(c)) return c;
  throw badRequest("CURP con formato inválido", "INVALID_CURP");
}

function validarFormatos(data) {
  if (data.correoElectronico && !EMAIL_REGEX.test(data.correoElectronico)) {
    throw badRequest("Formato de correo electrónico inválido", "INVALID_EMAIL");
  }
  if (data.telefonoCelular && !TEL_REGEX.test(data.telefonoCelular)) {
    throw badRequest("TELEFONO_CELULAR debe contener exactamente 10 dígitos", "INVALID_PHONE");
  }
  if (data.telefonoCasa && !TEL_REGEX.test(data.telefonoCasa)) {
    throw badRequest("TELEFONO_CASA debe contener exactamente 10 dígitos", "INVALID_PHONE");
  }
  if (data.telefonoEmergencia && !TEL_REGEX.test(data.telefonoEmergencia)) {
    throw badRequest("TELEFONO_EMERGENCIA debe contener exactamente 10 dígitos", "INVALID_PHONE");
  }
  if (data.cp && !CP_REGEX.test(data.cp)) {
    throw badRequest("CP debe contener exactamente 5 dígitos", "INVALID_CP");
  }
  if (data.genero && !["M", "F"].includes(data.genero)) {
    throw badRequest("GENERO debe ser 'M' o 'F'", "INVALID_GENERO");
  }
  if (data.tipoSangre && !TIPOS_SANGRE.includes(data.tipoSangre)) {
    throw badRequest(`TIPOS_SANGRE debe ser uno de: ${TIPOS_SANGRE.join(", ")}`, "INVALID_TIPO_SANGRE");
  }
  if (data.usaValvula && !["S", "N"].includes(data.usaValvula)) {
    throw badRequest("USA_VALVULA debe ser 'S' o 'N'", "INVALID_USA_VALVULA");
  }
  if (data.notas && data.notas.length > 500) {
    throw badRequest("NOTAS no puede superar los 500 caracteres", "NOTES_TOO_LONG");
  }
  if (data.fechaNacimiento) {
    const fecha = new Date(data.fechaNacimiento);
    const hoy   = new Date(new Date().toISOString().slice(0, 10));
    const hace120 = new Date(hoy);
    hace120.setFullYear(hoy.getFullYear() - 120);

    if (isNaN(fecha.getTime())) {
      throw badRequest("Formato de FECHA_NACIMIENTO inválido (use YYYY-MM-DD)", "INVALID_DATE_FORMAT");
    }
    if (fecha > hoy) {
      throw badRequest("FECHA_NACIMIENTO no puede ser una fecha futura", "DATE_IN_FUTURE");
    }
    if (fecha < hace120) {
      throw badRequest("FECHA_NACIMIENTO no puede ser hace más de 120 años", "DATE_TOO_OLD");
    }
  }
}

// Validación permisiva para UPDATE — solo valida enums, no formato libre
function validarFormatosUpdate(data) {
  if (data.genero && !["M", "F"].includes(data.genero)) {
    throw badRequest("GENERO debe ser 'M' o 'F'", "INVALID_GENERO");
  }
  if (data.usaValvula && !["S", "N"].includes(data.usaValvula)) {
    throw badRequest("USA_VALVULA debe ser 'S' o 'N'", "INVALID_USA_VALVULA");
  }
  if (data.tipoSangre && !TIPOS_SANGRE.includes(data.tipoSangre)) {
    throw badRequest(`TIPOS_SANGRE debe ser uno de: ${TIPOS_SANGRE.join(", ")}`, "INVALID_TIPO_SANGRE");
  }
  if (data.notas && data.notas.length > 500) {
    throw badRequest("NOTAS no puede superar los 500 caracteres", "NOTES_TOO_LONG");
  }
}

export const getAll = () => BeneficiarioModel.findAll();

export async function hardDelete(curp) {
  const id = validarCurpRuta(curp);
  const existente = await BeneficiarioModel.findById(id);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${id}`);
  }
  await BeneficiarioModel.hardDelete(id);
}

export async function toggleEstatus(curp, estatus) {
  const id = validarCurpRuta(curp);
  if (!["Activo", "Inactivo"].includes(estatus)) {
    throw badRequest("Estatus debe ser 'Activo' o 'Inactivo'");
  }
  const existente = await BeneficiarioModel.findById(id);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${id}`);
  }
  await BeneficiarioModel.updateEstatus(id, estatus);
}

export function getById(curp) {
  const id = normalizarCurpRuta(curp);
  if (!id) return Promise.resolve(null);
  return BeneficiarioModel.findById(id);
}

export async function create(data) {
  data = sanitizar(data);
  validarCurp(data.curp);
  validarCamposObligatorios(data);
  validarFormatos(data);

  const existente = await BeneficiarioModel.findById(data.curp);
  if (existente) {
    throw conflict(`Ya existe un beneficiario con la CURP ${data.curp}`, "DUPLICATE_CURP");
  }

  data.estatus = "Activo";
  return BeneficiarioModel.create(data);
}

export async function update(curp, data) {
  const id = validarCurpRuta(curp);
  data = sanitizar(data);
  validarCamposObligatorios(data);
  validarFormatosUpdate(data);

  const existente = await BeneficiarioModel.findById(id);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${id}`, "BENEFICIARIO_NOT_FOUND");
  }

  if (existente.ESTATUS === "Baja") {
    throw conflict(
      `No se puede actualizar el beneficiario ${id} porque su estatus es Baja`,
      "BENEFICIARIO_BAJA"
    );
  }

  data.estatus = existente.ESTATUS;
  return BeneficiarioModel.update(id, data);
}

export async function deactivate(curp) {
  const id = validarCurpRuta(curp);

  const existente = await BeneficiarioModel.findById(id);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${id}`, "BENEFICIARIO_NOT_FOUND");
  }

  await BeneficiarioModel.deactivate(id);
  await MembresiasModel.cancelarPorCurp(id);
}

/** Tras multer: `filename` es el nombre en disco bajo uploads/profiles */
export async function updateFotoPerfilByUpload(curpParam, filename) {
  const curp = validarCurpRuta(curpParam);

  const existente = await BeneficiarioModel.findById(curp);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${curp}`, "BENEFICIARIO_NOT_FOUND");
  }

  const prev = existente.FOTO_PERFIL_URL ?? existente.fotoPerfilUrl;
  const publicPath = publicPathForStoredFile(filename);
  await BeneficiarioModel.updateFotoPerfilUrl(curp, publicPath);
  unlinkOldProfileIfSafe(prev);

  return { fotoPerfilUrl: publicPath };
}

/** Quita la foto en BD y borra el archivo bajo uploads/profiles si aplica */
export async function clearFotoPerfil(curpParam) {
  const curp = validarCurpRuta(curpParam);

  const existente = await BeneficiarioModel.findById(curp);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${curp}`, "BENEFICIARIO_NOT_FOUND");
  }

  const prev = existente.FOTO_PERFIL_URL ?? existente.fotoPerfilUrl;
  await BeneficiarioModel.updateFotoPerfilUrl(curp, null);
  unlinkOldProfileIfSafe(prev);

  return { fotoPerfilUrl: null };
}
