/**
 * Tests unitarios del módulo de reportes.
 * Cubre funciones puras: buildInClause, calcularPeriodo, generarHTML, generarXLSX.
 * Sin dependencias de Oracle, Puppeteer ni red.
 */

import { buildInClause } from '../utils/reporteHelpers.js';
import { calcularPeriodo } from '../utils/reporteScheduler.js';
import { generarHTML } from '../utils/reporteTemplate.js';
import * as XLSX from 'xlsx';
import * as ReportesService from '../services/reportes.service.js';

// ── buildInClause ─────────────────────────────────────────────────────────────

describe('buildInClause', () => {
  it('T1 — genera placeholders y binds para múltiples valores', () => {
    const result = buildInClause(['Monterrey', 'Guadalupe'], 'm');
    expect(result.placeholders).toBe(':m0,:m1');
    expect(result.binds).toEqual({ m0: 'Monterrey', m1: 'Guadalupe' });
  });

  it('genera placeholder y bind para un solo valor', () => {
    const result = buildInClause([42], 'e');
    expect(result.placeholders).toBe(':e0');
    expect(result.binds).toEqual({ e0: 42 });
  });

  it('preserva el tipo del valor (número)', () => {
    const { binds } = buildInClause([1, 2, 3], 'x');
    expect(binds.x0).toBe(1);
    expect(binds.x2).toBe(3);
  });

  it('prefijos distintos no colisionan entre sí', () => {
    const a = buildInClause(['A'], 'mun');
    const b = buildInClause([1],   'est');
    const merged = { ...a.binds, ...b.binds };
    expect(merged.mun0).toBe('A');
    expect(merged.est0).toBe(1);
  });
});

// ── calcularPeriodo ───────────────────────────────────────────────────────────

describe('calcularPeriodo', () => {
  it('T3 — MENSUAL: disparo en feb cubre enero completo', () => {
    const result = calcularPeriodo('MENSUAL', new Date(2026, 1, 1)); // 1-feb-2026
    expect(result).toEqual({ fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
  });

  it('T4 — MENSUAL: disparo en enero cubre diciembre del año anterior (edge)', () => {
    const result = calcularPeriodo('MENSUAL', new Date(2026, 0, 1)); // 1-ene-2026
    expect(result).toEqual({ fechaInicio: '2025-12-01', fechaFin: '2025-12-31' });
  });

  it('T5 — SEMESTRAL: disparo en 1-ene cubre jul-dic del año anterior', () => {
    const result = calcularPeriodo('SEMESTRAL', new Date(2026, 0, 1)); // 1-ene-2026
    expect(result).toEqual({ fechaInicio: '2025-07-01', fechaFin: '2025-12-31' });
  });

  it('T6 — SEMESTRAL: disparo en 1-jul cubre ene-jun del año actual', () => {
    const result = calcularPeriodo('SEMESTRAL', new Date(2026, 6, 1)); // 1-jul-2026
    expect(result).toEqual({ fechaInicio: '2026-01-01', fechaFin: '2026-06-30' });
  });

  it('T7 — ANUAL: disparo en 1-ene cubre el año anterior completo', () => {
    const result = calcularPeriodo('ANUAL', new Date(2026, 0, 1)); // 1-ene-2026
    expect(result).toEqual({ fechaInicio: '2025-01-01', fechaFin: '2025-12-31' });
  });

  it('MENSUAL: disparo en marzo cubre febrero (mes corto)', () => {
    const result = calcularPeriodo('MENSUAL', new Date(2026, 2, 1)); // 1-mar-2026
    expect(result).toEqual({ fechaInicio: '2026-02-01', fechaFin: '2026-02-28' });
  });
});

// ── generarHTML ───────────────────────────────────────────────────────────────

const DATA_VACIA = {
  tipo:     'estadisticas',
  resumen:  { CANT_CREDENCIALES: 0, CANT_SERVICIOS: 0, EXENTOS: 0, CON_CUOTA: 0,
              HOMBRES: 0, MUJERES: 0, URBANO: 0, RURAL: 0,
              LACTANTES: 0, NINOS: 0, ADOLESCENTES: 0, ADULTOS: 0 },
  detalle:  [],
  ciudades: [],
  estudios: [],
  porMes:   [],
};

const DATA_COMPLETA = {
  tipo:     'estadisticas',
  resumen:  { CANT_CREDENCIALES: 10, CANT_SERVICIOS: 55, EXENTOS: 12, CON_CUOTA: 43,
              HOMBRES: 20, MUJERES: 35, URBANO: 48, RURAL: 7,
              LACTANTES: 5, NINOS: 15, ADOLESCENTES: 8, ADULTOS: 27 },
  detalle:  [
    { NOMBRE: 'Consulta general', CANTIDAD: 30, UNIDAD: 'CITA' },
    { NOMBRE: 'Silla de ruedas',  CANTIDAD: 5,  UNIDAD: 'pieza' },
  ],
  ciudades: [
    { CIUDAD: 'Monterrey', CANTIDAD: 30 },
    { CIUDAD: 'Guadalupe',  CANTIDAD: 18 },
  ],
  estudios: [
    { NOMBRE: 'Urodinámico', CANTIDAD: 7 },
  ],
  porMes: [
    { MES: '2026-01', PACIENTES: 20, SERVICIOS: 35 },
    { MES: '2026-02', PACIENTES: 15, SERVICIOS: 20 },
  ],
};

describe('generarHTML', () => {
  it('T13 — no lanza con arrays vacíos', () => {
    expect(() => generarHTML(DATA_VACIA, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' }))
      .not.toThrow();
  });

  it('devuelve HTML con los valores del resumen', () => {
    const html = generarHTML(DATA_COMPLETA, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('55'); // CANT_SERVICIOS
    expect(html).toContain('12'); // EXENTOS
    expect(html).toContain('Monterrey');
    expect(html).toContain('Consulta general');
    expect(html).toContain('Urodinámico');
  });

  it('escapa caracteres HTML especiales en nombres de servicios', () => {
    const data = { ...DATA_VACIA, detalle: [{ NOMBRE: 'Consulta <Urología>', CANTIDAD: 1, UNIDAD: 'CITA' }] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Consulta &lt;Urología&gt;');
    expect(html).not.toContain('Consulta <Urología>');
  });

  it('muestra "Sin estudios configurados" cuando estudios está vacío', () => {
    const html = generarHTML(DATA_VACIA, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin estudios configurados');
  });

  it('beneficiarios: genera tabla con filas', () => {
    const data = {
      tipo: 'beneficiarios',
      filas: [
        { CURP: 'GARM900101HNLRLS01', NOMBRE_COMPLETO: 'Marco García López',
          GENERO: 'Masculino', MUNICIPIO: 'Monterrey', ESTATUS: 'Activo' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Marco García López');
    expect(html).toContain('GARM900101HNLRLS01');
    expect(html).toContain('Beneficiarios Atendidos');
  });

  it('beneficiarios: sin filas muestra mensaje vacío', () => {
    const data = { tipo: 'beneficiarios', filas: [] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin beneficiarios en el periodo');
  });
});

// ── generarXLSX ───────────────────────────────────────────────────────────────

describe('generarXLSX', () => {
  it('T14 — retorna Buffer con 5 hojas correctamente nombradas', async () => {
    const buf = await ReportesService.generarXLSX(DATA_COMPLETA);

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);

    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Resumen', 'Por Mes', 'Detalle Servicios', 'Ciudades', 'Estudios']);
  });

  it('la hoja Resumen contiene los campos esperados', async () => {
    const buf  = await ReportesService.generarXLSX(DATA_COMPLETA);
    const wb   = XLSX.read(buf, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Resumen']);
    expect(rows[0]).toHaveProperty('CANT_SERVICIOS', 55);
    expect(rows[0]).toHaveProperty('HOMBRES', 20);
  });

  it('la hoja Detalle Servicios tiene las filas correctas', async () => {
    const buf  = await ReportesService.generarXLSX(DATA_COMPLETA);
    const wb   = XLSX.read(buf, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Detalle Servicios']);
    expect(rows).toHaveLength(2);
    expect(rows[0].NOMBRE).toBe('Consulta general');
  });
});

// ── generarHTML — ramas pendientes ───────────────────────────────────────────

describe('generarHTML — esc() con null/undefined (rama ?? \'\')', () => {
  it('escapa null a cadena vacía sin lanzar', () => {
    const data = {
      ...DATA_VACIA,
      detalle: [{ NOMBRE: null, CANTIDAD: null, UNIDAD: undefined }],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toBeDefined();
    // los campos null/undefined se convierten a '' por esc()
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });

  it('muestra 0 en resumen cuando los campos son null via ?? 0', () => {
    const data = { ...DATA_VACIA, resumen: null };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    // resumen?.CANT_CREDENCIALES ?? 0 → '0'
    expect(html).toContain('>0<');
  });
});

// ── calcularPeriodo — ramas adicionales ──────────────────────────────────────

describe('calcularPeriodo — tipos de periodo', () => {
  it('ANUAL: disparo en mes no-enero también produce el año anterior (tipo ANUAL genérico)', () => {
    // La función ANUAL solo debería dispararse el 1-ene, pero si se llama en otro mes
    // debe devolver el año anterior completo
    const result = calcularPeriodo('ANUAL', new Date(2026, 5, 1)); // 1-jun-2026
    expect(result).toEqual({ fechaInicio: '2025-01-01', fechaFin: '2025-12-31' });
  });

  it('tipo desconocido cae en rama ANUAL (default)', () => {
    const result = calcularPeriodo('DESCONOCIDO', new Date(2026, 0, 1));
    expect(result).toEqual({ fechaInicio: '2025-01-01', fechaFin: '2025-12-31' });
  });
});
