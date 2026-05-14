import cron from 'node-cron';
import path from 'path';
import fs   from 'fs/promises';
import * as ReportesService from '../services/reportes.service.js';
import * as ReportesModel   from '../models/reportes.model.js';

// Cron expressions (disparan en el primer día del periodo siguiente):
//   Mensual:    '0 6 1 * *'    → 1er día de cada mes, 6am
//   Semestral:  '0 6 1 1,7 *'  → 1 de enero y 1 de julio, 6am
//   Anual:      '0 6 1 1 *'    → 1 de enero, 6am

const STORAGE = path.resolve(process.env.STORAGE_PATH ?? './storage/reportes');

/**
 * Calcula el rango de fechas del periodo ya cerrado según el tipo y la fecha
 * de disparo del cron. Los reportes automáticos siempre cubren el periodo anterior.
 */
export function calcularPeriodo(tipo, hoy) {
  const y = hoy.getFullYear();
  const m = hoy.getMonth(); // 0-indexed

  if (tipo === 'MENSUAL') {
    // 1-feb → cubre enero; 1-ene (m=0) → new Date(y,-1,1) = 1-dic del año anterior
    const inicio = new Date(y, m - 1, 1);
    const fin    = new Date(y, m, 0);    // día 0 del mes actual = último del anterior
    return { fechaInicio: fmtDate(inicio), fechaFin: fmtDate(fin) };
  }
  if (tipo === 'SEMESTRAL') {
    // Dispara el 1-ene → cubre jul-dic del año anterior
    // Dispara el 1-jul → cubre ene-jun del año actual
    if (m === 0) return { fechaInicio: `${y - 1}-07-01`, fechaFin: `${y - 1}-12-31` };
    return { fechaInicio: `${y}-01-01`, fechaFin: `${y}-06-30` };
  }
  // ANUAL: dispara 1-ene → cubre todo el año anterior
  return { fechaInicio: `${y - 1}-01-01`, fechaFin: `${y - 1}-12-31` };
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function generarAutomatico(tipo) {
  const { fechaInicio, fechaFin } = calcularPeriodo(tipo, new Date());
  try {
    const data = await ReportesService.generarReporte(fechaInicio, fechaFin);
    const pdf  = await ReportesService.generarPDF(data, fechaInicio, fechaFin);
    const xlsx = await ReportesService.generarXLSX(data);

    const mes  = fechaInicio.slice(0, 7);
    const dir  = path.join(STORAGE, mes);
    await fs.mkdir(dir, { recursive: true });

    const base     = `reporte-${tipo.toLowerCase()}-${fechaInicio}`;
    const rutaPdf  = path.join(mes, `${base}.pdf`);
    const rutaXlsx = path.join(mes, `${base}.xlsx`);

    await fs.writeFile(path.join(STORAGE, rutaPdf),  pdf);
    await fs.writeFile(path.join(STORAGE, rutaXlsx), xlsx);

    await ReportesModel.guardarRegistro({ tipo, fechaInicio, fechaFin, rutaPdf, rutaXlsx });
    console.log(`[scheduler] Reporte ${tipo} generado: ${fechaInicio} → ${fechaFin}`);
  } catch (err) {
    // No lanzar — el scheduler nunca debe crashear el proceso
    console.error(`[scheduler] Error generando reporte ${tipo} (${fechaInicio}–${fechaFin}):`, err);
  }
}

/**
 * Inicia los cron jobs según variables de entorno.
 * Llamar desde server.js después de que el pool Oracle esté listo.
 *
 * Variables:
 *   REPORT_MENSUAL=true|false
 *   REPORT_SEMESTRAL=true|false
 *   REPORT_ANUAL=true|false
 */
export function initScheduler() {
  if (process.env.REPORT_MENSUAL   === 'true') {
    cron.schedule('0 6 1 * *',   () => generarAutomatico('MENSUAL'));
    console.log('[scheduler] Reporte MENSUAL activado (0 6 1 * *)');
  }
  if (process.env.REPORT_SEMESTRAL === 'true') {
    cron.schedule('0 6 1 1,7 *', () => generarAutomatico('SEMESTRAL'));
    console.log('[scheduler] Reporte SEMESTRAL activado (0 6 1 1,7 *)');
  }
  if (process.env.REPORT_ANUAL     === 'true') {
    cron.schedule('0 6 1 1 *',   () => generarAutomatico('ANUAL'));
    console.log('[scheduler] Reporte ANUAL activado (0 6 1 1 *)');
  }
}
