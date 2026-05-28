import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { getConnection } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { mountProfilePhotosRemoteFallback } from "./middleware/profilePhotosRemoteFallback.js";
import { REPO_ROOT } from "./repoRoot.js";
import { loginLimiter, publicLimiter, authLimiter, otpLimiter } from './middleware/rateLimiter.js';
import { swaggerConfig } from './config/swagger.js';

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
import configuracionRoutes    from "./routes/configuracion.routes.js";
import especialistasRoutes    from "./routes/especialistas.routes.js";
import catalogoRoutes           from "./routes/servicios-catalogo.routes.js";
import notificacionesRoutes    from "./routes/notificaciones.routes.js";

const app = express();

app.use(helmet());

// CORS: environment-aware.
// Si FRONTEND_URL está definida, solo se permite ese origen y localhost:3001 (dev).
// Si no está definida, se permite cualquier origen (fallback de desarrollo).
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // curl, SSR, mobile apps
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) return callback(null, true); // dev: permitir cualquier origen
    const allowed = [frontendUrl, "http://localhost:3001"];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("CORS: origen no permitido"));
  },
  credentials: true,
}));
app.use(express.json());
mountProfilePhotosRemoteFallback(app);
app.use("/uploads", express.static(path.join(REPO_ROOT, "uploads")));

// Swagger UI — solo en desarrollo/staging (nunca en producción)
if (process.env.NODE_ENV !== 'production') {
  const swaggerSpec = swaggerJsdoc(swaggerConfig);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Rate limiting — specific limiters before their routes, global limiter for all routes
app.post('/administradores/login', loginLimiter);
app.post('/api/v1/administradores/login', loginLimiter);
app.post('/beneficiarios/solicitud-publica', publicLimiter);
app.post('/api/v1/beneficiarios/solicitud-publica', publicLimiter);
app.post('/administradores/:idAdmin/solicitar-codigo', otpLimiter);
app.post('/api/v1/administradores/:idAdmin/solicitar-codigo', otpLimiter);
app.post('/administradores/forgot-password', otpLimiter);
app.post('/api/v1/administradores/forgot-password', otpLimiter);
app.use(authLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// /ready — verifica que el pool de Oracle esté inicializado
// Usado por wait-on en CI para esperar que la DB esté lista antes de correr los tests E2E
app.get("/ready", async (_req, res) => {
  try {
    const conn = await getConnection();
    await conn.close();
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "starting" });
  }
});

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
app.use("/configuracion",   configuracionRoutes);
app.use("/especialistas",   especialistasRoutes);
app.use("/servicios-catalogo",   catalogoRoutes);
app.use("/notificaciones",       notificacionesRoutes);
app.use("/api/v1/notificaciones", notificacionesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
