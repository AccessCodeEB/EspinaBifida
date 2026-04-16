import * as BeneficiarioService from "../services/beneficiarios.service.js";
import { notFound } from "../utils/httpErrors.js";

export async function getAll(req, res, next) {
  try {
    res.json(await BeneficiarioService.getAll());
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await BeneficiarioService.getById(req.params.curp);
    if (!data) throw notFound("Beneficiario no encontrado", "BENEFICIARIO_NOT_FOUND");
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    await BeneficiarioService.create(req.body);
    res.status(201).json({ message: "Beneficiario creado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    await BeneficiarioService.update(req.params.curp, req.body);
    res.json({ message: "Beneficiario actualizado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req, res, next) {
  try {
    await BeneficiarioService.deactivate(req.params.curp);
    res.json({ message: "Beneficiario desactivado exitosamente" });
  } catch (err) {
    next(err);
  }
}
