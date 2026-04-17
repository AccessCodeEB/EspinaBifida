import * as MembresiasModel from "../models/membresias.model.js";
import { badRequest, conflict, notFound } from "../utils/httpErrors.js";

function parseISODate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatISODateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addOneYearUTC(date) {
  const d = new Date(date.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + 1);
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

export async function registrarMembresia(data) {
  const curp = data?.curp ? String(data.curp).trim().toUpperCase() : "";
  const numeroCredencial = data?.numero_credencial
    ? String(data.numero_credencial).trim()
    : "";

  const fechaEmisionStr = data?.fecha_emision
    ? String(data.fecha_emision).trim()
    : "";

  if (!curp || !numeroCredencial || !fechaEmisionStr) {
    throw badRequest("curp, numero_credencial y fecha_emision son obligatorios");
  }

  const beneficiario = await MembresiasModel.findBeneficiarioByCurp(curp);
  if (!beneficiario) {
    throw notFound("Beneficiario no encontrado");
  }

  const fechaEmision = parseISODate(fechaEmisionStr);
  if (!fechaEmision) {
    throw badRequest("fecha_emision debe tener formato YYYY-MM-DD");
  }

  const fechaVigenciaInicio = parseISODate(
    data?.fecha_vigencia_inicio
      ? String(data.fecha_vigencia_inicio).trim()
      : fechaEmisionStr
  );
  if (!fechaVigenciaInicio) {
    throw badRequest("fecha_vigencia_inicio debe tener formato YYYY-MM-DD");
  }

  const fechaVigenciaFin = addOneYearUTC(fechaEmision);
  const hoy = toDateOnlyUTC(new Date());

  const fechaUltimoPago = data?.fecha_ultimo_pago
    ? parseISODate(String(data.fecha_ultimo_pago).trim())
    : null;

  if (data?.fecha_ultimo_pago && !fechaUltimoPago) {
    throw badRequest("fecha_ultimo_pago debe tener formato YYYY-MM-DD");
  }

  if (fechaVigenciaInicio.getTime() > fechaVigenciaFin.getTime()) {
    throw badRequest("fecha_vigencia_inicio no puede ser mayor a fecha_vigencia_fin");
  }

  if (fechaUltimoPago && fechaUltimoPago.getTime() > hoy.getTime()) {
    throw badRequest("fecha_ultimo_pago no puede ser mayor a la fecha actual");
  }

  const hasOverlap = await MembresiasModel.hasPeriodOverlap(
    curp,
    formatISODateUTC(fechaVigenciaInicio),
    formatISODateUTC(fechaVigenciaFin)
  );

  if (hasOverlap) {
    throw conflict("Ya existe una membresia con vigencia traslapada para este CURP");
  }

  return await MembresiasModel.create({
    curp,
    numeroCredencial,
    fechaEmision: formatISODateUTC(fechaEmision),
    fechaVigenciaInicio: formatISODateUTC(fechaVigenciaInicio),
    fechaVigenciaFin: formatISODateUTC(fechaVigenciaFin),
    fechaUltimoPago: fechaUltimoPago ? formatISODateUTC(fechaUltimoPago) : null,
    observaciones: data?.observaciones ?? null,
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

