"use client"

import { useState, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  createServicio,
  getMontoSugeridoPorTipoServicio,
  getServicios,
  TIPOS_SERVICIO_SUGERIDOS,
  type Servicio,
} from "@/services/servicios"
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"

export function ServiciosSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistroDialog, setShowRegistroDialog] = useState(false)
  const [busquedaBeneficiario, setBusquedaBeneficiario] = useState("")
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState<{ curp: string; nombre: string; membresia: string } | null>(null)
  const [tipoServicioSeleccionado, setTipoServicioSeleccionado] = useState("")
  const [montoServicio, setMontoServicio] = useState("")
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

  useEffect(() => {
    getServicios()
      .then(data => setServiciosRegistrados(data))
      .catch(err => setError(err?.message ?? "Error al cargar servicios"))
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

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground text-sm">Cargando servicios...</p>
    </div>
  )

  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )

  const filtered = serviciosRegistrados.filter(
    (s) =>
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.servicio.toLowerCase().includes(searchTerm.toLowerCase())
  )
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
    const membresia = String(b.membresiaEstatus ?? "").toLowerCase() === "activa" ? "Activa" : "Vencida"
    return {
      curp: String(b.curp ?? "").trim(),
      nombre,
      membresia,
    }
  }

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
      setRegistroError("Seleccione un beneficiario válido")
      return
    }

    if (!Number.isInteger(idTipoServicioNumerico) || idTipoServicioNumerico <= 0) {
      setRegistroError("Seleccione un tipo de servicio")
      return
    }

    if (!montoEsValido) {
      setRegistroError("Ingrese un monto válido")
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
      })

      const serviciosActualizados = await getServicios()
      setServiciosRegistrados(serviciosActualizados)

      setShowRegistroDialog(false)
      setBeneficiarioEncontrado(null)
      setBusquedaBeneficiario("")
      setTipoServicioSeleccionado("")
      setMontoServicio("")
      setFechaServicio(hoy)
    } catch (err) {
      setRegistroError(err instanceof Error ? err.message : "Error al registrar el servicio")
    } finally {
      setRegistroLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Registro de Servicios</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Registrar y consultar servicios otorgados
          </p>
        </div>
        <Button size="lg" className="gap-2 text-base" onClick={() => {
          setShowRegistroDialog(true)
          setBeneficiarioEncontrado(null)
          setBusquedaBeneficiario("")
          setTipoServicioSeleccionado("")
          setMontoServicio("")
          setFechaServicio(hoy)
          setFechaError("")
          setRegistroError("")
        }}>
          <Plus className="size-5" />
          Nuevo Servicio
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Servicios Registrados</CardTitle>
              <CardDescription>{filtered.length} servicios encontrados</CardDescription>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm font-semibold">Folio</TableHead>
                <TableHead className="text-sm font-semibold">Nombre</TableHead>
                <TableHead className="text-sm font-semibold hidden md:table-cell">Servicio</TableHead>
                <TableHead className="text-sm font-semibold hidden lg:table-cell">Fecha</TableHead>
                <TableHead className="text-sm font-semibold hidden lg:table-cell">Monto</TableHead>
                <TableHead className="text-sm font-semibold text-center">Membresia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-semibold text-primary">{s.folio}</TableCell>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{s.servicio}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{s.fecha}</TableCell>
                  <TableCell className="hidden lg:table-cell font-medium">{s.monto}</TableCell>
                  <TableCell className="text-center">
                    <StatusIcon status={s.membresia} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              <div className={`rounded-lg border p-4 ${beneficiarioEncontrado.membresia === "Activa" ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{beneficiarioEncontrado.nombre}</p>
                    <p className="text-sm text-muted-foreground">{beneficiarioEncontrado.curp || "SIN CURP"}</p>
                  </div>
                  <StatusIcon status={beneficiarioEncontrado.membresia} />
                </div>
                {beneficiarioEncontrado.membresia === "Vencida" && (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    Atencion: La membresia esta vencida. Se requiere renovar antes de registrar servicios.
                  </p>
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
                <p className="text-sm text-muted-foreground">
                  Monto sugerido para {tipoServicioSeleccionadoLabel}: ${montoSugerido.toFixed(2)}
                </p>
              )}
              {tipoServicioSeleccionadoLabel === "Otros" && (
                <p className="text-sm text-muted-foreground">
                  Este servicio no tiene monto sugerido automático.
                </p>
              )}
            </div>

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
                {fechaError && (
                  <p className="text-sm font-medium text-destructive">{fechaError}</p>
                )}
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

            {registroError && (
              <p className="text-sm font-medium text-destructive">{registroError}</p>
            )}

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
                  beneficiarioEncontrado.membresia === "Vencida" ||
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
    </div>
  )
}
