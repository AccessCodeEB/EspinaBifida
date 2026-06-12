import { updateCita } from "./src/services/citas.service.js";
import { getCitaById, getAllCitas } from "./src/services/citas.service.js";
import { createPool, closePool } from "./src/config/db.js";
import { config } from "dotenv";
config();

async function test() {
  await createPool();
  try {
    // Find a pending cita
    const citas = await getAllCitas();
    const pendingCitas = citas.filter(c => c.ESTATUS !== 'COMPLETADA' && c.ESTATUS !== 'CANCELADA');
    if (pendingCitas.length === 0) {
      console.log("No pending citas found");
    } else {
      const cita = pendingCitas[0];
      console.log("Found pending cita:", cita);
      
      const result = await updateCita(cita.ID_CITA, { estatus: "COMPLETADA" });
      console.log("Update result:", result);
    }
  } catch (err) {
    console.error("Error:", err);
  }
  await closePool();
  process.exit(0);
}
test();
