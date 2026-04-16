import * as BeneficiarioModel from "../models/beneficiarios.model.js";
import * as MembresiasModel from "../models/membresias.model.js";
import { badRequest, notFound, conflict } from "../utils/httpErrors.js";

const CURP_REGEX   = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_REGEX    = /^\d{10}$/;
const CP_REGEX     = /^\d{5}$/;
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CAMPOS_OBLIGATORIOS = [
  "nombres",
  "apellidoPaterno",
  "apellidoMaterno",
  "fechaNacimiento",
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
    throw badRequest(`TIPO_SANGRE debe ser uno de: ${TIPOS_SANGRE.join(", ")}`, "INVALID_TIPO_SANGRE");
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

export const getAll = () => BeneficiarioModel.findAll();

export const getById = (curp) => BeneficiarioModel.findById(curp);

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
  validarCurp(curp);
  data = sanitizar(data);
  validarCamposObligatorios(data);
  validarFormatos(data);

  const existente = await BeneficiarioModel.findById(curp);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${curp}`, "BENEFICIARIO_NOT_FOUND");
  }
  if (existente.ESTATUS === "Baja") {
    throw conflict("No se puede modificar un beneficiario con estatus 'Baja'", "BENEFICIARIO_BAJA");
  }

  data.estatus = existente.ESTATUS;
  return BeneficiarioModel.update(curp, data);
}

export async function deactivate(curp) {
  validarCurp(curp);

  const existente = await BeneficiarioModel.findById(curp);
  if (!existente) {
    throw notFound(`No existe un beneficiario con la CURP ${curp}`, "BENEFICIARIO_NOT_FOUND");
  }

  await BeneficiarioModel.deactivate(curp);
  await MembresiasModel.cancelarPorCurp(curp);
}
