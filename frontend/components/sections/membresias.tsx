"use client"

import { useState, useEffect } from "react"
import { Search, AlertTriangle, CheckCircle, XCircle, CreditCard } from "lucide-react"
import { StatusIcon } from "@/components/ui/status-icon"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getBeneficiarios, type Beneficiario } from "@/services/beneficiarios"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"

/** Misma semántica que en Beneficiarios: estatus del expediente. */
function getMembresiaEstatus(b: Beneficiario): "Activa" | "Inactiva" | "Cancelada" {
  if (b.estatus === "Activo") return "Activa"
  if (b.estatus === "Inactivo") return "Inactiva"
  return "Cancelada"
}

// Usamos `StatusIcon` compartido para mantener consistencia visual con Servicios

export function MembresiasSection() {
  /** Lista completa (misma fuente que Beneficiarios) para conteos idénticos a los chips. */
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [searchTerm, setSearchTerm]       = useState("")
  const [showPagoDialog, setShowPagoDialog]       = useState(false)
  const [selectedBenef, setSelectedBenef]         = useState<Beneficiario | null>(null)

  useEffect(() => {
    getBeneficiarios()
      .then((data) => setTodosBeneficiarios(data))
      .catch((err) => setError(err?.message ?? "Error al cargar membresías"))
      .finally(() => setLoading(false))
  }, [])

  const beneficiarios = todosBeneficiarios.filter((b) => b.estatus !== "Baja")

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground text-sm">Cargando membresías...</p></div>
  if (error)   return <div className="flex h-64 items-center justify-center"><p className="text-destructive text-sm">{error}</p></div>

  const filtered  = beneficiarios.filter((b) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.toLowerCase()
    const folio  = (b.curp ?? b.folio ?? "").toLowerCase()
    const term   = searchTerm.toLowerCase()
    return nombre.includes(term) || folio.includes(term)
  })

  const conteos = conteosEstatusBeneficiarios(todosBeneficiarios)
  const activas   = conteos.Activo
  const inactivas = conteos.Inactivo

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Membresías</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los totales coinciden con la sección Beneficiarios (estatus Activo / Inactivo).</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[
          { label: "Activas",   count: activas,   icon: CheckCircle,   color: "bg-success/10 text-success border-success/20" },
          { label: "Inactivas", count: inactivas, icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="border-border/60 shadow-sm rounded-2xl">
            <CardContent className="flex items-center gap-5 p-6">
              <div className={`flex size-14 items-center justify-center rounded-2xl border ${color}`}>
                <Icon className="size-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold text-foreground">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Control de Membresías</CardTitle>
              <CardDescription className="mt-1">Membresía activa = beneficiario con estatus Activo.</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o CURP..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-semibold">CURP / Folio</TableHead>
                <TableHead className="py-4 font-semibold">Nombre</TableHead>
                <TableHead className="py-4 font-semibold hidden md:table-cell">Ciudad</TableHead>
                <TableHead className="py-4 font-semibold hidden lg:table-cell">Estado</TableHead>
                <TableHead className="py-4 font-semibold text-center">Membresía</TableHead>
                <TableHead className="py-4 pr-6 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => {
                  const estatus = getMembresiaEstatus(b)
                  const nombre  = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`
                  const folio   = b.curp ?? b.folio ?? "—"
                  return (
                    <TableRow key={folio} className="transition-colors hover:bg-muted/20">
                      <TableCell className="py-4 pl-6 font-semibold text-primary text-xs">{folio}</TableCell>
                      <TableCell className="py-4 font-medium text-foreground">{nombre}</TableCell>
                      <TableCell className="py-4 hidden md:table-cell text-muted-foreground text-sm">{b.ciudad ?? "—"}</TableCell>
                      <TableCell className="py-4 hidden lg:table-cell text-muted-foreground text-sm">{b.estado ?? "—"}</TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex justify-center"><StatusIcon status={estatus} /></div>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        {estatus !== "Cancelada" && (
                          <Button
                            size="sm"
                            className="gap-2 text-sm"
                            onClick={() => { setSelectedBenef(b); setShowPagoDialog(true) }}
                          >
                            <CreditCard className="size-4" />Registrar Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showPagoDialog} onOpenChange={setShowPagoDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Estás registrando un pago para{" "}
              <span className="font-semibold text-foreground">
                {selectedBenef ? `${selectedBenef.nombres} ${selectedBenef.apellidoPaterno}` : ""}
              </span>{" "}
              ({selectedBenef?.curp ?? selectedBenef?.folio}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label>Monto</Label>
              <Input defaultValue="500.00" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Método de Pago</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Observaciones</Label>
              <Input placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={() => setShowPagoDialog(false)}>Cancelar</Button>
              <Button type="button" onClick={() => setShowPagoDialog(false)}>Confirmar Pago</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
