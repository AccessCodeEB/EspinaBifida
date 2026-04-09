import * as citasService from "../services/citas.service.js";

export const getCitas = async (req, res, next) => {
  try {
    const citas = await citasService.getAllCitas();
    res.status(200).json(citas);
  } catch (error) {
    next(error);
  }
};

export const getCitaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cita = await citasService.getCitaById(id);
    res.status(200).json(cita);
  } catch (error) {
    next(error);
  }
};

export const createCita = async (req, res, next) => {
  try {
    const result = await citasService.createCita(req.body);
    res.status(201).json({
      message: "Cita creada correctamente",
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await citasService.updateCita(id, req.body);
    res.status(200).json({
      message: "Cita actualizada correctamente",
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    await citasService.deleteCita(id);
    res.status(200).json({
      message: "Cita cancelada correctamente",
    });
  } catch (error) {
    next(error);
  }
};