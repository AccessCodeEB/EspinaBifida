import { getConnection } from "../config/db.js";

// Keywords para clasificar artículos existentes por descripción
const REGLAS = [
  {
    cat: "Equipos Médicos",
    keywords: ["silla", "andadera", "ferula", "férula", "baston", "bastón",
               "muleta", "ortesis", "cinturon", "cinturón", "colchon", "colchón",
               "cojin", "cojín", "caminador", "andador", "faja"],
  },
  {
    cat: "Insumos Médicos",
    keywords: ["cateter", "catéter", "pañal", "panal", "guante", "bolsa",
               "drenaje", "crema", "gasa", "vendaje", "torunda", "jeringa",
               "aguja", "alcohol", "curacion", "curación"],
  },
  {
    cat: "Medicamentos",
    keywords: ["mg", "mcg", "ml", "solucion", "solución", "vitamina",
               "baclofen", "oxibutinina", "trimetoprima", "capsula", "cápsula",
               "tableta", "ampolleta", "jarabe", "comprimido", "suspension"],
  },
];

export async function runMigration016() {
  let conn;
  try {
    conn = await getConnection();

    // Obtener IDs de categorías por nombre
    const { rows: cats } = await conn.execute(
      `SELECT ID_CATEGORIA, NOMBRE FROM CATEGORIAS_ARTICULO`
    );
    const catMap = {};
    for (const r of cats) {
      const n = String(r.NOMBRE ?? "").toLowerCase();
      if (n.includes("equipo"))      catMap.equipos      = r.ID_CATEGORIA;
      if (n.includes("insumo"))      catMap.insumos      = r.ID_CATEGORIA;
      if (n.includes("medicamento")) catMap.medicamentos = r.ID_CATEGORIA;
    }

    if (!catMap.equipos && !catMap.insumos && !catMap.medicamentos) {
      console.log("[migration-015] Sin categorías definidas — omitiendo.");
      return;
    }

    // Obtener artículos activos
    const { rows: articulos } = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, ID_CATEGORIA
       FROM ARTICULOS WHERE NVL(ACTIVO,'S') = 'S'`
    );

    let actualizados = 0;
    for (const art of articulos) {
      const desc = String(art.DESCRIPCION ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

      let idCatNueva = null;
      for (const regla of REGLAS) {
        if (regla.keywords.some(k => desc.includes(k))) {
          if      (regla.cat === "Equipos Médicos")  idCatNueva = catMap.equipos;
          else if (regla.cat === "Insumos Médicos")  idCatNueva = catMap.insumos;
          else if (regla.cat === "Medicamentos")     idCatNueva = catMap.medicamentos;
          break;
        }
      }

      // Solo actualizar si hay una categoría detectada y es diferente a la actual
      if (idCatNueva && art.ID_CATEGORIA !== idCatNueva) {
        await conn.execute(
          `UPDATE ARTICULOS SET ID_CATEGORIA = :cat WHERE ID_ARTICULO = :id`,
          { cat: idCatNueva, id: art.ID_ARTICULO },
          { autoCommit: false }
        );
        actualizados++;
      }
    }

    await conn.commit();
    console.log(`[migration-015] ✅ ${actualizados} artículo(s) categorizados por descripción.`);
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("[migration-015] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
