/**
 * Seed de inventario — uso: node src/seeds/seed-inventario.js
 *
 * Si ya hay artículos en ARTICULOS:
 *   - Actualiza stocks a distribución de demo (normal/bajo/sin stock)
 *   - Corrige categorías basándose en la descripción
 * Si no hay ninguno:
 *   - Inserta artículos de demo con categorías correctas
 */

import "dotenv/config";
import { createPool, getConnection, closePool } from "../config/db.js";

// ──────────────────────────────────────────────────────────────────────────────
// Artículos de demo — campo `cat`: "equipos" | "insumos" | "medicamentos"
// ──────────────────────────────────────────────────────────────────────────────
const DEMO_ARTICULOS = [
  // Equipos Médicos — se prestan (comodatos) y se devuelven
  { descripcion: "Silla de ruedas plegable",       unidad: "Pieza",    cuota: 0,   stock: 18, stockMin: 3, manejaInv: "S", cat: "equipos" },
  { descripcion: "Andadera ajustable",             unidad: "Pieza",    cuota: 0,   stock: 12, stockMin: 2, manejaInv: "S", cat: "equipos" },
  { descripcion: "Colchón antiescaras",            unidad: "Pieza",    cuota: 50,  stock: 10, stockMin: 2, manejaInv: "S", cat: "equipos" },
  { descripcion: "Férulas de tobillo-pie",         unidad: "Par",      cuota: 0,   stock: 9,  stockMin: 2, manejaInv: "S", cat: "equipos" },
  { descripcion: "Cojín antiescaras",              unidad: "Pieza",    cuota: 40,  stock: 14, stockMin: 3, manejaInv: "S", cat: "equipos" },
  { descripcion: "Cinturón de transferencia",      unidad: "Pieza",    cuota: 0,   stock: 8,  stockMin: 2, manejaInv: "S", cat: "equipos" },
  { descripcion: "Bastones canadienses",           unidad: "Par",      cuota: 0,   stock: 0,  stockMin: 2, manejaInv: "S", cat: "equipos" },

  // Insumos Médicos — consumibles, no se devuelven
  { descripcion: "Cateteres intermitentes (caja)", unidad: "Caja",     cuota: 120, stock: 30, stockMin: 5, manejaInv: "S", cat: "insumos" },
  { descripcion: "Pañales para adulto (paquete)",  unidad: "Paquete",  cuota: 80,  stock: 25, stockMin: 5, manejaInv: "S", cat: "insumos" },
  { descripcion: "Guantes de exploración (caja)",  unidad: "Caja",     cuota: 0,   stock: 11, stockMin: 4, manejaInv: "S", cat: "insumos" },
  { descripcion: "Bolsas de drenaje urinario",     unidad: "Pieza",    cuota: 30,  stock: 2,  stockMin: 5, manejaInv: "S", cat: "insumos" },
  { descripcion: "Crema hidratante especializada", unidad: "Frasco",   cuota: 45,  stock: 1,  stockMin: 4, manejaInv: "S", cat: "insumos" },

  // Medicamentos — comunes en pacientes con espina bífida
  { descripcion: "Solución de Cloruro de Sodio 0.9% 500ml", unidad: "Frasco",  cuota: 35,  stock: 40, stockMin: 10, manejaInv: "S", cat: "medicamentos" },
  { descripcion: "Vitamina B12 1000mcg",                    unidad: "Ampolleta", cuota: 20, stock: 50, stockMin: 10, manejaInv: "S", cat: "medicamentos" },
  { descripcion: "Baclofen 10mg",                           unidad: "Tableta",  cuota: 5,   stock: 3,  stockMin: 10, manejaInv: "S", cat: "medicamentos" },
  { descripcion: "Oxibutinina 5mg",                         unidad: "Tableta",  cuota: 8,   stock: 20, stockMin: 10, manejaInv: "S", cat: "medicamentos" },
  { descripcion: "Trimetoprima/Sulfametoxazol 160/800mg",   unidad: "Tableta",  cuota: 6,   stock: 15, stockMin: 10, manejaInv: "S", cat: "medicamentos" },
];

// Palabras clave para reclasificar artículos existentes por descripción
const KEYWORDS_CATEGORIA = {
  equipos: ["silla", "andadera", "colchón", "ferula", "férula", "cojín", "cinturon", "cinturón", "baston", "bastón", "muleta", "ortesis"],
  insumos: ["cateter", "catéter", "pañal", "guante", "bolsa", "drenaje", "crema", "gasa", "vendaje", "torunda"],
  medicamentos: ["mg", "mcg", "ml", "solucion", "solución", "vitamina", "baclofen", "oxibutinina", "trimetoprima", "capsula", "cápsula", "tableta", "ampolleta", "jarabe"],
};

function detectarCategoria(descripcion) {
  const lower = descripcion.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [cat, keywords] of Object.entries(KEYWORDS_CATEGORIA)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return null;
}

function stockDistribution(total) {
  const sinStock = 1;
  const low      = total <= 4 ? 1 : 2;
  const normal   = total - sinStock - low;
  return { normal: Math.max(normal, 0), low, sinStock };
}

// Resuelve los IDs de las 3 categorías principales por nombre
async function resolverCategorias(conn) {
  const { rows } = await conn.execute(
    `SELECT ID_CATEGORIA, NOMBRE FROM CATEGORIAS_ARTICULO`
  );
  const mapa = {};
  for (const r of rows) {
    const nombre = String(r.NOMBRE ?? "").toLowerCase().trim();
    if (nombre.includes("equipo"))      mapa.equipos      = r.ID_CATEGORIA;
    if (nombre.includes("insumo"))      mapa.insumos      = r.ID_CATEGORIA;
    if (nombre.includes("medicamento")) mapa.medicamentos = r.ID_CATEGORIA;
  }

  // Crear las que falten
  for (const [key, nombreOficial] of [
    ["equipos",      "Equipos Médicos"],
    ["insumos",      "Insumos Médicos"],
    ["medicamentos", "Medicamentos"],
  ]) {
    if (!mapa[key]) {
      await conn.execute(
        `INSERT INTO CATEGORIAS_ARTICULO (NOMBRE) VALUES (:n)`,
        { n: nombreOficial }, { autoCommit: false }
      );
      const { rows: nr } = await conn.execute(
        `SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO WHERE NOMBRE = :n AND ROWNUM = 1`,
        { n: nombreOficial }
      );
      mapa[key] = nr[0].ID_CATEGORIA;
      console.log(`  Categoría '${nombreOficial}' creada: ID=${mapa[key]}`);
    }
  }

  console.log(`  Categorías → equipos:${mapa.equipos} insumos:${mapa.insumos} medicamentos:${mapa.medicamentos}`);
  return mapa;
}

async function syncNotificacionesStockBajo(conn) {
  const { rows: bajos } = await conn.execute(
    `SELECT DESCRIPCION, INVENTARIO_ACTUAL, STOCK_MINIMO
       FROM ARTICULOS
       WHERE MANEJA_INVENTARIO = 'S'
         AND NVL(ACTIVO,'S') = 'S'
         AND INVENTARIO_ACTUAL <= STOCK_MINIMO`
  );

  const { rowsAffected } = await conn.execute(
    `UPDATE NOTIFICACIONES SET ESTATUS = 'LEIDA', FECHA_LECTURA = SYSDATE
       WHERE TIPO = 'STOCK_BAJO' AND ESTATUS = 'PENDIENTE'`
  );
  console.log(`  Notificaciones STOCK_BAJO antiguas limpiadas: ${rowsAffected ?? 0}`);

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

async function insertarDemos(conn, cats) {
  console.log("No se encontraron artículos. Insertando datos de demo...\n");

  for (const a of DEMO_ARTICULOS) {
    const idCat = cats[a.cat] ?? cats.insumos;
    await conn.execute(
      `INSERT INTO ARTICULOS (
         ID_ARTICULO, DESCRIPCION, UNIDAD, CUOTA_RECUPERACION,
         INVENTARIO_ACTUAL, MANEJA_INVENTARIO, ID_CATEGORIA, STOCK_MINIMO, ACTIVO
       ) VALUES (
         SEQ_ARTICULOS.NEXTVAL, :desc, :unidad, :cuota,
         :stock, :manejaInv, :idCat, :stockMin, 'S'
       )`,
      { desc: a.descripcion, unidad: a.unidad, cuota: a.cuota, stock: a.stock, manejaInv: a.manejaInv, idCat, stockMin: a.stockMin }
    );
    let tag;
    if (a.stock === 0)        tag = "SIN STOCK    ";
    else if (a.stock < a.stockMin) tag = "STOCK BAJO   ";
    else                           tag = "stock normal ";
    console.log(`  [${tag}] [${a.cat.padEnd(12)}] ${a.descripcion}`);
  }
}

async function actualizarStocks(conn, existentes, cats) {
  console.log(`Se encontraron ${existentes.length} artículo(s). Actualizando stocks y categorías...\n`);
  const { normal, low } = stockDistribution(existentes.length);

  for (let i = 0; i < existentes.length; i++) {
    const art = existentes[i];
    const minimo = Number(art.STOCK_MINIMO ?? 5);
    let nuevoStock, label;

    if (art.MANEJA_INVENTARIO !== "S") {
      label = "sin tracking";
      nuevoStock = 0;
    } else if (i < normal) {
      nuevoStock = Math.max(minimo * 3, 10);
      label = "stock normal";
    } else if (i < normal + low) {
      nuevoStock = Math.max(1, minimo - 1);
      label = "STOCK BAJO  ";
    } else {
      nuevoStock = 0;
      label = "SIN STOCK   ";
    }

    // Detectar categoría correcta por descripción
    const catKey = detectarCategoria(art.DESCRIPCION);
    const idCat  = catKey ? cats[catKey] : null;

    await conn.execute(
      `UPDATE ARTICULOS SET INVENTARIO_ACTUAL = :stock
       ${idCat ? ", ID_CATEGORIA = :idCat" : ""}
       WHERE ID_ARTICULO = :id`,
      idCat ? { stock: nuevoStock, idCat, id: art.ID_ARTICULO }
            : { stock: nuevoStock,        id: art.ID_ARTICULO }
    );

    const catLabel = catKey ?? "sin clasificar";
    console.log(
      `  [${label.padEnd(12)}] [${catLabel.padEnd(12)}] ` +
      `${art.DESCRIPCION.substring(0, 38).padEnd(40)} → ${nuevoStock}`
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
await createPool();
const conn = await getConnection();

try {
  const cats = await resolverCategorias(conn);

  const { rows: existentes } = await conn.execute(
    `SELECT ID_ARTICULO, DESCRIPCION, STOCK_MINIMO, MANEJA_INVENTARIO, ID_CATEGORIA
       FROM ARTICULOS WHERE NVL(ACTIVO,'S') = 'S'
       ORDER BY ID_ARTICULO`
  );

  if (existentes.length === 0) {
    await insertarDemos(conn, cats);
  } else {
    await actualizarStocks(conn, existentes, cats);
  }

  await conn.commit();
  console.log("\n✅ Seed de inventario completado.");

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
