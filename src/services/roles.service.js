import * as RolesModel from "../models/roles.model.js";
import { notFound } from "../utils/httpErrors.js";

export const getAll = () => RolesModel.findAll();

export async function getById(idRol) {
  const rol = await RolesModel.findById(idRol);
  if (!rol) throw notFound(`Rol con id ${idRol} no encontrado`);
  return rol;
}
