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

  it('membresias: genera tabla con estados coloreados', () => {
    const data = {
      tipo: 'membresias',
      filas: [
        { NOMBRE: 'Ana Martínez', CURP: 'MARA850515MNLRNS02',
          NUMERO_CREDENCIAL: 'NL-001', FECHA_VIGENCIA_INICIO: new Date('2025-01-01'),
          FECHA_VIGENCIA_FIN: new Date('2026-12-31'), FECHA_ULTIMO_PAGO: new Date('2025-01-10'),
          ESTADO: 'Activa' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Ana Martínez');
    expect(html).toContain('Activa');
    expect(html).toContain('Membresías');
  });

  it('membresias: sin filas muestra mensaje vacío', () => {
    const data = { tipo: 'membresias', filas: [] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin membresías en el periodo');
  });

  it('servicios: genera tabla con monto recaudado correcto', () => {
    const data = {
      tipo: 'servicios',
      filas: [
        { FECHA: '2026-01-15', NOMBRE: 'Marco García', CURP: 'GARM900101HNLRLS01',
          TIPO_SERVICIO: 'Consulta', COSTO: 100, MONTO_PAGADO: 50, MODALIDAD: 'Con cuota' },
        { FECHA: '2026-01-20', NOMBRE: 'Ana López', CURP: 'LOPA800202MNLRNN03',
          TIPO_SERVICIO: 'Medicamento', COSTO: 0, MONTO_PAGADO: 0, MODALIDAD: 'Exento' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Marco García');
    expect(html).toContain('$50.00');
    expect(html).toContain('Reporte de Servicios');
  });

  it('servicios: sin filas muestra mensaje vacío', () => {
    const data = { tipo: 'servicios', filas: [] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin servicios en el periodo');
  });

  it('inventario: genera tablas de stock y movimientos', () => {
    const data = {
      tipo: 'inventario',
      articulos: [
        { DESCRIPCION: 'Silla de ruedas', UNIDAD: 'pieza',
          INVENTARIO_ACTUAL: 3, CUOTA_RECUPERACION: 200, MANEJA_INVENTARIO: 'S' },
      ],
      movimientos: [
        { FECHA: '2026-01-10', ARTICULO: 'Silla de ruedas',
          TIPO_MOVIMIENTO: 'SALIDA', CANTIDAD: 1, MOTIVO: 'Servicio ID 42' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Silla de ruedas');
    expect(html).toContain('SALIDA');
    expect(html).toContain('Reporte de Inventario');
  });

  it('inventario: sin movimientos muestra mensaje vacío', () => {
    const data = { tipo: 'inventario', articulos: [], movimientos: [] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin movimientos en el periodo');
    expect(html).toContain('Sin artículos registrados');
  });

  it('citas: genera resumen por estatus y tabla de detalle', () => {
    const data = {
      tipo: 'citas',
      filas: [
        { FECHA: '2026-01-20', NOMBRE: 'Ana Martínez', CURP: 'MARA850515MNLRNS02',
          TIPO_SERVICIO: 'Neurología', ESPECIALISTA: 'Dr. Rodríguez', ESTATUS: 'Completada' },
        { FECHA: '2026-01-22', NOMBRE: 'Marco García', CURP: 'GARM900101HNLRLS01',
          TIPO_SERVICIO: 'Cardiología', ESPECIALISTA: 'Dr. Rodríguez', ESTATUS: 'Pendiente' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Ana Martínez');
    expect(html).toContain('Dr. Rodríguez');
    expect(html).toContain('Completada');
    expect(html).toContain('Reporte de Citas');
  });

  it('citas: sin filas muestra mensaje vacío', () => {
    const data = { tipo: 'citas', filas: [] };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('Sin citas en el periodo');
  });

  it('membresias: aplica estilos de color para estados "Por vencer" y "Vencida"', () => {
    // Cubre las ramas lines 222-224 de estadoStyle en generarHTMLMembresias
    const data = {
      tipo: 'membresias',
      filas: [
        { NOMBRE: 'Ana Martínez', CURP: 'MARA850515MNLRNS02',
          NUMERO_CREDENCIAL: 'NL-001',
          FECHA_VIGENCIA_INICIO: new Date('2025-01-01'),
          FECHA_VIGENCIA_FIN: new Date('2025-12-31'),
          FECHA_ULTIMO_PAGO: new Date('2025-01-10'),
          ESTADO: 'Por vencer' },
        { NOMBRE: 'Luis Torres', CURP: 'TOLI750303HNLRRS04',
          NUMERO_CREDENCIAL: 'NL-002',
          FECHA_VIGENCIA_INICIO: new Date('2024-01-01'),
          FECHA_VIGENCIA_FIN: new Date('2024-12-31'),
          FECHA_ULTIMO_PAGO: new Date('2024-01-10'),
          ESTADO: 'Vencida' },
        { NOMBRE: 'Pedro Sanz', CURP: 'SANP800404HNLRZN05',
          NUMERO_CREDENCIAL: 'NL-003',
          FECHA_VIGENCIA_INICIO: new Date('2026-06-01'),
          FECHA_VIGENCIA_FIN: new Date('2027-05-31'),
          FECHA_ULTIMO_PAGO: null,
          ESTADO: 'Futura' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    // color #b87c00 = Por vencer, #c0392b = Vencida, #555 = Futura (fallback)
    expect(html).toContain('#b87c00');
    expect(html).toContain('#c0392b');
    expect(html).toContain('#555');
    expect(html).toContain('Por vencer');
    expect(html).toContain('Vencida');
  });

  it('inventario: aplica color verde cuando stock > 5', () => {
    // Cubre la rama line 359 de stockStyle (return \'color:#2a7a2a\')
    const data = {
      tipo: 'inventario',
      articulos: [
        { DESCRIPCION: 'Silla de ruedas', UNIDAD: 'pieza',
          INVENTARIO_ACTUAL: 10, CUOTA_RECUPERACION: 200, MANEJA_INVENTARIO: 'S' },
      ],
      movimientos: [],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    expect(html).toContain('#2a7a2a');
    expect(html).toContain('Silla de ruedas');
  });

  it('citas: sort de especialistas con múltiples entradas distintas', () => {
    // Cubre la rama line 498 — el comparador del sort se invoca cuando hay ≥2 especialistas
    const data = {
      tipo: 'citas',
      filas: [
        { FECHA: '2026-01-20', NOMBRE: 'Ana Martínez', CURP: 'MARA850515MNLRNS02',
          TIPO_SERVICIO: 'Neurología', ESPECIALISTA: 'Dr. Rodríguez', ESTATUS: 'Completada' },
        { FECHA: '2026-01-21', NOMBRE: 'Marco García', CURP: 'GARM900101HNLRLS01',
          TIPO_SERVICIO: 'Cardiología', ESPECIALISTA: 'Dra. López', ESTATUS: 'Completada' },
        { FECHA: '2026-01-22', NOMBRE: 'Luis Torres', CURP: 'TOLI750303HNLRRS04',
          TIPO_SERVICIO: 'Neurología', ESPECIALISTA: 'Dr. Rodríguez', ESTATUS: 'Pendiente' },
      ],
    };
    const html = generarHTML(data, { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' });
    // Dr. Rodríguez tiene 2 citas, Dra. López tiene 1 — ambos deben aparecer
    expect(html).toContain('Dr. Rodríguez');
    expect(html).toContain('Dra. López');
    // La tabla de especialistas existe (sort se ejecutó)
    expect(html).toContain('Especialista');
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

  it('beneficiarios: produce workbook con 1 hoja "Beneficiarios"', async () => {
    const data = {
      tipo: 'beneficiarios',
      filas: [{ CURP: 'GARM900101HNLRLS01', NOMBRE_COMPLETO: 'Marco García López',
                GENERO: 'Masculino', MUNICIPIO: 'Monterrey', ESTATUS: 'Activo' }],
    };
    const buf = await ReportesService.generarXLSX(data);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Beneficiarios']);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Beneficiarios']);
    expect(rows[0].CURP).toBe('GARM900101HNLRLS01');
  });

  it('membresias: produce workbook con 1 hoja "Membresías"', async () => {
    const data = {
      tipo: 'membresias',
      filas: [{ NOMBRE: 'Ana Martínez', CURP: 'MARA850515MNLRNS02', ESTADO: 'Activa' }],
    };
    const buf = await ReportesService.generarXLSX(data);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Membresías']);
  });

  it('servicios: produce workbook con 1 hoja "Servicios"', async () => {
    const data = {
      tipo: 'servicios',
      filas: [{ FECHA: '2026-01-15', TIPO_SERVICIO: 'Consulta', MONTO_PAGADO: 50, MODALIDAD: 'Con cuota' }],
    };
    const buf = await ReportesService.generarXLSX(data);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Servicios']);
  });

  it('inventario: produce workbook con 2 hojas "Stock Actual" y "Movimientos"', async () => {
    const data = {
      tipo: 'inventario',
      articulos:   [{ DESCRIPCION: 'Silla de ruedas', INVENTARIO_ACTUAL: 3, MANEJA_INVENTARIO: 'S' }],
      movimientos: [{ ARTICULO: 'Silla de ruedas', TIPO_MOVIMIENTO: 'SALIDA', CANTIDAD: 1 }],
    };
    const buf = await ReportesService.generarXLSX(data);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Stock Actual', 'Movimientos']);
    const stock = XLSX.utils.sheet_to_json(wb.Sheets['Stock Actual']);
    expect(stock[0].DESCRIPCION).toBe('Silla de ruedas');
  });

  it('citas: produce workbook con 1 hoja "Citas"', async () => {
    const data = {
      tipo: 'citas',
      filas: [{ FECHA: '2026-01-20', ESPECIALISTA: 'Dr. Rodríguez', ESTATUS: 'Completada' }],
    };
    const buf = await ReportesService.generarXLSX(data);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Citas']);
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
