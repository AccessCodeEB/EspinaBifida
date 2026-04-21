import * as BeneficiarioService from "../services/beneficiarios.service.js";
import { toCamel, safeClobString } from "../utils/dbTransform.js";
import { badRequest, notFound } from "../utils/httpErrors.js";

function mapBeneficiario(row) {
  const b = toCamel(row);
  return {
    folio:           b.curp,
    nombres:         b.nombres,
    apellidoPaterno: b.apellidoPaterno,
    apellidoMaterno: b.apellidoMaterno,
    curp:            b.curp,
    fechaNacimiento: b.fechaNacimiento,
    genero:          b.genero,
    tipoSangre:      b.tiposSangre ?? b.tipoSangre ?? null,
    nombrePadreMadre:  b.nombrePadreMadre,
    calle:           b.calle,
    colonia:         b.colonia,
    ciudad:          b.ciudad ?? "",
    municipio:       b.municipio,
    estado:          b.estado ?? "",
    cp:              b.cp,
    telefonoCasa:    b.telefonoCasa,
    telefonoCelular: b.telefonoCelular,
    correoElectronico:  b.correoElectronico,
    contactoEmergencia: b.contactoEmergencia,
    telefonoEmergencia: b.telefonoEmergencia,
    municipioNacimiento: b.municipioNacimiento,
    hospitalNacimiento:  b.hospitalNacimiento,
    usaValvula:      b.usaValvula === "S" || b.usaValvula === 1 || b.usaValvula === "1",
    notas:           safeClobString(b.notas),
    estatus:         b.estatus ?? "Activo",
    membresiaEstatus: b.membresiaEstatus ?? "Sin membresia",
    tipo:            b.tipo ?? null,
    fechaAlta:       b.fechaAlta,
    numeroCredencial: b.numeroCredencial,
    fotoPerfilUrl:   b.fotoPerfilUrl ?? null,
  };
}

export async function getAll(req, res, next) {
  try {
    const rows = await BeneficiarioService.getAll();
    res.json(rows.map(mapBeneficiario));
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await BeneficiarioService.getById(req.params.curp);
    if (!data) throw notFound("Beneficiario no encontrado", "BENEFICIARIO_NOT_FOUND");
    res.json(mapBeneficiario(data));
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

export async function updateEstatus(req, res, next) {
  try {
    const { estatus } = req.body;
    await BeneficiarioService.toggleEstatus(req.params.curp, estatus);
    res.json({ message: `Estatus actualizado a '${estatus}'` });
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

export async function hardDelete(req, res, next) {
  try {
    await BeneficiarioService.hardDelete(req.params.curp);
    res.json({ message: "Beneficiario eliminado permanentemente" });
  } catch (err) {
    next(err);
  }
}

export async function uploadFotoPerfil(req, res, next) {
  try {
    if (!req.file) throw badRequest("Envía una imagen en el campo foto", "MISSING_FILE");
    const curp = String(req.params.curp).trim().toUpperCase();
    const { fotoPerfilUrl } = await BeneficiarioService.updateFotoPerfilByUpload(
      curp,
      req.file.filename
    );
    res.json({ message: "Foto de perfil actualizada", fotoPerfilUrl });
  } catch (err) {
    next(err);
  }
}

export async function deleteFotoPerfil(req, res, next) {
  try {
    const curp = String(req.params.curp).trim().toUpperCase();
    await BeneficiarioService.clearFotoPerfil(curp);
    res.json({ message: "Foto de perfil eliminada", fotoPerfilUrl: null });
  } catch (err) {
    next(err);
  }
}
