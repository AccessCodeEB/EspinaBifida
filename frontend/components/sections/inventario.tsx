"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Minus, AlertTriangle, Package } from "lucide-react"
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
import { getInventario, type ArticuloInventario } from "@/services/inventario"

export function InventarioSection() {
  const [inventario, setInventario]   = useState<ArticuloInventario[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [searchTerm, setSearchTerm]   = useState("")
  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false)
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada")
  const [selectedItem, setSelectedItem]     = useState<ArticuloInventario | null>(null)

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
    item.clave.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const bajosStock = inventario.filter((item) => item.cantidad < item.minimo).length

  function openMovimiento(tipo: "entrada" | "salida", item: ArticuloInventario | null = null) {
    setTipoMovimiento(tipo)
    setSelectedItem(item)
    setShowMovimientoDialog(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control de artículos y materiales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => openMovimiento("entrada")}>
            <Plus className="size-4" />Entrada
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => openMovimiento("salida")}>
            <Minus className="size-4" />Salida
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
              <CardDescription>{filtered.length} artículos</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por clave o descripción..."
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
                <TableHead className="font-semibold">Clave</TableHead>
                <TableHead className="font-semibold">Descripción</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Unidad</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Cuota</TableHead>
                <TableHead className="font-semibold">Cantidad</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={`${item.clave}-${idx}`} className={item.cantidad < item.minimo ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono font-semibold text-primary">{item.clave}</TableCell>
                  <TableCell className="font-medium">{item.descripcion}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{item.unidad}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{item.cuota}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${item.cantidad < item.minimo ? "text-destructive" : "text-foreground"}`}>
                        {item.cantidad}
                      </span>
                      {item.cantidad < item.minimo && (
                        <Badge className="bg-destructive text-destructive-foreground gap-1 text-xs">
                          <AlertTriangle className="size-3" />Bajo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Registrar entrada" onClick={() => openMovimiento("entrada", item)}>
                        <Plus className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Registrar salida" onClick={() => openMovimiento("salida", item)}>
                        <Minus className="size-4" />
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
              Registrar {tipoMovimiento === "entrada" ? "Entrada" : "Salida"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem ? selectedItem.descripcion : "Seleccione el artículo y la cantidad."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!selectedItem && (
              <div className="flex flex-col gap-2">
                <Label>Artículo</Label>
                <Select>
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
              <Input type="number" min="1" defaultValue="1" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Motivo</Label>
              <Input placeholder="Descripción del movimiento" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowMovimientoDialog(false)}>Cancelar</Button>
              <Button type="button" onClick={() => setShowMovimientoDialog(false)}>
                Confirmar {tipoMovimiento === "entrada" ? "Entrada" : "Salida"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
