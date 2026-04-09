import * as ServiciosModel from "../models/servicios.model.js";

// Validar beneficiario activo y crear servicio
export async function createConValidacion(data) {
  // Validar que el beneficiario existe y está activo
  const beneficiario = await ServiciosModel.findBeneficiarioActivo(data.curp);
  
  if (!beneficiario) {
    throw new Error("Beneficiario no encontrado");
  }

  if (!beneficiario.ACTIVO) {
    throw new Error("Beneficiario inactivo. No se puede asignar servicio");
  }

  // Crear el servicio
  await ServiciosModel.create(data);

  // Registrar en historial
  await ServiciosModel.insertHistorial({
    curp: data.curp,
    idServicio: data.idServicio || null,
    accion: "CREAR",
    detalles: `Servicio tipo ${data.idTipoServicio} creado`
  });

  return {
    message: "Servicio creado exitosamente",
    beneficiario: beneficiario.NOMBRES
  };
}

export const getByCurp = (curp) =>
  ServiciosModel.findByCurp(curp);

export const getByCurpPaginated = (curp, page, limit) =>
  ServiciosModel.findByCurpPaginated(curp, page, limit);

export const getById = (idServicio) =>
  ServiciosModel.findById(idServicio);

export const update = (idServicio, data) =>
  ServiciosModel.update(idServicio, data);

export const deleteById = (idServicio) =>
  ServiciosModel.deleteById(idServicio);
