import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import beneficiariosRoutes   from "./routes/beneficiarios.routes.js";
import serviciosRoutes        from "./routes/servicios.routes.js";
import articulosRoutes        from "./routes/articulos.routes.js";
import citasRoutes            from "./routes/citas.routes.js";
import membresiasRoutes       from "./routes/membresias.routes.js";
import inventarioRoutes       from "./routes/inventario.routes.js";
import administradoresRoutes  from "./routes/administradores.routes.js";
import rolesRoutes            from "./routes/roles.routes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/beneficiarios",  beneficiariosRoutes);
app.use("/servicios",      serviciosRoutes);
app.use("/articulos",      articulosRoutes);
app.use("/citas",          citasRoutes);
app.use("/membresias",     membresiasRoutes);
app.use("/inventario",     inventarioRoutes);
app.use("/administradores",administradoresRoutes);
app.use("/roles",          rolesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
