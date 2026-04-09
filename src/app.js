import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Importar rutas para carpeta de modulos
import { errorHandler } from "./middleware/errorHandler.js";
import beneficiariosRoutes from "./modules/beneficiarios/beneficiarios.routes.js";
import serviciosRoutes from "./modules/servicios/servicios.routes.js";
import articulosRoutes from "./modules/inventario/articulos.routes.js";
import citasRoutes from "./modules/citas/citas.routes.js";
import membresiasRoutes from "./modules/membresias/membresias.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/beneficiarios", beneficiariosRoutes);
app.use("/servicios", serviciosRoutes);
app.use("/articulos", articulosRoutes);
app.use("/citas", citasRoutes);
app.use("/membresias", membresiasRoutes);

app.use(errorHandler);

export default app;