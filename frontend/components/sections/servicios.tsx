"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import {
  CalendarDays,
  ChevronDown,
  Plus,
  User, Package, Clock,
  BarChart2, ClipboardList,
  CheckCircle2, Trash2, X,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
  getCatalogoServicios,
  updateServicio,
  type Servicio,
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
const SERVICIO_DRAFT_KEY = "servicioDraftFromCita"
const CITA_PREFILL_KEY = "prefillCitaFromServicio"

const GLOBAL_OPTIMISTIC_DELETED_SERVICIOS = new Set<number>()

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

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—"
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
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

  // ── Catálogo dinámico + inventario para el form ──
  const [catalogoServicios, setCatalogoServicios] = useState<TipoServicioCompleto[]>([])
  const [articulosInventario, setArticulosInventario] = useState<ArticuloInventario[]>([])
  const [loadingArticulos, setLoadingArticulos] = useState(false)
  const [idArticuloSeleccionado, setIdArticuloSeleccionado] = useState("")

  // ── Table UI ──
  const [activeTab, setActiveTab] = useState<"resumen" | "tabla">("resumen")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))
  const [tipoServicioFiltro, setTipoServicioFiltro] = useState("")
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState("")
  const [fechaFinFiltro, setFechaFinFiltro] = useState("")
  const [sortField, setSortField] = useState<SortField>("fecha")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const ESTATUS_CICLO = [null, "PENDIENTE", "COMPLETADO"] as const
  type EstatusCiclo = typeof ESTATUS_CICLO[number]
  const [estatusCicloIdx, setEstatusCicloIdx] = useState(0)
  const estatusCicloFiltro: EstatusCiclo = ESTATUS_CICLO[estatusCicloIdx]
  const [page, setPage] = useState(1)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)

  const router = useRouter()

  // ── Dialogs ──
  const [showRegistroDialog, setShowRegistroDialog] = useState(false)
  const [bannerEliminarServicio, setBannerEliminarServicio] = useState<{ nombre: string; servicio: string; idCita?: number | null } | null>(null)
  const [servicioDetalle, setServicioDetalle] = useState<ServicioDetallado | null>(null)
  const [servicioParaEliminar, setServicioParaEliminar] = useState<ServicioDetallado | null>(null)
  const [eliminandoServicio, setEliminandoServicio] = useState(false)
  const [updatingServicioId, setUpdatingServicioId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<"delete"|"complete" | null>(null)

  // ── Form state ──
  const [busquedaBeneficiario, setBusquedaBeneficiario] = useState("")
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState<BeneficiarioEncontrado | null>(null)
  const [tipoServicioSeleccionado, setTipoServicioSeleccionado] = useState("")
  const [montoServicio, setMontoServicio] = useState("")
  const [cantidadArticulo, setCantidadArticulo] = useState("1")
  const [descripcionOtro, setDescripcionOtro] = useState("")
  const [tipoEstudio, setTipoEstudio] = useState("")
  const [fechaServicio, setFechaServicio] = useState(() => new Date().toISOString().split("T")[0])
  const [fechaError, setFechaError] = useState("")
  const [registroError, setRegistroError] = useState("")
  const [registroLoading, setRegistroLoading] = useState(false)
  const [showSugerencias, setShowSugerencias] = useState(false)

  // ── Effects ──
  useEffect(() => {
    getServicios()
      .then((data) => setServiciosRegistrados(data.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id))))
      .catch((err) => setError(err?.message ?? "Error al cargar servicios"))
      .finally(() => setLoading(false))
    getCatalogoServicios()
      .then(setCatalogoServicios)
      .catch(() => {})
  }, [])


  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SERVICIO_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)

      if (draft.busquedaBeneficiario) setBusquedaBeneficiario(draft.busquedaBeneficiario)
      if (draft.beneficiarioEncontrado) setBeneficiarioEncontrado(draft.beneficiarioEncontrado)
      if (draft.tipoServicioSeleccionado) setTipoServicioSeleccionado(draft.tipoServicioSeleccionado)
      if (draft.montoServicio !== undefined) setMontoServicio(String(draft.montoServicio))
      if (draft.cantidadArticulo !== undefined) setCantidadArticulo(String(draft.cantidadArticulo))
      if (draft.descripcionOtro !== undefined) setDescripcionOtro(String(draft.descripcionOtro))
      if (draft.fechaServicio) setFechaServicio(draft.fechaServicio)
      if (draft.idArticuloSeleccionado !== undefined) setIdArticuloSeleccionado(String(draft.idArticuloSeleccionado))

      setFechaError("")
      setRegistroError("")
      // No abrimos el modal de forma automática
      sessionStorage.removeItem(SERVICIO_DRAFT_KEY)
    } catch {
      // ignore malformed draft payloads
    }
  }, [])

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
    setPage(1)
  }, [selectedMonth, tipoServicioFiltro, fechaInicioFiltro, fechaFinFiltro, searchTerm, sortField, sortDirection, estatusCicloIdx])

  // Cargar inventario SIEMPRE que se selecciona un tipo que requiere artículo
  useEffect(() => {
    setIdArticuloSeleccionado("")
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
  const fechaEsFutura = fechaServicio > hoy
  const tipoSeleccionado = catalogoServicios.find((t) => t.idTipoServicio === idTipoServicioNumerico)
  const montoSugerido = tipoSeleccionado?.montoSugerido ?? null
  const tipoServicioSeleccionadoLabel = tipoSeleccionado?.nombre ?? ""
  const tipoServicioClasificacion =
    catalogoServicios.find((t) => t.idTipoServicio === idTipoServicioNumerico)?.tipoServicio ?? "SERVICIO"
  const requiereArticulo = tipoServicioClasificacion === "CONSUMIBLE"
  const montoEsValido = requiereArticulo || (montoServicio.trim() !== "" && Number.isFinite(montoNum) && montoNum >= 0)
  const cantidadArticuloNum = Number(cantidadArticulo)
  const cantidadArticuloValida = cantidadArticulo.trim() !== "" && Number.isInteger(cantidadArticuloNum) && cantidadArticuloNum > 0
  const requiereDescripcionOtro = tipoServicioSeleccionadoLabel === "Otros"
  const esEstudioMedico = tipoServicioSeleccionadoLabel.toLowerCase().includes("estudio")

  const categoriaArticulo =
    tipoServicioSeleccionadoLabel.toLowerCase().includes("insumo") ? "Insumos Médicos" :
    tipoServicioSeleccionadoLabel.toLowerCase().includes("medicamento") ? "Medicamentos" :
    null

  const articulosFiltrados = articulosInventario.filter(a =>
    (categoriaArticulo ? a.nombreCategoria === categoriaArticulo : true) && a.cantidad > 0
  )

  // Catálogo filtrado: excluir COMADATOs (van por Comodatos) y Membresía Anual (se gestiona desde Membresías)
  const catalogoFiltrado = catalogoServicios.filter(
    t => t.tipoServicio !== "COMODATO" && !/membres[ií]a/i.test(t.nombre)
  )
  const expedienteBloqueado = beneficiarioEncontrado
    ? beneficiarioEncontrado.estatus === "Baja"
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

  // Auto-open service detail when navigated from Citas (openServicioId in sessionStorage)
  const [pendingOpenServicioId, setPendingOpenServicioId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = sessionStorage.getItem("openServicioId")
      if (raw) {
        sessionStorage.removeItem("openServicioId")
        const num = Number(raw)
        return Number.isFinite(num) && num > 0 ? num : null
      }
    } catch {}
    return null
  })

  useEffect(() => {
    if (!pendingOpenServicioId || loading) return
    const found = serviciosConFecha.find(s => s.id === pendingOpenServicioId)
    if (found) {
      setPendingOpenServicioId(null) // Only trigger once
      setActiveTab("tabla")
      if (found.mesClave) setSelectedMonth(found.mesClave)
      // Small delay to let tab/month state settle before opening dialog
      setTimeout(() => setServicioDetalle(found), 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenServicioId, loading, serviciosConFecha])

  const serviciosMes = useMemo(
    () => serviciosConFecha.filter((s) => s.mesClave === selectedMonth),
    [serviciosConFecha, selectedMonth]
  )

  const montoMes = useMemo(
    () => serviciosMes.filter((s) => String(s.estatus ?? "").toUpperCase() === "COMPLETADO").reduce((acc, s) => acc + s.montoNumero, 0),
    [serviciosMes]
  )
  const pendientesMes = useMemo(
    () => serviciosMes.filter((s) => String(s.estatus ?? "").toUpperCase() === "PENDIENTE").length,
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
        .filter((s) => s.mesClave === m && String(s.estatus ?? "").toUpperCase() === "COMPLETADO")
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
      if (estatusCicloFiltro && s.estatus !== estatusCicloFiltro) return false
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
    if (requiereArticulo && !idArticuloSeleccionado) { setRegistroError("Seleccione un artículo para registrar el consumo de inventario"); return }
    if (requiereArticulo && !cantidadArticuloValida) { setRegistroError("La cantidad debe ser un entero mayor a 0"); return }
    if (!requiereArticulo && !montoEsValido) { setRegistroError("Ingrese un monto valido"); return }
    if (requiereDescripcionOtro && !descripcionOtro.trim()) { setRegistroError("Debe especificar en que consiste el servicio para la opcion 'Otros'"); return }
    if (fechaEsFutura) { setFechaError("No se permiten fechas futuras. Solo hoy o fechas anteriores."); return }

    const esConsulta = tipoServicioSeleccionadoLabel.toLowerCase().includes("consulta")
    const esEstudio = tipoServicioSeleccionadoLabel.toLowerCase().includes("estudio")

    if (esConsulta || esEstudio) {
      try {
        sessionStorage.setItem(
          "CITA_PREFILL_KEY",
          JSON.stringify({
            curp: beneficiarioEncontrado.curp,
            nombre: beneficiarioEncontrado.nombre,
            idTipoServicio: idTipoServicioNumerico,
            fecha: fechaServicio,
          })
        )
      } catch {}
      
      setShowRegistroDialog(false)
      setBeneficiarioEncontrado(null)
      setBusquedaBeneficiario("")
      setTipoServicioSeleccionado("")
      setMontoServicio("")
      setCantidadArticulo("1")
      setDescripcionOtro("")
      setTipoEstudio("")
      setFechaServicio(hoy)
      setIdArticuloSeleccionado("")
      setArticulosInventario([])

      toast.info("Redirigiendo a Citas...", {
        description: "Las consultas y estudios deben agendarse como cita primero. El servicio se registrará automáticamente cuando la cita sea completada."
      })
      
      const evt = new CustomEvent("section-change", { detail: "citas" })
      window.dispatchEvent(evt)
      router.push("/panel?section=citas")
      return
    }

    try {
      setRegistroLoading(true)
      setRegistroError("")
      setFechaError("")
      const result = await createServicio({
        curp:           beneficiarioEncontrado.curp,
        idTipoServicio: idTipoServicioNumerico,
        montoPagado:    0,
        notas:          requiereDescripcionOtro ? `Servicio otros: ${descripcionOtro.trim()}` :
                        (esEstudioMedico && tipoEstudio.trim()) ? `Estudio: ${tipoEstudio.trim()}` : undefined,
        estatus:        "COMPLETADO",
        fechaDevolucionEsperada: null,
        consumos: requiereArticulo && idArticuloSeleccionado
          ? [{ idProducto: Number(idArticuloSeleccionado), cantidad: cantidadArticuloNum }]
          : undefined,
        costo: montoNum > 0 ? montoNum : undefined,
      })
      const updated = await getServicios()
      setServiciosRegistrados(updated.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))

      setShowRegistroDialog(false)
      setBeneficiarioEncontrado(null)
      setBusquedaBeneficiario("")
      setTipoServicioSeleccionado("")
      setMontoServicio("")
      setCantidadArticulo("1")
      setDescripcionOtro("")
      setTipoEstudio("")
      setFechaServicio(hoy)
      setIdArticuloSeleccionado("")
      setArticulosInventario([])

      toast.success("Servicio registrado correctamente")
    } catch (err) {
      setRegistroError(friendlyError(err, "No se pudo registrar el servicio"))
    } finally {
      setRegistroLoading(false)
    }
  }

  const handleEliminarServicio = async () => {
    if (!servicioParaEliminar) return
    const servicio = servicioParaEliminar
    setEliminandoServicio(true)

    // Eliminación optimista
    GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.add(servicio.id)
    setServiciosRegistrados(prev => prev.filter(s => s.id !== servicio.id))
    setServicioParaEliminar(null)
    setSelectedIds(prev => { const n = new Set(prev); n.delete(servicio.id); return n })

    let seconds = 10
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout

    const undo = () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(servicio.id)
      getServicios().then(data => setServiciosRegistrados(data.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))).catch(() => {})
    }

    const toastId = toast.warning(`Eliminando servicio de ${servicio.nombre}...`, {
      description: `Tienes ${seconds} segundos para deshacer esta acción.`,
      duration: 10500,
      action: { label: "Deshacer", onClick: undo }
    })

    intervalId = setInterval(() => {
      seconds--
      if (seconds <= 0) {
        clearInterval(intervalId)
      } else {
        toast.warning(`Eliminando servicio de ${servicio.nombre}...`, {
          id: toastId,
          description: `Tienes ${seconds} segundos para deshacer esta acción.`,
          duration: seconds * 1000 + 500,
          action: { label: "Deshacer", onClick: undo }
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      try {
        await deleteServicio(servicio.id)
        GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(servicio.id)
        const updated = await getServicios()
        setServiciosRegistrados(updated.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))
        
        const esCita = servicio.referenciaTipo?.toUpperCase() === "CITA"
        if (esCita) {
          setBannerEliminarServicio({ nombre: servicio.nombre, servicio: servicio.servicio, idCita: servicio.referenciaId })
        }
      } catch (err) {
        console.error("Error al eliminar servicio:", err)
        toast.error(friendlyError(err, "No se pudo eliminar el servicio"))
        GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(servicio.id)
        const updated = await getServicios()
        setServiciosRegistrados(updated.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))
      }
    }, 10000)

    setEliminandoServicio(false)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const count = ids.length
    
    // Optimistic delete
    ids.forEach(id => GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.add(id))
    setServiciosRegistrados(prev => prev.filter(s => !ids.includes(s.id)))
    setSelectedIds(new Set())
    setSelectionMode(false)

    let seconds = 10
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout

    const undo = () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      ids.forEach(id => GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(id))
      getServicios().then(data => setServiciosRegistrados(data.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))).catch(() => {})
    }

    const toastId = toast.warning(`Eliminando ${count} servicios...`, {
      description: `Tienes ${seconds} segundos para deshacer esta acción.`,
      duration: 10500,
      action: { label: "Deshacer", onClick: undo }
    })

    intervalId = setInterval(() => {
      seconds--
      if (seconds <= 0) {
        clearInterval(intervalId)
      } else {
        toast.warning(`Eliminando ${count} servicios...`, {
          id: toastId,
          description: `Tienes ${seconds} segundos para deshacer esta acción.`,
          duration: seconds * 1000 + 500,
          action: { label: "Deshacer", onClick: undo }
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      try {
        for (const id of ids) {
          await deleteServicio(id).catch(console.error)
          GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(id)
        }
        const updated = await getServicios()
        setServiciosRegistrados(updated.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))
      } catch (err) {
        console.error("Error en eliminación masiva:", err)
        ids.forEach(id => GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.delete(id))
        toast.error("Hubo un error al eliminar algunos servicios")
        const updated = await getServicios()
        setServiciosRegistrados(updated.filter(s => !GLOBAL_OPTIMISTIC_DELETED_SERVICIOS.has(s.id)))
      }
    }, 10000)
  }

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const count = ids.length
    
    setServiciosRegistrados(prev => prev.map(s => ids.includes(s.id) ? { ...s, estatus: "COMPLETADO" } : s))
    setSelectedIds(new Set())
    setSelectionMode(false)
    
    const toastId = toast.loading(`Marcando ${count} servicios como completados...`)
    try {
      for (const id of ids) {
        await updateServicio(id, { estatus: "COMPLETADO" }).catch(console.error)
      }
      toast.success(`${count} servicios marcados como completados`, { id: toastId })
      const updated = await getServicios()
      setServiciosRegistrados(updated)
    } catch (err) {
      toast.error("Hubo un error al actualizar algunos servicios", { id: toastId })
      const updated = await getServicios()
      setServiciosRegistrados(updated)
    }
  }

  const handleActualizarEstatusServicio = async (idServicio: number, estatus: string) => {
    try {
      setUpdatingServicioId(idServicio)
      await updateServicio(idServicio, { estatus })
      const updated = await getServicios()
      setServiciosRegistrados(updated)
      toast.success("Estatus actualizado")
    } catch (err) {
      toast.error(friendlyError(err, "No se pudo actualizar el estatus"))
    } finally {
      setUpdatingServicioId(null)
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

  const applySortPreset = (preset: "recent" | "highest" | "nameAZ") => {
    if (preset === "recent") { setSortField("fecha"); setSortDirection("desc"); return }
    if (preset === "highest") { setSortField("monto"); setSortDirection("desc"); return }
    setSortField("nombre"); setSortDirection("asc")
  }

  const resetFormDialog = () => {
    setShowRegistroDialog(true)
    setBeneficiarioEncontrado(null)
    setBusquedaBeneficiario("")
    setTipoServicioSeleccionado("")
    setMontoServicio("")
    setCantidadArticulo("1")
    setDescripcionOtro("")
    setFechaServicio(hoy)
    setFechaError("")
    setRegistroError("")
    setIdArticuloSeleccionado("")
    setArticulosInventario([])
  }

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
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
    <>
      <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Registro de Servicios</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Resumen mensual y consulta de servicios otorgados</p>
      </div>

      {/* Tabs + Botones */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-[180ms] border ${
              activeTab === "resumen"
                ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
                : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
            }`}
          >
            <BarChart2 className="size-3.5" />Resumen
          </button>
          <button
            onClick={() => setActiveTab("tabla")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-[180ms] border ${
              activeTab === "tabla"
                ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm"
                : "bg-card text-muted-foreground border-border/70 hover:border-[#0f4c81]/40 hover:text-foreground"
            }`}
          >
            <ClipboardList className="size-3.5" />Servicios registrados
          </button>
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-3.5" />
            Nuevo Servicio
          </button>
        </div>
      </div>


      {/* KPIs + Charts */}
      {activeTab === "resumen" && <ServiciosChartsKpis
        selectedMonth={selectedMonth}
        monthInputToLabel={monthInputToLabel}
        totalMes={serviciosMes.length}
        montoMes={montoMes}
        pendientesMes={pendientesMes}
        tiposDistintosMes={tiposDistintosMes}
        topTipoMes={topTipoMes}
        monthlyBarData={monthlyBarData}
        donutData={donutData}
      />}

      {/* Table */}
      {activeTab === "tabla" && <ServiciosTable
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
        estatusCicloIdx={estatusCicloIdx}
        onCicloEstatus={() => setEstatusCicloIdx(i => (i + 1) % 3)}

        onRowClick={setServicioDetalle}
        setPage={setPage}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectionMode={selectionMode}
        onSelectionModeToggle={() => {
          setSelectionMode(prev => !prev)
          setSelectedIds(new Set())
        }}
      />}
      </div>

      {/* Barra de acción masiva */}
      {selectedIds.size > 0 && activeTab === "tabla" && (
        <div className="sticky bottom-0 h-0 w-full overflow-visible pointer-events-none">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-max z-50 flex items-center gap-4 rounded-full border border-border/40 bg-background/95 px-6 py-3 shadow-xl backdrop-blur-md pointer-events-auto">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? "seleccionado" : "seleccionados"}
            </span>
            <div className="flex items-center gap-2 border-l border-border/50 pl-4">
            <button
              onClick={() => setBulkConfirm("complete")}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <CheckCircle2 className="size-4" />
              Completar
            </button>
            <button
              onClick={() => {
                if (selectedIds.size === 1) {
                  const id = selectedIds.values().next().value
                  const servicio = serviciosConFecha.find(s => s.id === id)
                  if (servicio) setServicioParaEliminar(servicio)
                } else {
                  setBulkConfirm("delete")
                }
              }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors ml-1"
            >
              <X className="size-4" />
            </button>
            </div>
          </div>
        </div>
      )}
      {/* Dialog: Detalle */}
      <Dialog open={Boolean(servicioDetalle)} onOpenChange={(open) => !open && setServicioDetalle(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-[#0f4c81]" />
              Detalle del servicio #{servicioDetalle?.id}
            </DialogTitle>
          </DialogHeader>
          {servicioDetalle && (
            <div className="flex flex-col gap-4 py-1">

              {/* Beneficiario + Servicio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Beneficiario</p>
                  <p className="text-sm font-medium text-foreground">{servicioDetalle.nombre}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{servicioDetalle.folio}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Servicio</p>
                  <p className="text-sm font-medium text-foreground">{servicioDetalle.servicio}</p>
                </div>
              </div>

              {/* Cards: Fecha · Monto · Estatus */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Fecha",   value: formatDate(servicioDetalle.fecha) },
                  { label: "Monto",   value: formatMoney(servicioDetalle.montoNumero), bold: true },
                  { label: "Estatus", value: servicioDetalle.estatus ?? "—" },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex flex-col gap-0.5 rounded-lg border border-border/70 bg-muted/20 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className={`text-sm tabular-nums text-foreground ${bold ? "font-bold" : ""}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Artículo entregado (si aplica) */}
              {servicioDetalle.articuloEntregado && (
                <div className={`grid gap-2 ${servicioDetalle.cantidadArticulo ? "grid-cols-3" : "grid-cols-1"}`}>
                  <div className={`flex flex-col gap-0.5 rounded-lg border border-border/70 bg-muted/20 p-2.5 ${servicioDetalle.cantidadArticulo ? "col-span-2" : ""}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Artículo entregado</p>
                    <p className="text-sm text-foreground">{servicioDetalle.articuloEntregado}</p>
                  </div>
                  {servicioDetalle.cantidadArticulo && (
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/70 bg-muted/20 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cantidad</p>
                      <p className="text-sm font-bold tabular-nums text-foreground">{servicioDetalle.cantidadArticulo}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo de membresía (solo servicios de tipo MEMBRESIA) */}
              {servicioDetalle.referenciaTipo === "MEMBRESIA" && (() => {
                const partes = (servicioDetalle.notas ?? "").split(" · ")
                const motivo = partes.length > 2 ? partes.slice(2).join(" · ").trim() : null
                return (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Motivo</p>
                    {motivo
                      ? <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-foreground">{motivo}</p>
                      : <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground/60">—</p>
                    }
                  </div>
                )
              })()}

              {/* Notas */}
              {servicioDetalle.referenciaTipo !== "MEMBRESIA" && (
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notas</p>
                  {servicioDetalle.notas
                    ? <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-foreground">{servicioDetalle.notas}</p>
                    : <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground/60">—</p>
                  }
                </div>
              )}

              {/* Cambiar estatus */}
              {servicioDetalle.referenciaTipo === "CITA" && String(servicioDetalle.estatus ?? "").toUpperCase() === "COMPLETADO" ? (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estatus</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />Completado
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cambiar estatus</p>
                  <Select
                    value={String(servicioDetalle.estatus ?? "").toUpperCase() === "PENDIENTE" ? "PENDIENTE" : "COMPLETADO"}
                    onValueChange={(value) => handleActualizarEstatusServicio(servicioDetalle.id, value)}
                    disabled={updatingServicioId === servicioDetalle.id}
                  >
                    <SelectTrigger className="h-8 w-32 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="COMPLETADO">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-between gap-2 border-t border-border/40 pt-2">
                <button
                  onClick={() => { setServicioParaEliminar(servicioDetalle); setServicioDetalle(null) }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                >
                  Eliminar servicio
                </button>
                <div className="flex gap-2">
                  {servicioDetalle.referenciaTipo === "CITA" && (
                    <button
                      onClick={() => {
                        setServicioDetalle(null)
                        try { sessionStorage.setItem("openCitaId", String(servicioDetalle.referenciaId)) } catch {}
                        router.push("/panel?section=citas")
                      }}
                      className="rounded-lg border border-border/70 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Ver en citas
                    </button>
                  )}
                  <button
                    onClick={() => setServicioDetalle(null)}
                    className="rounded-lg border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cerrar
                  </button>
                </div>
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
        cantidadArticulo={cantidadArticulo}
        setCantidadArticulo={setCantidadArticulo}
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
        esEstudioMedico={esEstudioMedico}
        tipoEstudio={tipoEstudio}
        setTipoEstudio={setTipoEstudio}
        expedienteBloqueado={expedienteBloqueado}
        onRegistrar={handleRegistrarServicio}
        catalogoServicios={catalogoFiltrado}
        requiereArticulo={requiereArticulo}
        articulosFiltrados={articulosFiltrados}
        loadingArticulos={loadingArticulos}
        idArticuloSeleccionado={idArticuloSeleccionado}
        setIdArticuloSeleccionado={setIdArticuloSeleccionado}
        
      />

      {/* Dialog: cancelar cita post-eliminación */}
      <Dialog open={Boolean(bannerEliminarServicio)} onOpenChange={(open) => { if (!open) setBannerEliminarServicio(null) }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarDays className="size-4 text-[#0f4c81]" />
              ¿Cancelar la cita?
            </DialogTitle>
          </DialogHeader>
          {bannerEliminarServicio && (
            <div className="flex flex-col gap-4 pt-1">
              <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Servicio eliminado</p>
                <p className="mt-1 text-sm font-medium text-foreground">{bannerEliminarServicio.nombre}</p>
                <p className="text-xs text-muted-foreground">{bannerEliminarServicio.servicio}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                ¿Quieres ir a Citas para cancelar también la cita asociada?
              </p>
              <div className="flex justify-end gap-2 border-t border-border/40 pt-2">
                <button
                  onClick={() => setBannerEliminarServicio(null)}
                  className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  No, gracias
                </button>
                <button
                  onClick={() => {
                    if (bannerEliminarServicio.idCita) {
                      try { sessionStorage.setItem("openCitaId", String(bannerEliminarServicio.idCita)) } catch {}
                    }
                    router.push("/panel?section=citas")
                    setBannerEliminarServicio(null)
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#0f4c81" }}
                >
                  Ir a Citas
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Eliminar */}
      <Dialog open={Boolean(servicioParaEliminar)} onOpenChange={(open) => !open && setServicioParaEliminar(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">¿Eliminar servicio?</DialogTitle>
            <DialogDescription className="text-xs">
              {servicioParaEliminar && (
                <>
                  ¿Deseas eliminar este servicio de forma permanente aunque esté en estado <strong>{servicioParaEliminar.estatus?.toUpperCase()}</strong>?
                  {servicioParaEliminar.referenciaTipo?.toUpperCase() === "CITA" && (
                    <span className="block mt-1 font-bold">¡Atención! Este servicio proviene de una cita.</span>
                  )}
                  <br className="mt-1" />
                  Al confirmar, tendrás 10 segundos para deshacer esta acción antes de que se elimine de forma permanente y definitiva del sistema.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {servicioParaEliminar && (
            <div className="space-y-4 pt-1">
              <div className="divide-y divide-border/40 rounded-xl border border-border/60">
                {[
                  { label: "CURP",         value: <span className="font-mono text-xs">{servicioParaEliminar.folio}</span> },
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

      <AlertDialog open={bulkConfirm !== null} onOpenChange={(o) => !o && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === "delete" ? "¿Eliminar servicios permanentemente?" :
               "¿Completar servicios seleccionados?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm === "delete" ? "Al confirmar, tendrás 10 segundos para deshacer esta acción antes de que los servicios se eliminen de forma permanente y definitiva del sistema." :
               "¿Estás seguro que deseas marcar como completados los servicios seleccionados?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                const action = bulkConfirm
                setBulkConfirm(null)
                if (action === "delete") handleBulkDelete()
                else if (action === "complete") handleBulkComplete()
              }}
              className={bulkConfirm === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
