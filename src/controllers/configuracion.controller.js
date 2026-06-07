import * as ConfiguracionService from "../services/configuracion.service.js";
import { badRequest } from "../utils/httpErrors.js";

export async function getConfiguracion(req, res, next) {
  try {
    const data = await ConfiguracionService.getConfiguracion();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getCuentasBancarias(req, res, next) {
  try {
    const data = await ConfiguracionService.getCuentasBancarias();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function patchConfiguracion(req, res, next) {
  try {
    const { clave } = req.params;
    const { valor } = req.body;
    if (valor == null) throw badRequest("El campo 'valor' es obligatorio");
    const result = await ConfiguracionService.updateValor(clave, valor);
    res.json({ data: result, message: "Configuración actualizada correctamente" });
  } catch (err) {
    next(err);
  }
}

export async function getResumenFinanciero(req, res, next) {
  try {
    const mes = req.query.mes ?? new Date().toISOString().slice(0, 7);
    const data = await ConfiguracionService.getResumenFinanciero(mes);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
