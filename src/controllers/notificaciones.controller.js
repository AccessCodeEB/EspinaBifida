import * as Service from "../services/notificaciones.service.js";
import { toCamelArray } from "../utils/dbTransform.js";

export async function getAll(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const data = await Service.getAll(limit);
    res.json({ data: toCamelArray(data) });
  } catch (err) {
    next(err);
  }
}

export async function getPendientes(req, res, next) {
  try {
    const data = await Service.getPendientes();
    res.json({ data: toCamelArray(data) });
  } catch (err) {
    next(err);
  }
}

export async function getCount(req, res, next) {
  try {
    const total = await Service.getCount();
    res.json({ total });
  } catch (err) {
    next(err);
  }
}

export async function marcarLeida(req, res, next) {
  try {
    await Service.marcarLeida(Number(req.params.id));
    res.json({ message: "Notificación marcada como leída" });
  } catch (err) {
    next(err);
  }
}

export async function marcarTodasLeidas(req, res, next) {
  try {
    await Service.marcarTodasLeidas();
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) {
    next(err);
  }
}

export async function runJob(req, res, next) {
  try {
    const resumen = await Service.runJob();
    res.json({ message: "Job ejecutado", data: resumen });
  } catch (err) {
    next(err);
  }
}
