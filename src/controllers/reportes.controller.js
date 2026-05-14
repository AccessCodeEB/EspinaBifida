import path from 'path';
import * as ReportesService from '../services/reportes.service.js';
import * as ReportesModel   from '../models/reportes.model.js';
import { badRequest, notFound } from '../utils/httpErrors.js';

// Decisión D2 (eng-review): STORAGE vive aquí, no en routes.
const STORAGE = path.resolve(process.env.STORAGE_PATH ?? './storage/reportes');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/v1/reportes/periodo
 * ?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&formato=pdf|xlsx
 * Genera el reporte on-demand y lo descarga directamente (no persiste en BD).
 */
export async function getPeriodo(req, res, next) {
  try {
    const { fechaInicio, fechaFin, formato = 'pdf' } = req.query;

    if (!fechaInicio || !fechaFin)
      throw badRequest('fechaInicio y fechaFin son requeridos');
    if (!DATE_RE.test(fechaInicio) || !DATE_RE.test(fechaFin))
      throw badRequest('Formato de fecha inválido — use YYYY-MM-DD');
    if (fechaInicio > fechaFin)
      throw badRequest('fechaInicio no puede ser posterior a fechaFin');
    if (!['pdf', 'xlsx'].includes(formato))
      throw badRequest('formato debe ser pdf o xlsx');

    const data = await ReportesService.generarReporte(fechaInicio, fechaFin);

    if (formato === 'pdf') {
      const buf = await ReportesService.generarPDF(data, fechaInicio, fechaFin);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-${fechaInicio}-${fechaFin}.pdf"`);
      return res.send(buf);
    }

    const buf = await ReportesService.generarXLSX(data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${fechaInicio}-${fechaFin}.xlsx"`);
    return res.send(buf);
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/reportes/historico?page=1&limit=20
 * Lista reportes guardados automáticamente por el scheduler.
 */
export async function getHistorico(req, res, next) {
  try {
    const page  = Math.max(1,  Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const rows  = await ReportesModel.findHistorico(page, limit);
    res.json({ data: rows });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/reportes/:id/descargar?formato=pdf|xlsx
 * Descarga un reporte guardado por el scheduler.
 * Decisión D4 (eng-review): validación startsWith(STORAGE) previene path traversal.
 */
export async function descargar(req, res, next) {
  try {
    const id      = Number(req.params.id);
    const formato = req.query.formato === 'xlsx' ? 'xlsx' : 'pdf';

    const reporte = await ReportesModel.findById(id);
    if (!reporte) throw notFound('Reporte no encontrado');

    const rutaRelativa = formato === 'pdf' ? reporte.RUTA_PDF : reporte.RUTA_XLSX;
    if (!rutaRelativa) throw notFound(`El reporte no tiene archivo ${formato}`);

    const rutaAbsoluta = path.resolve(STORAGE, rutaRelativa);
    // startsWith(STORAGE + sep) evita el ataque de directorio hermano:
    // si STORAGE='/data/reportes', '/data/reportes-evil/...' pasaría startsWith
    // sin el separador pero falla con él.
    if (!rutaAbsoluta.startsWith(STORAGE + path.sep)) {
      throw badRequest('Ruta de archivo inválida');
    }

    res.download(rutaAbsoluta);
  } catch (err) { next(err); }
}
