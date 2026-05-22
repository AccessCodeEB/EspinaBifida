import cron from "node-cron";
import { runJob } from "../services/notificaciones.service.js";

export function initNotificacionesScheduler() {
  // Corre a las 2am todos los días
  cron.schedule("0 2 * * *", async () => {
    console.log("[notificaciones-scheduler] Iniciando job de notificaciones...");
    try {
      await runJob();
    } catch (err) {
      console.error("[notificaciones-scheduler] Error en job:", err);
    }
  });
  console.log("[notificaciones-scheduler] Activado (0 2 * * *)");
}
