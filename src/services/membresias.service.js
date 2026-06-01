import * as MembresiasModel from "../models/membresias.model.js";
import { badRequest, notFound } from "../utils/httpErrors.js";
import { parseISODate } from "../utils/validators.js";

const MONTO_NUEVO_INGRESO = 200;
const MONTO_REINSCRIPCION = 150;

function formatISODateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* istanbul ignore next */
function addMonthsUTC(date, n = 1) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

function toDateOnlyUTC(dateLike) {
  const source = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(source.getTime())) return null;
  return new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate())
  );
}

export function isMembresiaActiva(fechaVigenciaFin) {
  if (!fechaVigenciaFin) return false;
  const fin = toDateOnlyUTC(fechaVigenciaFin);
  if (!fin) return false;

  const now = toDateOnlyUTC(new Date());
  return now.getTime() <= fin.getTime();
}

function mapMembresiaPublica(credencial) {
  if (!credencial) return null;
  const toISO = (value) => {
    const date = toDateOnlyUTC(value);
    return date ? formatISODateUTC(date) : null;
  };

  return {
    id_credencial: credencial.ID_CREDENCIAL ?? null,
    curp: credencial.CURP ?? null,
    numero_credencial: credencial.NUMERO_CREDENCIAL ?? null,
    fecha_emision: toISO(credencial.FECHA_EMISION),
    fecha_vigencia_inicio: toISO(credencial.FECHA_VIGENCIA_INICIO),
    fecha_vigencia_fin: toISO(credencial.FECHA_VIGENCIA_FIN),
    fecha_ultimo_pago: toISO(credencial.FECHA_ULTIMO_PAGO),
    observaciones: credencial.OBSERVACIONES ?? null,
  };
}

export async function getAll() {
  return MembresiasModel.findAll();
}

export async function syncEstados() {
  await MembresiasModel.syncEstados();
}

export async function getPagosRecientes() {
  return MembresiasModel.findPagosRecientes();
}

export async function validarMembresiaActivaPorCurp(curpParam) {
  const curp = curpParam ? String(curpParam).trim().toUpperCase() : "";
  if (!curp) {
    throw badRequest("curp es obligatorio");
  }

  const credencialActiva = await MembresiasModel.findMembresiaActivaByCurp(curp);

  if (!credencialActiva) {
    await MembresiasModel.setBeneficiarioInactivo(curp);
  }

  return {
    curp,
    activa: Boolean(credencialActiva),
    estatus: credencialActiva ? "ACTIVA" : "VENCIDA",
    membresia: mapMembresiaPublica(credencialActiva),
  };
}

function parsarFechasMembresia(data, hoy, hoyStr, fechaEmisionStr) {
  const fechaEmision = parseISODate(fechaEmisionStr);
  /* istanbul ignore next 3 */
  if (!fechaEmision) {
    throw badRequest("fecha_emision debe tener formato YYYY-MM-DD");
  }

  const fechaVigenciaInicio = parseISODate(
    data?.fecha_vigencia_inicio
      ? String(data.fecha_vigencia_inicio).trim()
      : fechaEmisionStr
  );
  /* istanbul ignore next 3 */
  if (!fechaVigenciaInicio) {
    throw badRequest("fecha_vigencia_inicio debe tener formato YYYY-MM-DD");
  }

  const fechaUltimoPago = data?.fecha_ultimo_pago
    ? parseISODate(String(data.fecha_ultimo_pago).trim())
    : hoy;

  /* istanbul ignore next 3 */
  if (data?.fecha_ultimo_pago && !fechaUltimoPago) {
    throw badRequest("fecha_ultimo_pago debe tener formato YYYY-MM-DD");
  }

  if (fechaUltimoPago && fechaUltimoPago.getTime() > hoy.getTime()) {
    throw badRequest("fecha_ultimo_pago no puede ser mayor a la fecha actual");
  }

  return { fechaEmision, fechaVigenciaInicio, fechaUltimoPago };
}

function validarMontoYMetodo(data) {
  let monto;
  if (data?.monto != null) {
    monto = Number(data.monto);
  } else {
    monto = data?.tipo === "reinscripcion" ? MONTO_REINSCRIPCION : MONTO_NUEVO_INGRESO;
  }
  if (Number.isNaN(monto) || monto < 0) {
    throw badRequest("monto debe ser un número positivo");
  }

  const metodoPago = data?.metodo_pago ?? data?.metodoPago ?? null;
  const validMetodos = ["efectivo", "transferencia", "tarjeta", null, undefined];
  if (!validMetodos.includes(metodoPago)) {
    throw badRequest("metodo_pago inválido. Use: efectivo, transferencia, tarjeta");
  }

  return { monto, metodoPago };
}

export async function registrarMembresia(data) {
  const curp = data?.curp ? String(data.curp).trim().toUpperCase() : "";
  if (!curp) {
    throw badRequest("curp es obligatorio");
  }

  const hoy    = toDateOnlyUTC(new Date());
  const hoyStr = formatISODateUTC(hoy);

  // Número de credencial: auto-generado si no se provee
  const numeroCredencial = data?.numero_credencial
    ? String(data.numero_credencial).trim()
    : `CRED-${curp.slice(0, 4)}-${hoyStr.replaceAll("-", "").slice(0, 8)}`;

  // Fecha de emisión: hoy por defecto
  const fechaEmisionStr = data?.fecha_emision
    ? String(data.fecha_emision).trim()
    : hoyStr;

  const beneficiario = await MembresiasModel.findBeneficiarioByCurp(curp);
  if (!beneficiario) {
    throw notFound("Beneficiario no encontrado");
  }

  const { fechaEmision, fechaVigenciaInicio, fechaUltimoPago } =
    parsarFechasMembresia(data, hoy, hoyStr, fechaEmisionStr);

  // Vigencia: siempre 1 año (membresía anual)
  const fechaVigenciaFin = addMonthsUTC(fechaVigenciaInicio, 12);

  const { monto, metodoPago } = validarMontoYMetodo(data);
  const referencia = data?.referencia ?? null;

  return await MembresiasModel.create({
    curp,
    numeroCredencial,
    fechaEmision: formatISODateUTC(fechaEmision),
    fechaVigenciaInicio: formatISODateUTC(fechaVigenciaInicio),
    fechaVigenciaFin: formatISODateUTC(fechaVigenciaFin),
    fechaUltimoPago: /* istanbul ignore next */ fechaUltimoPago ? formatISODateUTC(fechaUltimoPago) : null,
    observaciones: data?.observaciones ?? null,
    monto,
    metodoPago,
    referencia,
  });
}

export async function getEstatusMembresia(curpParam) {
  const curp = curpParam ? String(curpParam).trim().toUpperCase() : "";
  if (!curp) {
    throw badRequest("curp es obligatorio");
  }

  const credencial = await MembresiasModel.findLastByCurp(curp);
  if (!credencial) {
    await MembresiasModel.setBeneficiarioInactivo(curp);
    return {
      curp,
      existe: false,
      estatus: "SIN_MEMBRESIA",
      activa: false,
      membresia: null,
    };
  }

  const fechaVigenciaFin = credencial.FECHA_VIGENCIA_FIN ?? null;
  const activa = isMembresiaActiva(fechaVigenciaFin);

  if (!activa) {
    await MembresiasModel.setBeneficiarioInactivo(curp);
  }

  return {
    curp: credencial.CURP ?? curp,
    existe: true,
    estatus: activa ? "ACTIVA" : "VENCIDA",
    activa,
    membresia: mapMembresiaPublica(credencial),
  };
}
