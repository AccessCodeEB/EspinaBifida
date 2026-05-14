"use client"

import { useEffect, useMemo, useState } from "react"
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
    } catch (err) {
      console.error("Error al eliminar servicio:", err)
      alert(err instanceof Error ? err.message : "Error al eliminar el servicio")
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

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Registro de Servicios</h1>
          <p className="mt-1 text-base text-muted-foreground">Resumen mensual y consulta de servicios otorgados</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarDays className="size-4" />
                {monthInputToLabel(selectedMonth)}
                <ChevronDown className="size-4" />
              </Button>
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

          <Button
            size="lg"
            className="gap-2 text-base"
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
          >
            <Plus className="size-5" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios del mes</CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ClipboardList className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{serviciosMesSeleccionado.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Periodo: {monthInputToLabel(selectedMonth)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto total del mes</CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <CircleDollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatMoney(montoMesSeleccionado)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Suma de servicios registrados en el mes</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes por validar</CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{pendientesMesSeleccionado}</div>
            <p className="mt-1 text-xs text-muted-foreground">Servicios con estatus Pendiente</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios por tipo</CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm">
              <Layers3 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{tiposDistintosMes}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Top: {topTipoMes.label} ({topTipoMes.value})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="border-border/60 shadow-sm lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monto por mes</CardTitle>
            <CardDescription>Ultimos 6 meses con base en el mes seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 h-[300px] w-full">
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
                  />
                  <Bar dataKey="monto" fill="#005bb5" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {monthlyBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.mesClave === selectedMonth ? "#ef4444" : "#005bb5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Servicios por tipo</CardTitle>
            <CardDescription>Distribucion del mes seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4 flex h-[300px] w-full items-center justify-center">
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
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        color: "#0f172a",
                      }}
                      labelStyle={{ fontWeight: 600, color: "#0f172a" }}
                      itemStyle={{ color: "#0f172a" }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {pendingDelete ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Servicio {pendingDelete.servicio.folio} marcado para eliminar. Puedes deshacer en 8 segundos.
                <Button variant="link" className="ml-2 h-auto p-0 text-amber-900" onClick={handleUndoDelete}>
                  Deshacer
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Servicios Registrados</CardTitle>
                <CardDescription>
                  {filtered.length} servicios encontrados en {monthInputToLabel(selectedMonth)}
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, nombre o servicio..."
                  className="h-12 pl-10 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Fecha inicio</Label>
                <Input 
                  type="date" 
                  value={fechaInicioFiltro} 
                  onChange={(e) => setFechaInicioFiltro(e.target.value)}
                  max={fechaFinFiltro || undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Fecha fin</Label>
                <Input 
                  type="date" 
                  value={fechaFinFiltro} 
                  onChange={(e) => setFechaFinFiltro(e.target.value)}
                  min={fechaInicioFiltro || undefined}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFechaInicioFiltro("")
                    setFechaFinFiltro("")
                    setSearchTerm("")
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => applyQuickRange("full")}>Mes completo</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => applyQuickRange("firstHalf")}>1-15</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => applyQuickRange("secondHalf")}>16-fin</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => applyQuickRange("last7")}>Ultimos 7 dias</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => applySortPreset("recent")}>Mas reciente</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applySortPreset("highest")}>Mayor monto</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applySortPreset("nameAZ")}>Nombre A-Z</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applySortPreset("pendingFirst")}>Pendientes primero</Button>
              <div className="inline-flex items-center rounded-md border px-2 text-xs text-muted-foreground">
                Orden: {sortField} ({sortDirection === "asc" ? "asc" : "desc"})
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm font-semibold">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("folio")}>
                    Folio
                    <ArrowUpDown className={`size-3 ${sortField === "folio" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="text-sm font-semibold">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("nombre")}>
                    Nombre
                    <ArrowUpDown className={`size-3 ${sortField === "nombre" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="hidden text-sm font-semibold md:table-cell">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("servicio")}>
                    Servicio
                    <ArrowUpDown className={`size-3 ${sortField === "servicio" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="hidden text-sm font-semibold lg:table-cell">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("fecha")}>
                    Fecha
                    <ArrowUpDown className={`size-3 ${sortField === "fecha" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="hidden text-sm font-semibold lg:table-cell">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("monto")}>
                    Monto
                    <ArrowUpDown className={`size-3 ${sortField === "monto" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="text-sm font-semibold text-center">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSortBy("estatus")}>
                    Membresia (por status)
                    <ArrowUpDown className={`size-3 ${sortField === "estatus" ? "text-foreground" : "text-muted-foreground"}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right text-sm font-semibold">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No hay servicios para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">{s.folio}</TableCell>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{s.servicio}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{s.fecha}</TableCell>
                    <TableCell className="hidden font-medium lg:table-cell">{formatMoney(s.montoNumero)}</TableCell>
                    <TableCell className="text-center">
                      <StatusIcon status={s.estatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setServicioDetalle(s)}>
                          <Eye className="size-4" />
                          Ver
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setServicioParaEliminar(s)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {sortedFiltered.length === 0 ? 0 : start + 1}-{Math.min(end, sortedFiltered.length)} de {sortedFiltered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(servicioDetalle)} onOpenChange={(open) => !open && setServicioDetalle(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalle del servicio</DialogTitle>
            <DialogDescription>Informacion del registro seleccionado</DialogDescription>
          </DialogHeader>

          {servicioDetalle && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                <p className="text-muted-foreground">Folio</p>
                <p className="font-medium">{servicioDetalle.folio}</p>
                <p className="text-muted-foreground">Nombre</p>
                <p className="font-medium">{servicioDetalle.nombre}</p>
                <p className="text-muted-foreground">Servicio</p>
                <p className="font-medium">{servicioDetalle.servicio}</p>
                <p className="text-muted-foreground">Fecha</p>
                <p className="font-medium">{servicioDetalle.fecha}</p>
                <p className="text-muted-foreground">Monto</p>
                <p className="font-medium">{formatMoney(servicioDetalle.montoNumero)}</p>
                <p className="text-muted-foreground">Estatus</p>
                <p><StatusIcon status={servicioDetalle.estatus} /></p>
              </div>

              {servicioDetalle.notas ? (
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="mt-1">{servicioDetalle.notas}</p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRegistroDialog} onOpenChange={setShowRegistroDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Registrar Nuevo Servicio</DialogTitle>
            <DialogDescription>Busque al beneficiario y registre el servicio</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-base">Buscar Beneficiario</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="CURP o nombre..."
                    className="h-12 flex-1 text-base"
                    value={busquedaBeneficiario}
                    onFocus={() => setShowSugerencias(true)}
                    onChange={(e) => {
                      setBusquedaBeneficiario(e.target.value)
                      setShowSugerencias(true)
                      if (!e.target.value.trim()) {
                        setBeneficiarioEncontrado(null)
                      }
                    }}
                  />
                  <Button size="lg" variant="outline" onClick={handleBuscarBeneficiario}>
                    <Search className="size-5" />
                  </Button>
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

            <div className="flex flex-col gap-2">
              <Label className="text-base">Tipo de Servicio</Label>
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
              <div className="flex flex-col gap-2">
                <Label className="text-base">Especificar servicio</Label>
                <Input
                  placeholder="Describe que servicio se brindo..."
                  className="h-12 text-base"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-base">Fecha</Label>
                <Input
                  type="date"
                  className="h-12 text-base"
                  max={hoy}
                  value={fechaServicio}
                  onChange={(e) => {
                    setFechaServicio(e.target.value)
                    if (fechaError) setFechaError("")
                  }}
                />
                {fechaError && <p className="text-sm font-medium text-destructive">{fechaError}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base">Monto</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  className="h-12 text-base"
                  value={montoServicio}
                  onChange={(e) => {
                    setMontoServicio(e.target.value)
                    if (registroError) setRegistroError("")
                  }}
                />
              </div>
            </div>

            {registroError && <p className="text-sm font-medium text-destructive">{registroError}</p>}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" size="lg" className="text-base" onClick={() => setShowRegistroDialog(false)}>
                Cancelar
              </Button>
              <Button
                size="lg"
                className="text-base"
                disabled={
                  registroLoading ||
                  !beneficiarioEncontrado ||
                  expedienteBloqueado ||
                  fechaEsFutura ||
                  !Number.isInteger(idTipoServicioNumerico) ||
                  idTipoServicioNumerico <= 0 ||
                  !montoEsValido
                }
                onClick={handleRegistrarServicio}
              >
                {registroLoading ? "Registrando..." : "Registrar Servicio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(servicioParaEliminar)} onOpenChange={(open) => !open && setServicioParaEliminar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Eliminar Servicio</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas eliminar este servicio?</DialogDescription>
          </DialogHeader>

          {servicioParaEliminar && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/50">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Folio:</span>
                    <span className="font-medium">{servicioParaEliminar.folio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beneficiario:</span>
                    <span className="font-medium">{servicioParaEliminar.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-medium">{servicioParaEliminar.servicio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto:</span>
                    <span className="font-medium">{formatMoney(servicioParaEliminar.montoNumero)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-amber-600 font-medium">
                Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setServicioParaEliminar(null)}
                  disabled={eliminandoServicio}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleEliminarServicio}
                  disabled={eliminandoServicio}
                >
                  {eliminandoServicio ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
