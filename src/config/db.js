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
  process.env.TNS_ADMIN = fs.existsSync(path.join(nestedWallet, "tnsnames.ora"))
    ? nestedWallet
    : walletRoot;
  oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });

  _pool = await oracledb.createPool({
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin:       2,
    poolMax:       10,
    poolIncrement: 1,
  });
}

export async function getConnection() {
  if (!_pool) throw new Error("DB pool no inicializado — llama createPool() al arrancar");
  return _pool.getConnection();
}

export async function closePool() {
  if (_pool) {
    await _pool.close(10); // drainTime = 10s
    _pool = null;
  }
}
