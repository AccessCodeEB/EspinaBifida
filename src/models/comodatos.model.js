import oracledb from "oracledb";
import { withConnection, getConnection } from "../config/db.js";
import { toCamel } from "../utils/dbTransform.js";
import { applyMovimientoConConexion } from "./inventario.model.js";

/**
 * Devuelve lista paginada de comodatos con datos del beneficiario y artículo.
 */
export function findAll({ page = 1, limit = 20, estatus, curp } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const binds = { limit, offset };

  if (estatus) { conditions.push("c.ESTATUS = :estatus"); binds.estatus = estatus; }
  if (curp)    { conditions.push("c.CURP = :curp");       binds.curp = curp; }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT c.*,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS BENEFICIARIO,
              a.DESCRIPCION AS ARTICULO
       FROM COMODATOS c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       JOIN ARTICULOS     a ON a.ID_ARTICULO = c.ID_ARTICULO
       ${where}
       ORDER BY c.FECHA_ALTA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      binds
    );
    return rows.map(toCamel);
  });
}

/**
 * Devuelve un comodato por ID junto con su historial de pagos.
 */
export function findById(idComodato) {
  return withConnection(async (conn) => {
    const { rows: comodatos } = await conn.execute(
      `SELECT c.*,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS BENEFICIARIO,
              a.DESCRIPCION AS ARTICULO
       FROM COMODATOS c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       JOIN ARTICULOS     a ON a.ID_ARTICULO = c.ID_ARTICULO
       WHERE c.ID_COMODATO = :id`,
      { id: idComodato }
    );
    if (!comodatos.length) return null;

    const { rows: pagos } = await conn.execute(
      `SELECT * FROM COMODATOS_PAGOS
       WHERE ID_COMODATO = :id
       ORDER BY FECHA ASC`,
      { id: idComodato }
    );

    return { ...toCamel(comodatos[0]), pagos: pagos.map(toCamel) };
  });
}

/**
 * Devuelve todos los comodatos de un beneficiario.
 */
export function findByCurp(curp) {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT c.*,
              a.DESCRIPCION AS ARTICULO
       FROM COMODATOS c
       JOIN ARTICULOS a ON a.ID_ARTICULO = c.ID_ARTICULO
       WHERE c.CURP = :curp
       ORDER BY c.FECHA_ALTA DESC`,
      { curp }
    );
    return rows.map(toCamel);
  });
}

/**
 * Crea un nuevo comodato y registra la SALIDA en MOVIMIENTOS_INVENTARIO.
 * Si montoTotal es null → donación total, se crea directamente como Pagado.
 */
export async function create({ curp, idArticulo, montoTotal, notas, fechaDevolucionEsperada }) {
  const estatus = montoTotal == null ? "Pagado" : "Activo";
  const conn = await getConnection();
  try {
    // Obtener nombre del beneficiario para el motivo del movimiento
    const benefRes = await conn.execute(
      `SELECT NOMBRES || ' ' || APELLIDO_PATERNO AS NOMBRE FROM BENEFICIARIOS WHERE CURP = :curp`,
      { curp },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nombreBenef = benefRes.rows?.[0]?.NOMBRE ?? curp;

    const result = await conn.execute(
      `INSERT INTO COMODATOS (ID_COMODATO, CURP, ID_ARTICULO, MONTO_TOTAL,
                              MONTO_PAGADO, MONTO_EXENTO, ESTATUS, NOTAS,
                              FECHA_DEVOLUCION_ESPERADA)
       VALUES (SEQ_COMODATOS.NEXTVAL, :curp, :idArticulo, :montoTotal,
               0, 0, :estatus, :notas,
               :fechaDevolucionEsperada)
       RETURNING ID_COMODATO INTO :newId`,
      {
        curp,
        idArticulo,
        montoTotal: montoTotal ?? null,
        estatus,
        notas: notas ?? null,
        fechaDevolucionEsperada: fechaDevolucionEsperada ? new Date(fechaDevolucionEsperada) : null,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    const idComodato = Array.isArray(result.outBinds.newId)
      ? result.outBinds.newId[0]
      : result.outBinds.newId;

    // Registrar SALIDA en inventario
    await applyMovimientoConConexion(conn, {
      idArticulo,
      tipo: "SALIDA",
      cantidad: 1,
      motivo: `Comodato a ${nombreBenef}`,
    });

    await conn.commit();
    return { idComodato, estatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

/**
 * Actualiza solo las NOTAS de un comodato.
 * Devuelve null si no existe.
 */
export function updateNotas(idComodato, notas) {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_COMODATO, ESTATUS FROM COMODATOS WHERE ID_COMODATO = :id`,
      { id: idComodato }
    );
    if (!rows.length) return null;

    await conn.execute(
      `UPDATE COMODATOS SET NOTAS = :notas WHERE ID_COMODATO = :id`,
      { notas, id: idComodato },
      { autoCommit: true }
    );
    return toCamel(rows[0]);
  });
}

/**
 * Cancela un comodato (soft-delete → ESTATUS='Cancelado').
 * Devuelve null si no existe, o el objeto con estatus previo.
 */
export function cancel(idComodato) {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_COMODATO, ESTATUS FROM COMODATOS WHERE ID_COMODATO = :id`,
      { id: idComodato }
    );
    if (!rows.length) return null;

    await conn.execute(
      `UPDATE COMODATOS SET ESTATUS = 'Cancelado' WHERE ID_COMODATO = :id`,
      { id: idComodato },
      { autoCommit: true }
    );
    return toCamel(rows[0]);
  });
}

/**
 * Registra un pago o exención en una transacción atómica.
 * Actualiza los saldos en COMODATOS y cambia estatus a 'Pagado' si corresponde.
 *
 * Retorna:
 *   null                  — comodato no encontrado
 *   { cancelled: true }   — comodato cancelado, no se puede pagar
 *   { idPago, estatusResultante } — éxito
 */
export async function addPago(idComodato, { monto, esExento, notas }) {
  const conn = await (await import("../config/db.js")).getConnection();
  try {
    // 1) Verificar estado actual del comodato
    const { rows } = await conn.execute(
      `SELECT ID_COMODATO, MONTO_TOTAL, MONTO_PAGADO, MONTO_EXENTO, ESTATUS
       FROM COMODATOS WHERE ID_COMODATO = :id`,
      { id: idComodato }
    );
    if (!rows.length) return null;

    const com = toCamel(rows[0]);
    if (com.estatus === "Cancelado") return { cancelled: true };

    // 2) Insertar pago
    const esExentoChar = esExento ? "S" : "N";
    const result = await conn.execute(
      `INSERT INTO COMODATOS_PAGOS (ID_PAGO, ID_COMODATO, MONTO, ES_EXENTO, NOTAS)
       VALUES (SEQ_COMODATOS_PAGOS.NEXTVAL, :idComodato, :monto, :esExento, :notas)
       RETURNING ID_PAGO INTO :newId`,
      {
        idComodato,
        monto,
        esExento: esExentoChar,
        notas: notas ?? null,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );
    const idPago = Array.isArray(result.outBinds.newId)
      ? result.outBinds.newId[0]
      : result.outBinds.newId;

    // 3) Calcular nuevos saldos y estatus
    const nuevoPagado  = esExento ? com.montoPagado  : com.montoPagado  + monto;
    const nuevoExento  = esExento ? com.montoExento  + monto : com.montoExento;
    const total        = com.montoTotal;
    const liquidado    = total != null && (nuevoPagado + nuevoExento) >= total;
    const nuevoEstatus = liquidado ? "Pagado" : com.estatus;

    await conn.execute(
      `UPDATE COMODATOS
       SET MONTO_PAGADO = :pagado, MONTO_EXENTO = :exento, ESTATUS = :estatus
       WHERE ID_COMODATO = :id`,
      { pagado: nuevoPagado, exento: nuevoExento, estatus: nuevoEstatus, id: idComodato },
      { autoCommit: false }
    );

    await conn.commit();
    return { idPago, estatusResultante: nuevoEstatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

/**
 * Reporte de exenciones agrupado por beneficiario + equipo para informe de gobierno.
 */
export function getReporteExenciones({ fechaInicio, fechaFin }) {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT
         c.CURP,
         b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS BENEFICIARIO,
         a.DESCRIPCION AS EQUIPO,
         SUM(cp.MONTO)       AS TOTAL_EXENTO,
         COUNT(cp.ID_PAGO)   AS NUM_EXENCIONES
       FROM COMODATOS c
       JOIN COMODATOS_PAGOS cp ON cp.ID_COMODATO = c.ID_COMODATO
       JOIN BENEFICIARIOS   b  ON b.CURP = c.CURP
       JOIN ARTICULOS        a  ON a.ID_ARTICULO = c.ID_ARTICULO
       WHERE cp.ES_EXENTO = 'S'
         AND cp.FECHA BETWEEN TO_DATE(:fi,'YYYY-MM-DD') AND TO_DATE(:ff,'YYYY-MM-DD')
       GROUP BY c.CURP, b.NOMBRES, b.APELLIDO_PATERNO, b.APELLIDO_MATERNO, a.DESCRIPCION
       ORDER BY TOTAL_EXENTO DESC`,
      { fi: fechaInicio, ff: fechaFin }
    );
    return rows.map(toCamel);
  });
}

/**
 * Verifica si un beneficiario tiene membresía activa.
 * Retorna el registro o null.
 */
export function checkMembresiaActiva(curp) {
  return withConnection(async (conn) => {
    const { rows } = await conn.execute(
      `SELECT ID_CREDENCIAL, CURP, FECHA_VIGENCIA_FIN
       FROM CREDENCIALES
       WHERE CURP = :curp
         AND SYSDATE BETWEEN FECHA_VIGENCIA_INICIO AND FECHA_VIGENCIA_FIN
         AND ROWNUM = 1`,
      { curp }
    );
    return rows.length ? toCamel(rows[0]) : null;
  });
}
