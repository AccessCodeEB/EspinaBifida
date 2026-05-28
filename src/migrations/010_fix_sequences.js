import { getConnection } from "../config/db.js";

/**
 * Avanza secuencias de Oracle para que estén por encima del MAX(PK) de cada tabla.
 * Esto evita ORA-00001 cuando la secuencia quedó por debajo del valor máximo existente.
 * Idempotente y seguro de ejecutar en cualquier momento.
 */
export async function runMigration010() {
  let conn;
  try {
    conn = await getConnection();

    const sequences = [
      { seq: "SEQ_ARTICULOS",   table: "ARTICULOS",           pk: "ID_ARTICULO" },
      { seq: "SEQ_CITAS",       table: "CITAS",               pk: "ID_CITA" },
      { seq: "SEQ_SERVICIOS",   table: "SERVICIOS",           pk: "ID_SERVICIO" },
      { seq: "SEQ_MOV_INV",     table: "MOVIMIENTOS_INVENTARIO", pk: "ID_MOVIMIENTO" },
      { seq: "SEQ_CREDENCIALES",table: "CREDENCIALES",        pk: "ID_CREDENCIAL" },
    ];

    for (const { seq, table, pk } of sequences) {
      try {
        // Get current max PK value
        const maxRes = await conn.execute(
          `SELECT NVL(MAX(${pk}), 0) AS MAX_ID FROM ${table}`
        );
        const maxId = Number(maxRes.rows[0].MAX_ID ?? maxRes.rows[0][0] ?? 0);

        // Get current NEXTVAL (advances sequence by 1)
        const seqRes = await conn.execute(`SELECT ${seq}.NEXTVAL AS CURR FROM DUAL`);
        const currVal = Number(seqRes.rows[0].CURR ?? seqRes.rows[0][0] ?? 0);

        if (currVal <= maxId) {
          const diff = maxId - currVal + 10;
          await conn.execute(`ALTER SEQUENCE ${seq} INCREMENT BY ${diff}`);
          await conn.execute(`SELECT ${seq}.NEXTVAL FROM DUAL`);
          await conn.execute(`ALTER SEQUENCE ${seq} INCREMENT BY 1`);
          console.log(`[migration-010] ✅ ${seq} avanzada a ${maxId + 10} (era ${currVal}, max en tabla: ${maxId})`);
        } else {
          console.log(`[migration-010] ${seq} OK (currVal=${currVal}, maxId=${maxId})`);
        }

        await conn.commit();
      } catch (seqErr) {
        // Sequence might not exist — skip silently
        if (!/ORA-02289|ORA-01403/.test(String(seqErr.message))) {
          console.warn(`[migration-010] ⚠️ Error con ${seq}: ${seqErr.message}`);
        }
      }
    }
  } finally {
    if (conn) await conn.close();
  }
}
