"use client"

import { useState } from "react"
import { Search, Eye, Clock, UserPlus } from "lucide-react"
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

const preregistros = [
  { id: 1, nombre: "Roberto Juarez Medina", email: "roberto.juarez@email.com", telefono: "33 1234 5678", estado: "Jalisco", ciudad: "Guadalajara", fecha: "2026-02-24", estatus: "Pendiente" },
  { id: 2, nombre: "Lucia Navarro Torres", email: "lucia.navarro@email.com", telefono: "81 9876 5432", estado: "Nuevo Leon", ciudad: "Monterrey", fecha: "2026-02-23", estatus: "Pendiente" },
  { id: 3, nombre: "Fernando Rios Gomez", email: "fernando.rios@email.com", telefono: "55 5555 1234", estado: "CDMX", ciudad: "Benito Juarez", fecha: "2026-02-22", estatus: "Aprobado" },
  { id: 4, nombre: "Isabela Cruz Vargas", email: "isabela.cruz@email.com", telefono: "222 333 4455", estado: "Puebla", ciudad: "Puebla", fecha: "2026-02-20", estatus: "Pendiente" },
  { id: 5, nombre: "Miguel Angel Ortiz", email: "miguel.ortiz@email.com", telefono: "33 8877 6655", estado: "Jalisco", ciudad: "Tlaquepaque", fecha: "2026-02-18", estatus: "Aprobado" },
]


export function PreregistroSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showDetalleDialog, setShowDetalleDialog] = useState(false)
  const [selectedPreregistro, setSelectedPreregistro] = useState<typeof preregistros[0] | null>(null)
  const [showFormularioPublico, setShowFormularioPublico] = useState(false)

  const filtered = preregistros.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendientes = preregistros.filter((p) => p.estatus === "Pendiente").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Preregistro Publico</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Solicitudes de preregistro recibidas
          </p>
        </div>
        <Button size="lg" variant="outline" className="gap-2 text-base" onClick={() => setShowFormularioPublico(true)}>
          <Eye className="size-5" />
          Ver Formulario Publico
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-warning text-warning-foreground">
              <Clock className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes de Revision</p>
              <p className="text-2xl font-bold text-foreground">{pendientes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-success text-success-foreground">
              <UserPlus className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recibidos</p>
              <p className="text-2xl font-bold text-foreground">{preregistros.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Solicitudes de Preregistro</CardTitle>
              <CardDescription>{filtered.length} solicitudes</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o ciudad..."
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
                <TableHead className="text-sm font-semibold">Nombre</TableHead>
                <TableHead className="text-sm font-semibold hidden md:table-cell">Email</TableHead>
                <TableHead className="text-sm font-semibold hidden lg:table-cell">Telefono</TableHead>
                <TableHead className="text-sm font-semibold hidden lg:table-cell">Estado</TableHead>
                <TableHead className="text-sm font-semibold text-center">Estatus</TableHead>
                <TableHead className="text-sm font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{p.telefono}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{p.estado}</TableCell>
                  <TableCell className="text-center"><StatusIcon status={p.estatus} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        title="Ver detalle"
                        onClick={() => {
                          setSelectedPreregistro(p)
                          setShowDetalleDialog(true)
                        }}
                      >
                        <Eye className="size-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                      {p.estatus === "Pendiente" && (
                        <Button size="sm" className="h-9 w-24 text-sm">
                          Aprobar
                        </Button>
                      )}
                      {p.estatus === "Aprobado" && (
                        <span className="inline-flex h-9 w-24 items-center justify-center rounded-md border border-success/40 bg-success/10 text-sm font-medium text-success">
                          Aprobado
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalle Dialog */}
      <Dialog open={showDetalleDialog} onOpenChange={setShowDetalleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalle de Solicitud</DialogTitle>
            <DialogDescription>Preregistro recibido el {selectedPreregistro?.fecha}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {selectedPreregistro && (
              <>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Nombre completo</p>
                  <p className="text-base font-medium text-foreground">{selectedPreregistro.nombre}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-base font-medium text-foreground">{selectedPreregistro.email}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="text-base font-medium text-foreground">{selectedPreregistro.telefono}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="text-base font-medium text-foreground">{selectedPreregistro.estado}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Ciudad</p>
                    <p className="text-base font-medium text-foreground">{selectedPreregistro.ciudad}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Estatus</p>
                  <div className="mt-1"><StatusIcon status={selectedPreregistro.estatus} /></div>
                </div>
                {selectedPreregistro.estatus === "Pendiente" && (
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="lg" className="text-base" onClick={() => setShowDetalleDialog(false)}>
                      Cerrar
                    </Button>
                    <Button size="lg" className="text-base" onClick={() => setShowDetalleDialog(false)}>
                      Aprobar y Crear Beneficiario
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Public Form Preview Dialog */}
      <Dialog open={showFormularioPublico} onOpenChange={setShowFormularioPublico}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Formulario de Preregistro Publico</DialogTitle>
            <DialogDescription>Vista previa del formulario que ven los solicitantes</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border-2 border-dashed border-border p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-primary">
                <span className="text-2xl font-bold text-primary-foreground">EB</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">Asociacion de Espina Bifida</h2>
              <p className="text-muted-foreground">Formulario de Preregistro</p>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-base">Nombre completo</Label>
                  <Input placeholder="Su nombre completo" className="h-12 text-base" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-base">Telefono</Label>
                  <Input placeholder="Su telefono" className="h-12 text-base" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base">Correo electronico</Label>
                <Input type="email" placeholder="su.correo@email.com" className="h-12 text-base" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-base">Estado</Label>
                  <Select>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdmx">CDMX</SelectItem>
                      <SelectItem value="jalisco">Jalisco</SelectItem>
                      <SelectItem value="nuevo-leon">Nuevo Leon</SelectItem>
                      <SelectItem value="puebla">Puebla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-base">Ciudad</Label>
                  <Input placeholder="Su ciudad" className="h-12 text-base" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base">Motivo de solicitud</Label>
                <Input placeholder="Describa brevemente el motivo" className="h-12 text-base" />
              </div>
              <Button size="lg" className="mt-2 w-full text-base">
                Enviar Solicitud de Preregistro
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Su solicitud sera revisada por nuestro equipo. Le contactaremos por correo electronico.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
