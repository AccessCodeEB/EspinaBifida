import { getConnection } from "./db.js";

export async function executeQuery(sql, params = []) {
  const connection = await getConnection();

  try {
    const result = await connection.execute(sql, params, {
      autoCommit: true
    });
    return result.rows;
  } finally {
    await connection.close();
  }
}