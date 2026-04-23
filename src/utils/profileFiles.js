import fs from "fs";
import path from "path";
import { REPO_ROOT } from "../repoRoot.js";

const PROFILES_DIR = path.join(REPO_ROOT, "uploads", "profiles");

/** Ruta relativa guardada en Oracle y servida como estático bajo /uploads/... */
export function publicPathForStoredFile(filename) {
  return `/uploads/profiles/${filename}`;
}

/**
 * Elimina un archivo previo solo si está bajo uploads/profiles y el nombre es seguro.
 */
export function unlinkOldProfileIfSafe(storedUrl) {
  if (!storedUrl || typeof storedUrl !== "string") return;
  if (!storedUrl.startsWith("/uploads/profiles/")) return;
  const base = path.basename(storedUrl);
  if (!base || base === "." || base === "..") return;
  const full = path.resolve(PROFILES_DIR, base);
  if (!full.startsWith(path.resolve(PROFILES_DIR))) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* ignorar errores de borrado */
  }
}
