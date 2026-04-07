import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler } from "./middleware/errorHandler.js";
import beneficiariosRoutes from "./modules/beneficiarios/beneficiarios.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/beneficiarios", beneficiariosRoutes);

app.use(errorHandler);

export default app;