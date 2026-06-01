import { getConnection } from "../config/db.js";

/**
 * Migración 024:
 * Limpieza de artículos mal clasificados en ARTICULOS:
 *
 * 1. Desactiva artículos que son estudios de laboratorio/diagnóstico o servicios
 *    (no son ítems físicos de inventario).
 * 2. Desactiva artículos administrativos (aportaciones, credenciales, tarjetas, etc.)
 * 3. Reasigna artículos físicos sin categoría a la categoría correcta según keywords
 *    (Medicamentos, Insumos Médicos, Equipos Médicos).
 * 4. Elimina la categoría "Servicios y Estudios" de CATEGORIAS_ARTICULO ya que
 *    no tiene sentido en inventario físico.
 *
 * Los estudios/consultas quedan cubiertos por "Estudio médico" y "Consulta médica"
 * en SERVICIOS_CATALOGO (IDs 1 y 2).
 */
export async function runMigration024() {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Desactivar artículos que son estudios / diagnósticos ──────────────
    const estudiosKeywords = [
      '%BIOMETRÍA%', '%BIOMETRIA%',
      '%CISTOGRAMA%', '%GAMAGRAMA%',
      '%UROCULTIVO%', '%URIANALISIS%', '%URIANÁLISIS%',
      '%CREATININA%', '%ECO VIAS%', '%ECO VÍAS%',
      '%HOLTER%', '%PERFIL BIOQUIMICO%', '%PERFIL BIOQUÍMICO%',
      '%PERFIL DE LIPIDOS%', '%PÉRFIL DE LIPIDOS%',
      '%RESONANCIA%', '%TAC SIMPLE%', '%TAC CONTRASTADO%',
      '%URODINAMICO%', '%URODINÁMICO%', '%VIDEOURODINAMIA%',
      '%UROTAC%', '%TIEMPO DE COAGULACION%', '%TIEMPO DE COAGULACIÓN%',
      '%TIEMPO DE PROTROMBINA%', '%TIEMPO DE SANGRADO%',
      '%TIEMPO DE TROMBOPLASTINA%', '%ELECTROLITOS SERICOS%', '%ELECTROLITOS SÉRICOS%',
      '%DEPURACION DE CREATININA%', '%DEPURACIÓN DE CREATININA%',
      '%ESTUDIOS MEDICOS%', '%ESTUDIOS UROLÓGICOS%', '%ESTUDIOS UROLOGICOS%',
      '%SEDACION%', '%SEDACIÓN%', '%SERVICIO PODOLOG%',
      '%CISTOGRAMA DE LLENADO%', '%CISTOGRAMA MICCIONAL%',
      '%GAMAGRAMA RENAL%', '%VITAMINA D MOREIRA%',
    ];

    let totalEstudios = 0;
    for (const kw of estudiosKeywords) {
      const { rowsAffected } = await conn.execute(
        `UPDATE ARTICULOS SET ACTIVO = 'N'
         WHERE UPPER(DESCRIPCION) LIKE :kw
           AND NVL(ACTIVO, 'S') != 'N'`,
        { kw }
      );
      totalEstudios += rowsAffected ?? 0;
    }
    console.log(`[migration-024] ✅ ${totalEstudios} artículos de estudios/diagnóstico desactivados.`);

    // ── 2. Desactivar artículos administrativos (no son físicos) ─────────────
    const adminKeywords = [
      '%APORTACIONES%',
      '%CREDENCIALES  REGISTRO%', '%CREDENCIALES RENOVACI%',
      '%BRIGADA DE LENTES%',
      '%TARJETA DE CITAS%',
    ];

    let totalAdmin = 0;
    for (const kw of adminKeywords) {
      const { rowsAffected } = await conn.execute(
        `UPDATE ARTICULOS SET ACTIVO = 'N'
         WHERE UPPER(DESCRIPCION) LIKE :kw
           AND NVL(ACTIVO, 'S') != 'N'`,
        { kw }
      );
      totalAdmin += rowsAffected ?? 0;
    }
    console.log(`[migration-024] ✅ ${totalAdmin} artículos administrativos desactivados.`);

    await conn.commit();

    // ── 3. Reclasificar físicos sin categoría ─────────────────────────────────
    // Obtener IDs de las 3 categorías físicas
    const { rows: cats } = await conn.execute(
      `SELECT ID_CATEGORIA, UPPER(NOMBRE) AS NOMBRE FROM CATEGORIAS_ARTICULO
       WHERE UPPER(NOMBRE) IN ('MEDICAMENTOS','INSUMOS MÉDICOS','INSUMOS MEDICOS','EQUIPOS MÉDICOS','EQUIPOS MEDICOS')`
    );

    const catMap = {};
    for (const row of cats) {
      const n = row.NOMBRE ?? row[1];
      const id = row.ID_CATEGORIA ?? row[0];
      if (n.includes('MEDICAMENT')) catMap.medicamentos = id;
      if (n.includes('INSUMO')) catMap.insumos = id;
      if (n.includes('EQUIPO')) catMap.equipos = id;
    }

    if (catMap.medicamentos && catMap.insumos && catMap.equipos) {
      // Equipos (sillas, andaderas, mesas, cojines, corsettes, ferulas, estimuladores)
      const equiposKw = [
        '%SILLA DE RUEDAS%','%ANDADERA%','%ANDADOR%','%MESA DE BIPEDESTACI%',
        '%COJIN%','%COLCHON%','%CORSETTE%','%FERULA%','%FERULAS%',
        '%ESTIMULADOR%','%ASIENTO PARA BANO%','%ASIENTO PARA BAÑO%',
        '%TABLA DESLIZADORA%','%TABLAS DESLIZADORAS%','%BAUMANOMETRO%','%BAUMANÓMETRO%',
        '%PORTACELULAR%','%PORTAVASOS%','%FUNDA%','%UNICAMAS%','%CUBRECAMAS%',
        '%KITS HEMODIALISIS%','%KITS HEMODIÁLISIS%',
      ];
      for (const kw of equiposKw) {
        await conn.execute(
          `UPDATE ARTICULOS SET ID_CATEGORIA = :cat
           WHERE UPPER(DESCRIPCION) LIKE :kw AND NVL(ACTIVO,'S') = 'S'
             AND (ID_CATEGORIA IS NULL OR ID_CATEGORIA = (
               SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
               WHERE UPPER(NOMBRE) LIKE '%SERVICIO%' AND ROWNUM = 1))`,
          { cat: catMap.equipos, kw }
        );
      }

      // Insumos (catéteres, sondas, gasas, guantes, pañales, gel, cintas, jeringas, bolsas, vendajes)
      const insumosKw = [
        '%CATETER%','%CATÉTER%','%SONDA%','%GASA%','%GUANTE%','%PANAL%','%PAÑAL%',
        '%GEL LUBRICANTE%','%JALEA LUBRICANTE%','%CINTA MICROPORE%','%CINTA TRANSPORE%',
        '%JERINGA%','%BOLSA COLECTORA%','%FRASCO PARA CATETER%','%MINI SPIKE%',
        '%VENDAJE%','%ELECTRODOS%','%INTRASITE%','%CUBRECAMAS LAMBY%',
      ];
      for (const kw of insumosKw) {
        await conn.execute(
          `UPDATE ARTICULOS SET ID_CATEGORIA = :cat
           WHERE UPPER(DESCRIPCION) LIKE :kw AND NVL(ACTIVO,'S') = 'S'
             AND (ID_CATEGORIA IS NULL OR ID_CATEGORIA = (
               SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
               WHERE UPPER(NOMBRE) LIKE '%SERVICIO%' AND ROWNUM = 1))`,
          { cat: catMap.insumos, kw }
        );
      }

      // Lo que queda sin categoría válida → Medicamentos (la mayoría son fármacos)
      await conn.execute(
        `UPDATE ARTICULOS SET ID_CATEGORIA = :cat
         WHERE NVL(ACTIVO,'S') = 'S'
           AND (ID_CATEGORIA IS NULL OR ID_CATEGORIA = (
             SELECT ID_CATEGORIA FROM CATEGORIAS_ARTICULO
             WHERE UPPER(NOMBRE) LIKE '%SERVICIO%' AND ROWNUM = 1))`,
        { cat: catMap.medicamentos }
      );

      console.log("[migration-024] ✅ Artículos físicos reclasificados en Medicamentos/Insumos/Equipos.");
    } else {
      console.log("[migration-024] ⚠️  No se encontraron las 3 categorías físicas — reclasificación omitida.");
    }

    await conn.commit();

    // ── 4. Eliminar categoría "Servicios y Estudios" ──────────────────────────
    await conn.execute(
      `UPDATE CATEGORIAS_ARTICULO SET ACTIVO = 0
       WHERE UPPER(NOMBRE) LIKE '%SERVICIOS Y ESTUDIOS%'`
    ).catch(() => {
      // Si no tiene columna ACTIVO, intentar DELETE directo
      return conn.execute(
        `DELETE FROM CATEGORIAS_ARTICULO
         WHERE UPPER(NOMBRE) LIKE '%SERVICIOS Y ESTUDIOS%'
           AND NOT EXISTS (
             SELECT 1 FROM ARTICULOS
             WHERE ARTICULOS.ID_CATEGORIA = CATEGORIAS_ARTICULO.ID_CATEGORIA
               AND NVL(ARTICULOS.ACTIVO,'S') = 'S'
           )`
      );
    });

    await conn.commit();
    console.log("[migration-024] ✅ Categoría 'Servicios y Estudios' eliminada.");

  } catch (err) {
    console.error("[migration-024] ❌ Error:", err.message);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
