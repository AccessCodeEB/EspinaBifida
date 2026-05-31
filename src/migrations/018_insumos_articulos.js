import { getConnection } from "../config/db.js";

const INSUMOS = [
  "Pañales talla chica",
  "Pañales talla mediana",
  "Pañales talla grande",
  "Pañales talla extra grande",
  "Catéter intermitente 12 Fr",
  "Catéter intermitente 14 Fr",
  "Catéter Foley 14 Fr",
  "Catéter Foley 16 Fr",
  "Bolsa colectora de orina",
  "Guantes de látex talla S (caja)",
  "Guantes de látex talla M (caja)",
  "Guantes de látex talla L (caja)",
  "Gasas estériles (paquete)",
  "Vendaje elástico 5cm",
  "Crema barrera/protectora",
];

export async function runMigration018() {
  let conn;
  try {
    conn = await getConnection();

    // Obtener ID de categoría "Insumos Médicos"
    const { rows: cats } = await conn.execute(
      `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
       WHERE UPPER(NOMBRE) LIKE '%INSUMO%' AND ROWNUM = 1`
    );
    const idCategoria = cats[0]?.ID_CATEGORIA ?? cats[0]?.[0];
    if (!idCategoria) {
      console.log("[migration-018] Sin categoría 'Insumos Médicos' — omitiendo.");
      return;
    }

    let insertados = 0;
    for (const descripcion of INSUMOS) {
      const { rows: existe } = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM ARTICULOS
         WHERE UPPER(DESCRIPCION) = UPPER(:descripcion)`,
        { descripcion }
      );
      const cnt = Number(existe[0]?.CNT ?? existe[0]?.[0] ?? 0);
      if (cnt > 0) continue;

      await conn.execute(
        `INSERT INTO ARTICULOS
           (DESCRIPCION, UNIDAD, CUOTA_RECUPERACION, INVENTARIO_ACTUAL,
            MANEJA_INVENTARIO, STOCK_MINIMO, ACTIVO, ID_CATEGORIA)
         VALUES
           (:descripcion, 'PZA', 0, 0, 'S', 5, 'S', :cat)`,
        { descripcion, cat: idCategoria },
        { autoCommit: true }
      );
      insertados++;
    }

    console.log(`[migration-018] ✅ ${insertados} artículo(s) de insumos insertados.`);
  } catch (err) {
    console.error("[migration-018] ❌ Error:", err?.message ?? err);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
