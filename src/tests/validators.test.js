import {
  CURP_REGEX, EMAIL_REGEX, TEL_REGEX,
  sanitizeString, parsePositiveNumber, parseISODate,
} from '../utils/validators.js';

describe('CURP_REGEX', () => {
  test('acepta CURP válido', () => {
    expect(CURP_REGEX.test('GALJ900515HJCRPN01')).toBe(true);
  });
  test('rechaza CURP de 17 chars', () => {
    expect(CURP_REGEX.test('GALJ900515HJCRPN0')).toBe(false);
  });
});

describe('sanitizeString', () => {
  test('recorta espacios', () => {
    expect(sanitizeString('  hola  ')).toBe('hola');
  });
  test('devuelve no-string sin cambio', () => {
    expect(sanitizeString(null)).toBe(null);
  });
});

describe('parsePositiveNumber', () => {
  test('convierte string numérico', () => {
    expect(parsePositiveNumber('5', 'campo')).toBe(5);
  });
  test('lanza error si es negativo', () => {
    expect(() => parsePositiveNumber(-1, 'campo')).toThrow('campo');
  });
  test('lanza error si NaN', () => {
    expect(() => parsePositiveNumber('abc', 'campo')).toThrow('campo');
  });
});

describe('parseISODate', () => {
  test('parsea fecha ISO válida', () => {
    const d = parseISODate('2024-01-15', 'fecha');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });
  test('lanza error si formato incorrecto', () => {
    expect(() => parseISODate('15/01/2024', 'fecha')).toThrow('fecha');
  });
  test('devuelve null si valor vacío', () => {
    expect(parseISODate(null, 'fecha')).toBeNull();
  });
});
