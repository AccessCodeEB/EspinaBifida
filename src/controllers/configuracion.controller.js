import * as ConfiguracionService from "../services/configuracion.service.js";

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

export async function getResumenFinanciero(req, res, next) {
  try {
    const mes = req.query.mes ?? new Date().toISOString().slice(0, 7);
    const data = await ConfiguracionService.getResumenFinanciero(mes);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
