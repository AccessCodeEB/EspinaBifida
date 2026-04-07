import { getConnection } from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  try {
    const conn = await getConnection();

    const result = await conn.execute(`SELECT 1 FROM dual`);

    console.log("✅ DB OK:", result.rows);

    await conn.close();
  } catch (err) {
    console.error("❌ ERROR:", err);
  }
}

test();