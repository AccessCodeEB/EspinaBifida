import oracledb from "oracledb";
import { getConnection, withConnection } from "../config/db.js";
import { applyMovimientoConConexion } from "./inventario.model.js";
import { internal } from "../utils/httpErrors.js";

export const findAll = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT s.ID_SERVICIO,
              s.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO || ' ' || NVL(b.APELLIDO_MATERNO,'') AS NOMBRE_BENEFICIARIO,
              NVL(cat.NOMBRE, 'Servicio ' || s.ID_TIPO_SERVICIO) AS TIPO_SERVICIO,
              s.FECHA,
              s.COSTO,
              s.MONTO_PAGADO,
              s.NOTAS,
              NVL(s.ESTATUS, 'COMPLETADO') AS ESTATUS_SERVICIO,
              NVL(b.ESTATUS, 'Activo') AS ESTATUS_BENEFICIARIO,
              (SELECT a.DESCRIPCION
               FROM SERVICIO_ARTICULOS sa
               JOIN ARTICULOS a ON a.ID_ARTICULO = sa.ID_ARTICULO
               WHERE sa.ID_SERVICIO = s.ID_SERVICIO
               AND ROWNUM = 1) AS ARTICULO_ENTREGADO,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = s.CURP
                    AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                    AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) > 30
                ) THEN 'Activa'
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = s.CURP
                    AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                    AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) <= 30
                ) THEN 'Por vencer'
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = s.CURP
                ) THEN 'Vencida'
                ELSE 'Sin membresia'
              END AS MEMBRESIA_ESTATUS
       FROM SERVICIOS s
       LEFT JOIN BENEFICIARIOS b ON b.CURP = s.CURP
       LEFT JOIN SERVICIOS_CATALOGO cat ON cat.ID_TIPO_SERVICIO = s.ID_TIPO_SERVICIO
       ORDER BY s.FECHA DESC`
    ).then(r => r.rows)
  );

// Validar que beneficiario existe y está activo
export const findBeneficiarioActivo = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ESTATUS, NOMBRES, APELLIDO_PATERNO
       FROM BENEFICIARIOS
       WHERE CURP = :curp`,
      { curp }
    ).then(r => r.rows[0] ?? null)
  );

// Validar beneficiario activo y membresía vigente en una sola consulta atómica.
// Evita la ventana TOCTOU que existe cuando se hacen dos llamadas separadas.
export const findBeneficiarioActivoConMembresia = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT b.ESTATUS, b.NOMBRES, b.APELLIDO_PATERNO,
              c.ID_CREDENCIAL, c.NUMERO_CREDENCIAL
       FROM BENEFICIARIOS b
       LEFT JOIN CREDENCIALES c
         ON c.CURP = b.CURP
        AND SYSDATE BETWEEN c.FECHA_VIGENCIA_INICIO AND c.FECHA_VIGENCIA_FIN
       WHERE b.CURP = :curp`,
      { curp }
    ).then(r => r.rows[0] ?? null)
  );

// Obtener todos los servicios de un beneficiario
export const findByCurp = (curp) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS
       WHERE CURP = :curp
       ORDER BY FECHA DESC`,
      { curp }
    ).then(r => r.rows)
  );

// Obtener servicios de un beneficiario (con paginación opcional)
export const findByCurpPaginated = (curp, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return withConnection(conn =>
    conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS
       WHERE CURP = :curp
       ORDER BY FECHA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { curp, offset, limit }
    ).then(r => r.rows)
  );
};

export async function create(data) {
  return withConnection(async conn => {
    // Use the Oracle sequence (atomic, no race condition under concurrency)
    const idResult = await conn.execute(
      `SELECT SEQ_SERVICIOS.NEXTVAL AS NEXT_ID FROM DUAL`
    );

    const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? 0);

    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      throw internal("No se pudo generar ID_SERVICIO");
    }

    const fechaSQL = data.fechaDevolucionEsperada
      ? `TO_DATE(:fechaDevolucion, 'YYYY-MM-DD')`
      : `NULL`;
    const insertBinds = {
      idServicio,
      curp:           data.curp,
      idTipoServicio: data.idTipoServicio,
      costo:          data.costo,
      montoPagado:    data.montoPagado,
      referenciaId:   data.referenciaId,
      referenciaTipo: data.referenciaTipo,
      notas:          data.notas,
      estatus:        data.estatus ?? "COMPLETADO",
    };
    if (data.fechaDevolucionEsperada) insertBinds.fechaDevolucion = data.fechaDevolucionEsperada;

    await conn.execute(
      `INSERT INTO SERVICIOS (
         ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS, ESTATUS, FECHA_DEVOLUCION_ESPERADA
       ) VALUES (
         :idServicio, :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas, :estatus, ${fechaSQL}
       )`,
      insertBinds,
      { autoCommit: true }
    );

    return idServicio;
  });
}

function normalizeConsumoMotivo(consumo, idServicio) {
  if (consumo.motivo) return consumo.motivo;
  return `Consumo por servicio ${idServicio}`;
}

export async function createWithInventarioTransaction(data, consumos) {
  const conn = await getConnection();
  try {
    // 1. Obtener ID_SERVICIO de la secuencia (igual que create() — no dependemos del trigger TRG_SERVICIOS_BI)
    const idResult = await conn.execute(
      `SELECT SEQ_SERVICIOS.NEXTVAL AS NEXT_ID FROM DUAL`
    );
    const idServicio = Number(idResult.rows?.[0]?.NEXT_ID ?? idResult.rows?.[0]?.[0] ?? 0);
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      throw internal("No se pudo generar ID_SERVICIO");
    }
    console.log(`[createWithInventario] STEP 1: idServicio=${idServicio}`);

    // 2. INSERT directo en SERVICIOS (mismo patrón que create(), sin SP)
    const fechaSQL = data.fechaDevolucionEsperada
      ? `TO_DATE(:fechaDevolucion, 'YYYY-MM-DD')`
      : `NULL`;
    const insertBinds = {
      idServicio,
      curp:           data.curp,
      idTipoServicio: data.idTipoServicio,
      costo:          data.costo,
      montoPagado:    data.montoPagado,
      referenciaId:   data.referenciaId   ?? null,
      referenciaTipo: data.referenciaTipo  ?? null,
      notas:          data.notas           ?? null,
      estatus:        data.estatus         ?? "COMPLETADO",
    };
    if (data.fechaDevolucionEsperada) insertBinds.fechaDevolucion = data.fechaDevolucionEsperada;

    await conn.execute(
      `INSERT INTO SERVICIOS (
         ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO,
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS, ESTATUS, FECHA_DEVOLUCION_ESPERADA
       ) VALUES (
         :idServicio, :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas, :estatus, ${fechaSQL}
       )`,
      insertBinds
    );
    console.log(`[createWithInventario] STEP 2: SERVICIOS insert OK`);

    // 3. Procesar consumos: movimiento de inventario + SERVICIO_ARTICULOS con ID explícito
    for (const consumo of consumos) {
      await applyMovimientoConConexion(conn, {
        idArticulo: consumo.idProducto,
        tipo:       "SALIDA",
        cantidad:   consumo.cantidad,
        motivo:     normalizeConsumoMotivo(consumo, idServicio),
      });
      console.log(`[createWithInventario] STEP 3a: movimiento inventario OK (artículo ${consumo.idProducto})`);

      const idSaResult = await conn.execute(
        `SELECT SEQ_SERVICIO_ARTICULOS.NEXTVAL AS NEXT_ID FROM DUAL`
      );
      const idSA = Number(idSaResult.rows?.[0]?.NEXT_ID ?? idSaResult.rows?.[0]?.[0] ?? 0);
      await conn.execute(
        `INSERT INTO SERVICIO_ARTICULOS (ID, ID_SERVICIO, ID_ARTICULO, CANTIDAD)
         VALUES (:id, :idServicio, :idArticulo, :cantidad)`,
        { id: idSA, idServicio, idArticulo: consumo.idProducto, cantidad: consumo.cantidad }
      );
      console.log(`[createWithInventario] STEP 3b: SERVICIO_ARTICULOS OK (id=${idSA})`);
    }

    await conn.commit();
    console.log("[createWithInventario] commit OK");
    return { idServicio };
  } catch (err) {
    console.error("[createWithInventario] ERROR:", err?.message ?? err);
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

/* istanbul ignore next */
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

/* istanbul ignore next */
function getHistorialDetalles(data) {
  return `Servicio tipo ${data.idTipoServicio} creado; costo=${data.costo}; montoPagado=${data.montoPagado}`;
}

export async function createWithHistorialTransaction(data) {
  return create(data);
}

// Obtener servicio por ID
export const findById = (idServicio) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO,
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS
       WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    ).then(r => r.rows[0] ?? null)
  );

// Actualizar servicio
export const update = (idServicio, data) =>
  withConnection(conn =>
    conn.execute(
      `UPDATE SERVICIOS SET
         MONTO_PAGADO = :montoPagado,
         NOTAS = :notas
       WHERE ID_SERVICIO = :idServicio`,
      { ...data, idServicio },
      { autoCommit: true }
    )
  );

// Eliminar servicio
export async function deleteById(idServicio) {
  const conn = await getConnection();
  try {
    // 1. Obtener artículos consumidos para revertir inventario
    const { rows: consumos } = await conn.execute(
      `SELECT ID_ARTICULO, CANTIDAD
         FROM SERVICIO_ARTICULOS
        WHERE ID_SERVICIO = :idServicio`,
      { idServicio },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 2. Revertir cada descuento de inventario (ENTRADA)
    for (const consumo of consumos) {
      await applyMovimientoConConexion(conn, {
        idArticulo: consumo.ID_ARTICULO,
        tipo: 'ENTRADA',
        cantidad: consumo.CANTIDAD,
        motivo: `Reversa por eliminación de servicio ID: ${idServicio}`,
      });
    }

    // 3. Eliminar artículos del servicio y luego el servicio
    await conn.execute(
      `DELETE FROM SERVICIO_ARTICULOS WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    );
    await conn.execute(
      `DELETE FROM SERVICIOS WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

