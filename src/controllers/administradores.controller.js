import * as AdminService from "../services/administradores.service.js";
import { toCamel } from "../utils/dbTransform.js";
import { badRequest } from "../utils/httpErrors.js";

function mapAdminPublic(row) {
  if (!row) return null;
  const a = toCamel(row);
  return {
    idAdmin:        a.idAdmin,
    idRol:          a.idRol,
    nombreCompleto: a.nombreCompleto,
    email:          a.email,
    activo:         a.activo,
    fechaCreacion:  a.fechaCreacion,
    nombreRol:      a.nombreRol,
    fotoPerfilUrl:  a.fotoPerfilUrl ?? null,
  };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const resultado = await AdminService.login(email, password);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getAll(req, res, next) {
  try {
    const rows = await AdminService.getAll();
    res.json(rows.map((row) => mapAdminPublic(row)));
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const row = await AdminService.getById(Number(req.params.idAdmin));
    res.json(mapAdminPublic(row));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    await AdminService.create(req.body);
    res.status(201).json({ message: "Administrador creado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    await AdminService.update(Number(req.params.idAdmin), req.body);
    res.json({ message: "Administrador actualizado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    await AdminService.changePassword(
      Number(req.params.idAdmin),
      req.body,
      req.user.idAdmin
    );
    res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req, res, next) {
  try {
    await AdminService.deactivate(Number(req.params.idAdmin));
    res.json({ message: "Administrador desactivado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function uploadFotoPerfil(req, res, next) {
  try {
    if (!req.file) throw badRequest("Envía una imagen en el campo foto", "MISSING_FILE");
    const idAdmin = Number(req.params.idAdmin);
    const { fotoPerfilUrl } = await AdminService.updateFotoPerfilByUpload(
      idAdmin,
      req.file,
      req.user
    );
    res.json({ message: "Foto de perfil actualizada", fotoPerfilUrl });
  } catch (err) {
    next(err);
  }
}
