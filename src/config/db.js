import oracledb from "oracledb";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

process.env.TNS_ADMIN = path.join(process.cwd(), "wallet");

// 👇 IMPORTANTE
if (!process.env.ORACLE_CLIENT_PATH) {
  throw new Error("Missing ORACLE_CLIENT_PATH in .env");
}

oracledb.initOracleClient({
  libDir: process.env.ORACLE_CLIENT_PATH
});

export async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING
  });
}

