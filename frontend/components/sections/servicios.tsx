"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import {
  CalendarDays,
  ChevronDown,
  Plus,
  RotateCcw,
  ClipboardList,
  AlertCircle,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StatusIcon } from "@/components/ui/status-icon"

import {
  createServicio,
  deleteServicio,
  getServicios,
  getComodatos,
  getCatalogoServicios,
  confirmarDevolucion,
  type Servicio,
  type ComodatoActivo,
  type TipoServicioCompleto,
} from "@/services/servicios"
import { getInventario, type ArticuloInventario } from "@/services/inventario"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"

import type { ServicioDetallado, SortField, SortDirection, RangoRapido, PendingDelete } from "./servicios/types"
import { ServiciosChartsKpis } from "./servicios/ServiciosChartsKpis"
import { ServiciosTable } from "./servicios/ServiciosTable"
import { ServicioFormDialog } from "./servicios/ServicioFormDialog"
import type { BeneficiarioEncontrado } from "./servicios/ServicioFormDialog"

// ─── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25
const PIE_COLORS = ["#005bb5", "#eab308", "#ef4444", "#10b981", "#9333ea", "#fb923c", "#14b8a6"]
const NAVY = "#0f4c81"

function monthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")
}

function monthInputToLabel(key: string): string {
  const [year, month] = key.split("-").map(Number)
  const d = new Date(year, month - 1, 1)
  const text = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const iso = value.includes("T") ? value : `${value}T00:00:00`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function parseMoney(value: string): number {
  if (!value) return 0
  const sanitized = value.replace(/[^\d.-]/g, "")
  const n = Number(sanitized)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value)
}

function buildLastMonths(baseMonth: string, total: number): string[] {
  const [year, month] = baseMonth.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const output: string[] = []
  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1)
    output.push(monthKey(d))
  }
  return output
}

function toInputDate(value: Date): string {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, "0")
  const d = String(value.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getMonthRange(key: string): { start: Date; end: Date } {
  const [year, month] = key.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start, end }
}

function subDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - days)
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export function ServiciosSection() {
  // ── Data ──
  const [serviciosRegistrados, setServiciosRegistrados] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loadingBeneficiarios, setLoadingBeneficiarios] = useState(false)

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<"historial" | "comodatos">("historial")

  // ── Comodatos ──
  const [comodatos, setComodatos] = useState<ComodatoActivo[]>([])
  const [loadingComodatos, setLoadingComodatos] = useState(false)
  const [comodatoADevolver, setComodatoADevolver] = useState<ComodatoActivo | null>(null)
  const [confirmandoDevolucion, setConfirmandoDevolucion] = useState(false)

  // ── Catálogo dinámico + inventario para el form ──
  const [catalogoServicios, setCatalogoServicios] = useState<TipoServicioCompleto[]>([])
  const [articulosInventario, setArticulosInventario] = useState<ArticuloInventario[]>([])
  const [loadingArticulos, setLoadingArticulos] = useState(false)
  const [idArticuloSeleccionado, setIdArticuloSeleccionado] = useState("")
  const [fechaDevolucionEsperada, setFechaDevolucionEsperada] = useState("")

  // ── Table UI ──
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))
  const [tipoServicioFiltro, setTipoServicioFiltro] = useState("")
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState("")
  const [fechaFinFiltro, setFechaFinFiltro] = useState("")
  const [sortField, setSortField] = useState<SortField>("fecha")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [page, setPage] = useState(1)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // ── Dialogs ──
  const [showRegistroDialog, setShowRegistroDialog] = useState(false)
  const [servicioDetalle, setServicioDetalle] = useState<ServicioDetallado | null>(null)
  const [servicioParaEliminar, setServicioParaEliminar] = useState<ServicioDetallado | null>(null)
  const [eliminandoServicio, setEliminandoServicio] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  // ── Form state ──
  const [busquedaBeneficiario, setBusquedaBeneficiario] = useState("")
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState<BeneficiarioEncontrado | null>(null)
  const [tipoServicioSeleccionado, setTipoServicioSeleccionado] = useState("")
  const [montoServicio, setMontoServicio] = useState("")
  const [descripcionOtro, setDescripcionOtro] = useState("")
  const [fechaServicio, setFechaServicio] = useState(() => new Date().toISOString().split("T")[0])
  const [fechaError, setFechaError] = useState("")
  const [registroError, setRegistroError] = useState("")
  const [registroLoading, setRegistroLoading] = useState(false)
  const [showSugerencias, setShowSugerencias] = useState(false)

  // ── Effects ──
  useEffect(() => {
    getServicios()
      .then((data) => setServiciosRegistrados(data))
      .catch((err) => setError(err?.message ?? "Error al cargar servicios"))
      .finally(() => setLoading(false))
    getCatalogoServicios()
      .then(setCatalogoServicios)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== "comodatos") return
    setLoadingComodatos(true)
    getComodatos()
      .then(setComodatos)
      .catch(() => setComodatos([]))
      .finally(() => setLoadingComodatos(false))
  }, [activeTab])

  useEffect(() => {
    if (!showRegistroDialog) return
    if (beneficiarios.length > 0) return
    setLoadingBeneficiarios(true)
    getBeneficiarios()
      .then((data) => setBeneficiarios(data))
      .catch(() => setBeneficiarios([]))
      .finally(() => setLoadingBeneficiarios(false))
  }, [showRegistroDialog, beneficiarios.length])

  useEffect(() => {
    return () => {
      if (pendingDelete) clearTimeout(pendingDelete.timerId)
    }
  }, [pendingDelete])

  useEffect(() => {
    setPage(1)
  }, [selectedMonth, tipoServicioFiltro, fechaInicioFiltro, fechaFinFiltro, searchTerm, sortField, sortDirection])

  // Cargar inventario SIEMPRE que se selecciona un tipo que requiere artículo
  useEffect(() => {
    if (!tipoServicioSeleccionado || !showRegistroDialog) return
    const tipo = catalogoServicios.find(t => String(t.idTipoServicio) === tipoServicioSeleccionado)
    if (!tipo || tipo.tipoServicio === "SERVICIO") return
    setLoadingArticulos(true)
    getInventario()
      .then(setArticulosInventario)
      .catch(() => {})
      .finally(() => setLoadingArticulos(false))
  }, [tipoServicioSeleccionado, catalogoServicios, showRegistroDialog])

  // ── Derived data ──
  const hoy = new Date().toISOString().split("T")[0]
  const idTipoServicioNumerico = Number(tipoServicioSeleccionado)
  const montoNum = Number(montoServicio)
  const montoEsValido = montoServicio.trim() !== "" && Number.isFinite(montoNum) && montoNum >= 0
  const fechaEsFutura = fechaServicio > hoy
  const tipoSeleccionado = catalogoServicios.find((t) => t.idTipoServicio === idTipoServicioNumerico)
  const montoSugerido = tipoSeleccionado?.montoSugerido ?? null
  const tipoServicioSeleccionadoLabel = tipoSeleccionado?.nombre ?? ""
  const tipoServicioClasificacion =
    catalogoServicios.find((t) => t.idTipoServicio === idTipoServicioNumerico)?.tipoServicio ?? "SERVICIO"
  const requiereArticulo = tipoServicioClasificacion === "COMODATO" || tipoServicioClasificacion === "CONSUMIBLE"
  const esComodato       = tipoServicioClasificacion === "COMODATO"
  const requiereDescripcionOtro = tipoServicioSeleccionadoLabel === "Otros" || tipoServicioSeleccionadoLabel === "Otros"

  const articulosFiltrados = esComodato
    ? articulosInventario.filter(a => a.nombreCategoria === "Equipos Médicos" && a.cantidad > 0)
    : articulosInventario.filter(a =>
        (a.nombreCategoria === "Insumos Médicos" || a.nombreCategoria === "Medicamentos") && a.cantidad > 0
      )
  const expedienteBloqueado = beneficiarioEncontrado
    ? beneficiarioEncontrado.estatus === "Inactivo" || beneficiarioEncontrado.estatus === "Baja"
    : false

  const busquedaNormalizada = busquedaBeneficiario.trim().toLowerCase()
  const sugerenciasBeneficiarios = busquedaNormalizada
    ? beneficiarios
        .filter((b) => {
          const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.trim().toLowerCase()
          const curp = String(b.curp ?? "").trim().toLowerCase()
          return nombre.startsWith(busquedaNormalizada) || curp.startsWith(busquedaNormalizada)
        })
        .slice(0, 8)
    : []

  const mapBeneficiario = (b: Beneficiario): BeneficiarioEncontrado => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
    const estatus = String(b.estatus ?? "").trim() || "Activo"
    return {
      curp: String(b.curp ?? "").trim(),
      nombre,
      membresia: estatus === "Activo" ? "Vigente" : "No vigente",
      estatus,
    }
  }

  const serviciosConFecha = useMemo<ServicioDetallado[]>(() => {
    return serviciosRegistrados.map((s) => {
      const fechaDate = parseDate(s.fecha)
      return { ...s, fechaDate, montoNumero: parseMoney(s.monto), mesClave: fechaDate ? monthKey(fechaDate) : "" }
    })
  }, [serviciosRegistrados])

  const serviciosMes = useMemo(
    () => serviciosConFecha.filter((s) => s.mesClave === selectedMonth),
    [serviciosConFecha, selectedMonth]
  )

  const montoMes = useMemo(() => serviciosMes.reduce((acc, s) => acc + s.montoNumero, 0), [serviciosMes])
  const pendientesMes = useMemo(
    () => serviciosMes.filter((s) => s.estatus === "PRESTADO").length,
    [serviciosMes]
  )

  const conteoTiposMes = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of serviciosMes) {
      const key = s.servicio || "Sin tipo"
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [serviciosMes])

  const tiposDistintosMes = conteoTiposMes.size

  const topTipoMes = useMemo(() => {
    let maxLabel = "Sin datos"
    let maxValue = 0
    for (const [label, value] of conteoTiposMes.entries()) {
      if (value > maxValue) { maxLabel = label; maxValue = value }
    }
    return { label: maxLabel, value: maxValue }
  }, [conteoTiposMes])

  const donutData = useMemo(() => {
    return Array.from(conteoTiposMes.entries())
      .map(([name, value], index) => ({ name, value, fill: PIE_COLORS[index % PIE_COLORS.length] }))
      .sort((a, b) => b.value - a.value)
  }, [conteoTiposMes])

  const monthlyBarData = useMemo(() => {
    return buildLastMonths(selectedMonth, 6).map((m) => {
      const monto = serviciosConFecha
        .filter((s) => s.mesClave === m)
        .reduce((acc, s) => acc + s.montoNumero, 0)
      return { mes: monthLabel(m), mesClave: m, monto: Number(monto.toFixed(2)) }
    })
  }, [serviciosConFecha, selectedMonth])

  const tiposServicioDistintos = useMemo(() => {
    const set = new Set<string>()
    for (const s of serviciosConFecha) {
      if (s.servicio) set.add(s.servicio)
    }
    return Array.from(set).sort()
  }, [serviciosConFecha])

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return serviciosConFecha.filter((s) => {
      if (s.mesClave !== selectedMonth) return false
      if (tipoServicioFiltro && s.servicio !== tipoServicioFiltro) return false
      if (fechaInicioFiltro && s.fechaDate && s.fechaDate < new Date(`${fechaInicioFiltro}T00:00:00`)) return false
      if (fechaFinFiltro && s.fechaDate && s.fechaDate > new Date(`${fechaFinFiltro}T23:59:59`)) return false
      if (!search) return true
      return s.nombre.toLowerCase().includes(search) || s.folio.toLowerCase().includes(search) || s.servicio.toLowerCase().includes(search)
    })
  }, [serviciosConFecha, selectedMonth, tipoServicioFiltro, fechaInicioFiltro, fechaFinFiltro, searchTerm])

  const collator = useMemo(() => new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" }), [])

  const sortedFiltered = useMemo(() => {
    const sign = sortDirection === "asc" ? 1 : -1
    const data = [...filtered]
    data.sort((a, b) => {
      if (sortField === "fecha") return ((a.fechaDate?.getTime() ?? 0) - (b.fechaDate?.getTime() ?? 0)) * sign
      if (sortField === "monto") return (a.montoNumero - b.montoNumero) * sign
      const get = (r: ServicioDetallado) => {
        if (sortField === "estatus") return String(r.estatus ?? "")
        if (sortField === "servicio") return String(r.servicio ?? "")
        if (sortField === "nombre") return String(r.nombre ?? "")
        return String(r.folio ?? "")
      }
      return collator.compare(get(a), get(b)) * sign
    })
    return data
  }, [filtered, sortField, sortDirection, collator])

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const paginated = sortedFiltered.slice(start, end)

  // ── Handlers ──
  const handleBuscarBeneficiario = () => {
    if (!busquedaNormalizada) { setBeneficiarioEncontrado(null); return }
    const exacto = beneficiarios.find((b) => {
      const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim().toLowerCase()
      const curp = String(b.curp ?? "").trim().toLowerCase()
      return nombre === busquedaNormalizada || curp === busquedaNormalizada
    })
    if (exacto) { setBeneficiarioEncontrado(mapBeneficiario(exacto)); setShowSugerencias(false); return }
    const primera = sugerenciasBeneficiarios[0]
    if (primera) {
      setBeneficiarioEncontrado(mapBeneficiario(primera))
      setBusquedaBeneficiario(`${primera.nombres} ${primera.apellidoPaterno} ${primera.apellidoMaterno}`.replace(/\s+/g, " ").trim())
      setShowSugerencias(false)
      return
    }
    setBeneficiarioEncontrado(null)
  }

  const handleSeleccionarSugerencia = (b: Beneficiario) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
    setBusquedaBeneficiario(nombre)
    setBeneficiarioEncontrado(mapBeneficiario(b))
    setShowSugerencias(false)
  }

  const handleRegistrarServicio = async () => {
    if (!beneficiarioEncontrado) { setRegistroError("Seleccione un beneficiario valido"); return }
    if (!Number.isInteger(idTipoServicioNumerico) || idTipoServicioNumerico <= 0) { setRegistroError("Seleccione un tipo de servicio"); return }
    if (!montoEsValido) { setRegistroError("Ingrese un monto valido"); return }
    if (requiereDescripcionOtro && !descripcionOtro.trim()) { setRegistroError("Debe especificar en que consiste el servicio para la opcion 'Otros'"); return }
    if (esComodato && !idArticuloSeleccionado) { setRegistroError("Selecciona el equipo específico a prestar."); return }
    if (esComodato && !fechaDevolucionEsperada) { setRegistroError("Indica la fecha esperada de devolución."); return }
    if (fechaEsFutura) { setFechaError("No se permiten fechas futuras. Solo hoy o fechas anteriores."); return }

    try {
      setRegistroLoading(true)
      setRegistroError("")
      setFechaError("")
      await createServicio({
        curp:           beneficiarioEncontrado.curp,
        idTipoServicio: idTipoServicioNumerico,
        costo:          montoNum,
        montoPagado:    0,
        notas:          requiereDescripcionOtro ? `Servicio otros: ${descripcionOtro.trim()}` : undefined,
        estatus:        esComodato ? "PRESTADO" : "COMPLETADO",
        fechaDevolucionEsperada: esComodato ? fechaDevolucionEsperada : null,
        consumos: requiereArticulo && idArticuloSeleccionado
          ? [{ idProducto: Number(idArticuloSeleccionado), cantidad: 1 }]
          : undefined,
      })
      const updated = await getServicios()
      setServiciosRegistrados(updated)
      setShowRegistroDialog(false)
      setBeneficiarioEncontrado(null)
      setBusquedaBeneficiario("")
      setTipoServicioSeleccionado("")
      setMontoServicio("")
      setDescripcionOtro("")
      setFechaServicio(hoy)
      setIdArticuloSeleccionado("")
      setFechaDevolucionEsperada("")
      setArticulosInventario([])
      if (esComodato) {
        setComodatos(prev => [...prev]) // fuerza recarga lazy si tab comodatos está abierta
        setActiveTab("comodatos")
        getComodatos().then(setComodatos).catch(() => {})
      }
      toast.success(esComodato ? "Préstamo registrado. Aparece en Préstamos activos." : "Servicio registrado correctamente")
    } catch (err) {
      setRegistroError(friendlyError(err, "No se pudo registrar el servicio"))
    } finally {
      setRegistroLoading(false)
    }
  }

  const handleEliminarServicio = async () => {
    if (!servicioParaEliminar) return
    try {
      setEliminandoServicio(true)
      if (pendingDelete) clearTimeout(pendingDelete.timerId)
      const servicio = servicioParaEliminar
      setServiciosRegistrados((prev) => prev.filter((s) => s.id !== servicio.id))
      const timerId = setTimeout(async () => {
        try {
          await deleteServicio(servicio.id)
          const updated = await getServicios()
          setServiciosRegistrados(updated)
        } catch (err) {
          console.error("Error al confirmar eliminación:", err)
          const updated = await getServicios()
          setServiciosRegistrados(updated)
          toast.error(friendlyError(err, "No se pudo eliminar el servicio"))
        } finally {
          setPendingDelete(null)
        }
      }, 8000)
      setPendingDelete({ servicio, timerId })
      setServicioParaEliminar(null)
      toast.success("Servicio eliminado", { description: "Tienes 8 segundos para deshacer." })
    } catch (err) {
      console.error("Error al eliminar servicio:", err)
      toast.error(friendlyError(err, "No se pudo eliminar el servicio"))
    } finally {
      setEliminandoServicio(false)
    }
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timerId)
    setPendingDelete(null)
    try {
      const updated = await getServicios()
      setServiciosRegistrados(updated)
    } catch (err) {
      console.error("Error al restaurar lista tras deshacer:", err)
    }
  }

  const applyQuickRange = (preset: RangoRapido) => {
    const { start: s, end: e } = getMonthRange(selectedMonth)
    if (preset === "full") { setFechaInicioFiltro(toInputDate(s)); setFechaFinFiltro(toInputDate(e)); return }
    if (preset === "firstHalf") { setFechaInicioFiltro(toInputDate(s)); setFechaFinFiltro(toInputDate(new Date(s.getFullYear(), s.getMonth(), 15))); return }
    if (preset === "secondHalf") { setFechaInicioFiltro(toInputDate(new Date(s.getFullYear(), s.getMonth(), 16))); setFechaFinFiltro(toInputDate(e)); return }
    setFechaInicioFiltro(toInputDate(subDays(e, 6)))
    setFechaFinFiltro(toInputDate(e))
  }

  const handleSortBy = (field: SortField) => {
    if (sortField === field) { setSortDirection((prev) => (prev === "asc" ? "desc" : "asc")); return }
    setSortField(field)
    setSortDirection("asc")
  }

  const applySortPreset = (preset: "recent" | "highest" | "nameAZ" | "pendingFirst") => {
    if (preset === "recent") { setSortField("fecha"); setSortDirection("desc"); return }
    if (preset === "highest") { setSortField("monto"); setSortDirection("desc"); return }
    if (preset === "nameAZ") { setSortField("nombre"); setSortDirection("asc"); return }
    setSortField("estatus"); setSortDirection("desc")
  }

  const resetFormDialog = () => {
    setShowRegistroDialog(true)
    setBeneficiarioEncontrado(null)
    setBusquedaBeneficiario("")
    setTipoServicioSeleccionado("")
    setMontoServicio("")
    setDescripcionOtro("")
    setFechaServicio(hoy)
    setFechaError("")
    setRegistroError("")
    setIdArticuloSeleccionado("")
    setFechaDevolucionEsperada("")
    setArticulosInventario([])
  }

  const handleConfirmarDevolucion = async () => {
    if (!comodatoADevolver) return
    setConfirmandoDevolucion(true)
    try {
      await confirmarDevolucion(comodatoADevolver.idServicio)
      setComodatos(prev => prev.filter(c => c.idServicio !== comodatoADevolver.idServicio))
      setComodatoADevolver(null)
      toast.success(`Devolución confirmada. Inventario y servicio actualizados.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al confirmar la devolución")
    } finally {
      setConfirmandoDevolucion(false)
    }
  }

  function diasDevolucion(fechaEsperada: string | null): { texto: string; color: string } {
    if (!fechaEsperada) return { texto: "Sin fecha definida", color: "text-muted-foreground" }
    const hoyMs = new Date().setHours(0, 0, 0, 0)
    const espMs  = new Date(fechaEsperada + "T00:00:00").getTime()
    const dias   = Math.round((espMs - hoyMs) / 86_400_000)
    if (dias > 7)  return { texto: `${dias} días restantes`,  color: "text-emerald-600 dark:text-emerald-400" }
    if (dias >= 0) return { texto: `${dias} días restantes`,  color: "text-amber-600 dark:text-amber-400" }
    return { texto: `${Math.abs(dias)} días de retraso`, color: "text-red-600 dark:text-red-400" }
  }

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando servicios...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Registro de Servicios</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Resumen mensual y consulta de servicios otorgados</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month picker */}
          <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted">
                <CalendarDays className="size-3.5" />
                {monthInputToLabel(selectedMonth)}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">Año</Label>
                  <Select
                    value={selectedMonth.split("-")[0]}
                    onValueChange={(year) => {
                      const month = selectedMonth.split("-")[1]
                      setSelectedMonth(`${year}-${month}`)
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i
                        return <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">Mes</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { num: 1, label: "Ene" }, { num: 2, label: "Feb" }, { num: 3, label: "Mar" },
                      { num: 4, label: "Abr" }, { num: 5, label: "May" }, { num: 6, label: "Jun" },
                      { num: 7, label: "Jul" }, { num: 8, label: "Ago" }, { num: 9, label: "Sep" },
                      { num: 10, label: "Oct" }, { num: 11, label: "Nov" }, { num: 12, label: "Dic" },
                    ].map(({ num, label }) => {
                      const year = selectedMonth.split("-")[0]
                      const mk = `${year}-${String(num).padStart(2, "0")}`
                      return (
                        <Button
                          key={num}
                          variant={selectedMonth === mk ? "default" : "outline"}
                          className="h-8 text-xs"
                          onClick={() => { setSelectedMonth(mk); setShowMonthPicker(false) }}
                        >
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={resetFormDialog}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-4" />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "historial"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <ClipboardList className="size-3.5" />
          Historial de servicios
        </button>
        <button
          onClick={() => setActiveTab("comodatos")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border ${
            activeTab === "comodatos"
              ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
              : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
          }`}
        >
          <RotateCcw className="size-3.5" />
          Préstamos activos
          {comodatos.length > 0 && activeTab !== "comodatos" && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {comodatos.length}
            </span>
          )}
        </button>
      </div>

      {/* KPIs + Charts — siempre visibles independientemente del tab activo */}
      <ServiciosChartsKpis
        selectedMonth={selectedMonth}
        monthInputToLabel={monthInputToLabel}
        totalMes={serviciosMes.length}
        montoMes={montoMes}
        pendientesMes={pendientesMes}
        tiposDistintosMes={tiposDistintosMes}
        topTipoMes={topTipoMes}
        monthlyBarData={monthlyBarData}
        donutData={donutData}
      />

      {/* Table — Historial */}
      {activeTab === "historial" && <ServiciosTable
        filtered={filtered}
        sortedFiltered={sortedFiltered}
        paginated={paginated}
        page={page}
        totalPages={totalPages}
        currentPage={currentPage}
        start={start}
        end={end}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        tipoServicioFiltro={tipoServicioFiltro}
        setTipoServicioFiltro={setTipoServicioFiltro}
        tiposServicioDistintos={tiposServicioDistintos}
        fechaInicioFiltro={fechaInicioFiltro}
        setFechaInicioFiltro={setFechaInicioFiltro}
        fechaFinFiltro={fechaFinFiltro}
        setFechaFinFiltro={setFechaFinFiltro}
        selectedMonth={selectedMonth}
        monthInputToLabel={monthInputToLabel}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortBy={handleSortBy}
        onSortPreset={applySortPreset}

        onRowClick={setServicioDetalle}
        setPage={setPage}
        pendingDeleteFolio={pendingDelete?.servicio.folio ?? null}
        onUndoDelete={handleUndoDelete}
      />}

      {/* ── Tab: Comodatos activos ── */}
      {activeTab === "comodatos" && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Préstamos activos</p>
              <p className="text-[11px] text-muted-foreground">
                Equipos médicos prestados pendientes de devolución · {comodatos.length} registro{comodatos.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => { setLoadingComodatos(true); getComodatos().then(setComodatos).catch(() => {}).finally(() => setLoadingComodatos(false)) }}
              disabled={loadingComodatos}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className={`size-3.5 ${loadingComodatos ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          {loadingComodatos ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted-foreground">Cargando préstamos...</p>
            </div>
          ) : comodatos.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <RotateCcw className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No hay equipos médicos prestados actualmente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Beneficiario</th>
                    <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Equipo</th>
                    <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">Fecha préstamo</th>
                    <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Devolución</th>
                    <th className="py-2.5 pr-5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {comodatos.map(c => {
                    const dev = diasDevolucion(c.fechaDevolucionEsperada)
                    const esRetraso = c.fechaDevolucionEsperada && new Date(c.fechaDevolucionEsperada + "T00:00:00") < new Date()
                    return (
                      <tr key={c.idServicio} className={`transition-colors hover:bg-muted/20 ${esRetraso ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                        <td className="py-3 pl-5">
                          <p className="font-medium text-foreground">{c.nombreBeneficiario}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.curp}</p>
                        </td>
                        <td className="py-3 max-w-[14rem]">
                          <p className="font-medium text-foreground truncate">{c.nombreArticulo ?? c.tipoServicio}</p>
                          {c.cantidad > 1 && <p className="text-[10px] text-muted-foreground">Cantidad: {c.cantidad}</p>}
                        </td>
                        <td className="hidden py-3 text-muted-foreground md:table-cell">
                          {c.fecha ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {c.fechaDevolucionEsperada && (
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(c.fechaDevolucionEsperada + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                            <span className={`text-[11px] font-semibold ${dev.color}`}>
                              {esRetraso && <AlertCircle className="inline size-3 mr-0.5" />}
                              {dev.texto}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-5 text-center">
                          <button
                            onClick={() => setComodatoADevolver(c)}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            Confirmar devolución
                          </button>
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

      {/* Dialog: Confirmar devolución */}
      <Dialog open={comodatoADevolver != null} onOpenChange={open => { if (!open) setComodatoADevolver(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Confirmar devolución</DialogTitle>
            <DialogDescription className="text-xs">
              Esta acción marcará el equipo como devuelto y actualizará el inventario automáticamente.
            </DialogDescription>
          </DialogHeader>
          {comodatoADevolver && (
            <div className="space-y-4 pt-1">
              <div className="divide-y divide-border/40 rounded-xl border border-border/60">
                {[
                  { label: "Beneficiario", value: comodatoADevolver.nombreBeneficiario },
                  { label: "Equipo",       value: comodatoADevolver.nombreArticulo ?? comodatoADevolver.tipoServicio },
                  { label: "Prestado el",  value: comodatoADevolver.fecha
                      ? new Date(comodatoADevolver.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
                      : "—"
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    <span className="text-xs font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                Al confirmar: el servicio se marcará como <strong>devuelto</strong> y el equipo se sumará automáticamente al inventario.
              </p>
              <div className="flex gap-2 border-t border-border/40 pt-3">
                <button
                  onClick={() => setComodatoADevolver(null)}
                  disabled={confirmandoDevolucion}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarDevolucion}
                  disabled={confirmandoDevolucion}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#0f4c81" }}
                >
                  {confirmandoDevolucion ? "Confirmando..." : "Sí, confirmar"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle */}
      <Dialog open={Boolean(servicioDetalle)} onOpenChange={(open) => !open && setServicioDetalle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Detalle del servicio</DialogTitle>
            <DialogDescription className="text-xs">Información del registro seleccionado</DialogDescription>
          </DialogHeader>
          {servicioDetalle && (
            <div className="space-y-3 pt-1">
              <div className="divide-y divide-border/40 rounded-xl border border-border/60">
                {[
                  { label: "Beneficiario", value: servicioDetalle.nombre },
                  { label: "CURP",         value: <span className="font-mono text-[11px]">{servicioDetalle.folio}</span> },
                  { label: "Servicio",     value: servicioDetalle.servicio },
                  ...(servicioDetalle.articuloEntregado
                    ? [{ label: "Artículo", value: servicioDetalle.articuloEntregado }]
                    : []),
                  { label: "Fecha",    value: servicioDetalle.fecha },
                  { label: "Monto",    value: <span className="font-bold">{formatMoney(servicioDetalle.montoNumero)}</span> },
                  { label: "Estatus",  value: <StatusIcon status={servicioDetalle.estatus} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    <span className="text-xs text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              {servicioDetalle.notas && (
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notas</p>
                  <p className="mt-1 text-xs text-foreground">{servicioDetalle.notas}</p>
                </div>
              )}
              <div className="flex justify-end border-t border-border/40 pt-3">
                <button
                  onClick={() => { setServicioParaEliminar(servicioDetalle); setServicioDetalle(null) }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                >
                  Eliminar servicio
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Registro */}
      <ServicioFormDialog
        open={showRegistroDialog}
        onOpenChange={setShowRegistroDialog}
        busquedaBeneficiario={busquedaBeneficiario}
        setBusquedaBeneficiario={setBusquedaBeneficiario}
        beneficiarioEncontrado={beneficiarioEncontrado}
        setBeneficiarioEncontrado={setBeneficiarioEncontrado}
        beneficiarios={beneficiarios}
        loadingBeneficiarios={loadingBeneficiarios}
        showSugerencias={showSugerencias}
        setShowSugerencias={setShowSugerencias}
        sugerenciasBeneficiarios={sugerenciasBeneficiarios}
        onBuscarBeneficiario={handleBuscarBeneficiario}
        onSeleccionarSugerencia={handleSeleccionarSugerencia}
        tipoServicioSeleccionado={tipoServicioSeleccionado}
        setTipoServicioSeleccionado={setTipoServicioSeleccionado}
        montoServicio={montoServicio}
        setMontoServicio={setMontoServicio}
        descripcionOtro={descripcionOtro}
        setDescripcionOtro={setDescripcionOtro}
        fechaServicio={fechaServicio}
        setFechaServicio={setFechaServicio}
        fechaError={fechaError}
        setFechaError={setFechaError}
        registroError={registroError}
        setRegistroError={setRegistroError}
        registroLoading={registroLoading}
        hoy={hoy}
        fechaEsFutura={fechaEsFutura}
        idTipoServicioNumerico={idTipoServicioNumerico}
        montoEsValido={montoEsValido}
        montoSugerido={montoSugerido}
        tipoServicioSeleccionadoLabel={tipoServicioSeleccionadoLabel}
        requiereDescripcionOtro={requiereDescripcionOtro}
        expedienteBloqueado={expedienteBloqueado}
        onRegistrar={handleRegistrarServicio}
        catalogoServicios={catalogoServicios}
        esComodato={esComodato}
        requiereArticulo={requiereArticulo}
        articulosFiltrados={articulosFiltrados}
        loadingArticulos={loadingArticulos}
        idArticuloSeleccionado={idArticuloSeleccionado}
        setIdArticuloSeleccionado={setIdArticuloSeleccionado}
        fechaDevolucionEsperada={fechaDevolucionEsperada}
        setFechaDevolucionEsperada={setFechaDevolucionEsperada}
      />

      {/* Dialog: Eliminar */}
      <Dialog open={Boolean(servicioParaEliminar)} onOpenChange={(open) => !open && setServicioParaEliminar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Eliminar servicio</DialogTitle>
            <DialogDescription className="text-xs">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          {servicioParaEliminar && (
            <div className="space-y-4 pt-1">
              <div className="divide-y divide-border/40 rounded-xl border border-border/60">
                {[
                  { label: "Folio",        value: <span className="font-mono text-xs">{servicioParaEliminar.folio}</span> },
                  { label: "Beneficiario", value: servicioParaEliminar.nombre },
                  { label: "Servicio",     value: servicioParaEliminar.servicio },
                  { label: "Monto",        value: <span className="font-bold">{formatMoney(servicioParaEliminar.montoNumero)}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    <span className="text-xs text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-border/40 pt-3">
                <button
                  onClick={() => setServicioParaEliminar(null)}
                  disabled={eliminandoServicio}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarServicio}
                  disabled={eliminandoServicio}
                  className="flex-1 rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {eliminandoServicio ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
