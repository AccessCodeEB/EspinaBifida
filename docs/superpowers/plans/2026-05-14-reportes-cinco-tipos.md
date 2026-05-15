# Reportes: 5 Tipos Adicionales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los 5 tipos de reporte faltantes (Beneficiarios, Membresías, Servicios, Inventario, Citas) end-to-end: query Oracle → PDF/XLSX → frontend descargable.

**Architecture:** El endpoint existente `GET /api/v1/reportes/periodo` recibe un nuevo param `tipo` que enruta a diferentes queries, templates HTML y sheets XLSX. `generarReporte(fi, ff, tipo)` despacha por tipo; `generarHTML(data, opts)` y `generarXLSX(data)` leen `data.tipo` para generar el output correcto.

**Tech Stack:** Node.js + Express (backend), oracledb (Oracle queries), Puppeteer (PDF), xlsx library (XLSX), React/TypeScript (frontend), Jest + Supertest (tests).

---

## File Map

| Archivo | Cambio |
|---|---|
| `src/controllers/reportes.controller.js` | Extraer y validar `tipo` del query param |
| `src/services/reportes.service.js` | `generarReporte` acepta `tipo`; `generarXLSX` despacha por tipo |
| `src/models/reportes.model.js` | Agregar 6 nuevas funciones de query (2 para inventario) |
| `src/utils/reporteTemplate.js` | Renombrar body actual a `generarHTMLEstadisticas`; agregar 5 nuevas funciones + dispatcher |
| `frontend/services/reportes.ts` | Agregar param `tipo` a `fetchReporteUrl` y `downloadReporte` |
| `frontend/components/sections/reportes.tsx` | Pasar `selectedReport` como `tipo` en ambas llamadas |
| `src/tests/reportes.controller.test.js` | Agregar test de validación de `tipo` |
| `src/tests/reportes.service.test.js` | Actualizar DATA con `tipo`, actualizar mock para `generarReporte` |
| `src/tests/reportes.model.test.js` | Agregar tests para las 6 nuevas funciones |
| `src/tests/reportes.unit.test.js` | Agregar `tipo` a DATA_COMPLETA/DATA_VACIA; agregar tests de templates |

---

## Task 1: Wire `tipo` por todo el stack + stubs en el backend

Habilita el param `tipo` de extremo a extremo. Los 5 tipos nuevos retornan data vacía (stub) hasta los Tasks 2–6. El tipo `estadisticas` sigue funcionando igual.

**Files:**
- Modify: `src/controllers/reportes.controller.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `frontend/services/reportes.ts`
- Modify: `frontend/components/sections/reportes.tsx`
- Modify: `src/tests/reportes.controller.test.js`
- Modify: `src/tests/reportes.service.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir test fallido — controller rechaza tipo inválido**

Agregar al final del bloque `describe("GET /api/v1/reportes/periodo — validaciones"` en `src/tests/reportes.controller.test.js`:

```js
it("400 si tipo es inválido", async () => {
  const res = await request(app)
    .get("/api/v1/reportes/periodo?fechaInicio=2026-01-01&fechaFin=2026-01-31&tipo=facturas")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/tipo/i);
});

it("pasa tipo correcto al servicio", async () => {
  const res = await request(app)
    .get("/api/v1/reportes/periodo?fechaInicio=2026-01-01&fechaFin=2026-01-31&tipo=beneficiarios")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(mockGenerarReporte).toHaveBeenCalledWith("2026-01-01", "2026-01-31", "beneficiarios");
});
```

- [ ] **Step 2: Correr test — verificar que falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.controller.test.js --no-coverage
```

Esperado: FAIL — el controller no acepta `tipo`.

- [ ] **Step 3: Implementar validación de `tipo` en el controller**

Reemplazar el body de `getPeriodo` en `src/controllers/reportes.controller.js`:

```js
const TIPOS_VALIDOS = ['estadisticas', 'beneficiarios', 'membresias', 'servicios', 'inventario', 'citas'];

export async function getPeriodo(req, res, next) {
  try {
    const { fechaInicio, fechaFin, formato = 'pdf', tipo = 'estadisticas' } = req.query;

    if (!fechaInicio || !fechaFin)
      throw badRequest('fechaInicio y fechaFin son requeridos');
    if (!DATE_RE.test(fechaInicio) || !DATE_RE.test(fechaFin))
      throw badRequest('Formato de fecha inválido — use YYYY-MM-DD');
    if (fechaInicio > fechaFin)
      throw badRequest('fechaInicio no puede ser posterior a fechaFin');
    if (!['pdf', 'xlsx'].includes(formato))
      throw badRequest('formato debe ser pdf o xlsx');
    if (!TIPOS_VALIDOS.includes(tipo))
      throw badRequest('tipo debe ser: estadisticas, beneficiarios, membresias, servicios, inventario, citas');

    const data = await ReportesService.generarReporte(fechaInicio, fechaFin, tipo);

    if (formato === 'pdf') {
      const buf = await ReportesService.generarPDF(data, fechaInicio, fechaFin);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-${tipo}-${fechaInicio}-${fechaFin}.pdf"`);
      return res.send(buf);
    }

    const buf = await ReportesService.generarXLSX(data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${tipo}-${fechaInicio}-${fechaFin}.xlsx"`);
    return res.send(buf);
  } catch (err) { next(err); }
}
```

- [ ] **Step 4: Actualizar `generarReporte` en el service con switch + stubs**

Reemplazar la función completa `generarReporte` en `src/services/reportes.service.js`:

```js
export async function generarReporte(fechaInicio, fechaFin, tipo = 'estadisticas') {
  switch (tipo) {
    case 'beneficiarios':
      return { tipo, filas: [] };
    case 'membresias':
      return { tipo, filas: [] };
    case 'servicios':
      return { tipo, filas: [] };
    case 'inventario':
      return { tipo, articulos: [], movimientos: [] };
    case 'citas':
      return { tipo, filas: [] };
    default: { // 'estadisticas'
      const resumen  = await ReportesModel.getResumenPeriodo(fechaInicio, fechaFin);
      const detalle  = await ReportesModel.getDetalleServicios(fechaInicio, fechaFin);
      const ciudades = await ReportesModel.getDistribucionCiudades(fechaInicio, fechaFin);
      const estudios = await ReportesModel.getEstudios(fechaInicio, fechaFin);
      const porMes   = await ReportesModel.getAtencionesPorMes(fechaInicio, fechaFin);
      return { tipo: 'estadisticas', resumen, detalle, ciudades, estudios, porMes };
    }
  }
}
```

- [ ] **Step 5: Actualizar `generarXLSX` en el service con switch**

Reemplazar la función completa `generarXLSX` en `src/services/reportes.service.js`:

```js
/**
 * Genera XLSX. Las hojas varían según data.tipo.
 * Retorna Buffer listo para res.send().
 */
export async function generarXLSX(data) {
  const wb = XLSX.utils.book_new();
  switch (data.tipo) {
    case 'beneficiarios':
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.filas), 'Beneficiarios');
      break;
    case 'membresias':
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.filas), 'Membresías');
      break;
    case 'servicios':
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.filas), 'Servicios');
      break;
    case 'inventario':
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.articulos),   'Stock Actual');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.movimientos), 'Movimientos');
      break;
    case 'citas':
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.filas), 'Citas');
      break;
    default: // 'estadisticas'
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([data.resumen]), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.porMes),   'Por Mes');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.detalle),  'Detalle Servicios');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ciudades), 'Ciudades');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.estudios), 'Estudios');
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

- [ ] **Step 6: Refactorizar `reporteTemplate.js` — renombrar body actual y agregar dispatcher**

En `src/utils/reporteTemplate.js`:

1. Renombrar la función exportada actual: cambiar `export function generarHTML(...)` a `function generarHTMLEstadisticas(data, { fechaInicio, fechaFin })` (quitar `export`).

2. Agregar stubs para los 5 tipos nuevos justo después de `generarHTMLEstadisticas`:

```js
function generarHTMLBeneficiarios(data, { fechaInicio, fechaFin }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;font-size:9pt;margin:20px}
  .header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
  .titulo{font-size:13pt;font-weight:bold;text-transform:uppercase}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px 5px}
  th{background:#e0e0e0;font-weight:bold;text-align:center}</style></head><body>
  <div class="header"><div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
  <div>Reporte de Beneficiarios — Próximamente</div></div>
  <p>Este reporte se implementará en el Task 2.</p></body></html>`;
}

function generarHTMLMembresias(data, { fechaInicio, fechaFin }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>
  <p>Reporte de Membresías — Próximamente (Task 3)</p></body></html>`;
}

function generarHTMLServicios(data, { fechaInicio, fechaFin }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>
  <p>Reporte de Servicios — Próximamente (Task 4)</p></body></html>`;
}

function generarHTMLInventario(data, { fechaInicio, fechaFin }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>
  <p>Reporte de Inventario — Próximamente (Task 5)</p></body></html>`;
}

function generarHTMLCitas(data, { fechaInicio, fechaFin }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>
  <p>Reporte de Citas — Próximamente (Task 6)</p></body></html>`;
}
```

3. Agregar el dispatcher exportado al final del archivo:

```js
export function generarHTML(data, { fechaInicio, fechaFin }) {
  switch (data.tipo) {
    case 'beneficiarios': return generarHTMLBeneficiarios(data, { fechaInicio, fechaFin });
    case 'membresias':    return generarHTMLMembresias(data,    { fechaInicio, fechaFin });
    case 'servicios':     return generarHTMLServicios(data,     { fechaInicio, fechaFin });
    case 'inventario':    return generarHTMLInventario(data,    { fechaInicio, fechaFin });
    case 'citas':         return generarHTMLCitas(data,         { fechaInicio, fechaFin });
    default:              return generarHTMLEstadisticas(data,  { fechaInicio, fechaFin });
  }
}
```

- [ ] **Step 7: Agregar `tipo` al frontend service (`reportes.ts`)**

Actualizar `fetchReporteUrl` y `downloadReporte` en `frontend/services/reportes.ts`:

```ts
export async function fetchReporteUrl(
  fechaInicio: string,
  fechaFin: string,
  formato: "pdf" | "xlsx",
  tipo = "estadisticas"
): Promise<string> {
  const token = tokenStorage.get()
  const path = `/v1/reportes/periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&formato=${formato}&tipo=${tipo}`
  // ... resto sin cambios
}

export async function downloadReporte(
  fechaInicio: string,
  fechaFin: string,
  formato: "pdf" | "xlsx",
  tipo = "estadisticas"
): Promise<void> {
  const token = tokenStorage.get()
  const path = `/v1/reportes/periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&formato=${formato}&tipo=${tipo}`
  // ... resto sin cambios
}
```

- [ ] **Step 8: Pasar `selectedReport` como `tipo` en el componente (`reportes.tsx`)**

En `handleDescargar`:
```tsx
await downloadReporte(fechas.fechaInicio, fechas.fechaFin, selectedFormat, selectedReport ?? "estadisticas")
```

En `handlePreview`:
```tsx
const url = await fetchReporteUrl(fechas.fechaInicio, fechas.fechaFin, "pdf", selectedReport ?? "estadisticas")
```

- [ ] **Step 9: Actualizar `DATA` en service test para incluir `tipo`**

En `src/tests/reportes.service.test.js`, agregar `tipo: 'estadisticas'` a `DATA`:
```js
const DATA = {
  tipo:     'estadisticas',
  resumen:  { CANT_SERVICIOS: 10 },
  detalle:  [{ NOMBRE: 'Consulta', CANTIDAD: 5 }],
  ciudades: [{ CIUDAD: 'Monterrey', CANTIDAD: 8 }],
  estudios: [],
  porMes:   [{ MES: '2026-01', PACIENTES: 8, SERVICIOS: 10 }],
};
```

Y actualizar el test de `generarReporte` para pasar `'estadisticas'` explícitamente y agregar mock para `getAtencionesPorMes` con el `tipo` correcto:
```js
it('llama las 5 queries del modelo y retorna el objeto consolidado', async () => {
  mockGetResumenPeriodo      .mockResolvedValueOnce(DATA.resumen);
  mockGetDetalleServicios    .mockResolvedValueOnce(DATA.detalle);
  mockGetDistribucionCiudades.mockResolvedValueOnce(DATA.ciudades);
  mockGetEstudios            .mockResolvedValueOnce(DATA.estudios);
  mockGetAtencionesPorMes    .mockResolvedValueOnce(DATA.porMes);

  const result = await generarReporte(PERIODO.inicio, PERIODO.fin, 'estadisticas');

  expect(result).toEqual(DATA);
});
```

- [ ] **Step 10: Actualizar `DATA_COMPLETA` y `DATA_VACIA` en unit test**

En `src/tests/reportes.unit.test.js`:
```js
const DATA_VACIA = {
  tipo: 'estadisticas',
  // ... resto sin cambios
};

const DATA_COMPLETA = {
  tipo: 'estadisticas',
  // ... resto sin cambios
};
```

- [ ] **Step 11: Correr todos los tests de reportes — deben pasar**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

Esperado: todos los tests en verde.

- [ ] **Step 12: Commit**

```bash
git add src/controllers/reportes.controller.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        frontend/services/reportes.ts frontend/components/sections/reportes.tsx \
        src/tests/reportes.controller.test.js src/tests/reportes.service.test.js \
        src/tests/reportes.unit.test.js
git commit -m "feat(reportes): agregar param tipo al endpoint y stubs para 5 tipos nuevos"
```

---

## Task 2: Reporte de Beneficiarios

Muestra los beneficiarios que recibieron algún servicio en el periodo, con datos demográficos básicos.

**Files:**
- Modify: `src/models/reportes.model.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `src/tests/reportes.model.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir test fallido para `getBeneficiariosPeriodo`**

Agregar al final de `src/tests/reportes.model.test.js`:

```js
// ── getBeneficiariosPeriodo ───────────────────────────────────────────────────

describe('getBeneficiariosPeriodo', () => {
  it('retorna filas de beneficiarios con servicio en el periodo', async () => {
    const rows = [
      {
        CURP: 'GARM900101HNLRLS01',
        NOMBRE_COMPLETO: 'Marco García López',
        GENERO: 'Masculino',
        FECHA_NACIMIENTO: new Date('1990-01-01'),
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
```

Agregar `getBeneficiariosPeriodo` a la línea de importación en ese mismo test file:
```js
const {
  getResumenPeriodo,
  getDetalleServicios,
  getDistribucionCiudades,
  getEstudios,
  getBeneficiariosPeriodo,  // <-- agregar
  guardarRegistro,
  findHistorico,
  findById,
  ESTUDIOS_IDS,
} = await import('../models/reportes.model.js');
```

- [ ] **Step 2: Correr test — verificar que falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

Esperado: FAIL — `getBeneficiariosPeriodo is not a function`.

- [ ] **Step 3: Implementar `getBeneficiariosPeriodo` en el modelo**

Agregar en `src/models/reportes.model.js`, antes de `guardarRegistro`:

```js
// ── 6. Beneficiarios con servicio en el periodo ───────────────────────────────
export async function getBeneficiariosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT DISTINCT
        B.CURP,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO || ' ' || B.APELLIDO_MATERNO AS NOMBRE_COMPLETO,
        B.GENERO,
        B.FECHA_NACIMIENTO,
        B.MUNICIPIO,
        B.ESTADO,
        B.ESTATUS
      FROM BENEFICIARIOS B
      JOIN SERVICIOS S ON B.CURP = S.CURP
      WHERE S.FECHA BETWEEN :fi AND :ff
      ORDER BY B.APELLIDO_PATERNO, B.NOMBRES
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Correr test — verificar que pasa**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

Esperado: PASS — todos los tests del modelo en verde.

- [ ] **Step 5: Reemplazar stub en el service con la query real**

En `src/services/reportes.service.js`, reemplazar el case `'beneficiarios'`:

```js
case 'beneficiarios': {
  const filas = await ReportesModel.getBeneficiariosPeriodo(fechaInicio, fechaFin);
  return { tipo, filas };
}
```

- [ ] **Step 6: Implementar `generarHTMLBeneficiarios` en el template**

Reemplazar la función stub `generarHTMLBeneficiarios` en `src/utils/reporteTemplate.js`:

```js
function generarHTMLBeneficiarios({ filas }, { fechaInicio, fechaFin }) {
  const total    = filas.length;
  const hombres  = filas.filter(r => r.GENERO === 'Masculino').length;
  const mujeres  = filas.filter(r => r.GENERO === 'Femenino').length;
  const activos  = filas.filter(r => r.ESTATUS === 'Activo').length;
  const inactivos = filas.filter(r => r.ESTATUS !== 'Activo').length;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .titulo { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .subtitulo { font-size: 10pt; margin-top: 4px; }
    h3 { margin: 10px 0 4px; font-size: 10pt; background: #e0e0e0; padding: 3px 5px; border: 1px solid #999; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 3px 5px; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; }
    .num { text-align: center; font-weight: bold; }
    .resumen-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 8px 0; }
    .stat { border: 1px solid #999; padding: 6px; text-align: center; }
    .stat-n { font-size: 14pt; font-weight: bold; }
    .stat-l { font-size: 8pt; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Reporte de Beneficiarios Atendidos — del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Resumen</h3>
  <div class="resumen-grid">
    <div class="stat"><div class="stat-n">${esc(total)}</div><div class="stat-l">Total</div></div>
    <div class="stat"><div class="stat-n">${esc(hombres)}</div><div class="stat-l">Hombres</div></div>
    <div class="stat"><div class="stat-n">${esc(mujeres)}</div><div class="stat-l">Mujeres</div></div>
    <div class="stat"><div class="stat-n">${esc(activos)}</div><div class="stat-l">Activos</div></div>
    <div class="stat"><div class="stat-n">${esc(inactivos)}</div><div class="stat-l">Inactivos</div></div>
  </div>

  <h3>Detalle de Beneficiarios</h3>
  <table>
    <tr>
      <th>CURP</th><th>Nombre</th><th>Género</th><th>Municipio</th><th>Estatus</th>
    </tr>
    ${filas.length > 0
      ? filas.map(r => `<tr>
          <td>${esc(r.CURP)}</td>
          <td>${esc(r.NOMBRE_COMPLETO)}</td>
          <td class="num">${esc(r.GENERO)}</td>
          <td>${esc(r.MUNICIPIO ?? '—')}</td>
          <td class="num">${esc(r.ESTATUS)}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#666">Sin beneficiarios en el periodo</td></tr>'
    }
  </table>
</body>
</html>`;
}
```

- [ ] **Step 7: Agregar test de template de beneficiarios**

Agregar en el `describe('generarHTML')` de `src/tests/reportes.unit.test.js`:

```js
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
```

- [ ] **Step 8: Correr todos los tests de reportes**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

Esperado: todos en verde.

- [ ] **Step 9: Commit**

```bash
git add src/models/reportes.model.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        src/tests/reportes.model.test.js src/tests/reportes.unit.test.js
git commit -m "feat(reportes): implementar reporte de beneficiarios"
```

---

## Task 3: Reporte de Membresías

Muestra todas las credenciales cuyo periodo de vigencia se superpone con el rango seleccionado, con su estado actual (Activa / Por vencer / Vencida).

**Files:**
- Modify: `src/models/reportes.model.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `src/tests/reportes.model.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir test fallido para `getMembresias`**

Agregar en `src/tests/reportes.model.test.js` e importar `getMembresias`:

```js
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
```

Agregar `getMembresias` a la línea de importación del test.

- [ ] **Step 2: Correr test — verificar que falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 3: Implementar `getMembresias` en el modelo**

```js
// ── 7. Membresías vigentes o que se superponen con el periodo ─────────────────
export async function getMembresias(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        C.NUMERO_CREDENCIAL,
        C.FECHA_VIGENCIA_INICIO,
        C.FECHA_VIGENCIA_FIN,
        C.FECHA_ULTIMO_PAGO,
        CASE
          WHEN SYSDATE BETWEEN C.FECHA_VIGENCIA_INICIO AND C.FECHA_VIGENCIA_FIN
               AND (C.FECHA_VIGENCIA_FIN - SYSDATE) <= 30 THEN 'Por vencer'
          WHEN SYSDATE BETWEEN C.FECHA_VIGENCIA_INICIO AND C.FECHA_VIGENCIA_FIN THEN 'Activa'
          WHEN C.FECHA_VIGENCIA_FIN < SYSDATE THEN 'Vencida'
          ELSE 'Futura'
        END AS ESTADO
      FROM CREDENCIALES C
      JOIN BENEFICIARIOS B ON C.CURP = B.CURP
      WHERE C.FECHA_VIGENCIA_INICIO BETWEEN :fi AND :ff
         OR C.FECHA_VIGENCIA_FIN    BETWEEN :fi AND :ff
         OR (C.FECHA_VIGENCIA_INICIO <= :fi AND C.FECHA_VIGENCIA_FIN >= :ff)
      ORDER BY C.FECHA_VIGENCIA_FIN DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Correr test — verificar que pasa**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 5: Reemplazar stub en el service**

```js
case 'membresias': {
  const filas = await ReportesModel.getMembresias(fechaInicio, fechaFin);
  return { tipo, filas };
}
```

- [ ] **Step 6: Implementar `generarHTMLMembresias`**

Reemplazar el stub en `src/utils/reporteTemplate.js`:

```js
function generarHTMLMembresias({ filas }, { fechaInicio, fechaFin }) {
  const activas    = filas.filter(r => r.ESTADO === 'Activa').length;
  const porVencer  = filas.filter(r => r.ESTADO === 'Por vencer').length;
  const vencidas   = filas.filter(r => r.ESTADO === 'Vencida').length;
  const futuras    = filas.filter(r => r.ESTADO === 'Futura').length;

  const estadoStyle = (estado) => {
    if (estado === 'Activa')    return 'color:#2a7a2a;font-weight:bold';
    if (estado === 'Por vencer') return 'color:#b87c00;font-weight:bold';
    if (estado === 'Vencida')   return 'color:#c0392b;font-weight:bold';
    return 'color:#555';
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .titulo { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .subtitulo { font-size: 10pt; margin-top: 4px; }
    h3 { margin: 10px 0 4px; font-size: 10pt; background: #e0e0e0; padding: 3px 5px; border: 1px solid #999; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 3px 5px; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; }
    .resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
    .stat { border: 1px solid #999; padding: 6px; text-align: center; }
    .stat-n { font-size: 14pt; font-weight: bold; }
    .stat-l { font-size: 8pt; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Reporte de Membresías — del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Resumen</h3>
  <div class="resumen-grid">
    <div class="stat"><div class="stat-n" style="color:#2a7a2a">${esc(activas)}</div><div class="stat-l">Activas</div></div>
    <div class="stat"><div class="stat-n" style="color:#b87c00">${esc(porVencer)}</div><div class="stat-l">Por vencer (≤30 días)</div></div>
    <div class="stat"><div class="stat-n" style="color:#c0392b">${esc(vencidas)}</div><div class="stat-l">Vencidas</div></div>
    <div class="stat"><div class="stat-n">${esc(futuras)}</div><div class="stat-l">Futuras</div></div>
  </div>

  <h3>Detalle de Membresías</h3>
  <table>
    <tr>
      <th>Nombre</th><th>CURP</th><th>No. Credencial</th>
      <th>Inicio</th><th>Fin vigencia</th><th>Último pago</th><th>Estado</th>
    </tr>
    ${filas.length > 0
      ? filas.map(r => `<tr>
          <td>${esc(r.NOMBRE)}</td>
          <td>${esc(r.CURP)}</td>
          <td>${esc(r.NUMERO_CREDENCIAL ?? '—')}</td>
          <td>${esc(r.FECHA_VIGENCIA_INICIO ? formatFecha(r.FECHA_VIGENCIA_INICIO) : '—')}</td>
          <td>${esc(r.FECHA_VIGENCIA_FIN   ? formatFecha(r.FECHA_VIGENCIA_FIN)   : '—')}</td>
          <td>${esc(r.FECHA_ULTIMO_PAGO    ? formatFecha(r.FECHA_ULTIMO_PAGO)    : '—')}</td>
          <td style="${estadoStyle(r.ESTADO)}">${esc(r.ESTADO)}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:#666">Sin membresías en el periodo</td></tr>'
    }
  </table>
</body>
</html>`;
}
```

- [ ] **Step 7: Agregar test de template de membresías**

```js
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
```

- [ ] **Step 8: Correr todos los tests de reportes**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

- [ ] **Step 9: Commit**

```bash
git add src/models/reportes.model.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        src/tests/reportes.model.test.js src/tests/reportes.unit.test.js
git commit -m "feat(reportes): implementar reporte de membresías"
```

---

## Task 4: Reporte de Servicios

Lista todos los servicios registrados en el periodo con beneficiario, tipo de servicio, costo y modalidad de pago.

**Files:**
- Modify: `src/models/reportes.model.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `src/tests/reportes.model.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir test fallido para `getServiciosPeriodo`**

Agregar en `src/tests/reportes.model.test.js` e importar `getServiciosPeriodo`:

```js
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
```

- [ ] **Step 2: Correr test — verificar que falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 3: Implementar `getServiciosPeriodo` en el modelo**

```js
// ── 8. Detalle de servicios individuales del periodo ─────────────────────────
export async function getServiciosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        TO_CHAR(S.FECHA, 'YYYY-MM-DD') AS FECHA,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        SC.NOMBRE AS TIPO_SERVICIO,
        S.COSTO,
        S.MONTO_PAGADO,
        CASE WHEN S.MONTO_PAGADO = 0 THEN 'Exento' ELSE 'Con cuota' END AS MODALIDAD
      FROM SERVICIOS S
      JOIN BENEFICIARIOS B ON S.CURP = B.CURP
      JOIN SERVICIOS_CATALOGO SC ON S.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE S.FECHA BETWEEN :fi AND :ff
      ORDER BY S.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Correr test — verificar que pasa**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 5: Reemplazar stub en el service**

```js
case 'servicios': {
  const filas = await ReportesModel.getServiciosPeriodo(fechaInicio, fechaFin);
  return { tipo, filas };
}
```

- [ ] **Step 6: Implementar `generarHTMLServicios`**

```js
function generarHTMLServicios({ filas }, { fechaInicio, fechaFin }) {
  const total      = filas.length;
  const exentos    = filas.filter(r => r.MODALIDAD === 'Exento').length;
  const conCuota   = filas.filter(r => r.MODALIDAD === 'Con cuota').length;
  const montoTotal = filas.reduce((s, r) => s + (Number(r.MONTO_PAGADO) || 0), 0).toFixed(2);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .titulo { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .subtitulo { font-size: 10pt; margin-top: 4px; }
    h3 { margin: 10px 0 4px; font-size: 10pt; background: #e0e0e0; padding: 3px 5px; border: 1px solid #999; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 3px 5px; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; }
    .num { text-align: right; }
    .resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
    .stat { border: 1px solid #999; padding: 6px; text-align: center; }
    .stat-n { font-size: 14pt; font-weight: bold; }
    .stat-l { font-size: 8pt; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Reporte de Servicios — del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Resumen</h3>
  <div class="resumen-grid">
    <div class="stat"><div class="stat-n">${esc(total)}</div><div class="stat-l">Total servicios</div></div>
    <div class="stat"><div class="stat-n">${esc(exentos)}</div><div class="stat-l">Exentos</div></div>
    <div class="stat"><div class="stat-n">${esc(conCuota)}</div><div class="stat-l">Con cuota</div></div>
    <div class="stat"><div class="stat-n">$${esc(montoTotal)}</div><div class="stat-l">Monto recaudado</div></div>
  </div>

  <h3>Detalle de Servicios</h3>
  <table>
    <tr>
      <th>Fecha</th><th>Beneficiario</th><th>CURP</th>
      <th>Tipo de servicio</th><th>Costo</th><th>Pagado</th><th>Modalidad</th>
    </tr>
    ${filas.length > 0
      ? filas.map(r => `<tr>
          <td>${esc(r.FECHA)}</td>
          <td>${esc(r.NOMBRE)}</td>
          <td>${esc(r.CURP)}</td>
          <td>${esc(r.TIPO_SERVICIO)}</td>
          <td class="num">$${esc(Number(r.COSTO ?? 0).toFixed(2))}</td>
          <td class="num">$${esc(Number(r.MONTO_PAGADO ?? 0).toFixed(2))}</td>
          <td>${esc(r.MODALIDAD)}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:#666">Sin servicios en el periodo</td></tr>'
    }
  </table>
</body>
</html>`;
}
```

- [ ] **Step 7: Agregar test de template de servicios**

```js
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
```

- [ ] **Step 8: Correr todos los tests de reportes**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

- [ ] **Step 9: Commit**

```bash
git add src/models/reportes.model.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        src/tests/reportes.model.test.js src/tests/reportes.unit.test.js
git commit -m "feat(reportes): implementar reporte de servicios"
```

---

## Task 5: Reporte de Inventario

Muestra el stock actual de todos los artículos y los movimientos registrados en el periodo.

**Files:**
- Modify: `src/models/reportes.model.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `src/tests/reportes.model.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir tests fallidos para `getArticulosStock` y `getMovimientosPeriodo`**

Agregar en `src/tests/reportes.model.test.js` e importar ambas funciones:

```js
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
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 3: Implementar `getArticulosStock` y `getMovimientosPeriodo` en el modelo**

```js
// ── 9. Stock actual de todos los artículos ────────────────────────────────────
export async function getArticulosStock() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        A.ID_ARTICULO,
        A.DESCRIPCION,
        A.UNIDAD,
        A.INVENTARIO_ACTUAL,
        A.CUOTA_RECUPERACION,
        A.MANEJA_INVENTARIO
      FROM ARTICULOS A
      ORDER BY A.DESCRIPCION
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── 10. Movimientos de inventario en el periodo ───────────────────────────────
export async function getMovimientosPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        A.DESCRIPCION AS ARTICULO,
        M.TIPO_MOVIMIENTO,
        M.CANTIDAD,
        TO_CHAR(M.FECHA, 'YYYY-MM-DD') AS FECHA,
        M.MOTIVO
      FROM MOVIMIENTOS_INVENTARIO M
      JOIN ARTICULOS A ON M.ID_ARTICULO = A.ID_ARTICULO
      WHERE M.FECHA BETWEEN :fi AND :ff
      ORDER BY M.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 5: Reemplazar stub en el service**

```js
case 'inventario': {
  const articulos   = await ReportesModel.getArticulosStock();
  const movimientos = await ReportesModel.getMovimientosPeriodo(fechaInicio, fechaFin);
  return { tipo, articulos, movimientos };
}
```

- [ ] **Step 6: Implementar `generarHTMLInventario`**

```js
function generarHTMLInventario({ articulos, movimientos }, { fechaInicio, fechaFin }) {
  const conInventario = articulos.filter(a => a.MANEJA_INVENTARIO === 'S');
  const sinStock      = conInventario.filter(a => a.INVENTARIO_ACTUAL <= 0).length;
  const bajoStock     = conInventario.filter(a => a.INVENTARIO_ACTUAL > 0 && a.INVENTARIO_ACTUAL <= 5).length;

  const stockStyle = (a) => {
    if (a.MANEJA_INVENTARIO !== 'S') return '';
    if (a.INVENTARIO_ACTUAL <= 0)  return 'color:#c0392b;font-weight:bold';
    if (a.INVENTARIO_ACTUAL <= 5)  return 'color:#b87c00;font-weight:bold';
    return 'color:#2a7a2a';
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .titulo { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .subtitulo { font-size: 10pt; margin-top: 4px; }
    h3 { margin: 10px 0 4px; font-size: 10pt; background: #e0e0e0; padding: 3px 5px; border: 1px solid #999; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #999; padding: 3px 5px; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; }
    .num { text-align: center; font-weight: bold; }
    .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
    .stat { border: 1px solid #999; padding: 6px; text-align: center; }
    .stat-n { font-size: 14pt; font-weight: bold; }
    .stat-l { font-size: 8pt; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Reporte de Inventario — Movimientos del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Alertas de Stock</h3>
  <div class="resumen-grid">
    <div class="stat"><div class="stat-n">${esc(articulos.length)}</div><div class="stat-l">Total artículos</div></div>
    <div class="stat"><div class="stat-n" style="color:#c0392b">${esc(sinStock)}</div><div class="stat-l">Sin stock</div></div>
    <div class="stat"><div class="stat-n" style="color:#b87c00">${esc(bajoStock)}</div><div class="stat-l">Stock bajo (≤5)</div></div>
  </div>

  <h3>Stock Actual</h3>
  <table>
    <tr>
      <th>Artículo</th><th>Unidad</th><th>Stock</th><th>Cuota</th><th>Rastreo</th>
    </tr>
    ${articulos.length > 0
      ? articulos.map(a => `<tr>
          <td>${esc(a.DESCRIPCION)}</td>
          <td>${esc(a.UNIDAD)}</td>
          <td class="num" style="${stockStyle(a)}">${a.MANEJA_INVENTARIO === 'S' ? esc(a.INVENTARIO_ACTUAL) : '—'}</td>
          <td class="num">$${esc(Number(a.CUOTA_RECUPERACION ?? 0).toFixed(2))}</td>
          <td class="num">${a.MANEJA_INVENTARIO === 'S' ? 'Sí' : 'No'}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#666">Sin artículos registrados</td></tr>'
    }
  </table>

  <h3>Movimientos en el Periodo</h3>
  <table>
    <tr><th>Fecha</th><th>Artículo</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th></tr>
    ${movimientos.length > 0
      ? movimientos.map(m => `<tr>
          <td>${esc(m.FECHA)}</td>
          <td>${esc(m.ARTICULO)}</td>
          <td class="num" style="${m.TIPO_MOVIMIENTO === 'SALIDA' ? 'color:#c0392b' : 'color:#2a7a2a'}">${esc(m.TIPO_MOVIMIENTO)}</td>
          <td class="num">${esc(m.CANTIDAD)}</td>
          <td>${esc(m.MOTIVO ?? '—')}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#666">Sin movimientos en el periodo</td></tr>'
    }
  </table>
</body>
</html>`;
}
```

- [ ] **Step 7: Agregar test de template de inventario**

```js
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
```

- [ ] **Step 8: Correr todos los tests de reportes**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

- [ ] **Step 9: Commit**

```bash
git add src/models/reportes.model.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        src/tests/reportes.model.test.js src/tests/reportes.unit.test.js
git commit -m "feat(reportes): implementar reporte de inventario"
```

---

## Task 6: Reporte de Citas

Lista todas las citas del periodo agrupadas con beneficiario, especialista y estatus.

**Files:**
- Modify: `src/models/reportes.model.js`
- Modify: `src/services/reportes.service.js`
- Modify: `src/utils/reporteTemplate.js`
- Modify: `src/tests/reportes.model.test.js`
- Modify: `src/tests/reportes.unit.test.js`

- [ ] **Step 1: Escribir test fallido para `getCitasPeriodo`**

Agregar en `src/tests/reportes.model.test.js` e importar `getCitasPeriodo`:

```js
describe('getCitasPeriodo', () => {
  it('retorna filas de citas en el periodo', async () => {
    const rows = [
      {
        FECHA: '2026-01-20',
        NOMBRE: 'Ana Martínez',
        CURP: 'MARA850515MNLRNS02',
        TIPO_SERVICIO: 'Neurología',
        ESPECIALISTA: 'Dr. Rodríguez',
        ESTATUS: 'Completada',
      },
    ];
    mockExecute.mockResolvedValueOnce({ rows });

    const result = await getCitasPeriodo(PERIODO.inicio, PERIODO.fin);

    expect(result).toEqual(rows);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('retorna [] si no hay citas en el periodo', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await getCitasPeriodo(PERIODO.inicio, PERIODO.fin);
    expect(result).toEqual([]);
  });

  it('cierra conexión si execute lanza', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ORA-00600'));
    await expect(getCitasPeriodo(PERIODO.inicio, PERIODO.fin)).rejects.toThrow('ORA-00600');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Correr test — verificar que falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 3: Implementar `getCitasPeriodo` en el modelo**

```js
// ── 11. Citas del periodo ─────────────────────────────────────────────────────
export async function getCitasPeriodo(fechaInicio, fechaFin) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
      SELECT
        TO_CHAR(C.FECHA, 'YYYY-MM-DD') AS FECHA,
        B.NOMBRES || ' ' || B.APELLIDO_PATERNO AS NOMBRE,
        B.CURP,
        SC.NOMBRE AS TIPO_SERVICIO,
        C.ESPECIALISTA,
        C.ESTATUS
      FROM CITAS C
      JOIN BENEFICIARIOS B ON C.CURP = B.CURP
      JOIN SERVICIOS_CATALOGO SC ON C.ID_TIPO_SERVICIO = SC.ID_TIPO_SERVICIO
      WHERE C.FECHA BETWEEN :fi AND :ff
      ORDER BY C.FECHA DESC
    `,
    { fi: new Date(fechaInicio), ff: new Date(fechaFin) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
}
```

- [ ] **Step 4: Correr test — verificar que pasa**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes.model.test.js --no-coverage
```

- [ ] **Step 5: Reemplazar stub en el service**

```js
case 'citas': {
  const filas = await ReportesModel.getCitasPeriodo(fechaInicio, fechaFin);
  return { tipo, filas };
}
```

- [ ] **Step 6: Implementar `generarHTMLCitas`**

```js
function generarHTMLCitas({ filas }, { fechaInicio, fechaFin }) {
  const total = filas.length;

  // Agrupar por estatus
  const byEstatus = filas.reduce((acc, r) => {
    acc[r.ESTATUS] = (acc[r.ESTATUS] || 0) + 1;
    return acc;
  }, {});

  // Agrupar por especialista
  const byEspecialista = filas.reduce((acc, r) => {
    const esp = r.ESPECIALISTA ?? 'Sin asignar';
    acc[esp] = (acc[esp] || 0) + 1;
    return acc;
  }, {});

  const estatusStyle = (e) => {
    if (e === 'Completada') return 'color:#2a7a2a;font-weight:bold';
    if (e === 'Cancelada')  return 'color:#c0392b;font-weight:bold';
    return 'color:#b87c00;font-weight:bold'; // Pendiente / otros
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .titulo { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .subtitulo { font-size: 10pt; margin-top: 4px; }
    h3 { margin: 10px 0 4px; font-size: 10pt; background: #e0e0e0; padding: 3px 5px; border: 1px solid #999; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #999; padding: 3px 5px; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; }
    .num { text-align: center; font-weight: bold; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Reporte de Citas — del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Resumen — Total: ${esc(total)} citas</h3>
  <div class="bottom-grid">
    <div>
      <table>
        <tr><th>Estatus</th><th>Cantidad</th></tr>
        ${Object.entries(byEstatus).length > 0
          ? Object.entries(byEstatus).map(([e, n]) => `<tr>
              <td style="${estatusStyle(e)}">${esc(e)}</td>
              <td class="num">${esc(n)}</td>
            </tr>`).join('')
          : '<tr><td colspan="2" style="text-align:center;color:#666">—</td></tr>'
        }
      </table>
    </div>
    <div>
      <table>
        <tr><th>Especialista</th><th>Citas</th></tr>
        ${Object.entries(byEspecialista).length > 0
          ? Object.entries(byEspecialista)
              .sort((a, b) => b[1] - a[1])
              .map(([e, n]) => `<tr>
                <td>${esc(e)}</td>
                <td class="num">${esc(n)}</td>
              </tr>`).join('')
          : '<tr><td colspan="2" style="text-align:center;color:#666">—</td></tr>'
        }
      </table>
    </div>
  </div>

  <h3>Detalle de Citas</h3>
  <table>
    <tr>
      <th>Fecha</th><th>Beneficiario</th><th>CURP</th>
      <th>Servicio</th><th>Especialista</th><th>Estatus</th>
    </tr>
    ${filas.length > 0
      ? filas.map(r => `<tr>
          <td>${esc(r.FECHA)}</td>
          <td>${esc(r.NOMBRE)}</td>
          <td>${esc(r.CURP)}</td>
          <td>${esc(r.TIPO_SERVICIO)}</td>
          <td>${esc(r.ESPECIALISTA ?? '—')}</td>
          <td style="${estatusStyle(r.ESTATUS)}">${esc(r.ESTATUS)}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:#666">Sin citas en el periodo</td></tr>'
    }
  </table>
</body>
</html>`;
}
```

- [ ] **Step 7: Agregar test de template de citas**

```js
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
```

- [ ] **Step 8: Correr todos los tests de reportes — suite completa**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tests/reportes --no-coverage
```

Esperado: todos en verde. Verificar que el número total de tests subió desde 62.

- [ ] **Step 9: Commit final + push**

```bash
git add src/models/reportes.model.js src/services/reportes.service.js \
        src/utils/reporteTemplate.js \
        src/tests/reportes.model.test.js src/tests/reportes.unit.test.js
git commit -m "feat(reportes): implementar reporte de citas — módulo de reportes completo"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Beneficiarios — query + HTML + XLSX + tests
- ✅ Membresías — query + HTML + XLSX + tests (estado Activa/Por vencer/Vencida en SQL)
- ✅ Servicios — query + HTML + XLSX + tests (con resumen de montos)
- ✅ Inventario — 2 queries (stock + movimientos) + HTML + XLSX + tests
- ✅ Citas — query + HTML + XLSX + tests (resumen por estatus y especialista)
- ✅ Frontend pasa `selectedReport` como `tipo` al backend
- ✅ Controller valida `tipo` con whitelist
- ✅ Stubs en Task 1 mantienen estadisticas funcionando durante la implementación

**Placeholder scan:** ninguno — toda función tiene código real, todos los tests tienen asserts concretos.

**Type consistency:**
- `data.filas` usado en beneficiarios, membresías, servicios, citas — consistente
- `data.articulos` + `data.movimientos` solo en inventario — consistente
- `data.tipo` usado como discriminador en todos los dispatchers — consistente
- Columnas Oracle en UPPERCASE en todo el código — consistente con `oracledb.OUT_FORMAT_OBJECT`
