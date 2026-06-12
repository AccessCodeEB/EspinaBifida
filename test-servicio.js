import { createConValidacion as crearServicio } from "./src/services/servicios.service.js";
import { getCitaById, getAllCitas } from "./src/services/citas.service.js";
import { createPool, closePool } from "./src/config/db.js";
import { config } from "dotenv";
config();

async function test() {
  await createPool();
  try {
    const citas = await getAllCitas();
    const citaId = citas[0].ID_CITA;
    const cita = await getCitaById(citaId);
    console.log("Cita from findById:", cita);
    const result = await crearServicio({
        curp: cita.CURP,
        idTipoServicio: cita.ID_TIPO_SERVICIO,
        costo: cita.COSTO != null ? Number(cita.COSTO) : 0,
        montoPagado: 0,
        notas: "Test",
        estatus: "PENDIENTE",
        referenciaId: Number(cita.ID_CITA),
        referenciaTipo: "CITA",
        fecha: cita.FECHA ? cita.FECHA.slice(0, 10) : null,
    });
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
  await closePool();
  process.exit(0);
}
test();
