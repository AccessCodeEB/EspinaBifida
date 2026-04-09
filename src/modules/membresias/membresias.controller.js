import * as membresiasService from "./membresias.service.js";

export const createMembresia = async (req, res, next) => {
  try {
    const result = await membresiasService.registrarMembresia(req.body);
    res.status(201).json({
      message: "Membresía registrada correctamente",
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMembresiaStatus = async (req, res, next) => {
  try {
    const { curp } = req.params;
    const estatus = await membresiasService.getEstatusMembresia(curp);
    res.status(200).json(estatus);
  } catch (error) {
    next(error);
  }
};

