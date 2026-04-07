import * as BeneficiarioModel from "./beneficiarios.model.js";

export const getAll = () =>
  BeneficiarioModel.findAll();

export const getById = (id) =>
  BeneficiarioModel.findById(id);

export const create = (data) =>
  BeneficiarioModel.create(data);

export const update = (id, data) =>
  BeneficiarioModel.update(id, data);

export const deactivate = (id) =>
  BeneficiarioModel.deactivate(id);
