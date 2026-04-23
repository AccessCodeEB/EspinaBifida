import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { REPO_ROOT } from "../repoRoot.js";

const profilesDir = path.join(REPO_ROOT, "uploads", "profiles");

/** Solo nombres de archivo seguros (p. ej. ben-CURP-timestamp.jpg). */
function safeProfileFilename(name) {
  if (name == null || typeof name !== "string") return null;
  const trimmed = name.trim();
  const base = path.basename(trimmed);
  if (!base || base !== trimmed || trimmed.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

/**
 * Si falta el archivo en disco pero existe PROFILE_PHOTOS_REMOTE_BASE,
 * descarga la imagen de ese API, la guarda en uploads/profiles y la sirve.
 * Así quien clona el repo solo necesita `npm run dev` y la misma variable
 * que el resto del equipo (p. ej. en `.env.defaults` versionado).
 */
export function mountProfilePhotosRemoteFallback(app) {
  const router = express.Router();

  async function serveOrFetch(req, res, next) {
    const safe = safeProfileFilename(req.params.filename);
    if (!safe) return next();

    const localPath = path.join(profilesDir, safe);
    try {
      await fs.access(localPath);
      return res.sendFile(localPath, (err) => {
        if (err) next(err);
      });
    } catch {
      /* no existe local */
    }

    const base = (process.env.PROFILE_PHOTOS_REMOTE_BASE || "").trim().replace(/\/$/, "");
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      return next();
    }

    try {
      const remoteUrl = `${base}/uploads/profiles/${encodeURIComponent(safe)}`;
      const r = await fetch(remoteUrl, { redirect: "follow" });
      if (!r.ok) {
        if (r.status !== 404) {
          console.warn(`[uploads/fallback] ${remoteUrl} → ${r.status}`);
        }
        return res.status(404).end();
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) return res.status(404).end();

      await fs.mkdir(profilesDir, { recursive: true });
      await fs.writeFile(localPath, buf).catch(() => {});

      const ct = r.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buf);
    } catch (e) {
      console.warn("[uploads/fallback]", e?.message ?? e);
      return res.status(502).end();
    }
  }

  router.get("/:filename", serveOrFetch);
  router.head("/:filename", serveOrFetch);

  app.use("/uploads/profiles", router);
}
