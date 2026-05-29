import fs from "node:fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, randomInt } from "node:crypto";
import * as AdminModel from "../models/administradores.model.js";
import * as RolesModel from "../models/roles.model.js";
import * as RefreshModel from "../models/refreshTokens.model.js";
import { notFound, badRequest, conflict, HttpError, forbidden, unauthorized } from "../utils/httpErrors.js";
import { unlinkOldProfileIfSafe } from "../utils/profileFiles.js";
import { EMAIL_REGEX } from "../utils/validators.js";
import { saveOtp, verifyOtp } from "../utils/otpStore.js";
import { sendEmailCode } from "../utils/email.js";

const PHONE_REGEX = /^\d{10}$/;

const SALT_ROUNDS = 10;

function generarToken(admin) {
  return jwt.sign(
    {
      idAdmin:        admin.ID_ADMIN,
      idRol:          admin.ID_ROL,
      nombreCompleto: admin.NOMBRE_COMPLETO,
      email:          admin.EMAIL,
      nombreRol:      admin.NOMBRE_ROL,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "1h" }
  );
}

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "7");

async function emitirRefreshToken(idAdmin) {
  const raw = randomBytes(40).toString("hex");
  const hash = RefreshModel.hashToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  await RefreshModel.insert(idAdmin, hash, expiresAt);
  return raw;
}

function validarEmail(email) {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw badRequest("Formato de email inválido");
  }
}

function validarPassword(password) {
  if (!password || password.length < 6) {
    throw badRequest("La contraseña debe tener al menos 6 caracteres");
  }
}

function normalizePasswordHash(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return String(value);
}

export async function login(email, password) {
  if (!email || !password) throw badRequest("Email y contraseña son requeridos");

  const emailNorm = email.trim().toLowerCase();
  const admin = await AdminModel.findByEmail(emailNorm);
  if (!admin) throw unauthorized("Credenciales inválidas");

  if (admin.ACTIVO === 0 || admin.ACTIVO === "0") {
    throw forbidden("Cuenta desactivada. Contacta al administrador");
  }

  const stored = normalizePasswordHash(admin.PASSWORD_HASH);
  let passwordValida = false;

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    passwordValida = await bcrypt.compare(password, stored);
  } else if (stored.length > 0) {
    // Legado: contraseña guardada en texto plano u otro formato — migrar a bcrypt al validar
    if (stored === password) {
      passwordValida = true;
      const nuevoHash = await bcrypt.hash(password, SALT_ROUNDS);
      await AdminModel.updatePassword(admin.ID_ADMIN, nuevoHash);
    }
  }

  if (!passwordValida) throw unauthorized("Credenciales inválidas");

  const token = generarToken(admin);
  const refreshToken = await emitirRefreshToken(admin.ID_ADMIN);

  return {
    token,
    refreshToken,
    admin: {
      idAdmin:        admin.ID_ADMIN,
      idRol:          admin.ID_ROL,
      nombreRol:      admin.NOMBRE_ROL,
      nombreCompleto: admin.NOMBRE_COMPLETO,
      email:          admin.EMAIL,
      fotoPerfilUrl:  admin.FOTO_PERFIL_URL ?? null,
    },
  };
}

export async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) throw unauthorized("Refresh token requerido");

  const hash = RefreshModel.hashToken(rawRefreshToken);
  const row = await RefreshModel.findByHash(hash);

  if (!row || row.REVOCADO === 1) throw unauthorized("Refresh token inválido o revocado");
  if (new Date(row.EXPIRES_AT) < new Date()) throw unauthorized("Refresh token expirado");

  // Rotación: revocar el token usado antes de emitir el nuevo par
  await RefreshModel.revoke(hash);

  const admin = await AdminModel.findById(row.ID_ADMIN);
  if (!admin || admin.ACTIVO === 0) throw unauthorized("Cuenta inactiva");

  const token = generarToken(admin);
  const newRefreshToken = await emitirRefreshToken(admin.ID_ADMIN);

  return { token, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const hash = RefreshModel.hashToken(rawRefreshToken);
  await RefreshModel.revoke(hash);
}

export const getAll = () => AdminModel.findAll();

export async function getById(idAdmin) {
  const admin = await AdminModel.findById(idAdmin);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);
  return admin;
}

export async function create({ idRol, nombreCompleto, email, password }) {
  validarEmail(email);
  validarPassword(password);

  if (!nombreCompleto?.trim()) throw badRequest("El nombre completo es requerido");
  if (!idRol) throw badRequest("El rol es requerido");

  const rolExiste = await RolesModel.findById(idRol);
  if (!rolExiste) throw notFound(`Rol con id ${idRol} no encontrado`);

  const emailNorm = email.trim().toLowerCase();
  const existente = await AdminModel.findByEmail(emailNorm);
  if (existente) throw conflict(`Ya existe un administrador con el email ${emailNorm}`);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await AdminModel.create({
    idRol,
    nombreCompleto: nombreCompleto.trim(),
    email: emailNorm,
    passwordHash,
  });
}

export async function update(idAdmin, { idRol, nombreCompleto, email }) {
  const admin = await AdminModel.findById(idAdmin);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  if (email) validarEmail(email);
  if (!nombreCompleto?.trim()) throw badRequest("El nombre completo es requerido");
  if (!idRol) throw badRequest("El rol es requerido");

  const rolExiste = await RolesModel.findById(idRol);
  if (!rolExiste) throw notFound(`Rol con id ${idRol} no encontrado`);

  await AdminModel.update(idAdmin, {
    idRol,
    nombreCompleto: nombreCompleto.trim(),
    email: email?.trim().toLowerCase() ?? admin.EMAIL,
  });
}

export async function solicitarCodigo(idAdmin, callerIdAdmin) {
  if (callerIdAdmin !== idAdmin) {
    throw new HttpError(403, "Solo puedes solicitar el código para tu propia cuenta");
  }

  const adminRow = await AdminModel.findById(idAdmin);
  if (!adminRow) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  const code = String(randomInt(100000, 1000000));
  saveOtp(idAdmin, code);
  const devCode = await sendEmailCode(adminRow.EMAIL, code);

  return {
    message: "Código enviado a tu correo electrónico",
    ...(devCode !== undefined && process.env.NODE_ENV !== "production" && { codigoDev: devCode }),
  };
}

export async function solicitarRecuperacion(email) {
  const adminRow = await AdminModel.findByEmail(email?.trim().toLowerCase());
  if (!adminRow) throw notFound(`No existe un administrador con el email ${email}`);

  const code = String(randomInt(100000, 1000000));
  saveOtp(adminRow.ID_ADMIN, code);
  const devCode = await sendEmailCode(adminRow.EMAIL, code);

  return {
    message: "Código de recuperación enviado a tu correo electrónico",
    ...(devCode !== undefined && process.env.NODE_ENV !== "production" && { codigoDev: devCode }),
  };
}

export async function resetPasswordPublico(email, codigo, nuevaPassword) {
  const adminRow = await AdminModel.findByEmail(email?.trim().toLowerCase());
  if (!adminRow) throw notFound(`No existe un administrador con el email ${email}`);

  if (!codigo) throw badRequest("Se requiere el código de recuperación enviado a tu correo", "MISSING_OTP");
  if (!verifyOtp(adminRow.ID_ADMIN, String(codigo))) {
    throw badRequest("Código inválido o expirado", "INVALID_OTP");
  }

  validarPassword(nuevaPassword);

  const nuevoHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
  await AdminModel.updatePassword(adminRow.ID_ADMIN, nuevoHash);

  return { message: "Contraseña restablecida exitosamente" };
}

export async function changePassword(idAdmin, { passwordActual, passwordNueva, codigo }, callerIdAdmin) {
  if (callerIdAdmin !== idAdmin) {
    throw new HttpError(403, "Solo puedes cambiar tu propia contraseña");
  }
  if (!passwordActual || !passwordNueva) {
    throw badRequest("Se requieren passwordActual y passwordNueva");
  }
  validarPassword(passwordNueva);

  if (!codigo) throw badRequest("Se requiere el código enviado a tu correo electrónico", "MISSING_OTP");
  if (!verifyOtp(idAdmin, String(codigo))) {
    throw badRequest("Código inválido o expirado", "INVALID_OTP");
  }

  const adminRow = await AdminModel.findById(idAdmin);
  if (!adminRow) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  const admin = await AdminModel.findByEmail(adminRow.EMAIL);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  const valida = await bcrypt.compare(passwordActual, admin.PASSWORD_HASH);
  if (!valida) throw unauthorized("Contraseña actual incorrecta");

  const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
  await AdminModel.updatePassword(idAdmin, nuevoHash);
}

export async function resetPasswordBySuperAdmin(idAdmin, { passwordNueva }) {
  validarPassword(passwordNueva);
  const adminRow = await AdminModel.findById(idAdmin);
  if (!adminRow) throw notFound(`Administrador con id ${idAdmin} no encontrado`);
  const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
  await AdminModel.updatePassword(idAdmin, nuevoHash);
}

export async function updateTelefono(idAdmin, telefono, callerIdAdmin) {
  if (callerIdAdmin !== idAdmin) {
    throw new HttpError(403, "Solo puedes actualizar tu propio teléfono");
  }

  const adminRow = await AdminModel.findById(idAdmin);
  if (!adminRow) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  if (telefono !== null && telefono !== undefined && telefono !== "") {
    const cleaned = String(telefono).replace(/\D/g, "");
    if (!PHONE_REGEX.test(cleaned)) {
      throw badRequest("El teléfono debe tener exactamente 10 dígitos", "INVALID_PHONE");
    }
    await AdminModel.updateTelefono(idAdmin, cleaned);
  } else {
    await AdminModel.updateTelefono(idAdmin, null);
  }
}

export async function deactivate(idAdmin) {
  const admin = await AdminModel.findById(idAdmin);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);
  await AdminModel.deactivate(idAdmin);
}

/**
 * Tras multer: convierte el archivo a data URL y lo guarda en Oracle (misma estrategia que beneficiarios).
 * Así la foto viaja con la BD compartida y se ve en cualquier instancia del backend.
 */
export async function updateFotoPerfilByUpload(idAdmin, file, caller) {
  if (caller.idAdmin !== idAdmin && caller.idRol !== 1) {
    throw forbidden("No autorizado para modificar este perfil");
  }

  if (!file?.path) throw badRequest("Archivo de imagen inválido", "MISSING_FILE_PATH");

  const admin = await AdminModel.findById(idAdmin);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  const prev = admin.FOTO_PERFIL_URL ?? admin.fotoPerfilUrl;
  const buffer = fs.readFileSync(file.path);
  const mime = file.mimetype || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  if (prev && !String(prev).startsWith("data:")) unlinkOldProfileIfSafe(prev);

  await AdminModel.updateFotoPerfilUrl(idAdmin, dataUrl);

  try {
    fs.unlinkSync(file.path);
  } catch {
    /* archivo temporal ya eliminado */
  }

  return { fotoPerfilUrl: dataUrl };
}
