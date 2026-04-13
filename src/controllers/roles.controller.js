import * as RolesService from "../services/roles.service.js";

export async function getAll(req, res, next) {
  try {
    res.json(await RolesService.getAll());
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    res.json(await RolesService.getById(Number(req.params.idRol)));
  } catch (err) {
    next(err);
  }
}
