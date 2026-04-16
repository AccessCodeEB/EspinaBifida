import express, { Router } from "express";
import cors from "cors";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import beneficiariosRoutes   from "./routes/beneficiarios.routes.js";
import serviciosRoutes       from "./routes/servicios.routes.js";
import articulosRoutes       from "./routes/articulos.routes.js";
import citasRoutes           from "./routes/citas.routes.js";
import membresiasRoutes      from "./routes/membresias.routes.js";
import inventarioRoutes      from "./routes/inventario.routes.js";
import administradoresRoutes from "./routes/administradores.routes.js";
import rolesRoutes           from "./routes/roles.routes.js";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Todas las rutas bajo /api/v1
const v1 = Router();
v1.use("/administradores", administradoresRoutes);
v1.use("/roles",           rolesRoutes);
v1.use("/beneficiarios",   beneficiariosRoutes);
v1.use("/servicios",       serviciosRoutes);
v1.use("/articulos",       articulosRoutes);
v1.use("/citas",           citasRoutes);
v1.use("/membresias",      membresiasRoutes);
v1.use("/",                inventarioRoutes);

app.use("/api/v1", v1);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
