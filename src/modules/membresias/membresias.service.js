import * as MembresiasModel from "./membresias.model.js";

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

export function isMembresiaActiva(fechaVigenciaFin) {
  if (!fechaVigenciaFin) return false;
  const fin =
    fechaVigenciaFin instanceof Date
      ? fechaVigenciaFin
      : parseISODate(String(fechaVigenciaFin));
  if (!fin) return false;

  const now = new Date();
  return now.getTime() <= fin.getTime();
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
    throw new Error("curp, numero_credencial y fecha_emision son obligatorios");
  }

  const beneficiario = await MembresiasModel.findBeneficiarioByCurp(curp);
  if (!beneficiario) {
    throw new Error("Beneficiario no encontrado");
  }

  const fechaEmision = parseISODate(fechaEmisionStr);
  if (!fechaEmision) {
    throw new Error("fecha_emision debe tener formato YYYY-MM-DD");
  }

  const fechaVigenciaInicio = parseISODate(
    data?.fecha_vigencia_inicio
      ? String(data.fecha_vigencia_inicio).trim()
      : fechaEmisionStr
  );
  if (!fechaVigenciaInicio) {
    throw new Error("fecha_vigencia_inicio debe tener formato YYYY-MM-DD");
  }

  const fechaVigenciaFin = addOneYearUTC(fechaEmision);

  const fechaUltimoPago = data?.fecha_ultimo_pago
    ? parseISODate(String(data.fecha_ultimo_pago).trim())
    : null;

  if (data?.fecha_ultimo_pago && !fechaUltimoPago) {
    throw new Error("fecha_ultimo_pago debe tener formato YYYY-MM-DD");
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
    throw new Error("curp es obligatorio");
  }

  const credencial = await MembresiasModel.findLastByCurp(curp);
  if (!credencial) {
    return {
      curp,
      existe: false,
      estatus: "SIN_MEMBRESIA",
      activa: false,
    };
  }

  const fechaVigenciaFin = credencial.FECHA_VIGENCIA_FIN ?? null;
  const activa = isMembresiaActiva(fechaVigenciaFin);

  return {
    curp: credencial.CURP ?? curp,
    existe: true,
    estatus: activa ? "ACTIVA" : "VENCIDA",
    activa,
    membresia: credencial,
  };
}

