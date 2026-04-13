import * as AdminService from "../services/administradores.service.js";

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
    res.json(await AdminService.getAll());
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    res.json(await AdminService.getById(Number(req.params.idAdmin)));
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
    await AdminService.changePassword(Number(req.params.idAdmin), req.body);
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
