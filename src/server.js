import "dotenv/config";
import { createPool, closePool } from "./config/db.js";
import app from "./app.js";

const REQUIRED_ENV = [
  "DB_USER",
  "DB_PASSWORD",
  "DB_CONNECTION_STRING",
  "ORACLE_CLIENT_PATH",
  "JWT_SECRET",
];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`ERROR: Variables de entorno faltantes: ${missing.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT ?? "3000";

createPool()
  .then(() => {
    const server = app.listen(Number(PORT), () =>
      console.log(`Server running on port ${PORT}`)
    );

    const shutdown = (signal) => {
      console.log(`${signal} recibido — cerrando servidor...`);
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("ERROR: No se pudo conectar a la base de datos:", err.message);
    process.exit(1);
  });
