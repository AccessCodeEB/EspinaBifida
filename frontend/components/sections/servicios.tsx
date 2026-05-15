"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Layers3,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusIcon } from "@/components/ui/status-icon"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  createServicio,
  deleteServicio,
  getMontoSugeridoPorTipoServicio,
  getServicios,
  TIPOS_SERVICIO_SUGERIDOS,
  type Servicio,
} from "@/services/servicios"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"

type ServicioDetallado = Servicio & {
  fechaDate: Date | null
  montoNumero: number
  mesClave: string
}

const PAGE_SIZE = 25
const PIE_COLORS = ["#005bb5", "#eab308", "#ef4444", "#10b981", "#9333ea", "#fb923c", "#14b8a6"]

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

type RangoRapido = "full" | "firstHalf" | "secondHalf" | "last7"

type PendingDelete = {
  servicio: ServicioDetallado
  timerId: ReturnType<typeof setTimeout>
}

type SortField = "estatus" | "servicio" | "nombre" | "monto" | "folio" | "fecha"
type SortDirection = "asc" | "desc"

export function ServiciosSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistroDialog, setShowRegistroDialog] = useState(false)
  const [servicioDetalle, setServicioDetalle] = useState<ServicioDetallado | null>(null)
  const [servicioParaEliminar, setServicioParaEliminar] = useState<ServicioDetallado | null>(null)
  const [eliminandoServicio, setEliminandoServicio] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const [busquedaBeneficiario, setBusquedaBeneficiario] = useState("")
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState<{ curp: string; nombre: string; membresia: string; estatus: string } | null>(null)
  const [tipoServicioSeleccionado, setTipoServicioSeleccionado] = useState("")
  const [montoServicio, setMontoServicio] = useState("")
  const [descripcionOtro, setDescripcionOtro] = useState("")
  const [fechaServicio, setFechaServicio] = useState(() => new Date().toISOString().split("T")[0])
  const [fechaError, setFechaError] = useState("")
  const [registroError, setRegistroError] = useState("")
  const [registroLoading, setRegistroLoading] = useState(false)

  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loadingBeneficiarios, setLoadingBeneficiarios] = useState(false)
  const [showSugerencias, setShowSugerencias] = useState(false)

  const [serviciosRegistrados, setServiciosRegistrados] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState("")
  const [fechaFinFiltro, setFechaFinFiltro] = useState("")
  const [sortField, setSortField] = useState<SortField>("folio")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  useEffect(() => {
    getServicios()
      .then((data) => setServiciosRegistrados(data))
      .catch((err) => setError(err?.message ?? "Error al cargar servicios"))
      .finally(() => setLoading(false))
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
    return () => {
      if (pendingDelete) {
        clearTimeout(pendingDelete.timerId)
      }
    }
  }, [pendingDelete])

  const serviciosConFecha = useMemo<ServicioDetallado[]>(() => {
    return serviciosRegistrados.map((s) => {
      const fechaDate = parseDate(s.fecha)
      return {
        ...s,
        fechaDate,
        montoNumero: parseMoney(s.monto),
        mesClave: fechaDate ? monthKey(fechaDate) : "",
      }
    })
  }, [serviciosRegistrados])

  const hoy = new Date().toISOString().split("T")[0]
  const fechaEsFutura = fechaServicio > hoy
  const idTipoServicioNumerico = Number(tipoServicioSeleccionado)
  const montoNum = Number(montoServicio)
  const montoEsValido = montoServicio.trim() !== "" && Number.isFinite(montoNum) && montoNum >= 0

  const montoSugerido = Number.isInteger(idTipoServicioNumerico)
    ? getMontoSugeridoPorTipoServicio(idTipoServicioNumerico)
    : null

  const tipoServicioSeleccionadoLabel =
    TIPOS_SERVICIO_SUGERIDOS.find((tipo) => tipo.idTipoServicio === idTipoServicioNumerico)?.nombre ?? ""

  const requiereDescripcionOtro = tipoServicioSeleccionadoLabel === "Otros"

  const busquedaNormalizada = busquedaBeneficiario.trim().toLowerCase()
  const sugerenciasBeneficiarios = busquedaNormalizada
    ? beneficiarios
        .filter((b) => {
          const nombreCompleto = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.trim().toLowerCase()
          const curp = String(b.curp ?? "").trim().toLowerCase()
          return nombreCompleto.startsWith(busquedaNormalizada) || curp.startsWith(busquedaNormalizada)
        })
        .slice(0, 8)
    : []

  const mapBeneficiarioSeleccionado = (b: Beneficiario) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
    const estatus = String(b.estatus ?? "").trim() || "Activo"
    const membresia = estatus === "Activo" ? "Vigente" : "No vigente"
    return {
      curp: String(b.curp ?? "").trim(),
      nombre,
      membresia,
      estatus,
    }
  }

  const expedienteBloqueado = beneficiarioEncontrado
    ? beneficiarioEncontrado.estatus === "Inactivo" || beneficiarioEncontrado.estatus === "Baja"
    : false

  const serviciosMesSeleccionado = useMemo(
    () => serviciosConFecha.filter((s) => s.mesClave === selectedMonth),
    [serviciosConFecha, selectedMonth]
  )

  const montoMesSeleccionado = useMemo(
    () => serviciosMesSeleccionado.reduce((acc, s) => acc + s.montoNumero, 0),
    [serviciosMesSeleccionado]
  )

  const pendientesMesSeleccionado = useMemo(
    () => serviciosMesSeleccionado.filter((s) => String(s.estatus).toLowerCase() === "pendiente").length,
    [serviciosMesSeleccionado]
  )

  const conteoTiposMes = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of serviciosMesSeleccionado) {
      const key = s.servicio || "Sin tipo"
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [serviciosMesSeleccionado])

  const tiposDistintosMes = conteoTiposMes.size

  const topTipoMes = useMemo(() => {
    let maxLabel = "Sin datos"
    let maxValue = 0

    for (const [label, value] of conteoTiposMes.entries()) {
      if (value > maxValue) {
        maxLabel = label
        maxValue = value
      }
    }

    return { label: maxLabel, value: maxValue }
  }, [conteoTiposMes])

  const donutData = useMemo(() => {
    const entries = Array.from(conteoTiposMes.entries())
      .map(([name, value], index) => ({
        name,
        value,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)

    return entries
  }, [conteoTiposMes])

  const monthlyBarData = useMemo(() => {
    const months = buildLastMonths(selectedMonth, 6)
    return months.map((m) => {
      const totalMonto = serviciosConFecha
        .filter((s) => s.mesClave === m)
        .reduce((acc, s) => acc + s.montoNumero, 0)

      return {
        mes: monthLabel(m),
        mesClave: m,
        monto: Number(totalMonto.toFixed(2)),
      }
    })
  }, [serviciosConFecha, selectedMonth])

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return serviciosConFecha.filter((s) => {
      if (s.mesClave !== selectedMonth) return false

      if (fechaInicioFiltro && s.fechaDate && s.fechaDate < new Date(`${fechaInicioFiltro}T00:00:00`)) {
        return false
      }

      if (fechaFinFiltro && s.fechaDate && s.fechaDate > new Date(`${fechaFinFiltro}T23:59:59`)) {
        return false
      }

      if (!search) return true

      return (
        s.nombre.toLowerCase().includes(search) ||
        s.folio.toLowerCase().includes(search) ||
        s.servicio.toLowerCase().includes(search)
      )
    })
  }, [serviciosConFecha, selectedMonth, fechaInicioFiltro, fechaFinFiltro, searchTerm])

  const collator = useMemo(
    () => new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" }),
    []
  )

  const sortedFiltered = useMemo(() => {
    const sign = sortDirection === "asc" ? 1 : -1
    const data = [...filtered]

    data.sort((a, b) => {
      if (sortField === "fecha") {
        const aTime = a.fechaDate ? a.fechaDate.getTime() : 0
        const bTime = b.fechaDate ? b.fechaDate.getTime() : 0
        return (aTime - bTime) * sign
      }

      if (sortField === "monto") {
        return (a.montoNumero - b.montoNumero) * sign
      }

      const getValue = (row: ServicioDetallado): string => {
        if (sortField === "estatus") return String(row.estatus ?? "")
        if (sortField === "servicio") return String(row.servicio ?? "")
        if (sortField === "nombre") return String(row.nombre ?? "")
        return String(row.folio ?? "")
      }

      return collator.compare(getValue(a), getValue(b)) * sign
    })

    return data
  }, [filtered, sortField, sortDirection, collator])

  useEffect(() => {
    setPage(1)
  }, [selectedMonth, fechaInicioFiltro, fechaFinFiltro, searchTerm, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const paginated = sortedFiltered.slice(start, end)

  const handleBuscarBeneficiario = () => {
    if (!busquedaNormalizada) {
      setBeneficiarioEncontrado(null)
      return
    }

    const matchExacto = beneficiarios.find((b) => {
      const nombreCompleto = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim().toLowerCase()
      const curp = String(b.curp ?? "").trim().toLowerCase()
      return nombreCompleto === busquedaNormalizada || curp === busquedaNormalizada
    })

    if (matchExacto) {
      setBeneficiarioEncontrado(mapBeneficiarioSeleccionado(matchExacto))
      setShowSugerencias(false)
      return
    }

    const primeraSugerencia = sugerenciasBeneficiarios[0]
    if (primeraSugerencia) {
      setBeneficiarioEncontrado(mapBeneficiarioSeleccionado(primeraSugerencia))
      setBusquedaBeneficiario(
        `${primeraSugerencia.nombres} ${primeraSugerencia.apellidoPaterno} ${primeraSugerencia.apellidoMaterno}`
          .replace(/\s+/g, " ")
          .trim()
      )
      setShowSugerencias(false)
      return
    }

    setBeneficiarioEncontrado(null)
  }

  const handleSeleccionarSugerencia = (b: Beneficiario) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
    setBusquedaBeneficiario(nombre)
    setBeneficiarioEncontrado(mapBeneficiarioSeleccionado(b))
    setShowSugerencias(false)
  }

  const handleRegistrarServicio = async () => {
    if (!beneficiarioEncontrado) {
      setRegistroError("Seleccione un beneficiario valido")
      return
    }

    if (!Number.isInteger(idTipoServicioNumerico) || idTipoServicioNumerico <= 0) {
      setRegistroError("Seleccione un tipo de servicio")
      return
    }

    if (!montoEsValido) {
      setRegistroError("Ingrese un monto valido")
      return
    }

    if (requiereDescripcionOtro && !descripcionOtro.trim()) {
      setRegistroError("Debe especificar en que consiste el servicio para la opcion 'Otros'")
      return
    }

    if (fechaEsFutura) {
      setFechaError("No se permiten fechas futuras. Solo hoy o fechas anteriores.")
      return
    }

    try {
      setRegistroLoading(true)
      setRegistroError("")
      setFechaError("")

      await createServicio({
        curp: beneficiarioEncontrado.curp,
        idTipoServicio: idTipoServicioNumerico,
        costo: montoNum,
        montoPagado: 0,
        notas: requiereDescripcionOtro
          ? `Servicio otros: ${descripcionOtro.trim()}`
          : undefined,
      })

      const serviciosActualizados = await getServicios()
      setServiciosRegistrados(serviciosActualizados)

      setShowRegistroDialog(false)
      setBeneficiarioEncontrado(null)
      setBusquedaBeneficiario("")
      setTipoServicioSeleccionado("")
      setMontoServicio("")
      setDescripcionOtro("")
      setFechaServicio(hoy)
      toast.success("Servicio registrado correctamente")
    } catch (err) {
      setRegistroError(err instanceof Error ? err.message : "Error al registrar el servicio")
    } finally {
      setRegistroLoading(false)
    }
  }

  const handleEliminarServicio = async () => {
    if (!servicioParaEliminar) return

    try {
      setEliminandoServicio(true)
      if (pendingDelete) {
        clearTimeout(pendingDelete.timerId)
      }

      const servicio = servicioParaEliminar
      setServiciosRegistrados((prev) => prev.filter((s) => s.id !== servicio.id))

      const timerId = setTimeout(async () => {
        try {
          await deleteServicio(servicio.id)
          const serviciosActualizados = await getServicios()
          setServiciosRegistrados(serviciosActualizados)
        } catch (err) {
          console.error("Error al confirmar eliminación de servicio:", err)
          const serviciosActualizados = await getServicios()
          setServiciosRegistrados(serviciosActualizados)
          alert(err instanceof Error ? err.message : "Error al eliminar el servicio")
        } finally {
          setPendingDelete(null)
        }
      }, 8000)

      setPendingDelete({ servicio, timerId })
      setServicioParaEliminar(null)
      toast.success("Servicio eliminado", { description: "Tienes 8 segundos para deshacer." })
    } catch (err) {
      console.error("Error al eliminar servicio:", err)
      toast.error(err instanceof Error ? err.message : "Error al eliminar el servicio")
    } finally {
      setEliminandoServicio(false)
    }
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timerId)
    setPendingDelete(null)
    try {
      const serviciosActualizados = await getServicios()
      setServiciosRegistrados(serviciosActualizados)
    } catch (err) {
      console.error("Error al restaurar lista tras deshacer:", err)
    }
  }

  const applyQuickRange = (preset: RangoRapido) => {
    const { start, end } = getMonthRange(selectedMonth)

    if (preset === "full") {
      setFechaInicioFiltro(toInputDate(start))
      setFechaFinFiltro(toInputDate(end))
      return
    }

    if (preset === "firstHalf") {
      const mid = new Date(start.getFullYear(), start.getMonth(), 15)
      setFechaInicioFiltro(toInputDate(start))
      setFechaFinFiltro(toInputDate(mid))
      return
    }

    if (preset === "secondHalf") {
      const secondStart = new Date(start.getFullYear(), start.getMonth(), 16)
      setFechaInicioFiltro(toInputDate(secondStart))
      setFechaFinFiltro(toInputDate(end))
      return
    }

    const last7Start = subDays(end, 6)
    setFechaInicioFiltro(toInputDate(last7Start))
    setFechaFinFiltro(toInputDate(end))
  }

  const handleSortBy = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection("asc")
  }

  const applySortPreset = (preset: "recent" | "highest" | "nameAZ" | "pendingFirst") => {
    if (preset === "recent") {
      setSortField("fecha")
      setSortDirection("desc")
      return
    }

    if (preset === "highest") {
      setSortField("monto")
      setSortDirection("desc")
      return
    }

    if (preset === "nameAZ") {
      setSortField("nombre")
      setSortDirection("asc")
      return
    }

    setSortField("estatus")
    setSortDirection("desc")
  }

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

  const NAVY = "#0f4c81"

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Registro de Servicios</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Resumen mensual y consulta de servicios otorgados</p>
        </div>
        <div className="flex items-center gap-2">
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
                {/* Selector de año */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">Año</Label>
                  <Select value={selectedMonth.split("-")[0]} onValueChange={(year) => {
                    const month = selectedMonth.split("-")[1]
                    setSelectedMonth(`${year}-${month}`)
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i
                        return (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de mes */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">Mes</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { num: 1, label: "Ene" },
                      { num: 2, label: "Feb" },
                      { num: 3, label: "Mar" },
                      { num: 4, label: "Abr" },
                      { num: 5, label: "May" },
                      { num: 6, label: "Jun" },
                      { num: 7, label: "Jul" },
                      { num: 8, label: "Ago" },
                      { num: 9, label: "Sep" },
                      { num: 10, label: "Oct" },
                      { num: 11, label: "Nov" },
                      { num: 12, label: "Dic" },
                    ].map(({ num, label }) => {
                      const year = selectedMonth.split("-")[0]
                      const monthKey = `${year}-${String(num).padStart(2, "0")}`
                      const isSelected = selectedMonth === monthKey
                      return (
                        <Button
                          key={num}
                          variant={isSelected ? "default" : "outline"}
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedMonth(monthKey)
                            setShowMonthPicker(false)
                          }}
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
            onClick={() => {
              setShowRegistroDialog(true)
              setBeneficiarioEncontrado(null)
              setBusquedaBeneficiario("")
              setTipoServicioSeleccionado("")
              setMontoServicio("")
              setDescripcionOtro("")
              setFechaServicio(hoy)
              setFechaError("")
              setRegistroError("")
            }}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="size-4" />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Servicios del mes",    value: serviciosMesSeleccionado.length,             sub: `Período: ${monthInputToLabel(selectedMonth)}`, icon: ClipboardList,    color: NAVY       },
          { label: "Monto total del mes",  value: formatMoney(montoMesSeleccionado),            sub: "Suma de servicios registrados",                icon: CircleDollarSign, color: "#10b981"  },
          { label: "Pendientes",           value: pendientesMesSeleccionado,                    sub: "Servicios con estatus pendiente",              icon: AlertTriangle,    color: "#f59e0b"  },
          { label: "Tipos distintos",      value: tiposDistintosMes,                            sub: `Top: ${topTipoMes.label} (${topTipoMes.value})`, icon: Layers3,        color: "#e11d48"  },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon className="size-3.5" style={{ color }} />
              </div>
            </div>
            <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:col-span-4">
          <div className="border-b border-border/40 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Monto por mes</p>
            <p className="text-[11px] text-muted-foreground">Últimos 6 meses con base en el mes seleccionado</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
                  <XAxis
                    dataKey="mes"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value).toLocaleString("es-MX")}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatMoney(Number(value))}
                    labelFormatter={(label) => `Mes: ${label}`}
                    cursor={{ fill: "rgba(0,0,0,0.06)" }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--card-foreground)",
                    }}
                    labelStyle={{ color: "var(--card-foreground)" }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                  />
                  <Bar dataKey="monto" fill="#005bb5" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {monthlyBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.mesClave === selectedMonth ? "#ef4444" : "#005bb5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:col-span-3">
          <div className="border-b border-border/40 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Servicios por tipo</p>
            <p className="text-[11px] text-muted-foreground">Distribución del mes seleccionado</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <div className="flex h-[260px] w-full items-center justify-center">
              {donutData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos en este mes.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, item) => [`${value}`, item.payload.name]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        color: "var(--card-foreground)",
                      }}
                      labelStyle={{ fontWeight: 600, color: "var(--card-foreground)" }}
                      itemStyle={{ color: "var(--card-foreground)" }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de servicios */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">

        {/* Alerta undo */}
        {pendingDelete && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-xs text-amber-800 dark:text-amber-300">
              Servicio <span className="font-semibold">{pendingDelete.servicio.folio}</span> marcado para eliminar. Puedes deshacer en 8 segundos.
            </p>
            <button onClick={handleUndoDelete} className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400">
              Deshacer
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4">

          {/* Fila 1: título + búsqueda */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Servicios registrados</p>
              <p className="text-[11px] text-muted-foreground">{filtered.length} resultados · {monthInputToLabel(selectedMonth)}</p>
            </div>
            <div className="relative w-56 shrink-0">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Folio, nombre o servicio..."
                className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Fila 2: fechas + rangos rápidos + ordenar + limpiar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Rango personalizado */}
            <input type="date" value={fechaInicioFiltro} max={fechaFinFiltro || undefined}
              onChange={(e) => setFechaInicioFiltro(e.target.value)}
              className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs outline-none focus:border-[#0f4c81]" />
            <span className="text-[10px] text-muted-foreground">—</span>
            <input type="date" value={fechaFinFiltro} min={fechaInicioFiltro || undefined}
              onChange={(e) => setFechaFinFiltro(e.target.value)}
              className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs outline-none focus:border-[#0f4c81]" />

            {/* Separador */}
            <div className="h-5 w-px bg-border/60" />

            {/* Rangos rápidos */}
            {([
              { label: "Este mes", fn: () => applyQuickRange("full") },
              { label: "Últimos 7d", fn: () => applyQuickRange("last7") },
            ] as const).map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className="rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                {label}
              </button>
            ))}

            {/* Separador */}
            <div className="h-5 w-px bg-border/60" />

            {/* Ordenar (select nativo) */}
            <select
              className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:border-[#0f4c81]"
              onChange={(e) => applySortPreset(e.target.value as "recent" | "highest" | "nameAZ" | "pendingFirst")}
              defaultValue=""
            >
              <option value="" disabled>Ordenar por…</option>
              <option value="recent">Más reciente</option>
              <option value="highest">Mayor monto</option>
              <option value="nameAZ">Nombre A–Z</option>
              <option value="pendingFirst">Pendientes primero</option>
            </select>

            {/* Limpiar */}
            <button
              onClick={() => { setFechaInicioFiltro(""); setFechaFinFiltro(""); setSearchTerm("") }}
              className="ml-auto rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("folio")}>Folio <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("nombre")}>Nombre <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("servicio")}>Servicio <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("fecha")}>Fecha <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="hidden py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground lg:table-cell">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("monto")}>Monto <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                  <button className="inline-flex items-center gap-1 hover:text-foreground/70" onClick={() => handleSortBy("estatus")}>Estatus <ArrowUpDown className="size-3" /></button>
                </th>
                <th className="py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No hay servicios para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-muted/20">
                    <td className="py-3 pl-5 font-mono text-[11px] text-foreground">{s.folio}</td>
                    <td className="py-3 text-xs font-medium text-foreground">{s.nombre}</td>
                    <td className="hidden py-3 text-xs text-foreground md:table-cell">{s.servicio}</td>
                    <td className="hidden py-3 text-xs text-foreground lg:table-cell">{s.fecha}</td>
                    <td className="hidden py-3 text-right text-xs font-semibold text-foreground lg:table-cell">{formatMoney(s.montoNumero)}</td>
                    <td className="py-3 text-center">
                      {(() => {
                        const cfg: Record<string, { dot: string; text: string }> = {
                          Activo:   { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
                          Inactivo: { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-400" },
                          Baja:     { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400" },
                        }
                        const c = cfg[s.estatus] ?? { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" }
                        return (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
                            <span className={`size-1.5 rounded-full ${c.dot}`} />
                            {s.estatus}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setServicioDetalle(s)}
                          className="flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                          <Eye className="size-3.5" />Ver
                        </button>
                        <button onClick={() => setServicioParaEliminar(s)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
          <span className="text-[11px] text-muted-foreground">
            {sortedFiltered.length === 0 ? 0 : start + 1}–{Math.min(end, sortedFiltered.length)} de {sortedFiltered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
              Anterior
            </button>
            <span className="min-w-[4rem] text-center text-[11px] text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      </div>

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
                  { label: "Folio",    value: <span className="font-mono text-xs">{servicioDetalle.folio}</span> },
                  { label: "Nombre",   value: servicioDetalle.nombre },
                  { label: "Servicio", value: servicioDetalle.servicio },
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Registro */}
      <Dialog open={showRegistroDialog} onOpenChange={setShowRegistroDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registrar Nuevo Servicio</DialogTitle>
            <DialogDescription className="text-xs">Busca al beneficiario y completa los datos del servicio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Buscar beneficiario</label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    placeholder="CURP o nombre..."
                    className="h-10 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
                    value={busquedaBeneficiario}
                    onFocus={() => setShowSugerencias(true)}
                    onChange={(e) => {
                      setBusquedaBeneficiario(e.target.value)
                      setShowSugerencias(true)
                      if (!e.target.value.trim()) setBeneficiarioEncontrado(null)
                    }}
                  />
                  <button onClick={handleBuscarBeneficiario}
                    className="flex items-center justify-center rounded-lg border border-border/70 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Search className="size-4" />
                  </button>
                </div>

                {showSugerencias && busquedaNormalizada && (
                  <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                    {loadingBeneficiarios ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Cargando beneficiarios...</p>
                    ) : sugerenciasBeneficiarios.length > 0 ? (
                      sugerenciasBeneficiarios.map((b) => {
                        const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.replace(/\s+/g, " ").trim()
                        return (
                          <button
                            key={b.curp ?? b.folio}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => handleSeleccionarSugerencia(b)}
                          >
                            <span className="font-medium">{nombre}</span>
                            <span className="text-xs text-muted-foreground">{b.curp ?? "SIN CURP"}</span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {beneficiarioEncontrado && (
              <div className={`rounded-lg border p-4 ${expedienteBloqueado ? "border-destructive/50 bg-destructive/5" : "border-success/50 bg-success/5"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{beneficiarioEncontrado.nombre}</p>
                    <p className="text-sm text-muted-foreground">{beneficiarioEncontrado.curp || "SIN CURP"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estatus: {beneficiarioEncontrado.estatus} | Membresia: {beneficiarioEncontrado.membresia}
                    </p>
                  </div>
                  <StatusIcon status={beneficiarioEncontrado.estatus} />
                </div>
                {expedienteBloqueado ? (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    Atencion: El beneficiario esta en estatus {beneficiarioEncontrado.estatus}. No se pueden registrar servicios.
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-medium text-success">Aviso: Membresia vigente por estatus Activo.</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de servicio</label>
              <Select
                value={tipoServicioSeleccionado}
                onValueChange={(value) => {
                  setTipoServicioSeleccionado(value)
                  setRegistroError("")

                  const nuevoMonto = getMontoSugeridoPorTipoServicio(Number(value))
                  if (nuevoMonto !== null) {
                    setMontoServicio(String(nuevoMonto.toFixed(2)))
                  } else {
                    setMontoServicio("")
                  }
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICIO_SUGERIDOS.map((tipo) => (
                    <SelectItem key={tipo.idTipoServicio} value={String(tipo.idTipoServicio)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {montoSugerido !== null && (
                <p className="text-sm text-muted-foreground">Monto sugerido para {tipoServicioSeleccionadoLabel}: ${montoSugerido.toFixed(2)}</p>
              )}
              {tipoServicioSeleccionadoLabel === "Otros" && (
                <p className="text-sm text-muted-foreground">Este servicio no tiene monto sugerido automatico.</p>
              )}
            </div>

            {requiereDescripcionOtro && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Especificar servicio</label>
                <Input
                  placeholder="Describe qué servicio se brindó..."
                  className="h-10 text-sm"
                  value={descripcionOtro}
                  required
                  onChange={(e) => {
                    setDescripcionOtro(e.target.value)
                    if (registroError) setRegistroError("")
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Campo obligatorio para registrar la informacion del servicio de tipo "Otros".
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fecha</label>
                <Input
                  type="date"
                  className="h-10 text-sm"
                  max={hoy}
                  value={fechaServicio}
                  onChange={(e) => {
                    setFechaServicio(e.target.value)
                    if (fechaError) setFechaError("")
                  }}
                />
                {fechaError && <p className="text-sm font-medium text-destructive">{fechaError}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Monto</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  className="h-10 text-sm"
                  value={montoServicio}
                  onChange={(e) => {
                    setMontoServicio(e.target.value)
                    if (registroError) setRegistroError("")
                  }}
                />
              </div>
            </div>

            {registroError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">{registroError}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
              <button onClick={() => setShowRegistroDialog(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                disabled={registroLoading || !beneficiarioEncontrado || expedienteBloqueado || fechaEsFutura || !Number.isInteger(idTipoServicioNumerico) || idTipoServicioNumerico <= 0 || !montoEsValido}
                onClick={handleRegistrarServicio}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                {registroLoading ? "Registrando..." : "Registrar servicio"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <button onClick={() => setServicioParaEliminar(null)} disabled={eliminandoServicio}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleEliminarServicio} disabled={eliminandoServicio}
                  className="flex-1 rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
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
