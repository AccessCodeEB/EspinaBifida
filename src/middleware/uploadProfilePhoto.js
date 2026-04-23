import fs from "fs";
import path from "path";
import multer from "multer";
import { badRequest } from "../utils/httpErrors.js";
import { REPO_ROOT } from "../repoRoot.js";

const UPLOAD_DIR = path.join(REPO_ROOT, "uploads", "profiles");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fileFilter(_req, file, cb) {
  if (allowedMime.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(badRequest("Solo se permiten imágenes JPEG, PNG, WebP o GIF", "INVALID_UPLOAD"));
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const prefix = String(req._profileFilePrefix ?? "file").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
    cb(null, `${prefix}-${Date.now()}${safeExt}`);
  },
});

export const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB para el archivo original
  fileFilter,
});
