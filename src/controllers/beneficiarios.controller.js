import * as BeneficiarioService from "../services/beneficiarios.service.js";

export async function getAll(req, res, next) {
  try {
    const data = await BeneficiarioService.getAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await BeneficiarioService.getById(req.params.id);
    if (!data) return res.status(404).json({ error: "Beneficiario no encontrado" });
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
    await BeneficiarioService.update(req.params.id, req.body);
    res.json({ message: "Beneficiario actualizado exitosamente" });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req, res, next) {
  try {
    await BeneficiarioService.deactivate(req.params.id);
    res.json({ message: "Beneficiario desactivado exitosamente" });
  } catch (err) {
    next(err);
  }
}
