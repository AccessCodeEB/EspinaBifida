/**
 * Tests unitarios de src/models/reportes.model.js
 * Cubre las 6 funciones de acceso a Oracle: getResumenPeriodo, getDetalleServicios,
 * getDistribucionCiudades, getEstudios, guardarRegistro, findHistorico, findById.
 * Mockea getConnection — sin Oracle real.
 */
import { jest } from '@jest/globals';
import {
  mockExecute, mockClose, mockCommit,
  dbModuleMock, resetMocks,
} from './helpers/mockDb.js';

jest.unstable_mockModule('../config/db.js', () => dbModuleMock);

// oracledb se importa en el modelo solo para OUT_FORMAT_OBJECT (2304)
jest.unstable_mockModule('oracledb', () => ({
  default: { OUT_FORMAT_OBJECT: 2304 },
  OUT_FORMAT_OBJECT: 2304,
}));

const {
  getResumenPeriodo,
  getDetalleServicios,
  getDistribucionCiudades,
  getEstudios,
  getBeneficiariosPeriodo,
  getMembresias,
  getServiciosPeriodo,
  getArticulosStock,
  getMovimientosPeriodo,
  guardarRegistro,
  findHistorico,
  findById,
  ESTUDIOS_IDS,
} = await import('../models/reportes.model.js');

const PERIODO = { inicio: '2026-01-01', fin: '2026-01-31' };

beforeEach(() => resetMocks());

// ── getResumenPeriodo ─────────────────────────────────────────────────────────

describe('getResumenPeriodo', () => {
  it('retorna la primera fila del resultado', async () => {
    const row = {
      CANT_CREDENCIALES: 5, CANT_SERVICIOS: 20, EXENTOS: 5, CON_CUOTA: 15,
      HOMBRES: 10, MUJERES: 10, URBANO: 18, RURAL: 2,
      LACTANTES: 1, NINOS: 4, ADOLESCENTES: 3, ADULTOS: 12,
    };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await getResumenPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toBe(row);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('cierra la conexión aunque execute lance', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-00942'));

    await expect(getResumenPeriodo(PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('ORA-00942');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getDetalleServicios ───────────────────────────────────────────────────────

describe('getDetalleServicios', () => {
  it('retorna array de filas', async () => {
    const rows = [
      { NOMBRE: 'Consulta', CANTIDAD: 10, UNIDAD: 'CITA' },
      { NOMBRE: 'Silla', CANTIDAD: 2, UNIDAD: 'pieza' },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getDetalleServicios(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay servicios en el periodo', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await getDetalleServicios(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual([]);
  });

  it('cierra la conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-01403'));

    await expect(getDetalleServicios(PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('ORA-01403');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getDistribucionCiudades ───────────────────────────────────────────────────

describe('getDistribucionCiudades', () => {
  it('retorna distribución por municipio', async () => {
    const rows = [
      { CIUDAD: 'Monterrey', CANTIDAD: 30 },
      { CIUDAD: 'Guadalupe', CANTIDAD: 18 },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getDistribucionCiudades(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('cierra conexión en error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('timeout'));

    await expect(getDistribucionCiudades(PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('timeout');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getEstudios ───────────────────────────────────────────────────────────────

describe('getEstudios', () => {
  it('retorna [] sin tocar Oracle cuando ESTUDIOS_IDS está vacío', async () => {
    expect(ESTUDIOS_IDS).toHaveLength(0);

    const result = await getEstudios(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual([]);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});

// ── guardarRegistro ───────────────────────────────────────────────────────────

describe('guardarRegistro', () => {
  it('ejecuta INSERT y llama commit', async () => {
    mockExecute.mockResolvedValueOnce({});

    await guardarRegistro({
      tipo: 'MENSUAL',
      fechaInicio: PERIODO.inicio,
      fechaFin:    PERIODO.fin,
      rutaPdf:     '2026-01/r.pdf',
      rutaXlsx:    '2026-01/r.xlsx',
      generadoPor: 1,
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('usa null para rutaPdf y rutaXlsx cuando no se pasan', async () => {
    mockExecute.mockResolvedValueOnce({});

    await guardarRegistro({
      tipo: 'ANUAL',
      fechaInicio: PERIODO.inicio,
      fechaFin:    PERIODO.fin,
    });

    const binds = mockExecute.mock.calls[0][1];
    expect(binds.pdf).toBeNull();
    expect(binds.xlsx).toBeNull();
    expect(binds.admin).toBeNull();
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('INSERT failed'));

    await expect(guardarRegistro({
      tipo: 'MENSUAL', fechaInicio: PERIODO.inicio, fechaFin: PERIODO.fin,
    })).rejects.toThrow('INSERT failed');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findHistorico ─────────────────────────────────────────────────────────────

describe('findHistorico', () => {
  it('calcula offset correctamente y retorna filas', async () => {
    const rows = [
      { ID_REPORTE: 1, TIPO: 'MENSUAL', FECHA_INICIO: '2026-01-01', FECHA_FIN: '2026-01-31' },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await findHistorico(2, 10);

    expect(result).toEqual(rows);
    // page=2, limit=10 → offset=10
    const binds = mockExecute.mock.calls[0][1];
    expect(binds.offset).toBe(10);
    expect(binds.limit).toBe(10);
  });

  it('page=1 produce offset=0', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findHistorico(1, 20);

    const binds = mockExecute.mock.calls[0][1];
    expect(binds.offset).toBe(0);
  });

  it('retorna [] cuando no hay registros', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await findHistorico(1, 20);

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getBeneficiariosPeriodo ───────────────────────────────────────────────────

describe('getBeneficiariosPeriodo', () => {
  it('retorna filas de beneficiarios con servicio en el periodo', async () => {
    const rows = [
      {
        CURP: 'GARM900101HNLRLS01',
        NOMBRE_COMPLETO: 'Marco García López',
        GENERO: 'Masculino',
        MUNICIPIO: 'Monterrey',
        ESTADO: 'Nuevo León',
        ESTATUS: 'Activo',
      },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getBeneficiariosPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay servicios en el periodo', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await getBeneficiariosPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual([]);
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-00942'));

    await expect(getBeneficiariosPeriodo(PERIODO.inicio, PERIODO.fin))
      .rejects.toThrow('ORA-00942');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getMembresias ─────────────────────────────────────────────────────────────

describe('getMembresias', () => {
  it('retorna filas de credenciales con estado calculado', async () => {
    const rows = [
      {
        NOMBRE: 'Ana Martínez',
        CURP: 'MARA850515MNLRNS02',
        NUMERO_CREDENCIAL: 'NL-2025-001',
        FECHA_VIGENCIA_INICIO: new Date('2025-01-01'),
        FECHA_VIGENCIA_FIN: new Date('2026-12-31'),
        FECHA_ULTIMO_PAGO: new Date('2025-01-10'),
        ESTADO: 'Activa',
      },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getMembresias(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] cuando no hay membresías en el rango', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getMembresias(PERIODO.inicio, PERIODO.fin);
    expect(result).toEqual([]);
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('timeout'));
    await expect(getMembresias(PERIODO.inicio, PERIODO.fin)).rejects.toThrow('timeout');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getServiciosPeriodo ───────────────────────────────────────────────────────

describe('getServiciosPeriodo', () => {
  it('retorna filas de servicios en el periodo', async () => {
    const rows = [
      {
        FECHA: '2026-01-15',
        NOMBRE: 'Marco García López',
        CURP: 'GARM900101HNLRLS01',
        TIPO_SERVICIO: 'Consulta General',
        COSTO: 100,
        MONTO_PAGADO: 50,
        MODALIDAD: 'Con cuota',
      },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getServiciosPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay servicios en el periodo', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getServiciosPeriodo(PERIODO.inicio, PERIODO.fin);
    expect(result).toEqual([]);
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-01403'));
    await expect(getServiciosPeriodo(PERIODO.inicio, PERIODO.fin)).rejects.toThrow('ORA-01403');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── getArticulosStock ─────────────────────────────────────────────────────────

describe('getArticulosStock', () => {
  it('retorna todos los artículos con su stock actual', async () => {
    const rows = [
      { ID_ARTICULO: 1, DESCRIPCION: 'Silla de ruedas', UNIDAD: 'pieza',
        INVENTARIO_ACTUAL: 5, CUOTA_RECUPERACION: 200, MANEJA_INVENTARIO: 'S' },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getArticulosStock();

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay artículos', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getArticulosStock();
    expect(result).toEqual([]);
  });
});

// ── getMovimientosPeriodo ─────────────────────────────────────────────────────

describe('getMovimientosPeriodo', () => {
  it('retorna movimientos del periodo', async () => {
    const rows = [
      { ARTICULO: 'Silla de ruedas', TIPO_MOVIMIENTO: 'SALIDA',
        CANTIDAD: 1, FECHA: '2026-01-10', MOTIVO: 'Servicio ID 42' },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getMovimientosPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay movimientos en el periodo', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getMovimientosPeriodo(PERIODO.inicio, PERIODO.fin);
    expect(result).toEqual([]);
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DB error'));
    await expect(getMovimientosPeriodo(PERIODO.inicio, PERIODO.fin)).rejects.toThrow('DB error');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('retorna el registro cuando existe', async () => {
    const row = { ID_REPORTE: 7, TIPO: 'SEMESTRAL', RUTA_PDF: '2026-01/r.pdf', RUTA_XLSX: null };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await findById(7);

    expect(result).toBe(row);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna null cuando no existe el ID (rama ?? null)', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await findById(999);

    expect(result).toBeNull();
  });

  it('cierra conexión en error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DB error'));

    await expect(findById(1)).rejects.toThrow('DB error');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
