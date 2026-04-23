import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del proyecto (carpeta con `package.json` y `uploads/`), independiente de `process.cwd()`. */
export const REPO_ROOT = path.join(__dirname, "..");
