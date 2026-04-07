import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// aquí irán todas las rutas
// app.use("/beneficiarios", beneficiariosRoutes);

app.use(errorHandler);

export default app;