import * as Model from "../models/notificaciones.model.js";

export const getAll                = (limit) => Model.findAll(limit);
export const deleteE2ENotificaciones = ()      => Model.deleteE2ENotificaciones();
export const getPendientes   = ()      => Model.findPendientes();
export const getCount        = ()      => Model.countPendientes();
export const marcarLeida     = (id)    => Model.markAsRead(id);
export const marcarTodasLeidas = ()    => Model.markAllAsRead();

// Trunca nombres largos para mensajes legibles
const trimNombre = (s, max = 35) =>
  s && s.length > max ? s.slice(0, max - 1) + "…" : (s ?? "");

const MSG_MAX_LENGTH = 500;
const truncar = (msg) =>
  msg.length > MSG_MAX_LENGTH ? msg.slice(0, MSG_MAX_LENGTH - 3) + "..." : msg;

export async function checkStockBajo() {
  const rows = await Model.findArticulosConStockBajo();
  if (rows.length === 0) {
    await Model.syncStockBajoConsolidado(null);
    return 0;
  }
  let msg;
  if (rows.length === 1) {
    const r = rows[0];
    const uds = Number(r.INVENTARIO_ACTUAL);
    msg = `Stock bajo: "${trimNombre(r.DESCRIPCION)}" — ${uds} ${uds === 1 ? "unidad" : "unidades"} disponibles (mínimo ${r.STOCK_MINIMO}).`;
  } else {
    const lista = rows
      .slice(0, 5)
      .map(r => `${trimNombre(r.DESCRIPCION, 25)} (${r.INVENTARIO_ACTUAL})`)
      .join(", ");
    const extra = rows.length > 5 ? ` y ${rows.length - 5} más` : "";
    msg = `${rows.length} artículos con stock bajo: ${lista}${extra}.`;
  }
  msg = truncar(msg);
  await Model.syncStockBajoConsolidado(msg);
  return rows.length;
}

export async function checkSinStock() {
  const rows = await Model.findArticulosSinStock();
  if (rows.length === 0) {
    await Model.syncSinStockConsolidado(null);
    return 0;
  }
  let msg;
  if (rows.length === 1) {
    msg = `Sin stock: "${trimNombre(rows[0].DESCRIPCION)}" — no hay unidades disponibles.`;
  } else {
    const lista = rows.slice(0, 5).map(r => trimNombre(r.DESCRIPCION, 25)).join(", ");
    const extra = rows.length > 5 ? ` y ${rows.length - 5} más` : "";
    msg = `${rows.length} artículos sin stock: ${lista}${extra}.`;
  }
  msg = truncar(msg);
  await Model.syncSinStockConsolidado(msg);
  return rows.length;
}

async function checkCitasHoy() {
  const rows = await Model.findCitasHoyProgramadas();
  if (rows.length === 0) {
    await Model.syncCitasHoyConsolidado(null);
    return 0;
  }
  let msg;
  if (rows.length === 1) {
    const r = rows[0];
    msg = `Cita de hoy a las ${r.HORA} para ${r.NOMBRE} con ${r.ESPECIALISTA} sin confirmar.`;
  } else {
    const lista = rows.map(r => `${r.NOMBRE} (${r.HORA})`).join(", ");
    msg = `${rows.length} citas de hoy sin confirmar: ${lista}.`;
  }
  msg = truncar(msg);
  await Model.syncCitasHoyConsolidado(msg);
  return rows.length;
}

async function checkMembresiasProximas() {
  const rows = await Model.findMembresiasProximas();
  for (const row of rows) {
    const dias = Number(row.DIAS_RESTANTES);
    const diasStr = dias === 0 ? "hoy" : `en ${dias} día${dias === 1 ? "" : "s"}`;
    const msg = `Membresía de ${row.NOMBRE} (${row.CURP}) vence ${diasStr}.`;
    await Model.upsertMembresia(row.CURP, "MEMBRESIA_PROXIMA", msg);
  }
  return rows.length;
}

async function checkMembresiasVencidas() {
  const rows = await Model.findMembresiasVencidas();
  for (const row of rows) {
    const fecha = new Date(row.FECHA_VIGENCIA_FIN).toLocaleDateString("es-MX");
    const msg = `Membresía de ${row.NOMBRE} (${row.CURP}) venció el ${fecha}.`;
    // Cerrar MEMBRESIA_PROXIMA pendiente del mismo beneficiario para evitar
    // que aparezcan ambas notificaciones simultáneamente en el panel.
    await Model.closePendingMembresia(row.CURP, "MEMBRESIA_PROXIMA");
    await Model.upsertMembresia(row.CURP, "MEMBRESIA_VENCIDA", msg);
  }
  return rows.length;
}

const toTitleCase = (s) =>
  String(s ?? "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

async function checkComodatosPorVencer() {
  const rows = await Model.findComodatosPorVencer();
  if (rows.length === 0) {
    await Model.syncComodatosPorVencer(null);
    return 0;
  }

  const describir = (r) => {
    const dias     = Number(r.DIAS_RESTANTES);
    const articulo = trimNombre(toTitleCase(r.ARTICULO ?? "equipo"), 22);
    const nombre   = trimNombre(r.NOMBRE, 22);
    if (dias < 0)  return `${nombre} — ${articulo} (vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"})`;
    if (dias === 0) return `${nombre} — ${articulo} (vence hoy)`;
    return `${nombre} — ${articulo} (${dias} día${dias === 1 ? "" : "s"})`;
  };

  let msg;
  if (rows.length === 1) {
    msg = `Préstamo por vencer: ${describir(rows[0])}.`;
  } else {
    const lista = rows.slice(0, 3).map(describir).join("; ");
    const extra = rows.length > 3 ? ` y ${rows.length - 3} más` : "";
    msg = `${rows.length} préstamos por vencer o vencidos: ${lista}${extra}.`;
  }
  msg = truncar(msg);

  await Model.syncComodatosPorVencer(msg);
  return rows.length;
}

export async function checkPreregistroPendiente(dias = 3) {
  const rows = await Model.findPreregistrosPendientes(dias);
  if (rows.length === 0) {
    await Model.syncPreregistroPendiente(null);
    return 0;
  }
  let msg;
  if (rows.length === 1) {
    const r = rows[0];
    const d = Number(r.DIAS_PENDIENTE);
    msg = `Pre-registro de ${trimNombre(r.NOMBRE)} lleva ${d} día${d === 1 ? "" : "s"} sin revisarse.`;
  } else {
    const lista = rows.slice(0, 3).map(r => trimNombre(r.NOMBRE, 25)).join(", ");
    const extra = rows.length > 3 ? ` y ${rows.length - 3} más` : "";
    msg = `${rows.length} pre-registros sin revisar por más de ${dias} día${dias === 1 ? "" : "s"}: ${lista}${extra}.`;
  }
  msg = truncar(msg);
  await Model.syncPreregistroPendiente(msg);
  return rows.length;
}

export async function runJob() {
  const [stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos, preregistros] = await Promise.all([
    checkStockBajo(),
    checkSinStock(),
    checkMembresiasProximas(),
    checkMembresiasVencidas(),
    checkCitasHoy(),
    checkComodatosPorVencer(),
    checkPreregistroPendiente(),
  ]);

  const huerfanas = await Model.deleteOrphanedNotificaciones().catch(() => 0);
  if (huerfanas > 0) {
    console.log(`[notificaciones-job] limpiadas ${huerfanas} notificacion(es) de beneficiarios eliminados`);
  }

  return { stockBajo, sinStock, proximas, vencidas, citasHoy, comodatos, preregistros };
}
