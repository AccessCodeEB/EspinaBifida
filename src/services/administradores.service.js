import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as AdminModel from "../models/administradores.model.js";
import * as RolesModel from "../models/roles.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { notFound, badRequest, conflict, HttpError } from "../utils/httpErrors.js";

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "8h" }
  );
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
  if (!admin) throw new AppError("Credenciales inválidas", 401);

  if (admin.ACTIVO === 0 || admin.ACTIVO === "0") {
    throw new AppError("Cuenta desactivada. Contacta al administrador", 403);
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

  if (!passwordValida) throw new AppError("Credenciales inválidas", 401);

  const token = generarToken(admin);

  return {
    token,
    admin: {
      idAdmin:        admin.ID_ADMIN,
      idRol:          admin.ID_ROL,
      nombreRol:      admin.NOMBRE_ROL,
      nombreCompleto: admin.NOMBRE_COMPLETO,
      email:          admin.EMAIL,
    },
  };
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

export async function changePassword(idAdmin, { passwordActual, passwordNueva }, callerIdAdmin) {
  if (callerIdAdmin !== idAdmin) {
    throw new HttpError(403, "Solo puedes cambiar tu propia contraseña");
  }
  if (!passwordActual || !passwordNueva) {
    throw badRequest("Se requieren passwordActual y passwordNueva");
  }
  validarPassword(passwordNueva);

  const admin = await AdminModel.findByEmail(
    (await AdminModel.findById(idAdmin))?.EMAIL
  );
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);

  const valida = await bcrypt.compare(passwordActual, admin.PASSWORD_HASH);
  if (!valida) throw new AppError("Contraseña actual incorrecta", 401);

  const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
  await AdminModel.updatePassword(idAdmin, nuevoHash);
}

export async function deactivate(idAdmin) {
  const admin = await AdminModel.findById(idAdmin);
  if (!admin) throw notFound(`Administrador con id ${idAdmin} no encontrado`);
  await AdminModel.deactivate(idAdmin);
}
