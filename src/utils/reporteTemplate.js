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
export function generarHTML(data, { fechaInicio, fechaFin }) {
  const { resumen, detalle, ciudades, estudios } = data;
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
