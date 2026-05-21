import * as EspecialistasService from "../services/especialistas.service.js";

export async function getEspecialistas(req, res, next) {
  try {
    const data = await EspecialistasService.getEspecialistas();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
