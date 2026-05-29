import { createPool, closePool, getConnection } from "./config/db.js";
import app from "./app.js";
import { runMigration001 } from "./migrations/001_foto_perfil_clob.js";
import { runMigration002 } from "./migrations/002_reportes_generados.js";
import { runMigration003 } from "./migrations/003_administradores_foto_perfil_clob.js";
import { runMigration004 } from "./migrations/004_credenciales_pago_fields.js";
import { runMigration005 } from "./migrations/005_configuracion_especialistas.js";
import { runMigration006 } from "./migrations/006_articulos_stock_minimo.js";
import { runMigration007 } from "./migrations/007_articulos_activo.js";
import { runMigration008 } from "./migrations/008_administradores_telefono.js";
import { runMigration009 } from "./migrations/009_notificaciones.js";
import { runMigration010 } from "./migrations/010_fix_sequences.js";
import { runMigration011 } from "./migrations/011_refresh_tokens.js";
import { runMigration012 } from "./migrations/012_auditoria_operaciones.js";
import { runMigration013 } from "./migrations/013_trazabilidad_oracle.js";
import { initScheduler }  from "./utils/reporteScheduler.js";
import { initNotificacionesScheduler } from "./utils/notificacionesScheduler.js";

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

// Start listening immediately so /health is available before Oracle connects
const server = app.listen(Number(PORT), () =>
  console.log(`Server running on port ${PORT}`)
);

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recibido — cerrando servidor...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

async function initOracle() {
  await createPool();
  // Verificar conectividad real antes de correr migraciones
  const probe = await getConnection();
  await probe.close();
  await runMigration001();
  await runMigration002();
  await runMigration003();
  await runMigration004();
  await runMigration005();
  await runMigration006();
  await runMigration007();
  await runMigration008();
  await runMigration009();
  await runMigration010();
  await runMigration011();
  await runMigration012();
  await runMigration013();
  initScheduler();
  initNotificacionesScheduler();
}

// Connect to Oracle and run migrations asynchronously after the server is up.
// Reintenta hasta 3 veces con 20s de espera entre intentos para tolerar arranques
// lentos o conectividad transitoriamente no disponible al inicio del proceso.
(async () => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 20_000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await initOracle();
      console.log("[db] Oracle listo y migraciones aplicadas");
      return;
    } catch (err) {
      console.error(`[db] Intento ${attempt}/${MAX_RETRIES} falló: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`[db] Reintentando en ${RETRY_DELAY / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }
    }
  }
  console.error("[db] No se pudo inicializar Oracle después de todos los intentos");
  // In test environments keep the server alive so /health and e2e setup remain reachable
  if (process.env.NODE_ENV !== "test") process.exit(1);
})();
