import { getConnection } from "../config/db.js";

export async function findAll() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT b.NOMBRES, b.APELLIDO_PATERNO, b.APELLIDO_MATERNO,
              b.CURP, b.GENERO, b.FECHA_NACIMIENTO, b.TIPOS_SANGRE,
              b.NOMBRE_PADRE_MADRE, b.CALLE, b.COLONIA, b.CIUDAD,
              b.MUNICIPIO, b.ESTADO, b.CP,
              b.TELEFONO_CASA, b.TELEFONO_CELULAR, b.CORREO_ELECTRONICO,
              b.CONTACTO_EMERGENCIA, b.TELEFONO_EMERGENCIA,
              b.HOSPITAL_NACIMIENTO,
              b.USA_VALVULA, b.TIPO, b.NOTAS, b.ESTATUS, b.FECHA_ALTA,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = b.CURP
                    AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                    AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) > 30
                ) THEN 'Activa'
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c
                  WHERE c.CURP = b.CURP
                    AND c.FECHA_VIGENCIA_FIN >= TRUNC(SYSDATE)
                    AND c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE) <= 30
                ) THEN 'Por vencer'
                WHEN EXISTS (
                  SELECT 1 FROM CREDENCIALES c WHERE c.CURP = b.CURP
                ) THEN 'Vencida'
                ELSE 'Sin membresia'
              END AS MEMBRESIA_ESTATUS,
              (SELECT c.FECHA_VIGENCIA_FIN - TRUNC(SYSDATE)
               FROM CREDENCIALES c
               WHERE c.CURP = b.CURP
               ORDER BY c.FECHA_VIGENCIA_FIN DESC, c.ID_CREDENCIAL DESC
               FETCH FIRST 1 ROWS ONLY) AS DIAS_RESTANTES,
              b.FOTO_PERFIL_URL
       FROM BENEFICIARIOS b
       ORDER BY b.APELLIDO_PATERNO`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function findById(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM BENEFICIARIOS WHERE CURP = :curp`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

export async function create(data) {
  const conn = await getConnection();
  try {
    const {
      nombres, apellidoPaterno, apellidoMaterno, curp,
      fechaNacimiento, genero, nombrePadreMadre,
      calle, colonia, ciudad, municipio, estado, cp,
      telefonoCasa, telefonoCelular, correoElectronico,
      contactoEmergencia, telefonoEmergencia,
      hospitalNacimiento,
      tipoSangre, tipo, usaValvula, notas, estatus,
    } = data;

    await conn.execute(
      `INSERT INTO BENEFICIARIOS (
         NOMBRES, APELLIDO_PATERNO, APELLIDO_MATERNO, CURP,
         FECHA_NACIMIENTO, GENERO, NOMBRE_PADRE_MADRE,
         CALLE, COLONIA, CIUDAD, MUNICIPIO, ESTADO, CP,
         TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
         CONTACTO_EMERGENCIA, TELEFONO_EMERGENCIA,
         HOSPITAL_NACIMIENTO,
         TIPOS_SANGRE, TIPO, USA_VALVULA, NOTAS, ESTATUS
       ) VALUES (
         :nombres, :apellidoPaterno, :apellidoMaterno, :curp,
         TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'), :genero, :nombrePadreMadre,
         :calle, :colonia, :ciudad, :municipio, :estado, :cp,
         :telefonoCasa, :telefonoCelular, :correoElectronico,
         :contactoEmergencia, :telefonoEmergencia,
         :hospitalNacimiento,
         :tipoSangre, :tipo, :usaValvula, :notas, :estatus
       )`,
      {
        nombres:             nombres              ?? null,
        apellidoPaterno:     apellidoPaterno      ?? null,
        apellidoMaterno:     apellidoMaterno      ?? null,
        curp,
        fechaNacimiento:     fechaNacimiento      ?? null,
        genero:              genero               ?? null,
        nombrePadreMadre:    nombrePadreMadre     ?? null,
        calle:               calle                ?? null,
        colonia:             colonia              ?? null,
        ciudad:              ciudad               ?? null,
        municipio:           municipio            ?? null,
        estado:              estado               ?? null,
        cp:                  cp                   ?? null,
        telefonoCasa:        telefonoCasa         ?? null,
        telefonoCelular:     telefonoCelular      ?? null,
        correoElectronico:   correoElectronico    ?? null,
        contactoEmergencia:  contactoEmergencia   ?? null,
        telefonoEmergencia:  telefonoEmergencia   ?? null,
        hospitalNacimiento:  hospitalNacimiento   ?? null,
        tipoSangre:          tipoSangre           ?? null,
        tipo:                tipo                 ?? null,
        usaValvula:          usaValvula           ?? "N",
        notas:               notas                ?? null,
        estatus:             estatus              ?? "Activo",
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function update(curp, data) {
  const conn = await getConnection();
  try {
    const {
      nombres, apellidoPaterno, apellidoMaterno,
      fechaNacimiento, genero, nombrePadreMadre,
      calle, colonia, ciudad, municipio, estado, cp,
      telefonoCasa, telefonoCelular, correoElectronico,
      contactoEmergencia, telefonoEmergencia,
      hospitalNacimiento,
      tipoSangre, tipo, usaValvula, notas, estatus,
    } = data;

    const result = await conn.execute(
      `UPDATE BENEFICIARIOS SET
         NOMBRES               = :nombres,
         APELLIDO_PATERNO      = :apellidoPaterno,
         APELLIDO_MATERNO      = :apellidoMaterno,
         FECHA_NACIMIENTO      = TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'),
         GENERO                = :genero,
         NOMBRE_PADRE_MADRE    = :nombrePadreMadre,
         CALLE                 = :calle,
         COLONIA               = :colonia,
         CIUDAD                = :ciudad,
         MUNICIPIO             = :municipio,
         ESTADO                = :estado,
         CP                    = :cp,
         TELEFONO_CASA         = :telefonoCasa,
         TELEFONO_CELULAR      = :telefonoCelular,
         CORREO_ELECTRONICO    = :correoElectronico,
         CONTACTO_EMERGENCIA   = :contactoEmergencia,
         TELEFONO_EMERGENCIA   = :telefonoEmergencia,
         HOSPITAL_NACIMIENTO   = :hospitalNacimiento,
         TIPOS_SANGRE          = :tipoSangre,
         TIPO                  = :tipo,
         USA_VALVULA           = :usaValvula,
         NOTAS                 = :notas,
         ESTATUS               = :estatus
       WHERE CURP = :curp`,
      {
        nombres:             nombres              ?? null,
        apellidoPaterno:     apellidoPaterno      ?? null,
        apellidoMaterno:     apellidoMaterno      ?? null,
        curp,
        fechaNacimiento:     fechaNacimiento      ?? null,
        genero:              genero               ?? null,
        nombrePadreMadre:    nombrePadreMadre     ?? null,
        calle:               calle                ?? null,
        colonia:             colonia              ?? null,
        ciudad:              ciudad               ?? null,
        municipio:           municipio            ?? null,
        estado:              estado               ?? null,
        cp:                  cp                   ?? null,
        telefonoCasa:        telefonoCasa         ?? null,
        telefonoCelular:     telefonoCelular      ?? null,
        correoElectronico:   correoElectronico    ?? null,
        contactoEmergencia:  contactoEmergencia   ?? null,
        telefonoEmergencia:  telefonoEmergencia   ?? null,
        hospitalNacimiento:  hospitalNacimiento   ?? null,
        tipoSangre:          tipoSangre           ?? null,
        tipo:                tipo                 ?? null,
        usaValvula:          usaValvula           ?? "N",
        notas:               notas                ?? null,
        estatus:             estatus              ?? "Activo",
      },
      { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}

export async function updateFotoPerfilUrl(curp, fotoPerfilUrl) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE BENEFICIARIOS SET FOTO_PERFIL_URL = :fotoPerfilUrl WHERE CURP = :curp`,
      { curp, fotoPerfilUrl },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function updateEstatus(curp, estatus) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = :estatus WHERE CURP = :curp`,
      { estatus, curp },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

/** Actualiza estatus y notas en una sola operación (p. ej. aprobar solicitud pública). */
export async function updateEstatusAndNotas(curp, estatus, notas) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = :estatus, NOTAS = :notas WHERE CURP = :curp`,
      { estatus, notas: notas ?? null, curp },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function deactivate(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE BENEFICIARIOS SET ESTATUS = 'Baja' WHERE CURP = :curp`,
      { curp },
      { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}

export async function hardDelete(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM BENEFICIARIOS WHERE CURP = :curp`,
      { curp },
      { autoCommit: true }
    );
    return result.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}
