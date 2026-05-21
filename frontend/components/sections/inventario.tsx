"use client"

import { useState, useEffect } from "react"
import {
  Search, Plus, Minus, AlertTriangle, Package,
  Check, ChevronsUpDown, ChevronUp, ChevronDown, RefreshCw, Filter, X,
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
  getInventario, registrarMovimiento, crearArticulo, eliminarArticulo, actualizarArticulo,
  type ArticuloInventario,
} from "@/services/inventario"

type SortField = "clave" | "descripcion" | "cuota" | "cantidad"
type SortDirection = "asc" | "desc"
const OTRA_UNIDAD_VALUE = "__OTRA_UNIDAD__"
const NAVY  = "#0f4c81"
const DEFAULT_CATEGORIA_ID = 1

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
  const [stockMinimoEditar, setStockMinimoEditar] = useState<string>("0")
  const [savingStockMinimo, setSavingStockMinimo] = useState(false)

  const [showAgregarDialog, setShowAgregarDialog]   = useState(false)
  const [showEliminarDialog, setShowEliminarDialog] = useState(false)
  const [articuloForm, setArticuloForm] = useState({
    idArticulo: "", descripcion: "", unidad: "PZA.",
    cuotaRecuperacion: "0", inventarioActual: "0", stockMinimo: "5",
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
  const [stockFilter, setStockFilter] = useState<"bajo" | "sin" | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

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

  const EXCLUDED_UNITS = ["UNIDAD", "CITA"]
  const unidadesDisponibles = Array.from(
    new Set(inventario.map(i => i.unidad).filter(u => {
      const s = String(u ?? "").trim()
      if (!s) return false
      return !EXCLUDED_UNITS.includes(s.toUpperCase())
    }))
  ).sort((a, b) => a.localeCompare(b, "es"))
  const unidadesParaAlta = Array.from(new Set(["PZA.", ...unidadesDisponibles])).sort((a, b) => a.localeCompare(b, "es"))

  const activeUnidadFilter = unidadFilterIndex >= 0 ? unidadesDisponibles[unidadFilterIndex] : null
  const filtered = inventario.filter(item =>
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.clave).toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredByUnidad = activeUnidadFilter ? filtered.filter(i => i.unidad === activeUnidadFilter) : filtered
  const filteredByStock = stockFilter === "sin"
    ? filteredByUnidad.filter(i => i.cantidad === 0)
    : stockFilter === "bajo"
    ? filteredByUnidad.filter(i => i.cantidad > 0 && i.cantidad < i.minimo)
    : filteredByUnidad
  const sortedFiltered = [...filteredByStock].sort((a, b) => {
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

  const sinStock   = inventario.filter(i => i.cantidad === 0).length
  const bajosStock = inventario.filter(i => i.cantidad > 0 && i.cantidad < i.minimo).length

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
    setStockMinimoEditar(item ? String(item.minimo) : "0")
    setShowMovimientoDialog(true)
  }
  function closeMovimientoDialog() { setShowMovimientoDialog(false); setSavingMovimiento(false); setSavingStockMinimo(false); setMovimientoError(null); setStockMinimoEditar("0") }

  const normQty = (v: string) => { const p = Math.trunc(Number(v)); return isNaN(p) ? 0 : p }

  async function handleConfirmMovimiento() {
    const id = Number(selectedItem ? selectedItem.clave : selectedArticuloId)
    const qty = normQty(cantidadMovimiento)
    const minimo = Number(stockMinimoEditar)
    
    if (!id || isNaN(id)) { setMovimientoError("Selecciona un artículo válido."); return }
    if (isNaN(minimo) || minimo < 0) { setMovimientoError("Stock mínimo debe ser ≥ 0."); return }
    if (qty === 0 && minimo === (selectedItem?.minimo ?? 5)) { setMovimientoError("Sin cambios para guardar."); return }
    
    setSavingMovimiento(true); setSavingStockMinimo(true); setMovimientoError(null)
    try {
      // 1. Guardar stock mínimo si cambió
      if (minimo !== (selectedItem?.minimo ?? 5)) {
        await actualizarArticulo(id, { stockMinimo: minimo })
      }
      
      // 2. Registrar movimiento si hay cantidad
      if (qty !== 0) {
        await registrarMovimiento({ idArticulo: id, tipo: qty > 0 ? "ENTRADA" : "SALIDA", cantidad: Math.abs(qty), motivo: motivoMovimiento.trim() || "Movimiento manual" })
      }
      
      await refreshInventario()
      closeMovimientoDialog()
      
      const updates: string[] = []
      if (minimo !== (selectedItem?.minimo ?? 5)) updates.push("Stock mínimo actualizado")
      if (qty !== 0) updates.push(qty > 0 ? "Entrada registrada" : "Salida registrada")
      
      toast.success(updates.length > 0 ? updates.join(" • ") : "Cambios guardados")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar los cambios"
      setMovimientoError(msg)
      toast.error(msg)
    } finally {
      setSavingMovimiento(false)
      setSavingStockMinimo(false)
    }
  }

  function openAgregarArticulo() {
    setArticuloError(null); setSavingArticulo(false)
    setArticuloForm({ idArticulo: "", descripcion: "", unidad: "PZA.", cuotaRecuperacion: "0", inventarioActual: "0", stockMinimo: "5" })
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
    const inv = Number(articuloForm.inventarioActual), minimo = Number(articuloForm.stockMinimo)
    if (isNaN(id)) { setArticuloError("La clave debe ser numérica."); return }
    if (!articuloForm.descripcion.trim()) { setArticuloError("La descripción es obligatoria."); return }
    const unidadFinal = unidadSeleccionada === OTRA_UNIDAD_VALUE ? unidadNueva.trim() : articuloForm.unidad.trim()
    if (!unidadFinal) { setArticuloError("La unidad es obligatoria."); return }
    if (isNaN(cuota) || cuota < 0) { setArticuloError("La cuota debe ser ≥ 0."); return }
    if (isNaN(inv) || inv < 0) { setArticuloError("La cantidad inicial debe ser ≥ 0."); return }
    if (isNaN(minimo) || minimo < 0) { setArticuloError("El stock mínimo debe ser ≥ 0."); return }
    setSavingArticulo(true); setArticuloError(null)
    try {
      await crearArticulo({
        idArticulo: id,
        descripcion: articuloForm.descripcion.trim(),
        unidad: unidadFinal,
        cuotaRecuperacion: cuota,
        inventarioActual: inv,
        manejaInventario: "S",
        idCategoria: DEFAULT_CATEGORIA_ID,
        stockMinimo: minimo,
      })
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "Total artículos",  value: inventario.length, color: NAVY,      icon: Package },
          { label: "Stock bajo",       value: bajosStock,        color: "#f59e0b", icon: AlertTriangle },
          { label: "Sin stock",        value: sinStock,          color: "#ef4444", icon: AlertTriangle },
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

      {/* Entry banner (top-center) */}
      

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Listado de inventario</p>
            <p className="text-[11px] text-muted-foreground">
              {sortedFiltered.length} de {inventario.length} artículos
              {activeUnidadFilter && <> · Unidad: <span className="font-medium">{activeUnidadFilter}</span></>}
              {stockFilter === "bajo" && <> · <span className="font-medium text-amber-600">Stock bajo</span></>}
              {stockFilter === "sin"  && <> · <span className="font-medium text-red-600">Sin stock</span></>}
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
            {/* Filtro de stock */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    stockFilter
                      ? stockFilter === "sin"
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                        : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Filter className="size-3.5" />
                  Filtrar
                  {stockFilter && (
                    <span
                      onClick={e => { e.stopPropagation(); setStockFilter(null) }}
                      className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <X className="size-2.5" />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1.5">
                <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filtrar por stock</p>
                <button
                  onClick={() => { setStockFilter(null); setFilterOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    !stockFilter ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Package className="size-3.5" />
                  Todos los artículos
                </button>
                <button
                  onClick={() => { setStockFilter("bajo"); setFilterOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    stockFilter === "bajo"
                      ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:text-amber-400"
                  }`}
                >
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Stock bajo
                  <span className="ml-auto tabular-nums font-medium">{bajosStock}</span>
                </button>
                <button
                  onClick={() => { setStockFilter("sin"); setFilterOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    stockFilter === "sin"
                      ? "bg-red-50 font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                  }`}
                >
                  <AlertTriangle className="size-3.5 text-red-500" />
                  Sin stock
                  <span className="ml-auto tabular-nums font-medium">{sinStock}</span>
                </button>
              </PopoverContent>
            </Popover>
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
                <Input
                  className={`h-10 flex-1 text-center text-lg font-bold tabular-nums ${qtyColor}`}
                  type="number"
                  step="1"
                  placeholder="Ej. 500 o -500"
                  value={cantidadMovimiento}
                  onChange={e => setCantidadMovimiento(e.target.value)}
                />
                <button onClick={() => setCantidadMovimiento(p => String(normQty(p) + 1))}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-lg font-bold text-muted-foreground hover:bg-muted transition-colors">+</button>
              </div>
              <p className="text-[11px] text-muted-foreground">Escribe un número positivo para entrada o negativo para salida.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Motivo</label>
              <Input className="h-10 text-sm" placeholder="Descripción del movimiento" value={motivoMovimiento} onChange={e => setMotivoMovimiento(e.target.value)} />
            </div>

            {/* Divisor */}
            <div className="border-t border-border/40 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Stock mínimo</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nuevo mínimo</label>
                <Input className="h-10 text-sm" type="number" min="0" placeholder="Ej. 5" value={stockMinimoEditar} onChange={e => setStockMinimoEditar(e.target.value)} disabled={savingStockMinimo} />
                <p className="text-[11px] text-muted-foreground">Stock actual: <span className="font-medium">{selectedItem?.cantidad ?? 0}</span> · Mínimo actual: <span className="font-medium">{selectedItem?.minimo ?? 0}</span></p>
              </div>
            </div>

            {movimientoError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{movimientoError}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
              <button onClick={closeMovimientoDialog} disabled={savingMovimiento || savingStockMinimo}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleConfirmMovimiento} disabled={savingMovimiento || savingStockMinimo}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}>
                {savingMovimiento || savingStockMinimo ? "Guardando..." : "Confirmar y guardar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Agregar artículo ── */}
      <Dialog open={showAgregarDialog} onOpenChange={setShowAgregarDialog}>
        <DialogContent className="max-w-2xl w-[min(95vw,56rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Agregar artículo</DialogTitle>
            <DialogDescription className="text-xs">Crea un artículo nuevo en el inventario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Datos del artículo</p>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Clave del artículo</label>
                  <Input className="h-10 text-sm" type="number" min="1" placeholder="Ej. 500" value={articuloForm.idArticulo} onChange={e => setArticuloForm(p => ({ ...p, idArticulo: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Descripción</label>
                  <Input className="h-10 text-sm" placeholder="Nombre del artículo" value={articuloForm.descripcion} onChange={e => setArticuloForm(p => ({ ...p, descripcion: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Clasificación automática</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Unidad de medida</label>
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
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Inventario inicial</p>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Precio de recuperación</label>
                  <Input className="h-10 text-sm" type="number" min="0" step="0.01" value={articuloForm.cuotaRecuperacion} onChange={e => setArticuloForm(p => ({ ...p, cuotaRecuperacion: e.target.value }))} />
                  <p className="text-[11px] text-muted-foreground">Monto que se cobra o recupera por este artículo.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Existencia inicial</label>
                    <Input className="h-10 text-sm" type="number" min="0" value={articuloForm.inventarioActual} onChange={e => setArticuloForm(p => ({ ...p, inventarioActual: e.target.value }))} />
                    <p className="text-[11px] text-muted-foreground">Con cuántas piezas arranca el artículo.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stock de alerta</label>
                    <Input className="h-10 text-sm" type="number" min="0" value={articuloForm.stockMinimo} onChange={e => setArticuloForm(p => ({ ...p, stockMinimo: e.target.value }))} />
                    <p className="text-[11px] text-muted-foreground">Nivel mínimo para marcar aviso de reposición.</p>
                  </div>
                </div>
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
                <PopoverContent className="w-[420px] max-h-[280px] p-0 overflow-hidden" align="start">
                  <Command shouldFilter>
                    <CommandInput placeholder="Clave o descripción..." />
                    <CommandList className="max-h-[240px] overflow-y-auto">
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
