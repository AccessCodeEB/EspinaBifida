"use client"

import { useState, useEffect } from "react"
import { Search, AlertTriangle, CheckCircle, XCircle, CreditCard } from "lucide-react"
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
import { getMembresias, type Membresia } from "@/services/membresias"

function EstatusBadge({ estatus }: { estatus: string }) {
  switch (estatus) {
    case "Activa":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
          <CheckCircle className="size-3.5" />Activa
        </span>
      )
    case "Vencida":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <XCircle className="size-3.5" />Vencida
        </span>
      )
    case "Por vencer":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          <AlertTriangle className="size-3.5" />Por vencer
        </span>
      )
    default:
      return null
  }
}

export function MembresiasSection() {
  const [membresias, setMembresias]   = useState<Membresia[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [searchTerm, setSearchTerm]   = useState("")
  const [showPagoDialog, setShowPagoDialog]           = useState(false)
  const [selectedMembresia, setSelectedMembresia]     = useState<Membresia | null>(null)

  useEffect(() => {
    getMembresias()
      .then(data => setMembresias(data))
      .catch(err => setError(err?.message ?? "Error al cargar membresías"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground text-sm">Cargando membresías...</p></div>
  if (error)   return <div className="flex h-64 items-center justify-center"><p className="text-destructive text-sm">{error}</p></div>

  const filtered   = membresias.filter((m) =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.folio.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const activas    = membresias.filter((m) => m.estatus === "Activa").length
  const vencidas   = membresias.filter((m) => m.estatus === "Vencida").length
  const porVencer  = membresias.filter((m) => m.estatus === "Por vencer").length

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Membresías</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestión de membresías y registro de pagos.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: "Activas",    count: activas,   estatus: "Activa",     icon: CheckCircle,   color: "bg-success/10 text-success border-success/20" },
          { label: "Por Vencer", count: porVencer, estatus: "Por vencer", icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20" },
          { label: "Vencidas",   count: vencidas,  estatus: "Vencida",    icon: XCircle,       color: "bg-destructive/10 text-destructive border-destructive/20" },
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
              <CardDescription className="mt-1">Vigencia automática de 2 años.</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o nombre..."
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
                <TableHead className="py-4 pl-6 font-semibold">Folio</TableHead>
                <TableHead className="py-4 font-semibold">Nombre</TableHead>
                <TableHead className="py-4 font-semibold hidden md:table-cell">Fecha Inicio</TableHead>
                <TableHead className="py-4 font-semibold hidden lg:table-cell">Vigencia</TableHead>
                <TableHead className="py-4 font-semibold text-center">Estatus</TableHead>
                <TableHead className="py-4 font-semibold text-right hidden sm:table-cell">Por Pagar</TableHead>
                <TableHead className="py-4 pr-6 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.folio} className="transition-colors hover:bg-muted/20">
                  <TableCell className="py-4 pl-6 font-semibold text-primary">{m.folio}</TableCell>
                  <TableCell className="py-4 font-medium text-foreground">{m.nombre}</TableCell>
                  <TableCell className="py-4 hidden md:table-cell text-muted-foreground text-sm">{m.fechaInicio}</TableCell>
                  <TableCell className="py-4 hidden lg:table-cell text-muted-foreground text-sm">{m.vigencia}</TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="flex justify-center"><EstatusBadge estatus={m.estatus} /></div>
                  </TableCell>
                  <TableCell className="py-4 text-right hidden sm:table-cell">
                    <span className={`text-sm font-semibold ${m.porPagar === "$0.00" ? "text-muted-foreground" : "text-destructive"}`}>
                      {m.porPagar}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <Button
                      size="sm"
                      className="gap-2 text-sm"
                      onClick={() => { setSelectedMembresia(m); setShowPagoDialog(true) }}
                    >
                      <CreditCard className="size-4" />Registrar Pago
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
              <span className="font-semibold text-foreground">{selectedMembresia?.nombre}</span>{" "}
              ({selectedMembresia?.folio}).
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
