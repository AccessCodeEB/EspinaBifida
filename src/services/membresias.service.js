import * as MembresiasModel from "../models/membresias.model.js";
import * as ServiciosModel from "../models/servicios.model.js";
import { withConnection } from "../config/db.js";
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

function validarMontoYMetodo(data, tipo, anios = 1) {
  const montoBase = tipo === "reinscripcion" ? MONTO_REINSCRIPCION : MONTO_NUEVO_INGRESO;
  let monto;
  if (data?.monto == null) {
    monto = anios * montoBase;
  } else {
    monto = Number(data.monto);
  }
  if (Number.isNaN(monto) || monto < 0) {
    throw badRequest("monto debe ser un número positivo");
  }

  const metodoPago = data?.metodo_pago ?? data?.metodoPago ?? null;
  const validMetodos = ["efectivo", "transferencia"];
  if (!validMetodos.includes(metodoPago)) {
    throw badRequest("metodo_pago es obligatorio. Use: efectivo, transferencia");
  }

  return { monto, metodoPago };
}

async function determinarTipoMembresia(tipo, curp) {
  if (tipo === "reinscripcion" || tipo === "nuevo_ingreso") return tipo;
  const count = await MembresiasModel.countCredencialesByCurp(curp);
  return count > 0 ? "reinscripcion" : "nuevo_ingreso";
}

async function getIdTipoServicioMembresia() {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_TIPO_SERVICIO FROM SERVICIOS_CATALOGO
       WHERE UPPER(NOMBRE) = UPPER('Membresía Anual')
         AND ROWNUM = 1`
    );
    return rows[0]?.ID_TIPO_SERVICIO ?? null;
  });
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

  // Tipo: si no se provee, se determina automáticamente por historial en BD
  const tipoFinal = await determinarTipoMembresia(data?.tipo, curp);

  const { fechaEmision, fechaVigenciaInicio, fechaUltimoPago } =
    parsarFechasMembresia(data, hoy, hoyStr, fechaEmisionStr);

  // Vigencia: anios × 12 meses (por defecto 1 año)
  const anios = Math.max(1, Math.round(Number(data?.anios ?? 1)) || 1);
  const fechaVigenciaFin = addMonthsUTC(fechaVigenciaInicio, anios * 12);

  const { monto, metodoPago } = validarMontoYMetodo(data, tipoFinal, anios);
  const referencia = data?.referencia ?? null;

  const result = await MembresiasModel.create({
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

  // Registrar la membresía también como servicio para que aparezca en Servicios Registrados
  const idCredencial = result?.outBinds?.id_out ?? null;
  const idTipoServicio = await getIdTipoServicioMembresia().catch(() => null);

  if (idTipoServicio) {
    const etiquetaTipo = tipoFinal === "nuevo_ingreso" ? "Nuevo ingreso" : "Re-inscripción";
    const notasServicio = [
      etiquetaTipo,
      `${anios} año${anios > 1 ? "s" : ""}`,
      data?.observaciones ? data.observaciones : null,
    ].filter(Boolean).join(" · ");

    await ServiciosModel.create({
      curp,
      idTipoServicio,
      costo:         monto,
      montoPagado:   monto,
      referenciaId:  idCredencial,
      referenciaTipo: "MEMBRESIA",
      notas:         notasServicio,
      estatus:       "COMPLETADO",
    }).catch((err) => {
      // No bloquear el registro de membresía si falla la inserción del servicio
      console.error("[membresias] No se pudo crear el servicio vinculado:", err.message);
    });
  }

  return result;
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
