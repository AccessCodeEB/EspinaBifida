import { getConnection } from "../config/db.js";

export async function runMigration014() {
  let conn;
  try {
    conn = await getConnection();

    // ── Consolidar todas las variantes de "Insumos*" en "Insumos Médicos" ──────
    // 1. Asegurarse de que exista exactamente una fila con el nombre canónico
    const { rows: canonRows } = await conn.execute(
      `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
       WHERE NOMBRE = 'Insumos Médicos' AND ROWNUM = 1`
    );

    let canonId;
    if (canonRows.length === 0) {
      // No existe canónica — tomar la primera variante y renombrarla
      const { rows: anyInsumos } = await conn.execute(
        `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
         WHERE UPPER(NOMBRE) LIKE 'INSUMOS%' AND ROWNUM = 1`
      );
      if (anyInsumos.length > 0) {
        canonId = anyInsumos[0].ID_CATEGORIA;
        await conn.execute(
          `UPDATE CATEGORIAS_ARTICULO SET NOMBRE = 'Insumos Médicos' WHERE ID_CATEGORIA = :id`,
          { id: canonId }, { autoCommit: false }
        );
        console.log(`[migration-013] Renombrada variante ID=${canonId} → 'Insumos Médicos'`);
      } else {
        // No existe ninguna variante — insertar
        await conn.execute(
          `INSERT INTO CATEGORIAS_ARTICULO (NOMBRE) VALUES ('Insumos Médicos')`,
          {}, { autoCommit: false }
        );
        const { rows: newRow } = await conn.execute(
          `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO WHERE NOMBRE = 'Insumos Médicos' AND ROWNUM = 1`
        );
        canonId = newRow[0].ID_CATEGORIA;
        console.log(`[migration-013] ✅ 'Insumos Médicos' creada con ID=${canonId}`);
      }
    } else {
      canonId = canonRows[0].ID_CATEGORIA;
      console.log(`[migration-013] 'Insumos Médicos' ya existe con ID=${canonId}`);
    }

    // 2. Reasignar artículos de cualquier variante duplicada al ID canónico
    await conn.execute(
      `UPDATE ARTICULOS SET ID_CATEGORIA = :canonId
       WHERE ID_CATEGORIA IN (
         SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
         WHERE UPPER(NOMBRE) LIKE 'INSUMOS%' AND ID_CATEGORIA <> :canonId
       )`,
      { canonId }, { autoCommit: false }
    );

    // 3. Eliminar las variantes duplicadas
    const { rowsAffected } = await conn.execute(
      `DELETE FROM CATEGORIAS_ARTICULO
       WHERE UPPER(NOMBRE) LIKE 'INSUMOS%' AND ID_CATEGORIA <> :canonId`,
      { canonId }, { autoCommit: false }
    );
    if (rowsAffected > 0)
      console.log(`[migration-013] 🗑 ${rowsAffected} categoría(s) duplicada(s) de Insumos eliminada(s).`);

    // ── Insertar las demás categorías si no existen ───────────────────────────
    const categoriasAInsertar = ["Medicamentos", "Equipos Médicos"];

    for (const nombre of categoriasAInsertar) {
      const { rows } = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CATEGORIAS_ARTICULO WHERE UPPER(NOMBRE) = UPPER(:nombre)`,
        { nombre }
      );
      const count = Number(rows[0].CNT ?? rows[0][0]);
      if (count === 0) {
        await conn.execute(
          `INSERT INTO CATEGORIAS_ARTICULO (NOMBRE) VALUES (:nombre)`,
          { nombre },
          { autoCommit: false }
        );
        console.log(`[migration-013] ✅ Categoría '${nombre}' creada.`);
      } else {
        console.log(`[migration-013] Categoría '${nombre}' ya existe.`);
      }
    }

    await conn.commit();
    console.log("[migration-013] Categorías de inventario sincronizadas.");
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("[migration-013] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
