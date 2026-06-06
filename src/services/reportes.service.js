import puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import * as ReportesModel from '../models/reportes.model.js';
import { generarHTML } from '../utils/reporteTemplate.js';

/**
 * Ejecuta las queries Oracle según el tipo de reporte solicitado.
 * Los tipos distintos de 'estadisticas' retornan stubs vacíos (se implementan en Tasks 2-6).
 */
export async function generarReporte(fechaInicio, fechaFin, tipo = 'estadisticas') {
  switch (tipo) {
    case 'beneficiarios': {
      const filas = await ReportesModel.getBeneficiariosPeriodo(fechaInicio, fechaFin);
      return { tipo, filas };
    }
    case 'membresias': {
      const filas = await ReportesModel.getMembresias(fechaInicio, fechaFin);
      return { tipo, filas };
    }
    case 'servicios': {
      const filas = await ReportesModel.getServiciosPeriodo(fechaInicio, fechaFin);
      return { tipo, filas };
    }
    case 'inventario': {
      const [articulos, movimientos] = await Promise.all([
        ReportesModel.getArticulosStock(),
        ReportesModel.getMovimientosPeriodo(fechaInicio, fechaFin),
      ]);
      return { tipo, articulos, movimientos };
    }
    case 'citas': {
      const filas = await ReportesModel.getCitasPeriodo(fechaInicio, fechaFin);
      return { tipo, filas };
    }
    default: { // 'estadisticas'
      const [resumen, detalle, ciudades, estudios, porMes] = await Promise.all([
        ReportesModel.getResumenPeriodo(fechaInicio, fechaFin),
        ReportesModel.getDetalleServicios(fechaInicio, fechaFin),
        ReportesModel.getDistribucionCiudades(fechaInicio, fechaFin),
        ReportesModel.getEstudios(fechaInicio, fechaFin),
        ReportesModel.getAtencionesPorMes(fechaInicio, fechaFin),
      ]);
      return { tipo: 'estadisticas', resumen, detalle, ciudades, estudios, porMes };
    }
  }
}

// Singleton del browser — se lanza una sola vez y se reutiliza entre peticiones.
// Si el proceso de Chrome cae (browser.connected = false), se relanza automáticamente.
let _browser = null;

async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage', // evita OOM en VMs con /dev/shm limitado
      ],
    });
  }
  return _browser;
}

// Cierra el browser al apagar el proceso para evitar procesos Chrome huérfanos.
/* istanbul ignore next */
const _closeBrowser = () => { _browser?.close().catch(() => {}); };
/* istanbul ignore next */
process.once('exit',   _closeBrowser);
/* istanbul ignore next */
process.once('SIGTERM', _closeBrowser);

/**
 * Genera PDF usando Puppeteer (Chrome headless).
 * Reutiliza el browser singleton — solo abre/cierra una Page, no un Chrome entero.
 */
export async function generarPDF(data, fechaInicio, fechaFin) {
  const html    = generarHTML(data, { fechaInicio, fechaFin });
  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    // 'load' es correcto para HTML estático sin recursos externos.
    // 'networkidle0' agrega ~500ms de espera innecesaria en este caso.
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({ format: 'Letter', printBackground: true });
  } finally {
    await page.close();
  }
}

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
