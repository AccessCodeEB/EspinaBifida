import * as Model from "../models/notificaciones.model.js";

export const getAll       = (limit) => Model.findAll(limit);
export const getPendientes = ()     => Model.findPendientes();
export const getCount      = ()     => Model.countPendientes();
export const marcarLeida   = (id)   => Model.markAsRead(id);

async function checkStockBajo() {
  const rows = await Model.findArticulosConStockBajo();
  for (const row of rows) {
    const msg = `Stock bajo: "${row.DESCRIPCION}" tiene ${row.INVENTARIO_ACTUAL} unidades (mínimo ${row.STOCK_MINIMO}).`;
    await Model.upsertStockBajo(row.ID_ARTICULO, msg);
  }
  return rows.length;
}

async function checkMembresiasProximas() {
  const rows = await Model.findMembresiasProximas();
  for (const row of rows) {
    const dias = Number(row.DIAS_RESTANTES);
    const msg = `Membresía de ${row.NOMBRE} (${row.CURP}) vence en ${dias} día${dias === 1 ? "" : "s"}.`;
    await Model.upsertMembresia(row.CURP, "MEMBRESIA_PROXIMA", msg);
  }
  return rows.length;
}

async function checkMembresiasVencidas() {
  const rows = await Model.findMembresiasVencidas();
  for (const row of rows) {
    const fecha = new Date(row.FECHA_VIGENCIA_FIN).toLocaleDateString("es-MX");
    const msg = `Membresía de ${row.NOMBRE} (${row.CURP}) venció el ${fecha}.`;
    await Model.upsertMembresia(row.CURP, "MEMBRESIA_VENCIDA", msg);
  }
  return rows.length;
}

export async function runJob() {
  const [stockBajo, proximas, vencidas] = await Promise.all([
    checkStockBajo(),
    checkMembresiasProximas(),
    checkMembresiasVencidas(),
  ]);
  console.log(`[notificaciones-job] stock_bajo=${stockBajo}, proximas=${proximas}, vencidas=${vencidas}`);
  return { stockBajo, proximas, vencidas };
}
