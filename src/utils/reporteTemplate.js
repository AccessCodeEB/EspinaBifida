// Escapa caracteres HTML para evitar que valores de BD rompan el layout del PDF.
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatFecha(d) {
  const fecha = typeof d === 'string' ? new Date(d + 'T12:00:00') : new Date(d);
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: '2-digit' });
}

/**
 * Genera el HTML completo del "Resumen de Periodo" para Puppeteer.
 * @param {object} data  - { resumen, detalle, ciudades, estudios }
 * @param {object} opts  - { fechaInicio: 'YYYY-MM-DD', fechaFin: 'YYYY-MM-DD' }
 * @returns {string} HTML
 */
function formatMes(mesStr) {
  // mesStr = 'YYYY-MM'
  const [y, m] = mesStr.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function generarHTMLEstadisticas(data, { fechaInicio, fechaFin }) {
  const { resumen, detalle, ciudades, estudios, porMes = [] } = data;
  const mitad = Math.ceil(detalle.length / 2);
  const col1  = detalle.slice(0, mitad);
  const col2  = detalle.slice(mitad);

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
    td { vertical-align: top; }
    .resumen-table td { width: 20%; }
    .detalle-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .num { text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="titulo">Asociación de Espina Bífida de Nuevo León, A.B.P.</div>
    <div class="subtitulo">Resumen de Periodo — del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}</div>
    <div class="subtitulo">Generado: ${formatFecha(new Date())}</div>
  </div>

  <h3>Resumen de Servicios</h3>
  <table class="resumen-table">
    <tr>
      <th>Cant. Credenciales</th>
      <th>Cant. Servicios</th>
      <th>Exentos</th>
      <th>Con Cuota</th>
      <th>Hombres</th>
      <th>Mujeres</th>
      <th>Urbano</th>
      <th>Rural</th>
      <th>Lactantes</th>
      <th>Niños</th>
      <th>Adolescentes</th>
      <th>Adultos</th>
    </tr>
    <tr>
      <td class="num">${esc(resumen?.CANT_CREDENCIALES ?? 0)}</td>
      <td class="num">${esc(resumen?.CANT_SERVICIOS   ?? 0)}</td>
      <td class="num">${esc(resumen?.EXENTOS          ?? 0)}</td>
      <td class="num">${esc(resumen?.CON_CUOTA        ?? 0)}</td>
      <td class="num">${esc(resumen?.HOMBRES          ?? 0)}</td>
      <td class="num">${esc(resumen?.MUJERES          ?? 0)}</td>
      <td class="num">${esc(resumen?.URBANO           ?? 0)}</td>
      <td class="num">${esc(resumen?.RURAL            ?? 0)}</td>
      <td class="num">${esc(resumen?.LACTANTES        ?? 0)}</td>
      <td class="num">${esc(resumen?.NINOS            ?? 0)}</td>
      <td class="num">${esc(resumen?.ADOLESCENTES     ?? 0)}</td>
      <td class="num">${esc(resumen?.ADULTOS          ?? 0)}</td>
    </tr>
  </table>

  ${porMes.length > 1 ? `
  <h3>Atenciones por Mes</h3>
  <table style="width:50%">
    <tr><th>Mes</th><th>Pacientes</th><th>Servicios</th></tr>
    ${porMes.map(r => `<tr>
      <td>${esc(formatMes(r.MES))}</td>
      <td class="num">${esc(r.PACIENTES)}</td>
      <td class="num">${esc(r.SERVICIOS)}</td>
    </tr>`).join('')}
  </table>` : ''}

  <h3>Detalle de Servicios</h3>
  <div class="detalle-cols">
    <table>
      <tr><th>Cant.</th><th>Servicio / Artículo</th><th>Unidad</th></tr>
      ${col1.map(r => `<tr>
        <td class="num">${esc(r.CANTIDAD)}</td>
        <td>${esc(r.NOMBRE)}</td>
        <td>${esc(r.UNIDAD)}</td>
      </tr>`).join('')}
    </table>
    <table>
      <tr><th>Cant.</th><th>Servicio / Artículo</th><th>Unidad</th></tr>
      ${col2.map(r => `<tr>
        <td class="num">${esc(r.CANTIDAD)}</td>
        <td>${esc(r.NOMBRE)}</td>
        <td>${esc(r.UNIDAD)}</td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="bottom-grid">
    <div>
      <h3>Distribución por Ciudad</h3>
      <table>
        <tr><th>Cant.</th><th>Ciudad / Municipio</th></tr>
        ${ciudades.map(r => `<tr>
          <td class="num">${esc(r.CANTIDAD)}</td>
          <td>${esc(r.CIUDAD)}</td>
        </tr>`).join('')}
      </table>
    </div>
    <div>
      <h3>Estudios</h3>
      <table>
        <tr><th>Cant.</th><th>Estudio</th></tr>
        ${estudios.length > 0
          ? estudios.map(r => `<tr>
              <td class="num">${esc(r.CANTIDAD)}</td>
              <td>${esc(r.NOMBRE)}</td>
            </tr>`).join('')
          : '<tr><td colspan="2" style="text-align:center;color:#666">Sin estudios configurados</td></tr>'
        }
      </table>
    </div>
  </div>
</body>
</html>`;
}

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
    <div class="stat"><div class="stat-n">${esc(inactivos)}</div><div class="stat-l">No Activos</div></div>
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
