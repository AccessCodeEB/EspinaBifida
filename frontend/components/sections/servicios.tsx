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

import { getServicios, type Servicio } from "@/services/servicios"

export function ServiciosSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistroDialog, setShowRegistroDialog] = useState(false)
  const [busquedaBeneficiario, setBusquedaBeneficiario] = useState("")
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState<{ folio: string; nombre: string; membresia: string } | null>(null)
  const [serviciosRegistrados, setServiciosRegistrados] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getServicios()
      .then(data => setServiciosRegistrados(data))
      .catch(err => setError(err?.message ?? "Error al cargar servicios"))
      .finally(() => setLoading(false))
  }, [])

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

  const handleBuscarBeneficiario = () => {
    if (busquedaBeneficiario.toLowerCase().includes("garcia") || busquedaBeneficiario === "EB-001") {
      setBeneficiarioEncontrado({ folio: "EB-001", nombre: "Maria Garcia Lopez", membresia: "Activa" })
    } else if (busquedaBeneficiario.toLowerCase().includes("perez") || busquedaBeneficiario === "EB-002") {
      setBeneficiarioEncontrado({ folio: "EB-002", nombre: "Juan Perez Martinez", membresia: "Vencida" })
    } else {
      setBeneficiarioEncontrado(null)
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
              <div className="flex gap-2">
                <Input
                  placeholder="Folio o nombre..."
                  className="h-12 flex-1 text-base"
                  value={busquedaBeneficiario}
                  onChange={(e) => setBusquedaBeneficiario(e.target.value)}
                />
                <Button size="lg" variant="outline" onClick={handleBuscarBeneficiario}>
                  <Search className="size-5" />
                </Button>
              </div>
            </div>

            {beneficiarioEncontrado && (
              <div className={`rounded-lg border p-4 ${beneficiarioEncontrado.membresia === "Activa" ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{beneficiarioEncontrado.nombre}</p>
                    <p className="text-sm text-muted-foreground">{beneficiarioEncontrado.folio}</p>
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
              <Select>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta Medica</SelectItem>
                  <SelectItem value="terapia">Terapia Fisica</SelectItem>
                  <SelectItem value="donacion">Donacion Material</SelectItem>
                  <SelectItem value="panales">Paquete de Panales</SelectItem>
                  <SelectItem value="silla">Silla de Ruedas</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-base">Fecha</Label>
                <Input type="date" className="h-12 text-base" defaultValue="2026-02-26" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base">Monto</Label>
                <Input placeholder="$0.00" className="h-12 text-base" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" size="lg" className="text-base" onClick={() => setShowRegistroDialog(false)}>
                Cancelar
              </Button>
              <Button
                size="lg"
                className="text-base"
                disabled={!beneficiarioEncontrado || beneficiarioEncontrado.membresia === "Vencida"}
                onClick={() => setShowRegistroDialog(false)}
              >
                Registrar Servicio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
