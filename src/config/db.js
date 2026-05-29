import oracledb from "oracledb";
import fs from "fs";
import path from "path";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// CLOB/NCLOB como string (NOTAS, etc.). Si no, node-oracledb devuelve un Lob y
// Express/React pueden exponer un objeto interno y romper el renderizado.
oracledb.fetchAsString = [oracledb.CLOB, oracledb.NCLOB];

let _pool = null;

export async function createPool() {
  if (_pool) return; // idempotente

  const walletRoot = path.join(process.cwd(), "wallet");
  const nestedWallet = path.join(walletRoot, "wallet");
  const walletDir = fs.existsSync(path.join(nestedWallet, "tnsnames.ora"))
    ? nestedWallet
    : walletRoot;

  const thickMode = !!process.env.ORACLE_CLIENT_PATH;

  if (thickMode) {
    // Modo grueso: requiere Oracle Instant Client (desarrollo local en Windows/Mac)
    process.env.TNS_ADMIN = walletDir;

    // Oracle Instant Client no resuelve '?/network/admin' (no hay $ORACLE_HOME).
    // Actualizamos sqlnet.ora para que DIRECTORY apunte al directorio real del wallet.
    const sqlnetPath = path.join(walletDir, "sqlnet.ora");
    if (fs.existsSync(sqlnetPath)) {
      const original = fs.readFileSync(sqlnetPath, "utf8");
      const walletDirNorm = walletDir.replace(/\\/g, "/");
      const fixed = original.replace(/DIRECTORY="[^"]*"/g, `DIRECTORY="${walletDirNorm}"`);
      if (fixed !== original) {
        fs.writeFileSync(sqlnetPath, fixed, "utf8");
        console.log(`[db] sqlnet.ora actualizado: DIRECTORY="${walletDirNorm}"`);
      }
    }

    oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
    console.log("[db] Modo: thick (Oracle Instant Client)");
  } else {
    // Modo thin: sin Oracle Instant Client, funciona en cualquier servidor Linux/cloud.
    // oracledb v6+ lee TNS_ADMIN / configDir para resolver aliases del tnsnames.ora
    // y walletLocation para los certificados TLS del Oracle Cloud wallet.
    console.log("[db] Modo: thin (sin Oracle Instant Client)");
  }

  // poolMin:0 → el pool se crea sin conexiones inmediatas; la conectividad real
  // se verifica de forma lazy (primer getConnection()). Esto evita que createPool()
  // falle si Oracle tarda en responder al inicio del servidor.
  _pool = await oracledb.createPool({
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    // Thin mode: apunta al directorio del wallet para resolver tnsnames.ora y TLS
    ...(!thickMode && {
      configDir:      walletDir,
      walletLocation: walletDir,
    }),
    poolMin:       0,
    poolMax:       10,
    poolIncrement: 1,
    poolTimeout:   60,
  });
}

export async function getConnection() {
  if (!_pool) throw new Error("DB pool no inicializado — llama createPool() al arrancar");
  return _pool.getConnection();
}

export async function closePool() {
  if (!_pool) return;
  const pool = _pool;
  _pool = null; // marcar como cerrado antes del await para evitar doble cierre
  try {
    await pool.close(10); // drainTime = 10s
  } catch (err) {
    // NJS-064: pool ya estaba cerrándose (doble señal SIGINT/SIGTERM) — ignorar
    if (err?.code !== "NJS-064") throw err;
  }
}

/**
 * Ejecuta fn(conn) con una conexión del pool, garantizando conn.close() al terminar.
 * Usar para operaciones simples sin rollback. Para transacciones con rollback,
 * manejar la conexión manualmente.
 */
export async function withConnection(fn) {
  const conn = await getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}
