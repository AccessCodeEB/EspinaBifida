import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { mountProfilePhotosRemoteFallback } from "./middleware/profilePhotosRemoteFallback.js";
import { REPO_ROOT } from "./repoRoot.js";

dotenv.config({ path: path.join(REPO_ROOT, ".env.defaults") });
// Sin override: respeta variables ya definidas (p. ej. JWT_SECRET en CI o en tests).
dotenv.config({ path: path.join(REPO_ROOT, ".env") });
import beneficiariosRoutes   from "./routes/beneficiarios.routes.js";
import beneficiariosV1Routes from "./routes/beneficiarios.v1.routes.js";
import serviciosRoutes        from "./routes/servicios.routes.js";
import articulosRoutes        from "./routes/articulos.routes.js";
import citasRoutes            from "./routes/citas.routes.js";
import membresiasRoutes       from "./routes/membresias.routes.js";
import membresiasV1Routes     from "./routes/membresias.v1.routes.js";
import inventarioRoutes       from "./routes/inventario.routes.js";
import inventarioV1Routes     from "./routes/inventario.v1.routes.js";
import administradoresRoutes  from "./routes/administradores.routes.js";
import rolesRoutes            from "./routes/roles.routes.js";
import reportesRoutes         from "./routes/reportes.routes.js";

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
mountProfilePhotosRemoteFallback(app);
app.use("/uploads", express.static(path.join(REPO_ROOT, "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/beneficiarios",  beneficiariosRoutes);
app.use("/api/v1/beneficiarios", beneficiariosV1Routes);
app.use("/servicios",      serviciosRoutes);
app.use("/api/v1/servicios", serviciosRoutes);
app.use("/articulos",      articulosRoutes);
app.use("/api/v1/articulos", articulosRoutes);
app.use("/citas",          citasRoutes);
app.use("/api/v1/citas", citasRoutes);
app.use("/membresias",     membresiasRoutes);
app.use("/api/v1/membresias", membresiasV1Routes);
app.use("/inventario",     inventarioRoutes);
app.use("/api/v1",         inventarioV1Routes);
app.use("/administradores",administradoresRoutes);
app.use("/api/v1/administradores", administradoresRoutes);
app.use("/roles",          rolesRoutes);
app.use("/api/v1/roles", rolesRoutes);
app.use("/api/v1/reportes", reportesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
