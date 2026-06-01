import oracledb from "oracledb";
import { getConnection } from "../config/db.js";

/**
 * Migración 014 — Categoría "Servicios y Estudios" + reasignación de artículos sin categoría.
 *
 * Parte 1: Inserta la categoría "Servicios y Estudios" si no existe.
 * Parte 2: Actualiza los artículos con ID_CATEGORIA = NULL asignándolos
 *          a la categoría recién creada (o la ya existente).
 *          Lupita puede reclasificar artículos individuales desde el panel de inventario.
 *
 * Idempotente: verifica existencia antes de insertar/actualizar.
 */
export async function runMigration020() {
  let conn;
  try {
    conn = await getConnection();

    // ── Parte 1: crear categoría "Servicios y Estudios" si no existe ──────────
    const { rows: existing } = await conn.execute(
      `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
        WHERE UPPER(NOMBRE) = 'SERVICIOS Y ESTUDIOS'`
    );

    let idCategoriaServicios;

    if (existing.length > 0) {
      idCategoriaServicios = existing[0].ID_CATEGORIA;
      console.log(
        `[migration-014] Categoría "Servicios y Estudios" ya existe (ID=${idCategoriaServicios}).`
      );
    } else {
      const result = await conn.execute(
        `INSERT INTO CATEGORIAS_ARTICULO (ID_CATEGORIA, NOMBRE, DESCRIPCION)
         VALUES (SEQ_CATEGORIAS_ARTICULO.NEXTVAL, 'Servicios y Estudios',
                 'Consultas médicas, terapias, estudios de laboratorio y diagnóstico')
         RETURNING ID_CATEGORIA INTO :newId`,
        {
          newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );
      idCategoriaServicios = Array.isArray(result.outBinds.newId)
        ? result.outBinds.newId[0]
        : result.outBinds.newId;
      console.log(
        `[migration-014] ✅ Categoría "Servicios y Estudios" creada (ID=${idCategoriaServicios}).`
      );
    }

    // ── Parte 2: reasignar artículos sin categoría ────────────────────────────
    const { rows: sinCategoria } = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM ARTICULOS WHERE ID_CATEGORIA IS NULL`
    );
    const cnt = Number(sinCategoria[0].CNT);

    if (cnt > 0) {
      await conn.execute(
        `UPDATE ARTICULOS SET ID_CATEGORIA = :idCat WHERE ID_CATEGORIA IS NULL`,
        { idCat: idCategoriaServicios }
      );
      console.log(
        `[migration-014] ✅ ${cnt} artículo(s) sin categoría asignados a "Servicios y Estudios".`
      );
    } else {
      console.log("[migration-014] No hay artículos sin categoría — nada que actualizar.");
    }

    await conn.commit();
  } finally {
    if (conn) await conn.close();
  }
}
