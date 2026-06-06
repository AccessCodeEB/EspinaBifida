import * as ComodatosModel from "../models/comodatos.model.js";

// ─── GET /comodatos ────────────────────────────────────────────────────────────
export async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, estatus, curp } = req.query;
    const data = await ComodatosModel.findAll({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      estatus,
      curp,
    });
    res.json({ data });
  } catch (err) { next(err); }
}

// ─── GET /comodatos/reportes/exenciones ──────────────────────────────────────
export async function getReporteExenciones(req, res, next) {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: "fechaInicio y fechaFin son requeridos" });
    }
    const data = await ComodatosModel.getReporteExenciones({ fechaInicio, fechaFin });
    res.json({ data });
  } catch (err) { next(err); }
}

// ─── GET /comodatos/beneficiario/:curp ───────────────────────────────────────
export async function getByCurp(req, res, next) {
  try {
    const data = await ComodatosModel.findByCurp(req.params.curp);
    res.json({ data });
  } catch (err) { next(err); }
}

// ─── GET /comodatos/:id ───────────────────────────────────────────────────────
export async function getById(req, res, next) {
  try {
    const data = await ComodatosModel.findById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: "Comodato no encontrado" });
    res.json({ data });
  } catch (err) { next(err); }
}

// ─── POST /comodatos ──────────────────────────────────────────────────────────
export async function create(req, res, next) {
  try {
    const { curp, idArticulo, montoTotal, notas, fechaDevolucionEsperada } = req.body;

    if (!curp || !idArticulo) {
      return res.status(400).json({ error: "curp e idArticulo son requeridos" });
    }

    // Validar membresía activa
    const membresia = await ComodatosModel.checkMembresiaActiva(curp);
    if (!membresia) {
      return res.status(403).json({ error: "El beneficiario no tiene membresía activa" });
    }

    const data = await ComodatosModel.create({ curp, idArticulo, montoTotal, notas, fechaDevolucionEsperada });
    res.status(201).json({ message: "Comodato registrado exitosamente", data });
  } catch (err) { next(err); }
}

// ─── PATCH /comodatos/:id ─────────────────────────────────────────────────────
export async function updateNotas(req, res, next) {
  try {
    const { notas } = req.body;
    if (notas === undefined || notas === null) {
      return res.status(400).json({ error: "El campo notas es requerido" });
    }
    const result = await ComodatosModel.updateNotas(Number(req.params.id), notas);
    if (!result) return res.status(404).json({ error: "Comodato no encontrado" });
    res.json({ message: "Notas actualizadas", data: result });
  } catch (err) { next(err); }
}

// ─── DELETE /comodatos/:id ────────────────────────────────────────────────────
export async function cancel(req, res, next) {
  try {
    const result = await ComodatosModel.cancel(Number(req.params.id));
    if (!result) return res.status(404).json({ error: "Comodato no encontrado" });
    if (result.estatus === "Cancelado") {
      return res.status(409).json({ error: "El comodato ya está cancelado" });
    }
    res.json({ message: "Comodato cancelado exitosamente" });
  } catch (err) { next(err); }
}

// ─── PATCH /comodatos/:id/devolucion ─────────────────────────────────────────
export async function registerDevolucion(req, res, next) {
  try {
    const idComodato = Number(req.params.id);
    const data = await ComodatosModel.registrarDevolucion(idComodato);

    if (data === null) return res.status(404).json({ error: "Comodato no encontrado" });
    if (data.yaDevuelto) {
      return res.status(409).json({ error: "Este comodato ya tiene una devolución registrada" });
    }

    const mensajes = {
      anticipada:       "Devolución anticipada registrada exitosamente",
      tarde:            "Devolución tardía registrada exitosamente",
      aTiempo:          "Devolución registrada exitosamente",
      sinFechaEsperada: "Devolución registrada exitosamente",
    };
    res.json({ message: mensajes[data.tipo] ?? "Devolución registrada", data });
  } catch (err) { next(err); }
}

// ─── POST /comodatos/:id/pagos ────────────────────────────────────────────────
export async function addPago(req, res, next) {
  try {
    const idComodato = Number(req.params.id);
    const { monto, esExento = false, notas } = req.body;

    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({ error: "monto debe ser mayor a 0" });
    }

    const data = await ComodatosModel.addPago(idComodato, {
      monto: Number(monto),
      esExento: Boolean(esExento),
      notas,
    });

    if (data === null) return res.status(404).json({ error: "Comodato no encontrado" });
    if (data.cancelled) {
      return res.status(409).json({ error: "No se puede agregar pagos a un comodato cancelado" });
    }

    res.status(201).json({ message: "Pago registrado exitosamente", data });
  } catch (err) { next(err); }
}
