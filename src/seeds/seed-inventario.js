/**
 * Seed de inventario — uso: node src/seeds/seed-inventario.js
 *
 * Si ya hay artículos en ARTICULOS, les asigna stocks variados
 * (normal / bajo / sin stock). Si no hay ninguno, inserta artículos
 * de demo representativos de la asociación.
 */

import "dotenv/config";
import { createPool, getConnection, closePool } from "../config/db.js";

// ──────────────────────────────────────────────
// Artículos de demo a insertar si la tabla está vacía
// ──────────────────────────────────────────────
const DEMO_ARTICULOS = [
  // Con stock normal (mayoría)
  { descripcion: "Silla de ruedas plegable",       unidad: "Pieza",   cuota: 0,   stock: 18, stockMin: 3, manejaInv: "S" },
  { descripcion: "Andadera ajustable",             unidad: "Pieza",   cuota: 0,   stock: 12, stockMin: 2, manejaInv: "S" },
  { descripcion: "Colchón antiescaras",            unidad: "Pieza",   cuota: 50,  stock: 10, stockMin: 2, manejaInv: "S" },
  { descripcion: "Cateteres intermitentes (caja)", unidad: "Caja",    cuota: 120, stock: 30, stockMin: 5, manejaInv: "S" },
  { descripcion: "Pañales para adulto (paquete)",  unidad: "Paquete", cuota: 80,  stock: 25, stockMin: 5, manejaInv: "S" },
  { descripcion: "Férulas de tobillo-pie",         unidad: "Par",     cuota: 0,   stock: 9,  stockMin: 2, manejaInv: "S" },
  { descripcion: "Cojín antiescaras",              unidad: "Pieza",   cuota: 40,  stock: 14, stockMin: 3, manejaInv: "S" },
  { descripcion: "Cinturón de transferencia",      unidad: "Pieza",   cuota: 0,   stock: 8,  stockMin: 2, manejaInv: "S" },
  { descripcion: "Guantes de exploración (caja)",  unidad: "Caja",    cuota: 0,   stock: 11, stockMin: 4, manejaInv: "S" },

  // Con stock bajo (pocos — solo 2)
  { descripcion: "Bolsas de drenaje urinario",     unidad: "Pieza",   cuota: 30,  stock: 2,  stockMin: 5, manejaInv: "S" },
  { descripcion: "Crema hidratante especializada", unidad: "Frasco",  cuota: 45,  stock: 1,  stockMin: 4, manejaInv: "S" },

  // Sin stock (muy pocos — solo 1)
  { descripcion: "Bastones canadienses",           unidad: "Par",     cuota: 0,   stock: 0,  stockMin: 2, manejaInv: "S" },

  // No maneja inventario (servicios / sin stock tracking)
  { descripcion: "Consulta de fisioterapia",       unidad: "Sesión",  cuota: 150, stock: 0,  stockMin: 0, manejaInv: "N" },
  { descripcion: "Valoración médica",              unidad: "Sesión",  cuota: 0,   stock: 0,  stockMin: 0, manejaInv: "N" },
];

// Distribución de stocks cuando hay artículos existentes.
// Conteos fijos para garantizar "muy pocos" con problemas:
//   - 2 con stock bajo  (1 si el total es ≤ 4)
//   - 1 sin stock       (siempre)
//   - el resto → stock normal
function stockDistribution(total) {
  const sinStock = 1;
  const low      = total <= 4 ? 1 : 2;
  const normal   = total - sinStock - low;
  return { normal: Math.max(normal, 0), low, sinStock };
}

async function syncNotificacionesStockBajo(conn) {
  // Obtener artículos que siguen con stock bajo tras el seed
  const { rows: bajos } = await conn.execute(
    `SELECT DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
       FROM ARTICULOS
       WHERE MANEJA_INVENTARIO = 'S'
         AND NVL(ACTIVO,'S') = 'S'
         AND INVENTARIO_ACTUAL <= STOCK_MINIMO`
  );

  // Marcar todas las notificaciones STOCK_BAJO pendientes como leídas
  const { rowsAffected } = await conn.execute(
    `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE TIPO = 'STOCK_BAJO' AND ESTATUS = 'PENDIENTE'`
  );
  console.log(`  Notificaciones STOCK_BAJO antiguas limpiadas: ${rowsAffected ?? 0}`);

  // Insertar una sola notificación consolidada si aún hay artículos con stock bajo
  if (bajos.length > 0) {
    let msg;
    if (bajos.length === 1) {
      const r = bajos[0];
      msg = `Stock bajo: "${r.DESCRIPCION}" tiene ${r.INVENTARIO_ACTUAL} unidades (mínimo ${r.STOCK_MINIMO}).`;
    } else {
      const lista = bajos.map(r => `${r.DESCRIPCION} (${r.INVENTARIO_ACTUAL} uds)`).join(", ");
      msg = `${bajos.length} artículos con stock bajo: ${lista}.`;
    }
    if (msg.length > 500) msg = msg.slice(0, 497) + "...";

    await conn.execute(
      `INSERT INTO NOTIFICACIONES (TIPO, REFERENCIA_TIPO, MENSAJE)
         VALUES ('STOCK_BAJO', 'ARTICULO', :msg)`,
      { msg }
    );
    console.log(`  Nueva notificación consolidada: ${bajos.length} artículo(s) con stock bajo.`);
  } else {
    console.log("  Sin artículos con stock bajo — no se crea notificación.");
  }

  await conn.commit();
}

async function run() {
  await createPool();
  const conn = await getConnection();

  try {
    // ── 1. Obtener artículos existentes ──────────────────────────────
    const { rows: existentes } = await conn.execute(
      `SELECT ID_ARTICULO, DESCRIPCION, STOCK_MINIMO, MANEJA_INVENTARIO
         FROM ARTICULOS WHERE NVL(ACTIVO,'S') = 'S'
         ORDER BY ID_ARTICULO`
    );

    if (existentes.length === 0) {
      // ── 2a. No hay artículos → insertar demos ─────────────────────
      console.log("No se encontraron artículos. Insertando datos de demo...\n");

      // Buscar o crear una categoría genérica
      const { rows: cats } = await conn.execute(
        `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO WHERE ROWNUM = 1`
      );
      let idCat;
      if (cats.length > 0) {
        idCat = cats[0].ID_CATEGORIA;
        console.log(`  Usando categoría existente: ID_CATEGORIA = ${idCat}`);
      } else {
        await conn.execute(
          `INSERT INTO CATEGORIAS_ARTICULO (NOMBRE) VALUES ('General')`,
          {},
          { autoCommit: false }
        );
        const { rows: newCat } = await conn.execute(
          `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO WHERE ROWNUM = 1`
        );
        idCat = newCat[0].ID_CATEGORIA;
        console.log(`  Categoría 'General' creada: ID_CATEGORIA = ${idCat}`);
      }

      for (const a of DEMO_ARTICULOS) {
        await conn.execute(
          `INSERT INTO ARTICULOS (
             ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
             INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO, ACTIVO
           ) VALUES (
             SEQ_ARTICULOS.NEXTVAL, :desc, :unidad, :cuota,
             :stock, :manejaInv, :idCat, :stockMin, 'S'
           )`,
          {
            desc:      a.descripcion,
            unidad:    a.unidad,
            cuota:     a.cuota,
            stock:     a.stock,
            manejaInv: a.manejaInv,
            idCat,
            stockMin:  a.stockMin,
          }
        );
        const tag =
          a.manejaInv === "N"             ? "sin tracking" :
          a.stock === 0                   ? "SIN STOCK    " :
          a.stock < a.stockMin            ? "STOCK BAJO   " :
                                            "stock normal  ";
        console.log(`  [${tag}] ${a.descripcion} (${a.stock} ${a.unidad})`);
      }

    } else {
      // ── 2b. Ya existen artículos → actualizar stocks ───────────────
      console.log(`Se encontraron ${existentes.length} artículo(s). Actualizando stocks...\n`);

      const { normal, low, sinStock } = stockDistribution(existentes.length);

      for (let i = 0; i < existentes.length; i++) {
        const art = existentes[i];
        const minimo = Number(art.STOCK_MINIMO ?? 5);

        let nuevoStock;
        let label;

        if (i < normal) {
          // stock normal: mínimo × 3 o al menos 10
          nuevoStock = Math.max(minimo * 3, 10);
          label = "stock normal";
        } else if (i < normal + low) {
          // stock bajo: entre 1 y (mínimo - 1)
          nuevoStock = Math.max(1, minimo - 1);
          label = "STOCK BAJO";
        } else {
          // sin stock (solo los últimos `sinStock` artículos)
          nuevoStock = 0;
          label = "SIN STOCK";
        }

        if (art.MANEJA_INVENTARIO !== "S") {
          // artículos sin tracking de inventario: dejar en 0, no tocar
          label = "sin tracking — sin cambio";
          nuevoStock = 0;
        }

        await conn.execute(
          `UPDATE ARTICULOS SET INVENTARIO_ACTUAL = :stock WHERE ID_ARTICULO = :id`,
          { stock: nuevoStock, id: art.ID_ARTICULO }
        );

        console.log(
          `  [${label.padEnd(14)}] ID=${String(art.ID_ARTICULO).padEnd(4)} ` +
          `${art.DESCRIPCION.substring(0, 40).padEnd(42)} → ${nuevoStock}`
        );
      }
    }

    await conn.commit();
    console.log("\n✅ Seed de inventario completado.");

    // ── 3. Sincronizar notificaciones de stock bajo ────────────────────
    console.log("\nSincronizando notificaciones de stock bajo...");
    await syncNotificacionesStockBajo(conn);

  } catch (err) {
    await conn.rollback();
    console.error("\n❌ Error al ejecutar el seed:", err.message);
    process.exit(1);
  } finally {
    await conn.close();
    await closePool();
  }
}

run();
