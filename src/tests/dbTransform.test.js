/**
 * Tests unitarios de src/utils/dbTransform.js
 * Funciones puras — sin Oracle, sin mocks.
 */
import { toCamel, toCamelArray, safeClobString } from '../utils/dbTransform.js';

// ── toCamel ───────────────────────────────────────────────────────────────────

describe('toCamel', () => {
  it('convierte UPPER_SNAKE_CASE a camelCase', () => {
    expect(toCamel({ APELLIDO_PATERNO: 'García' }))
      .toEqual({ apellidoPaterno: 'García' });
  });

  it('convierte múltiples segmentos', () => {
    expect(toCamel({ FECHA_VIGENCIA_FIN: 'x' }))
      .toEqual({ fechaVigenciaFin: 'x' });
  });

  it('serializa Date a cadena YYYY-MM-DD', () => {
    const d = new Date('2026-03-15T12:00:00.000Z');
    const result = toCamel({ FECHA: d });
    expect(result.fecha).toBe(d.toISOString().slice(0, 10));
  });

  it('retorna null sin lanzar cuando row es null', () => {
    expect(toCamel(null)).toBeNull();
  });

  it('retorna el valor sin cambios cuando row es un string (no objeto)', () => {
    expect(toCamel('hola')).toBe('hola');
  });

  it('retorna el valor sin cambios cuando row es un número', () => {
    expect(toCamel(42)).toBe(42);
  });

  it('maneja object vacío', () => {
    expect(toCamel({})).toEqual({});
  });

  it('preserva valores null/undefined dentro del objeto', () => {
    const result = toCamel({ CAMPO_NULL: null, CAMPO_UNDEF: undefined });
    expect(result.campoNull).toBeNull();
    expect(result.campoUndef).toBeUndefined();
  });

  it('preserva valores numéricos y booleanos', () => {
    const result = toCamel({ ID_VALOR: 5, ACTIVO: true });
    expect(result.idValor).toBe(5);
    expect(result.activo).toBe(true);
  });
});

// ── toCamelArray ──────────────────────────────────────────────────────────────

describe('toCamelArray', () => {
  it('mapea un array de filas', () => {
    const rows = [{ CURP: 'ABC' }, { CURP: 'XYZ' }];
    const result = toCamelArray(rows);
    expect(result).toEqual([{ curp: 'ABC' }, { curp: 'XYZ' }]);
  });

  it('retorna [] cuando recibe un no-array (rama lines 29)', () => {
    expect(toCamelArray(null)).toEqual([]);
    expect(toCamelArray(undefined)).toEqual([]);
    expect(toCamelArray('string')).toEqual([]);
    expect(toCamelArray(42)).toEqual([]);
  });

  it('retorna [] con array vacío', () => {
    expect(toCamelArray([])).toEqual([]);
  });
});

// ── safeClobString ────────────────────────────────────────────────────────────

describe('safeClobString', () => {
  it('retorna null cuando value es null', () => {
    expect(safeClobString(null)).toBeNull();
  });

  it('retorna undefined cuando value es undefined', () => {
    expect(safeClobString(undefined)).toBeUndefined();
  });

  it('retorna el string tal cual', () => {
    expect(safeClobString('hola mundo')).toBe('hola mundo');
  });

  it('convierte número a string (rama lines 40)', () => {
    expect(safeClobString(42)).toBe('42');
  });

  it('convierte boolean a string (rama lines 40)', () => {
    expect(safeClobString(true)).toBe('true');
    expect(safeClobString(false)).toBe('false');
  });

  it('retorna "" para objeto Lob o cualquier otro objeto (rama lines 41)', () => {
    expect(safeClobString({ _impl: 'lob' })).toBe('');
    expect(safeClobString([])).toBe('');
  });
});
