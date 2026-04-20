import { getConnection } from "../config/db.js";
import { applyMovimientoConConexion } from "./inventario.model.js";

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT s.ID_SERVICIO,
              s.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO,
              NVL(cat.NOMBRE, 'Servicio ' || s.ID_TIPO_SERVICIO) AS TIPO_SERVICIO,
              s.FECHA,
              s.COSTO,
              s.MONTO_PAGADO,
              s.NOTAS,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = s.CURP
                    AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                ) THEN 'Activa'
                ELSE 'Vencida'
              END AS MEMBRESIA_ESTATUS
       FROM SERVICIOS s
       LEFT JOIN BENEFICIARIOS b ON b.CURP = s.CURP
       LEFT JOIN SERVICIOS_CATALOGO cat ON cat.ID_TIPO_SERVICIO = s.ID_TIPO_SERVICIO
       ORDER BY s.FECHA DESC`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Validar que beneficiario existe y está activo
export async function findBeneficiarioActivo(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ESTATUS, NOMBRES, APELLIDO_PATERNO
       FROM BENEFICIARIOS 
       WHERE CURP = :curp`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

// Obtener todos los servicios de un beneficiario
export async function findByCurp(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE CURP = :curp
       ORDER BY FECHA DESC`,
      { curp }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Obtener servicios de un beneficiario (con paginación opcional)
export async function findByCurpPaginated(curp, page = 1, limit = 10) {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE CURP = :curp
       ORDER BY FECHA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { curp, offset, limit }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function create(data) {
  const conn = await getConnection();
  try {
    const idResult = await conn.execute(
      `SELECT NVL(MAX(ID_SERVICIO), 0) + 1 AS NEXT_ID
       FROM SERVICIOS`
    );

    const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);

    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      throw new Error("No se pudo generar ID_SERVICIO");
    }

    await conn.execute(
      `INSERT INTO SERVICIOS (
         ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       ) VALUES (
         :idServicio, :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas
       )`,
      {
        idServicio,
        curp: data.curp,
        idTipoServicio: data.idTipoServicio,
        costo: data.costo,
        montoPagado: data.montoPagado,
        referenciaId: data.referenciaId,
        referenciaTipo: data.referenciaTipo,
        notas: data.notas,
      },
      { autoCommit: true }
    );

    return idServicio;
  } finally {
    await conn.close();
  }
}

function normalizeConsumoMotivo(consumo, idServicio) {
  if (consumo.motivo) return consumo.motivo;
  return `Consumo por servicio ${idServicio}`;
}

export async function createWithInventarioTransaction(data, consumos) {
  const conn = await getConnection();
  try {
    const idResult = await conn.execute(
      `SELECT NVL(MAX(ID_SERVICIO), 0) + 1 AS NEXT_ID
       FROM SERVICIOS`
    );

    const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      throw new Error("No se pudo generar ID_SERVICIO");
    }

    await conn.execute(
      `INSERT INTO SERVICIOS (
         ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       ) VALUES (
         :idServicio, :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas
       )`,
      {
        idServicio,
        curp: data.curp,
        idTipoServicio: data.idTipoServicio,
        costo: data.costo,
        montoPagado: data.montoPagado,
        referenciaId: data.referenciaId,
        referenciaTipo: data.referenciaTipo,
        notas: data.notas,
      }
    );

    for (const consumo of consumos) {
      await applyMovimientoConConexion(conn, {
        idArticulo: consumo.idProducto,
        tipo: "SALIDA",
        cantidad: consumo.cantidad,
        motivo: normalizeConsumoMotivo(consumo, idServicio),
      });
    }

    await conn.commit();

    return { idServicio };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

function normalizeDetailedFilters(filters = {}) {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 10);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 10;

  return {
    curp: filters.curp ?? null,
    idTipoServicio:
      filters.idTipoServicio !== undefined && filters.idTipoServicio !== null
        ? Number(filters.idTipoServicio)
        : null,
    fechaDesde: filters.fechaDesde ?? null,
    fechaHasta: filters.fechaHasta ?? null,
    costoMin:
      filters.costoMin !== undefined && filters.costoMin !== null
        ? Number(filters.costoMin)
        : null,
    costoMax:
      filters.costoMax !== undefined && filters.costoMax !== null
        ? Number(filters.costoMax)
        : null,
    montoPagadoMin:
      filters.montoPagadoMin !== undefined && filters.montoPagadoMin !== null
        ? Number(filters.montoPagadoMin)
        : null,
    montoPagadoMax:
      filters.montoPagadoMax !== undefined && filters.montoPagadoMax !== null
        ? Number(filters.montoPagadoMax)
        : null,
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

export async function findDetailed(filters = {}) {
  const conn = await getConnection();
  try {
    const normalized = normalizeDetailedFilters(filters);

    const baseBinds = {
      curp: normalized.curp,
      idTipoServicio: normalized.idTipoServicio,
      fechaDesde: normalized.fechaDesde,
      fechaHasta: normalized.fechaHasta,
      costoMin: normalized.costoMin,
      costoMax: normalized.costoMax,
      montoPagadoMin: normalized.montoPagadoMin,
      montoPagadoMax: normalized.montoPagadoMax,
    };

    const rowsBinds = {
      ...baseBinds,
      offset: normalized.offset,
      limit: normalized.limit,
    };

    const whereClause = `
      WHERE (:curp IS NULL OR s.CURP = :curp)
        AND (:idTipoServicio IS NULL OR s.ID_TIPO_SERVICIO = :idTipoServicio)
        AND (:fechaDesde IS NULL OR s.FECHA >= TO_DATE(:fechaDesde, 'YYYY-MM-DD'))
        AND (:fechaHasta IS NULL OR s.FECHA < TO_DATE(:fechaHasta, 'YYYY-MM-DD') + 1)
        AND (:costoMin IS NULL OR s.COSTO >= :costoMin)
        AND (:costoMax IS NULL OR s.COSTO <= :costoMax)
        AND (:montoPagadoMin IS NULL OR s.MONTO_PAGADO >= :montoPagadoMin)
        AND (:montoPagadoMax IS NULL OR s.MONTO_PAGADO <= :montoPagadoMax)
    `;

    const rowsResult = await conn.execute(
      `SELECT
         s.ID_SERVICIO,
         s.CURP,
         s.ID_TIPO_SERVICIO,
         c.NOMBRE AS TIPO_SERVICIO,
         s.FECHA,
         s.COSTO,
         s.MONTO_PAGADO,
         s.REFERENCIA_ID,
         s.REFERENCIA_TIPO,
         s.NOTAS
       FROM SERVICIOS s
       LEFT JOIN SERVICIOS_CATALOGO c
         ON c.ID_TIPO_SERVICIO = s.ID_TIPO_SERVICIO
       ${whereClause}
       ORDER BY s.FECHA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      rowsBinds
    );

    const totalResult = await conn.execute(
      `SELECT COUNT(1) AS TOTAL
       FROM SERVICIOS s
       ${whereClause}`,
      baseBinds
    );

    return {
      page: normalized.page,
      limit: normalized.limit,
      total: Number(totalResult.rows?.[0]?.TOTAL ?? 0),
      data: rowsResult.rows,
    };
  } finally {
    await conn.close();
  }
}

function getHistorialDetalles(data) {
  return `Servicio tipo ${data.idTipoServicio} creado; costo=${data.costo}; montoPagado=${data.montoPagado}`;
}

export async function createWithHistorialTransaction(data) {
  return create(data);
}

// Obtener servicio por ID
export async function findById(idServicio) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

// Actualizar servicio
export async function update(idServicio, data) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE SERVICIOS SET
         MONTO_PAGADO = :montoPagado,
         NOTAS = :notas
       WHERE ID_SERVICIO = :idServicio`,
      { ...data, idServicio },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

// Eliminar servicio
export async function deleteById(idServicio) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM SERVICIOS 
       WHERE ID_SERVICIO = :idServicio`,
      { idServicio },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}
