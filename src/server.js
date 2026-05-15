import { createPool, closePool } from "./config/db.js";
import app from "./app.js";
import { runMigration001 } from "./migrations/001_foto_perfil_clob.js";
import { runMigration002 } from "./migrations/002_reportes_generados.js";
import { runMigration003 } from "./migrations/003_administradores_foto_perfil_clob.js";
import { runMigration004 } from "./migrations/004_credenciales_pago_fields.js";
import { runMigration006 } from "./migrations/006_articulos_stock_minimo.js";
import { initScheduler }  from "./utils/reporteScheduler.js";

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
  .then(async () => {
    await runMigration001();
    await runMigration002();
    await runMigration003();
    await runMigration004();
    await runMigration006();
    initScheduler();
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
