"use client"

import { useState, useEffect } from "react"
import {
  Search, Plus, Minus, AlertTriangle, Package,
  Check, ChevronsUpDown, ChevronUp, ChevronDown, RefreshCw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getInventario, registrarMovimiento, crearArticulo, eliminarArticulo,
  type ArticuloInventario,
} from "@/services/inventario"

type SortField = "clave" | "descripcion" | "cuota" | "cantidad"
type SortDirection = "asc" | "desc"
const OTRA_UNIDAD_VALUE = "__OTRA_UNIDAD__"
const NAVY  = "#0f4c81"

function field<T extends object>(label: string, children: React.ReactNode) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export function InventarioSection() {
  const [inventario, setInventario] = useState<ArticuloInventario[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false)
  const [selectedItem, setSelectedItem]       = useState<ArticuloInventario | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState<string>("")
  const [cantidadMovimiento, setCantidadMovimiento] = useState<string>("0")
  const [motivoMovimiento, setMotivoMovimiento]   = useState<string>("")
  const [savingMovimiento, setSavingMovimiento]   = useState(false)
  const [movimientoError, setMovimientoError]     = useState<string | null>(null)

  const [showAgregarDialog, setShowAgregarDialog]   = useState(false)
  const [showEliminarDialog, setShowEliminarDialog] = useState(false)
  const [articuloForm, setArticuloForm] = useState({
    idArticulo: "", descripcion: "", unidad: "PZA.",
    cuotaRecuperacion: "0", inventarioActual: "0", idCategoria: "1",
  })
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>("PZA.")
  const [unidadNueva, setUnidadNueva]   = useState<string>("")
  const [deleteArticuloId, setDeleteArticuloId] = useState("")
  const [deletePickerOpen, setDeletePickerOpen] = useState(false)
  const [articuloError, setArticuloError] = useState<string | null>(null)
  const [savingArticulo, setSavingArticulo] = useState(false)

  const [sortField, setSortField]       = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [unidadFilterIndex, setUnidadFilterIndex] = useState<number>(-1)

  const loadData = () => {
    setLoading(true)
    getInventario()
      .then(setInventario)
      .catch(err => setError(err?.message ?? "Error al cargar inventario"))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const refreshInventario = async () => { const data = await getInventario(); setInventario(data) }

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-sm text-muted-foreground">Cargando inventario...</p></div>
  if (error)   return <div className="flex h-64 items-center justify-center"><p className="text-sm text-destructive">{error}</p></div>

  const unidadesDisponibles = Array.from(
    new Set(inventario.map(i => i.unidad).filter(u => String(u ?? "").trim() !== ""))
  ).sort((a, b) => a.localeCompare(b, "es"))
  const unidadesParaAlta = Array.from(new Set(["PZA.", ...unidadesDisponibles])).sort((a, b) => a.localeCompare(b, "es"))

  const activeUnidadFilter = unidadFilterIndex >= 0 ? unidadesDisponibles[unidadFilterIndex] : null
  const filtered = inventario.filter(item =>
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.clave).toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredByUnidad = activeUnidadFilter ? filtered.filter(i => i.unidad === activeUnidadFilter) : filtered
  const sortedFiltered = [...filteredByUnidad].sort((a, b) => {
    if (!sortField) return 0
    const f = sortDirection === "asc" ? 1 : -1
    if (sortField === "clave") {
      const an = Number(a.clave), bn = Number(b.clave)
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * f
      return String(a.clave).localeCompare(String(b.clave), "es", { numeric: true }) * f
    }
    if (sortField === "descripcion") return a.descripcion.localeCompare(b.descripcion, "es") * f
    if (sortField === "cuota") {
      const ac = Number(String(a.cuota).replace(/[^\d.-]/g, ""))
      const bc = Number(String(b.cuota).replace(/[^\d.-]/g, ""))
      return ((isNaN(ac) ? 0 : ac) - (isNaN(bc) ? 0 : bc)) * f
    }
    return (Number(a.cantidad) - Number(b.cantidad)) * f
  })

  const bajosStock = inventario.filter(i => i.cantidad < i.minimo).length
  const sinStock   = inventario.filter(i => i.cantidad === 0).length

  function handleSort(f: SortField) {
    setUnidadFilterIndex(-1)
    if (sortField === f) { setSortDirection(d => d === "asc" ? "desc" : "asc"); return }
    setSortField(f)
    setSortDirection(f === "cantidad" || f === "cuota" ? "desc" : "asc")
  }
  function SortIcon({ f }: { f: SortField }) {
    if (sortField !== f) return null
    return sortDirection === "asc" ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />
  }

  function handleUnidadCycle() {
    if (!unidadesDisponibles.length) return
    setUnidadFilterIndex(p => { const n = p + 1; return n >= unidadesDisponibles.length ? -1 : n })
  }

  function openMovimiento(item: ArticuloInventario | null = null) {
    setSelectedItem(item); setSelectedArticuloId(item ? String(item.clave) : "")
    setCantidadMovimiento("0"); setMotivoMovimiento(""); setMovimientoError(null)
    setShowMovimientoDialog(true)
  }
  function closeMovimientoDialog() { setShowMovimientoDialog(false); setSavingMovimiento(false); setMovimientoError(null) }

  const normQty = (v: string) => { const p = Math.trunc(Number(v)); return isNaN(p) ? 0 : p }

  async function handleConfirmMovimiento() {
    const id = Number(selectedItem ? selectedItem.clave : selectedArticuloId)
    const qty = normQty(cantidadMovimiento)
    if (!id || isNaN(id)) { setMovimientoError("Selecciona un artículo válido."); return }
    if (qty === 0) { setMovimientoError("La cantidad no puede ser 0."); return }
    setSavingMovimiento(true); setMovimientoError(null)
    try {
      await registrarMovimiento({ idArticulo: id, tipo: qty > 0 ? "ENTRADA" : "SALIDA", cantidad: Math.abs(qty), motivo: motivoMovimiento.trim() || "Movimiento manual" })
      await refreshInventario()
      closeMovimientoDialog()
      toast.success(qty > 0 ? "Entrada registrada correctamente" : "Salida registrada correctamente")
    } catch (err: unknown) {
      setMovimientoError(err instanceof Error ? err.message : "No se pudo registrar el movimiento")
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el movimiento")
      setSavingMovimiento(false)
    }
  }

  function openAgregarArticulo() {
    setArticuloError(null); setSavingArticulo(false)
    setArticuloForm({ idArticulo: "", descripcion: "", unidad: "PZA.", cuotaRecuperacion: "0", inventarioActual: "0", idCategoria: "1" })
    setUnidadSeleccionada("PZA."); setUnidadNueva(""); setShowAgregarDialog(true)
  }
  function handleUnidadSeleccion(value: string) {
    setUnidadSeleccionada(value)
    if (value !== OTRA_UNIDAD_VALUE) { setUnidadNueva(""); setArticuloForm(p => ({ ...p, unidad: value })) }
  }
  function openEliminarArticulo() {
    setArticuloError(null); setSavingArticulo(false); setDeleteArticuloId(""); setDeletePickerOpen(false); setShowEliminarDialog(true)
  }
  const normalizeForSearch = (v: string | number) => String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const findArticuloLabel  = (id: string) => { const item = inventario.find(a => String(a.clave) === id); return item ? `${item.clave} - ${item.descripcion}` : "Seleccionar artículo" }

  async function handleAgregarArticulo() {
    const id = Number(articuloForm.idArticulo), cuota = Number(articuloForm.cuotaRecuperacion)
    const inv = Number(articuloForm.inventarioActual), cat = Number(articuloForm.idCategoria)
    if (isNaN(id)) { setArticuloError("La clave debe ser numérica."); return }
    if (!articuloForm.descripcion.trim()) { setArticuloError("La descripción es obligatoria."); return }
    const unidadFinal = unidadSeleccionada === OTRA_UNIDAD_VALUE ? unidadNueva.trim() : articuloForm.unidad.trim()
    if (!unidadFinal) { setArticuloError("La unidad es obligatoria."); return }
    if (isNaN(cuota) || cuota < 0) { setArticuloError("La cuota debe ser ≥ 0."); return }
    if (isNaN(inv) || inv < 0) { setArticuloError("La cantidad inicial debe ser ≥ 0."); return }
    if (isNaN(cat)) { setArticuloError("La categoría debe ser numérica."); return }
    setSavingArticulo(true); setArticuloError(null)
    try {
      await crearArticulo({ idArticulo: id, descripcion: articuloForm.descripcion.trim(), unidad: unidadFinal, cuotaRecuperacion: cuota, inventarioActual: inv, manejaInventario: "S", idCategoria: cat })
      await refreshInventario(); setShowAgregarDialog(false)
      toast.success("Artículo agregado al inventario")
    } catch (err: unknown) {
      setArticuloError(err instanceof Error ? err.message : "No se pudo agregar el artículo")
      toast.error(err instanceof Error ? err.message : "No se pudo agregar el artículo")
    } finally { setSavingArticulo(false) }
  }

  async function handleEliminarArticulo() {
    if (!deleteArticuloId) { setArticuloError("Selecciona un artículo."); return }
    setSavingArticulo(true); setArticuloError(null)
    try {
      await eliminarArticulo(deleteArticuloId); await refreshInventario(); setShowEliminarDialog(false)
      toast.success("Artículo eliminado del inventario")
    } catch (err: unknown) {
      setArticuloError(err instanceof Error ? err.message : "No se pudo eliminar el artículo")
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el artículo")
    } finally { setSavingArticulo(false) }
  }

  const qty = normQty(cantidadMovimiento)
  const qtyColor = qty > 0 ? "text-emerald-600 dark:text-emerald-400" : qty < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Control de artículos y materiales del almacén</p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="size-3.5" />Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total artículos",  value: inventario.length, color: NAVY,      icon: Package },
          { label: "Stock bajo",       value: bajosStock,        color: "#f59e0b", icon: AlertTriangle },
          { label: "Sin stock",        value: sinStock,          color: "#ef4444", icon: AlertTriangle },
          { label: "Mostrando",        value: sortedFiltered.length, color: "#10b981", icon: Package },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{label}</span>
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon className="size-3.5" style={{ color }} />
              </div>
            </div>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Alerta stock bajo */}
      {bajosStock > 0 && (
        <div className="inline-flex self-start items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {bajosStock} artículo{bajosStock > 1 ? "s" : ""} con stock bajo — se recomienda reabastecer los marcados en rojo.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Listado de inventario</p>
            <p className="text-[11px] text-muted-foreground">
              {sortedFiltered.length} de {inventario.length} artículos
              {activeUnidadFilter && <> · Unidad: <span className="font-medium">{activeUnidadFilter}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Búsqueda */}
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Clave o artículo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              />
            </div>
            {/* Acciones */}
            <button onClick={openAgregarArticulo}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
              <Plus className="size-3.5" />Agregar
            </button>
            <button onClick={openEliminarArticulo}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50">
              <Minus className="size-3.5" />Eliminar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 pr-3 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button onClick={() => handleSort("clave")} className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Clave <SortIcon f="clave" />
                  </button>
                </th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button onClick={() => handleSort("descripcion")} className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Artículo <SortIcon f="descripcion" />
                  </button>
                </th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                  <button onClick={handleUnidadCycle} className="hover:text-foreground transition-colors">Unidad</button>
                </th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                  <button onClick={() => handleSort("cuota")} className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Cuota <SortIcon f="cuota" />
                  </button>
                </th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button onClick={() => handleSort("cantidad")} className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Cantidad <SortIcon f="cantidad" />
                  </button>
                </th>
                <th className="py-2.5 pr-5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">No se encontraron artículos.</td>
                </tr>
              ) : (
                sortedFiltered.map((item, idx) => {
                  const bajo = item.cantidad < item.minimo
                  const cero = item.cantidad === 0
                  return (
                    <tr key={`${item.clave}-${idx}`} className={`transition-colors hover:bg-muted/20 ${bajo ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                      <td className="py-3 pl-5 pr-3 text-center font-mono text-[11px] text-foreground">{item.clave}</td>
                      <td className="py-3 max-w-[16rem]">
                        <p className="truncate text-xs font-medium text-foreground">{item.descripcion}</p>
                        <p className="text-[10px] text-foreground md:hidden">{item.unidad} · {item.cuota}</p>
                      </td>
                      <td className="hidden py-3 text-center text-xs text-foreground md:table-cell">{item.unidad}</td>
                      <td className="hidden py-3 text-center text-xs text-foreground lg:table-cell">{item.cuota}</td>
                      <td className="py-3 text-center">
                        <span className={`text-sm font-bold tabular-nums ${
                          cero ? "text-red-600 dark:text-red-400" :
                          bajo ? "text-amber-600 dark:text-amber-400" :
                                 "text-foreground"
                        }`}>
                          {item.cantidad}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-center">
                        <button onClick={() => openMovimiento(item)}
                          className="rounded-lg border border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-[#0f4c81] hover:bg-[#0f4c81]/5 hover:text-[#0f4c81]">
                          Modificar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog: Movimiento ── */}
      <Dialog open={showMovimientoDialog} onOpenChange={setShowMovimientoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Modificar inventario</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedItem ? selectedItem.descripcion : "Selecciona el artículo y ajusta la cantidad."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {!selectedItem && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Artículo</label>
                <Select value={selectedArticuloId} onValueChange={setSelectedArticuloId}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar artículo" /></SelectTrigger>
                  <SelectContent>
                    {inventario.map((item, idx) => (
                      <SelectItem key={`sel-${item.clave}-${idx}`} value={String(item.clave)}>
                        {item.clave} - {item.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cantidad</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setCantidadMovimiento(p => String(normQty(p) - 1))}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-lg font-bold text-muted-foreground hover:bg-muted transition-colors">−</button>
                <div className={`min-w-[5rem] flex-1 rounded-lg border border-border bg-background py-2.5 text-center text-lg font-bold tabular-nums ${qtyColor}`}>
                  {qty > 0 ? `+${qty}` : qty}
                </div>
                <button onClick={() => setCantidadMovimiento(p => String(normQty(p) + 1))}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-lg font-bold text-muted-foreground hover:bg-muted transition-colors">+</button>
              </div>
              <p className="text-[11px] text-muted-foreground">Positivo = entrada · Negativo = salida</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Motivo</label>
              <Input className="h-10 text-sm" placeholder="Descripción del movimiento" value={motivoMovimiento} onChange={e => setMotivoMovimiento(e.target.value)} />
            </div>

            {movimientoError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{movimientoError}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
              <button onClick={closeMovimientoDialog} disabled={savingMovimiento}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleConfirmMovimiento} disabled={savingMovimiento}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}>
                {savingMovimiento ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Agregar artículo ── */}
      <Dialog open={showAgregarDialog} onOpenChange={setShowAgregarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Agregar artículo</DialogTitle>
            <DialogDescription className="text-xs">Crea un artículo nuevo en el inventario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Clave (ID)</label>
              <Input className="h-10 text-sm" type="number" min="1" placeholder="Ej. 500" value={articuloForm.idArticulo} onChange={e => setArticuloForm(p => ({ ...p, idArticulo: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Descripción</label>
              <Input className="h-10 text-sm" placeholder="Nombre del artículo" value={articuloForm.descripcion} onChange={e => setArticuloForm(p => ({ ...p, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Unidad</label>
                <Select value={unidadSeleccionada} onValueChange={handleUnidadSeleccion}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Unidad" /></SelectTrigger>
                  <SelectContent>
                    {unidadesParaAlta.map((u, i) => <SelectItem key={`u-${i}`} value={u}>{u}</SelectItem>)}
                    <SelectItem value={OTRA_UNIDAD_VALUE}>Otro</SelectItem>
                  </SelectContent>
                </Select>
                {unidadSeleccionada === OTRA_UNIDAD_VALUE && (
                  <Input className="h-10 text-sm mt-1" placeholder="Nueva unidad" value={unidadNueva} onChange={e => setUnidadNueva(e.target.value)} />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Categoría (ID)</label>
                <Input className="h-10 text-sm" type="number" min="1" value={articuloForm.idCategoria} onChange={e => setArticuloForm(p => ({ ...p, idCategoria: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cuota recuperación</label>
                <Input className="h-10 text-sm" type="number" min="0" step="0.01" value={articuloForm.cuotaRecuperacion} onChange={e => setArticuloForm(p => ({ ...p, cuotaRecuperacion: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cantidad inicial</label>
                <Input className="h-10 text-sm" type="number" min="0" value={articuloForm.inventarioActual} onChange={e => setArticuloForm(p => ({ ...p, inventarioActual: e.target.value }))} />
              </div>
            </div>
            {articuloError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{articuloError}</p>}
            <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
              <button onClick={() => setShowAgregarDialog(false)} disabled={savingArticulo}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleAgregarArticulo} disabled={savingArticulo}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}>
                {savingArticulo ? "Guardando..." : "Agregar artículo"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Eliminar artículo ── */}
      <Dialog open={showEliminarDialog} onOpenChange={setShowEliminarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Eliminar artículo</DialogTitle>
            <DialogDescription className="text-xs">Selecciona el artículo que deseas eliminar del inventario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Artículo</label>
              <Popover open={deletePickerOpen} onOpenChange={setDeletePickerOpen}>
                <PopoverTrigger asChild>
                  <button type="button" role="combobox"
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors">
                    <span className="truncate text-left">{findArticuloLabel(deleteArticuloId)}</span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="start">
                  <Command shouldFilter>
                    <CommandInput placeholder="Clave o descripción..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron artículos.</CommandEmpty>
                      <CommandGroup>
                        {inventario.map((item, idx) => {
                          const label = `${item.clave} - ${item.descripcion}`
                          return (
                            <CommandItem key={`del-${item.clave}-${idx}`} value={normalizeForSearch(label)}
                              keywords={[normalizeForSearch(item.clave), normalizeForSearch(item.descripcion)]}
                              onSelect={() => { setDeleteArticuloId(String(item.clave)); setDeletePickerOpen(false) }}>
                              <Check className={cn("mr-2 size-4", deleteArticuloId === String(item.clave) ? "opacity-100" : "opacity-0")} />
                              {label}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {articuloError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{articuloError}</p>}
            <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
              <button onClick={() => setShowEliminarDialog(false)} disabled={savingArticulo}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleEliminarArticulo} disabled={savingArticulo}
                className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {savingArticulo ? "Eliminando..." : "Eliminar artículo"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
