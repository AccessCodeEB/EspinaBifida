import { withConnection } from "../config/db.js";
import { notFound } from "../utils/httpErrors.js";

// ── Queries de detección (usadas por el job) ──────────────────────────────────

export const findArticulosConStockBajo = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
       FROM ARTICULOS
       WHERE MANEJA_INVENTARIO = 'S'
         AND INVENTARIO_ACTUAL <= STOCK_MINIMO`
    ).then(r => r.rows)
  );

export const findMembresiasProximas = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              c.FECHA_VIGENCIA_FIN,
              TRUNC(c.FECHA_VIGENCIA_FIN) - TRUNC(SYSDATE) AS DIAS_RESTANTES
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE c.ID_CREDENCIAL = (
         SELECT MAX(c2.ID_CREDENCIAL) FROM CREDENCIALES c2 WHERE c2.CURP = c.CURP
       )
         AND TRUNC(c.FECHA_VIGENCIA_FIN) - TRUNC(SYSDATE) BETWEEN 0 AND 15
         AND TRUNC(c.FECHA_VIGENCIA_FIN) >= TRUNC(SYSDATE)`
    ).then(r => r.rows)
  );

export const findMembresiasVencidas = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT c.CURP,
              b.NOMBRES || ' ' || b.APELLIDO_PATERNO AS NOMBRE,
              c.FECHA_VIGENCIA_FIN
       FROM CREDENCIALES c
       JOIN BENEFICIARIOS b ON b.CURP = c.CURP
       WHERE c.ID_CREDENCIAL = (
         SELECT MAX(c2.ID_CREDENCIAL) FROM CREDENCIALES c2 WHERE c2.CURP = c.CURP
       )
         AND TRUNC(c.FECHA_VIGENCIA_FIN) < TRUNC(SYSDATE)`
    ).then(r => r.rows)
  );

export const findAll = (limit = 100) =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_NOTIFICACION, TIPO, ESTATUS, REFERENCIA_ID, REFERENCIA_TIPO,
              CURP, MENSAJE, FECHA_CREACION, FECHA_LECTURA
       FROM NOTIFICACIONES
       ORDER BY FECHA_CREACION DESC
       FETCH FIRST :limit ROWS ONLY`,
      { limit }
    ).then(r => r.rows)
  );

export const findPendientes = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT ID_NOTIFICACION, TIPO, ESTATUS, REFERENCIA_ID, REFERENCIA_TIPO,
              CURP, MENSAJE, FECHA_CREACION, FECHA_LECTURA
       FROM NOTIFICACIONES
       WHERE ESTATUS = 'PENDIENTE'
       ORDER BY FECHA_CREACION DESC`
    ).then(r => r.rows)
  );

export const countPendientes = () =>
  withConnection(conn =>
    conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM NOTIFICACIONES WHERE ESTATUS = 'PENDIENTE'`
    ).then(r => Number(r.rows[0].TOTAL))
  );

export const markAsRead = (id) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT ID_NOTIFICACION FROM NOTIFICACIONES WHERE ID_NOTIFICACION = :id`,
      { id }
    );
    if (!rows.length) throw notFound("Notificación no encontrada", "NOTIFICACION_NOT_FOUND");

    await conn.execute(
      `UPDATE NOTIFICACIONES
       SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE ID_NOTIFICACION = :id`,
      { id }
    );
    await conn.commit();
  });

export const markAllAsRead = () =>
  withConnection(async conn => {
    await conn.execute(
      `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE ESTATUS = 'PENDIENTE'`
    );
    await conn.commit();
  });

/**
 * Sincroniza la notificación consolidada de stock bajo.
 * Marca todas las STOCK_BAJO PENDIENTE como leídas (incluye las antiguas por artículo),
 * luego inserta una sola notificación consolidada si se provee mensaje.
 * Pasar mensaje=null solo limpia las existentes (cuando no hay artículos con stock bajo).
 */
export const syncStockBajoConsolidado = (mensaje) =>
  withConnection(async conn => {
    await conn.execute(
      `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE TIPO = 'STOCK_BAJO' AND ESTATUS = 'PENDIENTE'`
    );
    if (mensaje) {
      await conn.execute(
        `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('STOCK_BAJO', 'ARTICULO', :msg)`,
        { msg: mensaje }
      );
    }
    await conn.commit();
  });

export const insertPreregistroNuevo = (curp, nombre) =>
  withConnection(async conn => {
    const msg = `Nuevo pre-registro de ${nombre} (CURP: ${curp}). Pendiente de revisión.`;
    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, CURP, REFERENCIA_TIPO, MENSAJE)
       VALUES ('PREREGISTRO_NUEVO', :curp, 'BENEFICIARIO', :msg)`,
      { curp, msg }
    );
    await conn.commit();
  });

/**
 * Crea notificación de membresía solo si no existe una PENDIENTE del mismo tipo para esa CURP.
 * Idempotente por (TIPO, CURP, ESTATUS='PENDIENTE').
 */
export const upsertMembresia = (curp, tipo, mensaje) =>
  withConnection(async conn => {
    const { rows } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM NOTIFICACIONES
       WHERE TIPO = :tipo AND CURP = :curp AND ESTATUS = 'PENDIENTE'`,
      { tipo, curp }
    );
    if (Number(rows[0].CNT) > 0) return;

    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, CURP, REFERENCIA_TIPO, MENSAJE)
       VALUES (:tipo, :curp, 'CREDENCIAL', :msg)`,
      { tipo, curp, msg: mensaje }
    );
    await conn.commit();
  });
