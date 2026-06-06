import { createPool, withConnection, closePool } from "./src/config/db.js";
import dotenv from "dotenv";
dotenv.config();
async function main() {
  await createPool();
  await withConnection(async (conn) => {
    const r = await conn.execute("SELECT ID_CITA FROM CITAS WHERE TO_NUMBER(TO_CHAR(FECHA, 'HH24')) >= 17");
    console.log("Citas >= 17:00 :", r.rows);
    if (r.rows.length > 0) {
      const ids = r.rows.map(x => x.ID_CITA).join(',');
      const d = await conn.execute(`DELETE FROM CITAS WHERE ID_CITA IN (${ids})`);
      await conn.commit();
      console.log(`Deleted ${d.rowsAffected} citas.`);
    }
  });
  await closePool();
}
main().catch(console.error);
