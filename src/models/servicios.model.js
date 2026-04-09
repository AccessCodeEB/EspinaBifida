import { getConnection } from "../config/db.js";

// Validar que beneficiario existe y está activo
export async function findBeneficiarioActivo(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ACTIVO, NUMERO_CREDENCIAL, NOMBRES, APELLIDO_PATERNO
       FROM BENEFICIARIOS 
       WHERE CURP = :curp`,
      { curp }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

// Obtener todos los servicios de un beneficiario
export async function findByCurp(curp) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE CURP = :curp
       ORDER BY FECHA DESC`,
      { curp }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Obtener servicios de un beneficiario (con paginación opcional)
export async function findByCurpPaginated(curp, page = 1, limit = 10) {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE CURP = :curp
       ORDER BY FECHA DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { curp, offset, limit }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

// Crear nuevo servicio
export async function create(data) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO SERVICIOS (
         CURP, ID_TIPO_SERVICIO, FECHA, COSTO, MONTO_PAGADO, 
         REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       ) VALUES (
         :curp, :idTipoServicio, SYSDATE, :costo, :montoPagado,
         :referenciaId, :referenciaTipo, :notas
       )`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

// Registrar en historial (auditoría)
export async function insertHistorial(data) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HISTORIAL_SERVICIOS (
         CURP, ID_SERVICIO, ACCION, FECHA, DETALLES
       ) VALUES (
         :curp, :idServicio, :accion, SYSDATE, :detalles
       )`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

// Obtener servicio por ID
export async function findById(idServicio) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID_SERVICIO, CURP, ID_TIPO_SERVICIO, FECHA, COSTO, 
              MONTO_PAGADO, REFERENCIA_ID, REFERENCIA_TIPO, NOTAS
       FROM SERVICIOS 
       WHERE ID_SERVICIO = :idServicio`,
      { idServicio }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
}

// Actualizar servicio
export async function update(idServicio, data) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE SERVICIOS SET
         MONTO_PAGADO = :montoPagado,
         NOTAS = :notas
       WHERE ID_SERVICIO = :idServicio`,
      { ...data, idServicio },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

// Eliminar servicio
export async function deleteById(idServicio) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM SERVICIOS 
       WHERE ID_SERVICIO = :idServicio`,
      { idServicio },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}
