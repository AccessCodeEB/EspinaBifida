"use client"

import { useState, useEffect } from "react"
import {
  Search, Plus, Minus, AlertTriangle, Package,
  Check, ChevronsUpDown, ChevronUp, ChevronDown, RefreshCw, Filter, X, Clock, Tag,
  Hash, Ruler, DollarSign, Layers, ArrowUpDown,
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
import { friendlyError } from "@/lib/friendly-error"
import {
  getInventario, registrarMovimiento, crearArticulo, eliminarArticulo, actualizarArticulo,
  getMovimientos, getCategorias,
  type ArticuloInventario, type MovimientoInventario, type CategoriaArticulo,
} from "@/services/inventario"

const MOVIMIENTOS_DIAS_DEFAULT = 30

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

export function InventarioSection({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [inventario, setInventario] = useState<ArticuloInventario[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [safetyNetItem, setSafetyNetItem] = useState<ArticuloInventario | null>(null)
  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false)
  const [selectedItem, setSelectedItem]       = useState<ArticuloInventario | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState<string>("")
  const [cantidadMovimiento, setCantidadMovimiento] = useState<string>("0")
  const [tipoMovimientoToggle, setTipoMovimientoToggle] = useState<"ENTRADA" | "SALIDA">("ENTRADA")
  const [motivoMovimiento, setMotivoMovimiento]   = useState<string>("")
  const [savingMovimiento, setSavingMovimiento]   = useState(false)
  const [movimientoError, setMovimientoError]     = useState<string | null>(null)
  const [stockMinimoEditar, setStockMinimoEditar] = useState<string>("0")
  const [savingStockMinimo, setSavingStockMinimo] = useState(false)

  const [showAgregarDialog, setShowAgregarDialog]   = useState(false)
  const [showEliminarDialog, setShowEliminarDialog] = useState(false)
  const [articuloForm, setArticuloForm] = useState({
    idArticulo: "", descripcion: "", unidad: "PZA.",
    cuotaRecuperacion: "0", cuotaB: "0", inventarioActual: "0", stockMinimo: "5", idCategoria: "",
  })
  const [cuotaBEditar, setCuotaBEditar] = useState<string>("")
  const [cuotaAEditar, setCuotaAEditar] = useState<string>("0")
  const [showPrecioConfirmDialog, setShowPrecioConfirmDialog] = useState(false)
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
  const [categoriaFilter, setCategoriaFilter] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [catFilterOpen, setCatFilterOpen] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaArticulo[]>([])

  const [activeTab, setActiveTab] = useState<"articulos" | "historial">("articulos")
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([getInventario(), getCategorias()])
      .then(([items, cats]) => { setInventario(items); setCategorias(cats) })
      .catch(err => setError(friendlyError(err, "No se pudo cargar el inventario")))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    loadData()
    getCategorias().then(setCategorias).catch(() => {})
  }, [])

  

  const refreshInventario = async () => { const data = await getInventario(); setInventario(data) }

  const loadMovimientos = () => {
    setLoadingMovimientos(true)
    getMovimientos(MOVIMIENTOS_DIAS_DEFAULT)
      .then(setMovimientos)
      .catch(() => setMovimientos([]))
      .finally(() => setLoadingMovimientos(false))
  }

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
  const filteredByCategoria = categoriaFilter != null
    ? filteredByUnidad.filter(i => i.idCategoria === categoriaFilter)
    : filteredByUnidad
  const filteredByStock = stockFilter === "sin"
    ? filteredByCategoria.filter(i => i.cantidad === 0)
    : stockFilter === "bajo"
    ? filteredByCategoria.filter(i => i.cantidad > 0 && i.cantidad <= i.minimo)
    : filteredByCategoria
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
  const bajosStock = inventario.filter(i => i.cantidad > 0 && i.cantidad <= i.minimo).length

  function handleSort(f: SortField) {
    setUnidadFilterIndex(-1)
    if (sortField === f) { setSortDirection(d => d === "asc" ? "desc" : "asc"); return }
    setSortField(f)
    setSortDirection(f === "cantidad" || f === "cuota" ? "desc" : "asc")
  }
  function SortIcon({ f }: { f: SortField }) {
    if (sortField !== f) return <ArrowUpDown className="inline size-3 opacity-40" />
    return sortDirection === "asc" ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />
  }

  function handleUnidadCycle() {
    if (!unidadesDisponibles.length) return
    setUnidadFilterIndex(p => { const n = p + 1; return n >= unidadesDisponibles.length ? -1 : n })
  }

  function openMovimiento(item: ArticuloInventario | null = null) {
    // Safety net: Equipos Médicos son comodatos — preguntar intención primero
    if (item && item.nombreCategoria === "Equipos Médicos") {
      setSafetyNetItem(item)
      return
    }
    setSelectedItem(item); setSelectedArticuloId(item ? String(item.clave) : "")
    setCantidadMovimiento(""); setTipoMovimientoToggle("ENTRADA"); setMotivoMovimiento(""); setMovimientoError(null)
    setStockMinimoEditar(item ? String(item.minimo) : "0")
    setCuotaBEditar(item?.cuotaB != null ? String(item.cuotaB) : "0")
    setCuotaAEditar(item ? String(Number(String(item.cuota).replace(/[^\d.-]/g, "")) || 0) : "0")
    setShowMovimientoDialog(true)
  }

  function confirmarAjusteStock() {
    const item = safetyNetItem
    setSafetyNetItem(null)
    setSelectedItem(item); setSelectedArticuloId(item ? String(item.clave) : "")
    setCantidadMovimiento(""); setTipoMovimientoToggle("ENTRADA"); setMotivoMovimiento(""); setMovimientoError(null)
    setStockMinimoEditar(item ? String(item.minimo) : "0")
    setCuotaBEditar(item?.cuotaB != null ? String(item.cuotaB) : "0")
    setCuotaAEditar(item ? String(Number(String(item.cuota).replace(/[^\d.-]/g, "")) || 0) : "0")
    setShowMovimientoDialog(true)
  }
  function closeMovimientoDialog() { setShowMovimientoDialog(false); setSavingMovimiento(false); setSavingStockMinimo(false); setMovimientoError(null); setStockMinimoEditar("0"); setCuotaBEditar(""); setCuotaAEditar("0"); setTipoMovimientoToggle("ENTRADA"); setShowPrecioConfirmDialog(false) }

  const normQty = (v: string) => { const p = Math.trunc(Number(v)); return isNaN(p) ? 0 : p }

  async function handleConfirmMovimiento() {
    const id = Number(selectedItem ? selectedItem.clave : selectedArticuloId)
    const qty = normQty(cantidadMovimiento)
    const minimo = Number(stockMinimoEditar)
    const cuotaANew = Number(cuotaAEditar)
    const cuotaAOld = Number(String(selectedItem?.cuota ?? "0").replace(/[^\d.-]/g, "")) || 0
    const cuotaAChanged = cuotaANew !== cuotaAOld
    const cuotaBNew = Number(cuotaBEditar)
    const cuotaBOld = selectedItem?.cuotaB ?? 0
    const cuotaBChanged = cuotaBNew !== cuotaBOld

    if (!id || isNaN(id)) { setMovimientoError("Selecciona un artículo válido."); return }
    if (isNaN(minimo) || minimo < 0) { setMovimientoError("Stock mínimo debe ser ≥ 0."); return }
    if (isNaN(cuotaANew) || cuotaANew < 0) { setMovimientoError("El precio base debe ser ≥ 0."); return }
    if (cuotaBEditar.trim() === "" || isNaN(cuotaBNew as number) || (cuotaBNew as number) < 0) { setMovimientoError("La Cuota B es obligatoria y debe ser ≥ 0."); return }
    if (qty === 0 && minimo === (selectedItem?.minimo ?? 5) && !cuotaBChanged && !cuotaAChanged) { setMovimientoError("Sin cambios para guardar."); return }
    if (qty !== 0 && !motivoMovimiento.trim()) { setMovimientoError("El motivo es obligatorio para registrar un movimiento."); return }

    setMovimientoError(null)
    if (cuotaAChanged) { setShowPrecioConfirmDialog(true); return }
    await executeSave()
  }

  async function executeSave() {
    const id = Number(selectedItem ? selectedItem.clave : selectedArticuloId)
    const qty = normQty(cantidadMovimiento)
    const minimo = Number(stockMinimoEditar)
    const cuotaANew = Number(cuotaAEditar)
    const cuotaAOld = Number(String(selectedItem?.cuota ?? "0").replace(/[^\d.-]/g, "")) || 0
    const cuotaAChanged = cuotaANew !== cuotaAOld
    const cuotaBNew = Number(cuotaBEditar)
    const cuotaBOld = selectedItem?.cuotaB ?? 0
    const cuotaBChanged = cuotaBNew !== cuotaBOld

    setShowPrecioConfirmDialog(false)
    setSavingMovimiento(true); setSavingStockMinimo(true); setMovimientoError(null)
    try {
      const updatePayload: Record<string, unknown> = {}
      if (minimo !== (selectedItem?.minimo ?? 5)) updatePayload.stockMinimo = minimo
      if (cuotaBChanged) updatePayload.cuotaB = cuotaBNew
      if (cuotaAChanged) updatePayload.cuotaRecuperacion = cuotaANew
      if (Object.keys(updatePayload).length > 0) {
        await actualizarArticulo(id, updatePayload as Parameters<typeof actualizarArticulo>[1])
      }
      if (qty !== 0) {
        await registrarMovimiento({ idArticulo: id, tipo: tipoMovimientoToggle, cantidad: qty, motivo: motivoMovimiento.trim() })
      }
      await refreshInventario()
      closeMovimientoDialog()

      const updates: string[] = []
      if (cuotaAChanged) updates.push("Precio base actualizado")
      if (cuotaBChanged) updates.push("Cuota B actualizada")
      if (minimo !== (selectedItem?.minimo ?? 5)) updates.push("Stock mínimo actualizado")
      if (qty !== 0) updates.push(tipoMovimientoToggle === "ENTRADA" ? "Entrada registrada" : "Salida registrada")
      toast.success(updates.length > 0 ? updates.join(" • ") : "Cambios guardados")
    } catch (err: unknown) {
      const msg = friendlyError(err, "No se pudo guardar los cambios")
      setMovimientoError(msg)
      toast.error(msg)
    } finally {
      setSavingMovimiento(false)
      setSavingStockMinimo(false)
    }
  }

  function openAgregarArticulo() {
    setArticuloError(null); setSavingArticulo(false)
    setArticuloForm({ idArticulo: "", descripcion: "", unidad: "PZA.", cuotaRecuperacion: "0", cuotaB: "", inventarioActual: "0", stockMinimo: "5", idCategoria: "" })
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
    const idCat = Number(articuloForm.idCategoria)
    const cuotaBVal = Number(articuloForm.cuotaB)
    if (isNaN(id)) { setArticuloError("La clave debe ser numérica."); return }
    if (!articuloForm.descripcion.trim()) { setArticuloError("La descripción es obligatoria."); return }
    if (!articuloForm.idCategoria || isNaN(idCat)) { setArticuloError("Selecciona una categoría."); return }
    const unidadFinal = unidadSeleccionada === OTRA_UNIDAD_VALUE ? unidadNueva.trim() : articuloForm.unidad.trim()
    if (!unidadFinal) { setArticuloError("La unidad es obligatoria."); return }
    if (isNaN(cuota) || cuota < 0) { setArticuloError("La cuota A (precio base) debe ser ≥ 0."); return }
    if (articuloForm.cuotaB.trim() === "" || isNaN(cuotaBVal) || cuotaBVal < 0) { setArticuloError("La Cuota B es obligatoria y debe ser ≥ 0."); return }
    if (isNaN(inv) || inv < 0) { setArticuloError("La cantidad inicial debe ser ≥ 0."); return }
    if (isNaN(minimo) || minimo < 0) { setArticuloError("El stock mínimo debe ser ≥ 0."); return }
    setSavingArticulo(true); setArticuloError(null)
    try {
      await crearArticulo({
        ...(id > 0 ? { idArticulo: id } : {}),
        descripcion: articuloForm.descripcion.trim(),
        unidad: unidadFinal,
        cuotaRecuperacion: cuota,
        cuotaB: cuotaBVal,
        inventarioActual: inv,
        manejaInventario: "S",
        idCategoria: idCat,
        stockMinimo: minimo,
      })
      await refreshInventario(); setShowAgregarDialog(false)
      toast.success("Artículo agregado al inventario")
    } catch (err: unknown) {
      setArticuloError(friendlyError(err, "No se pudo agregar el artículo"))
      toast.error(friendlyError(err, "No se pudo agregar el artículo"))
    } finally { setSavingArticulo(false) }
  }

  async function handleEliminarArticulo() {
    if (!deleteArticuloId) { setArticuloError("Selecciona un artículo."); return }
    setSavingArticulo(true); setArticuloError(null)
    try {
      await eliminarArticulo(deleteArticuloId)
      toast.success("Artículo eliminado del inventario")
      await refreshInventario()
      setSearchTerm("")
      setShowEliminarDialog(false)
    } catch (err: unknown) {
      // 404 means the article was already deleted externally — sync the UI
      const status = (err as { status?: number })?.status
      if (status === 404) {
        await refreshInventario()
        setSearchTerm("")
        setShowEliminarDialog(false)
        toast.info("El artículo ya había sido eliminado del sistema")
      } else {
        setArticuloError(friendlyError(err, "No se pudo eliminar el artículo"))
        toast.error(friendlyError(err, "No se pudo eliminar el artículo"))
      }
    } finally { setSavingArticulo(false) }
  }

  const qty = normQty(cantidadMovimiento)

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Control de artículos y materiales del almacén</p>
        </div>
        <button onClick={() => { loadData(); if (activeTab === "historial") loadMovimientos() }}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="size-3.5" />Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("articulos")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "articulos"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <Package className="size-3.5" />
          Artículos
        </button>
        <button
          onClick={() => { setActiveTab("historial"); if (!movimientos.length) loadMovimientos() }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "historial"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <Clock className="size-3.5" />
          Historial (30d)
        </button>
      </div>

      {/* KPIs */}
      {activeTab === "articulos" && <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
      </div>}

      {/* Tabla */}
      {activeTab === "articulos" && <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

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
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Clave o artículo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              />
            </div>
            {/* Selector de categoría */}
            {categorias.length > 0 && (
              <Popover open={catFilterOpen} onOpenChange={setCatFilterOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      categoriaFilter != null
                        ? "border-[#0f4c81]/50 bg-[#0f4c81]/5 text-[#0f4c81] dark:border-[#0f4c81]/40 dark:bg-[#0f4c81]/20"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Tag className="size-3.5" />
                    {categoriaFilter != null
                      ? (categorias.find(c => c.id === categoriaFilter)?.nombre ?? "Categoría")
                      : "Categoría"}
                    {categoriaFilter != null && (
                      <span
                        onClick={e => { e.stopPropagation(); setCategoriaFilter(null) }}
                        className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-black/10"
                      >
                        <X className="size-2.5" />
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-52 p-1.5">
                  <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">Categoría</p>
                  <button
                    onClick={() => { setCategoriaFilter(null); setCatFilterOpen(false) }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                      categoriaFilter == null ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Package className="size-3.5" />
                    Todas las categorías
                  </button>
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoriaFilter(cat.id); setCatFilterOpen(false) }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                        categoriaFilter === cat.id
                          ? "bg-[#0f4c81]/5 font-medium text-[#0f4c81] dark:bg-[#0f4c81]/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Tag className="size-3.5" />
                      {cat.nombre}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
            {/* Filtro de stock */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    stockFilter === "sin"
                      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : stockFilter === "bajo"
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Filter className="size-3.5" />
                  Stock
                  {stockFilter != null && (
                    <span
                      onClick={e => { e.stopPropagation(); setStockFilter(null) }}
                      className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <X className="size-2.5" />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-1.5">
                {/* Sección: Stock */}
                <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">Stock</p>
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
                  <button onClick={() => handleSort("clave")} className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Hash className="size-3" />CLAVE <SortIcon f="clave" />
                  </button>
                </th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button onClick={() => handleSort("descripcion")} className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Package className="size-3" />ARTÍCULO <SortIcon f="descripcion" />
                  </button>
                </th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                  <button onClick={handleUnidadCycle} className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Ruler className="size-3" />UNIDAD <ArrowUpDown className="inline size-3 opacity-40" />
                  </button>
                </th>
                <th className="hidden py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                  <button onClick={() => handleSort("cuota")} className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <DollarSign className="size-3" />CUOTA <SortIcon f="cuota" />
                  </button>
                </th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button onClick={() => handleSort("cantidad")} className="group inline-flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Layers className="size-3" />CANTIDAD <SortIcon f="cantidad" />
                  </button>
                </th>
                <th className="py-2.5 pr-5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">No se encontraron artículos.</td>
                </tr>
              ) : (
                sortedFiltered.map((item, idx) => {
                  const bajo = item.cantidad <= item.minimo
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
      </div>}

      {/* ── Historial de movimientos ── */}
      {activeTab === "historial" && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Historial de movimientos</p>
              <p className="text-[11px] text-muted-foreground">Últimos 30 días · {movimientos.length} registros</p>
            </div>
            <button
              onClick={loadMovimientos}
              disabled={loadingMovimientos}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loadingMovimientos ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
          {loadingMovimientos ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted-foreground">Cargando historial...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Clock className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin movimientos en los últimos 30 días</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="py-2.5 pl-5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Clock className="size-3" />FECHA</span></th>
                    <th className="py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Package className="size-3" />ARTÍCULO</span></th>
                    <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Tag className="size-3" />TIPO</span></th>
                    <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Layers className="size-3" />CANTIDAD</span></th>
                    <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground hidden md:table-cell"><span className="inline-flex items-center gap-1"><Hash className="size-3" />STOCK FINAL</span></th>
                    <th className="py-2.5 pr-5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Filter className="size-3" />MOTIVO</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {movimientos.map((m) => {
                    const esEntrada = m.tipo === "ENTRADA"
                    const fecha = (() => {
                      try {
                        return new Date(m.fecha).toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      } catch { return m.fecha }
                    })()
                    return (
                      <tr key={m.idMovimiento} className="transition-colors hover:bg-muted/20">
                        <td className="py-3 pl-5 text-[11px] text-muted-foreground whitespace-nowrap">{fecha}</td>
                        <td className="py-3 max-w-[14rem]">
                          <p className="truncate font-medium text-foreground">{m.descripcion}</p>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            esEntrada
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          }`}>
                            {esEntrada ? "ENTRADA" : "SALIDA"}
                          </span>
                        </td>
                        <td className={`py-3 text-center font-bold tabular-nums ${
                          esEntrada ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {esEntrada ? "+" : "−"}{m.cantidad}
                        </td>
                        <td className="py-3 text-center text-foreground tabular-nums hidden md:table-cell">
                          {m.stockResultante}
                        </td>
                        <td className="py-3 pr-5 text-muted-foreground max-w-[16rem]">
                          <p className="truncate">{m.motivo || <span className="italic opacity-50">Sin motivo</span>}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Dialog: Safety net Equipos Médicos ── */}
      <Dialog open={safetyNetItem != null} onOpenChange={open => { if (!open) setSafetyNetItem(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">¿Qué deseas hacer?</DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-medium text-foreground">{safetyNetItem?.descripcion}</span>
              {" "}es un equipo médico que normalmente se presta a beneficiarios y se devuelve.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => { setSafetyNetItem(null); onNavigate?.("servicios") }}
              className="flex flex-col items-start gap-0.5 rounded-xl border-2 border-[#0f4c81]/30 bg-[#0f4c81]/5 px-4 py-3 text-left transition-colors hover:border-[#0f4c81] hover:bg-[#0f4c81]/10"
            >
              <span className="text-sm font-semibold text-[#0f4c81]">Registrar comodato a un beneficiario</span>
              <span className="text-[11px] text-muted-foreground">Se registra el comodato bajo el nombre de la persona y se descuenta del inventario automáticamente.</span>
            </button>
            <button
              onClick={confirmarAjusteStock}
              className="flex flex-col items-start gap-0.5 rounded-xl border-2 border-border/60 bg-muted/30 px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/60"
            >
              <span className="text-sm font-semibold text-foreground">Ajustar stock</span>
              <span className="text-[11px] text-muted-foreground">Llegaron equipos nuevos, se dañó uno, corrección de inventario. No se asigna a ninguna persona.</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmación de cambio de precio ── */}
      <Dialog open={showPrecioConfirmDialog} onOpenChange={open => { if (!open) setShowPrecioConfirmDialog(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">¿Cambiar el precio?</DialogTitle>
            <DialogDescription className="text-xs">
              Estás a punto de modificar el precio base de <span className="font-medium text-foreground">{selectedItem?.descripcion}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cuota de recuperación actual</span>
                  <span className="font-bold text-foreground">{selectedItem?.cuota ?? "$0.00"}</span>
                </div>
                <span className="text-lg text-muted-foreground">→</span>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cuota de recuperación nueva</span>
                  <span className="font-bold text-[#0f4c81]">${Number(cuotaAEditar || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Este cambio afectará el precio que se cobra a los beneficiarios a partir de ahora.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
            <button
              onClick={() => setShowPrecioConfirmDialog(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeSave}
              disabled={savingMovimiento || savingStockMinimo}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              Sí, cambiar precio
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Movimiento ── */}
      <Dialog open={showMovimientoDialog} onOpenChange={setShowMovimientoDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Package className="size-4 text-[#0f4c81]" />
              {selectedItem ? selectedItem.descripcion : "Modificar artículo"}
            </DialogTitle>
            {selectedItem && (
              <DialogDescription className="text-xs text-muted-foreground">
                Ajusta el stock, el precio o el mínimo del artículo.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">

            {/* Selector de artículo (cuando se abre sin item) */}
            {!selectedItem && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Artículo</label>
                <Select value={selectedArticuloId} onValueChange={setSelectedArticuloId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar artículo" /></SelectTrigger>
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

            {/* Card de estado actual */}
            {selectedItem && (
              <div className="grid grid-cols-3 divide-x divide-border/50 rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
                <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Stock</span>
                  <span className={`text-2xl font-bold tabular-nums ${
                    selectedItem.cantidad === 0 ? "text-red-500 dark:text-red-400"
                    : selectedItem.cantidad <= selectedItem.minimo ? "text-amber-500 dark:text-amber-400"
                    : "text-foreground"
                  }`}>{selectedItem.cantidad}</span>
                  <span className="text-[9px] text-muted-foreground">{selectedItem.unidad}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recuperación</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">{selectedItem.cuota}</span>
                  {selectedItem.cuotaB != null && (
                    <span className="text-[9px] text-muted-foreground">Real: ${selectedItem.cuotaB.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mínimo</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">{selectedItem.minimo}</span>
                  <span className="text-[9px] text-muted-foreground">alerta</span>
                </div>
              </div>
            )}

            {/* Sección: Movimiento de stock */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Movimiento de stock</p>
              <div className="flex flex-col gap-3">
                {/* Toggle ENTRADA / SALIDA */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMovimientoToggle("ENTRADA")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      tipoMovimientoToggle === "ENTRADA"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Plus className="size-3.5" /> Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMovimientoToggle("SALIDA")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      tipoMovimientoToggle === "SALIDA"
                        ? "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-400"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Minus className="size-3.5" /> Salida
                  </button>
                </div>
                {/* Cantidad */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cantidad</label>
                  <Input
                    className="h-9 text-sm"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={cantidadMovimiento}
                    onChange={e => setCantidadMovimiento(e.target.value)}
                  />
                </div>
                {/* Motivo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Motivo {qty !== 0 && <span className="text-red-500 normal-case tracking-normal font-normal">*</span>}
                  </label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="¿Por qué se modifica el stock?"
                    value={motivoMovimiento}
                    onChange={e => setMotivoMovimiento(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Configuración del artículo */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Configuración del artículo</p>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cuota de recuperación</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input className="h-9 pl-6 text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={cuotaAEditar} onChange={e => setCuotaAEditar(e.target.value)} disabled={savingMovimiento} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Precio subsidiado (recursos limitados)</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Precio real</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input className="h-9 pl-6 text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={cuotaBEditar} onChange={e => setCuotaBEditar(e.target.value)} disabled={savingMovimiento} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Precio completo (cuota B)</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stock mínimo (alerta)</label>
                  <Input className="h-9 text-sm" type="number" min="0" placeholder="Ej. 5" value={stockMinimoEditar} onChange={e => setStockMinimoEditar(e.target.value)} disabled={savingStockMinimo} />
                </div>
              </div>
            </div>

            {movimientoError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{movimientoError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={closeMovimientoDialog} disabled={savingMovimiento || savingStockMinimo}
                className="rounded-lg border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmMovimiento} disabled={savingMovimiento || savingStockMinimo}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}>
                {savingMovimiento || savingStockMinimo ? "Guardando..." : "Guardar cambios"}
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
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Clasificación</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Categoría *</label>
                  <Select value={articuloForm.idCategoria} onValueChange={v => setArticuloForm(p => ({ ...p, idCategoria: v }))}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cuota de recuperación</label>
                    <Input className="h-10 text-sm" type="number" min="0" step="0.01" value={articuloForm.cuotaRecuperacion} onChange={e => setArticuloForm(p => ({ ...p, cuotaRecuperacion: e.target.value }))} />
                    <p className="text-[11px] text-muted-foreground">Precio subsidiado (recursos limitados).</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Precio real</label>
                    <Input className="h-10 text-sm" type="number" min="0" step="0.01" placeholder="0.00" value={articuloForm.cuotaB} onChange={e => setArticuloForm(p => ({ ...p, cuotaB: e.target.value }))} />
                    <p className="text-[11px] text-muted-foreground">Precio completo (cuota B).</p>
                  </div>
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
