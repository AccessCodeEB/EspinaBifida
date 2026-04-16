import oracledb from "oracledb";
import path from "path";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let _pool = null;

export async function createPool() {
  if (_pool) return; // idempotente

  process.env.TNS_ADMIN = path.join(process.cwd(), "wallet");
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
