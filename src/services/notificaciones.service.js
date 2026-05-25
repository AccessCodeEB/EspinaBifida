import * as Model from "../models/notificaciones.model.js";

export const getAll          = (limit) => Model.findAll(limit);
export const getPendientes   = ()      => Model.findPendientes();
export const getCount        = ()      => Model.countPendientes();
export const marcarLeida     = (id)    => Model.markAsRead(id);
export const marcarTodasLeidas = ()    => Model.markAllAsRead();

async function checkStockBajo() {
  const rows = await Model.findArticulosConStockBajo();
  if (rows.length === 0) {
    await Model.syncStockBajoConsolidado(null);
    return 0;
  }
  let msg;
  if (rows.length === 1) {
    const r = rows[0];
    msg = `Stock bajo: "${r.DESCRIPCION}" tiene ${r.INVENTARIO_ACTUAL} unidades (mínimo ${r.STOCK_MINIMO}).`;
  } else {
    const lista = rows.map(r => `${r.DESCRIPCION} (${r.INVENTARIO_ACTUAL} uds)`).join(", ");
    msg = `${rows.length} artículos con stock bajo: ${lista}.`;
  }
  if (msg.length > 500) msg = msg.slice(0, 497) + "...";
  await Model.syncStockBajoConsolidado(msg);
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
