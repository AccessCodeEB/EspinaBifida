import * as ServiciosCatalogoService from "../services/servicios-catalogo.service.js";

export async function getServiciosCatalogo(req, res, next) {
  try {
    const data = await ServiciosCatalogoService.getServiciosCatalogo();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
