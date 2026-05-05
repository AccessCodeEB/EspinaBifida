"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Minus, AlertTriangle, Package, Check, ChevronsUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  getInventario,
  registrarMovimiento,
  crearArticulo,
  eliminarArticulo,
  type ArticuloInventario,
} from "@/services/inventario"

type SortField = "clave" | "descripcion" | "cuota" | "cantidad"
type SortDirection = "asc" | "desc"
const OTRA_UNIDAD_VALUE = "__OTRA_UNIDAD__"

function getCantidadTextClass(cantidad: number) {
  return cantidad < 10
    ? "text-red-600 dark:text-red-400"
    : "text-emerald-600 dark:text-emerald-400"
}

export function InventarioSection() {
  const [inventario, setInventario]   = useState<ArticuloInventario[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [searchTerm, setSearchTerm]   = useState("")
  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false)
  const [selectedItem, setSelectedItem]     = useState<ArticuloInventario | null>(null)
  const [selectedArticuloId, setSelectedArticuloId] = useState<string>("")
  const [cantidadMovimiento, setCantidadMovimiento] = useState<string>("0")
  const [motivoMovimiento, setMotivoMovimiento] = useState<string>("")
  const [savingMovimiento, setSavingMovimiento] = useState(false)
  const [movimientoError, setMovimientoError] = useState<string | null>(null)

  const [showAgregarDialog, setShowAgregarDialog] = useState(false)
  const [showEliminarDialog, setShowEliminarDialog] = useState(false)
  const [articuloForm, setArticuloForm] = useState({
    idArticulo: "",
    descripcion: "",
    unidad: "PZA.",
    cuotaRecuperacion: "0",
    inventarioActual: "0",
    idCategoria: "1",
  })
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>("PZA.")
  const [unidadNueva, setUnidadNueva] = useState<string>("")
  const [deleteArticuloId, setDeleteArticuloId] = useState("")
  const [deletePickerOpen, setDeletePickerOpen] = useState(false)
  const [articuloError, setArticuloError] = useState<string | null>(null)
  const [savingArticulo, setSavingArticulo] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [unidadFilterIndex, setUnidadFilterIndex] = useState<number>(-1)

  useEffect(() => {
    getInventario()
      .then(data => setInventario(data))
      .catch(err => setError(err?.message ?? "Error al cargar inventario"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground text-sm">Cargando inventario...</p></div>
  if (error)   return <div className="flex h-64 items-center justify-center"><p className="text-destructive text-sm">{error}</p></div>

  const filtered   = inventario.filter((item) =>
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.clave).toLowerCase().includes(searchTerm.toLowerCase())
  )
  const unidadesDisponibles = Array.from(
    new Set(inventario.map((item) => item.unidad).filter((u) => String(u ?? "").trim() !== ""))
  ).sort((a, b) => a.localeCompare(b, "es"))
  const unidadesParaAlta = Array.from(new Set(["PZA.", ...unidadesDisponibles]))
    .sort((a, b) => a.localeCompare(b, "es"))

  const activeUnidadFilter = unidadFilterIndex >= 0 ? unidadesDisponibles[unidadFilterIndex] : null

  const filteredByUnidad = activeUnidadFilter
    ? filtered.filter((item) => item.unidad === activeUnidadFilter)
    : filtered

  const sortedFiltered = [...filteredByUnidad].sort((a, b) => {
    if (!sortField) return 0

    const factor = sortDirection === "asc" ? 1 : -1

    if (sortField === "clave") {
      const aNum = Number(a.clave)
      const bNum = Number(b.clave)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return (aNum - bNum) * factor
      }
      return String(a.clave).localeCompare(String(b.clave), "es", { numeric: true }) * factor
    }

    if (sortField === "descripcion") {
      return a.descripcion.localeCompare(b.descripcion, "es") * factor
    }

    if (sortField === "cuota") {
      const aCuota = Number(String(a.cuota).replace(/[^\d.-]/g, ""))
      const bCuota = Number(String(b.cuota).replace(/[^\d.-]/g, ""))
      return ((Number.isNaN(aCuota) ? 0 : aCuota) - (Number.isNaN(bCuota) ? 0 : bCuota)) * factor
    }

    return (Number(a.cantidad) - Number(b.cantidad)) * factor
  })
  const bajosStock = inventario.filter((item) => item.cantidad < item.minimo).length

  function getInitialDirection(field: SortField): SortDirection {
    if (field === "cantidad" || field === "cuota") return "desc"
    return "asc"
  }

  function handleUnidadCycle() {
    if (unidadesDisponibles.length === 0) return
    setUnidadFilterIndex((prev) => {
      const next = prev + 1
      if (next >= unidadesDisponibles.length) return -1
      return next
    })
  }

  function handleSort(field: SortField) {
    // Si el usuario ordena por otra columna, se limpia el filtro ciclado por unidad.
    setUnidadFilterIndex(-1)

    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection(getInitialDirection(field))
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ""
    return sortDirection === "asc" ? " ▲" : " ▼"
  }

  function openMovimiento(item: ArticuloInventario | null = null) {
    setSelectedItem(item)
    setSelectedArticuloId(item ? String(item.clave) : "")
    setCantidadMovimiento("0")
    setMotivoMovimiento("")
    setMovimientoError(null)
    setShowMovimientoDialog(true)
  }

  function closeMovimientoDialog() {
    setShowMovimientoDialog(false)
    setSavingMovimiento(false)
    setMovimientoError(null)
  }

  function normalizarCantidadMovimiento(value: string) {
    const parsed = Math.trunc(Number(value))
    if (Number.isNaN(parsed)) return 0
    return parsed
  }

  function incrementarCantidadMovimiento() {
    setCantidadMovimiento((prev) => {
      const current = normalizarCantidadMovimiento(prev)
      return String(current + 1)
    })
  }

  function disminuirCantidadMovimiento() {
    setCantidadMovimiento((prev) => {
      const current = normalizarCantidadMovimiento(prev)
      return String(current - 1)
    })
  }

  async function handleConfirmMovimiento() {
    const idArticuloRaw = selectedItem ? selectedItem.clave : selectedArticuloId
    const idArticulo = Number(idArticuloRaw)
    const cantidadConSigno = normalizarCantidadMovimiento(cantidadMovimiento)

    if (!idArticuloRaw || Number.isNaN(idArticulo)) {
      setMovimientoError("Selecciona un artículo válido.")
      return
    }

    if (cantidadConSigno === 0) {
      setMovimientoError("La cantidad no puede ser 0.")
      return
    }

    setSavingMovimiento(true)
    setMovimientoError(null)

    try {
      await registrarMovimiento({
        idArticulo,
        tipo: cantidadConSigno > 0 ? "ENTRADA" : "SALIDA",
        cantidad: Math.abs(cantidadConSigno),
        motivo: motivoMovimiento.trim() || "Movimiento manual",
      })

      const data = await getInventario()
      setInventario(data)
      closeMovimientoDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo registrar el movimiento"
      setMovimientoError(message)
      setSavingMovimiento(false)
    }
  }

  async function refreshInventario() {
    const data = await getInventario()
    setInventario(data)
  }

  function openAgregarArticulo() {
    setArticuloError(null)
    setSavingArticulo(false)
    setArticuloForm({
      idArticulo: "",
      descripcion: "",
      unidad: "PZA.",
      cuotaRecuperacion: "0",
      inventarioActual: "0",
      idCategoria: "1",
    })
    setUnidadSeleccionada("PZA.")
    setUnidadNueva("")
    setShowAgregarDialog(true)
  }

  function handleUnidadSeleccion(value: string) {
    setUnidadSeleccionada(value)

    if (value === OTRA_UNIDAD_VALUE) {
      return
    }

    setUnidadNueva("")
    setArticuloForm((prev) => ({ ...prev, unidad: value }))
  }

  function openEliminarArticulo() {
    setArticuloError(null)
    setSavingArticulo(false)
    setDeleteArticuloId("")
    setDeletePickerOpen(false)
    setShowEliminarDialog(true)
  }

  const normalizeForSearch = (value: string | number) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()

  const findArticuloLabel = (id: string) => {
    const item = inventario.find((art) => String(art.clave) === id)
    return item ? `${item.clave} - ${item.descripcion}` : "Seleccionar artículo"
  }

  async function handleAgregarArticulo() {
    const idArticulo = Number(articuloForm.idArticulo)
    const cuotaRecuperacion = Number(articuloForm.cuotaRecuperacion)
    const inventarioActual = Number(articuloForm.inventarioActual)
    const idCategoria = Number(articuloForm.idCategoria)

    if (Number.isNaN(idArticulo)) {
      setArticuloError("La clave del artículo debe ser numérica.")
      return
    }
    if (!articuloForm.descripcion.trim()) {
      setArticuloError("La descripción es obligatoria.")
      return
    }
    const unidadFinal =
      unidadSeleccionada === OTRA_UNIDAD_VALUE
        ? unidadNueva.trim()
        : articuloForm.unidad.trim()

    if (!unidadFinal) {
      setArticuloError("La unidad es obligatoria.")
      return
    }
    if (Number.isNaN(cuotaRecuperacion) || cuotaRecuperacion < 0) {
      setArticuloError("La cuota debe ser un número mayor o igual a 0.")
      return
    }
    if (Number.isNaN(inventarioActual) || inventarioActual < 0) {
      setArticuloError("La cantidad inicial debe ser mayor o igual a 0.")
      return
    }
    if (Number.isNaN(idCategoria)) {
      setArticuloError("La categoría debe ser numérica.")
      return
    }

    setSavingArticulo(true)
    setArticuloError(null)

    try {
      await crearArticulo({
        idArticulo,
        descripcion: articuloForm.descripcion.trim(),
        unidad: unidadFinal,
        cuotaRecuperacion,
        inventarioActual,
        manejaInventario: "S",
        idCategoria,
      })

      await refreshInventario()
      setShowAgregarDialog(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo agregar el artículo"
      setArticuloError(message)
    } finally {
      setSavingArticulo(false)
    }
  }

  async function handleEliminarArticulo() {
    if (!deleteArticuloId) {
      setArticuloError("Selecciona un artículo para eliminar.")
      return
    }

    setSavingArticulo(true)
    setArticuloError(null)
    try {
      await eliminarArticulo(deleteArticuloId)
      await refreshInventario()
      setShowEliminarDialog(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el artículo"
      setArticuloError(message)
    } finally {
      setSavingArticulo(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control de artículos y materiales.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-emerald-500/40 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-300 dark:border-emerald-400/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-200"
            onClick={openAgregarArticulo}
          >
            <Plus className="size-4" />Agregar artículo
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-red-500/40 text-red-700 bg-red-50/40 hover:bg-red-100 hover:text-red-800 dark:text-red-300 dark:border-red-400/40 dark:bg-red-950/20 dark:hover:bg-red-900/40 dark:hover:text-red-200"
            onClick={openEliminarArticulo}
          >
            <Minus className="size-4" />Eliminar artículo
          </Button>
        </div>
      </div>

      {bajosStock > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-warning text-warning-foreground">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {bajosStock} artículo{bajosStock > 1 ? "s" : ""} con stock bajo
              </p>
              <p className="text-sm text-muted-foreground">Se recomienda reabastecer los artículos marcados en rojo.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Listado de Inventario</CardTitle>
              <CardDescription>
                Mostrando {filtered.length} de {inventario.length} artículos
              </CardDescription>
              <p className="mt-1 text-xs text-muted-foreground">
                Filtro de unidad: {activeUnidadFilter ?? "Todas"}
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por clave o artículo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-center">
                  <button type="button" className="cursor-pointer" onClick={() => handleSort("clave")}>Clave{sortIndicator("clave")}</button>
                </TableHead>
                <TableHead className="min-w-[12rem] font-semibold text-left">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-baseline gap-0.5 text-left"
                    onClick={() => handleSort("descripcion")}
                  >
                    Artículo{sortIndicator("descripcion")}
                  </button>
                </TableHead>
                <TableHead className="font-semibold hidden md:table-cell text-center">
                  <button type="button" className="flex w-full cursor-pointer justify-center text-center" onClick={handleUnidadCycle}>
                    Unidad
                  </button>
                </TableHead>
                <TableHead className="font-semibold hidden lg:table-cell text-center">
                  <button type="button" className="cursor-pointer" onClick={() => handleSort("cuota")}>Cuota{sortIndicator("cuota")}</button>
                </TableHead>
                <TableHead className="font-semibold text-center">
                  <button type="button" className="cursor-pointer" onClick={() => handleSort("cantidad")}>Cantidad{sortIndicator("cantidad")}</button>
                </TableHead>
                <TableHead className="font-semibold text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((item, idx) => (
                <TableRow key={`${item.clave}-${idx}`} className={item.cantidad < item.minimo ? "bg-destructive/5" : ""}>
                  <TableCell className="text-center font-semibold text-primary">{item.clave}</TableCell>
                  <TableCell className="max-w-[12rem] text-left font-medium md:max-w-[14rem]">
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-1">{item.descripcion}</span>
                      <span className="text-[11px] text-muted-foreground md:hidden">
                        {item.unidad} · {item.cuota}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap text-center text-foreground">{item.unidad}</TableCell>
                  <TableCell className="hidden lg:table-cell text-center text-foreground">{item.cuota}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm font-semibold ${getCantidadTextClass(item.cantidad)}`}>
                      {item.cantidad}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-foreground"
                        title="Modificar inventario"
                        onClick={() => openMovimiento(item)}
                      >
                        Modificar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showMovimientoDialog} onOpenChange={setShowMovimientoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Modificar inventario
            </DialogTitle>
            <DialogDescription>
              {selectedItem ? selectedItem.descripcion : "Seleccione el artículo y ajuste la cantidad."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!selectedItem && (
              <div className="flex flex-col gap-2">
                <Label>Artículo</Label>
                <Select value={selectedArticuloId} onValueChange={setSelectedArticuloId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar artículo" /></SelectTrigger>
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
            <div className="flex flex-col gap-2">
              <Label>Cantidad</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={disminuirCantidadMovimiento}
                  aria-label="Disminuir cantidad"
                >
                  -
                </Button>
                <div className="min-w-16 rounded-md border border-input bg-background px-4 py-2 text-center text-lg font-semibold">
                  {normalizarCantidadMovimiento(cantidadMovimiento) > 0
                    ? `+${normalizarCantidadMovimiento(cantidadMovimiento)}`
                    : `${normalizarCantidadMovimiento(cantidadMovimiento)}`}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={incrementarCantidadMovimiento}
                  aria-label="Aumentar cantidad"
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                + agrega artículos y - quita artículos.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Motivo</Label>
              <Input
                placeholder="Descripción del movimiento"
                value={motivoMovimiento}
                onChange={(e) => setMotivoMovimiento(e.target.value)}
              />
            </div>
            {movimientoError && (
              <p className="text-sm text-destructive">{movimientoError}</p>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeMovimientoDialog} disabled={savingMovimiento}>Cancelar</Button>
              <Button type="button" onClick={handleConfirmMovimiento} disabled={savingMovimiento}>
                {savingMovimiento ? "Guardando..." : "Confirmar modificación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAgregarDialog} onOpenChange={setShowAgregarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar artículo</DialogTitle>
            <DialogDescription>Crea un artículo nuevo en la base de datos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Clave (ID)</Label>
              <Input
                type="number"
                min="1"
                value={articuloForm.idArticulo}
                onChange={(e) => setArticuloForm((p) => ({ ...p, idArticulo: e.target.value }))}
                placeholder="Ej. 500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripción</Label>
              <Input
                value={articuloForm.descripcion}
                onChange={(e) => setArticuloForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Nombre del artículo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Unidad</Label>
                <Select value={unidadSeleccionada} onValueChange={handleUnidadSeleccion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesParaAlta.map((unidad, idx) => (
                      <SelectItem key={`unidad-${idx}-${unidad}`} value={unidad}>
                        {unidad}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTRA_UNIDAD_VALUE}>Otro</SelectItem>
                  </SelectContent>
                </Select>
                {unidadSeleccionada === OTRA_UNIDAD_VALUE && (
                  <Input
                    placeholder="Escribe la nueva unidad"
                    value={unidadNueva}
                    onChange={(e) => setUnidadNueva(e.target.value)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Categoría (ID)</Label>
                <Input
                  type="number"
                  min="1"
                  value={articuloForm.idCategoria}
                  onChange={(e) => setArticuloForm((p) => ({ ...p, idCategoria: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Cuota recuperación</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={articuloForm.cuotaRecuperacion}
                  onChange={(e) => setArticuloForm((p) => ({ ...p, cuotaRecuperacion: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Cantidad inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={articuloForm.inventarioActual}
                  onChange={(e) => setArticuloForm((p) => ({ ...p, inventarioActual: e.target.value }))}
                />
              </div>
            </div>
            {articuloError && <p className="text-sm text-destructive">{articuloError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAgregarDialog(false)} disabled={savingArticulo}>Cancelar</Button>
              <Button onClick={handleAgregarArticulo} disabled={savingArticulo}>
                {savingArticulo ? "Guardando..." : "Agregar artículo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEliminarDialog} onOpenChange={setShowEliminarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar artículo</DialogTitle>
            <DialogDescription>Selecciona el artículo que deseas eliminar de la base de datos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Artículo</Label>
              <Popover open={deletePickerOpen} onOpenChange={setDeletePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={deletePickerOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate">{findArticuloLabel(deleteArticuloId)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="start">
                  <Command shouldFilter>
                    <CommandInput placeholder="Escribe clave o descripción..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron artículos.</CommandEmpty>
                      <CommandGroup>
                        {inventario.map((item, idx) => {
                          const itemLabel = `${item.clave} - ${item.descripcion}`
                          const normalized = normalizeForSearch(itemLabel)
                          return (
                            <CommandItem
                              key={`del-${item.clave}-${idx}`}
                              value={normalized}
                              keywords={[
                                normalizeForSearch(item.clave),
                                normalizeForSearch(item.descripcion),
                              ]}
                              onSelect={() => {
                                setDeleteArticuloId(String(item.clave))
                                setDeletePickerOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  deleteArticuloId === String(item.clave) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{itemLabel}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {articuloError && <p className="text-sm text-destructive">{articuloError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEliminarDialog(false)} disabled={savingArticulo}>Cancelar</Button>
              <Button variant="destructive" onClick={handleEliminarArticulo} disabled={savingArticulo}>
                {savingArticulo ? "Eliminando..." : "Eliminar artículo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
