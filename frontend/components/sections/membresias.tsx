"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, AlertTriangle, CheckCircle, Clock,
  CreditCard, Banknote, Building2, Timer,
  RefreshCw,
} from "lucide-react"
import { StatusIcon } from "@/components/ui/status-icon"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  getPagosRecientes, registrarPago, syncEstados,
  MONTO_PREDETERMINADO, type PagoReciente,
} from "@/services/membresias"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMembresiaEstatus(b: Beneficiario): "Activa" | "Inactiva" | "Cancelada" {
  if (b.estatus === "Activo") return "Activa"
  if (b.estatus === "Inactivo") return "Inactiva"
  return "Cancelada"
}

function diasRestantesLabel(dias: number | null | undefined): {
  text: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  if (dias == null) return { text: "Sin membresía", variant: "outline" }
  if (dias > 30)   return { text: `${dias} días`, variant: "default" }
  if (dias >= 0)   return { text: `${dias} días`, variant: "secondary" }
  if (dias >= -30) return { text: `Vencida hace ${Math.abs(dias)} días`, variant: "destructive" }
  return { text: `Vencida hace ${Math.abs(dias)} días`, variant: "destructive" }
}

function sortByDiasRestantes(list: Beneficiario[]): Beneficiario[] {
  return [...list].sort((a, b) => {
    const da = a.diasRestantes ?? Infinity
    const db = b.diasRestantes ?? Infinity
    return da - db
  })
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

function formatMonto(v: number | null | undefined): string {
  if (v == null) return "—"
  return `$${Number(v).toFixed(2)}`
}

function labelMetodo(m: string | null | undefined): string {
  if (m === "efectivo")      return "Efectivo"
  if (m === "transferencia") return "Transferencia"
  if (m === "tarjeta")       return "Tarjeta"
  return "—"
}

// ─── subcomponent: dialog de pago ────────────────────────────────────────────

interface PagoDialogProps {
  open: boolean
  beneficiario: Beneficiario | null
  onClose: () => void
  onSuccess: () => void
}

function PagoDialog({ open, beneficiario, onClose, onSuccess }: PagoDialogProps) {
  const [meses, setMeses]           = useState(1)
  const [metodo, setMetodo]         = useState<"efectivo" | "transferencia" | "tarjeta" | "">("")
  const [referencia, setReferencia] = useState("")
  const [observaciones, setObs]     = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const montoTotal = meses * MONTO_PREDETERMINADO

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setMeses(1)
      setMetodo("")
      setReferencia("")
      setObs("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!beneficiario) return
    if (!metodo) { setError("Selecciona un método de pago."); return }

    setLoading(true)
    setError(null)
    try {
      await registrarPago({
        curp:        beneficiario.curp ?? beneficiario.folio,
        meses,
        monto:       montoTotal,
        metodo_pago: metodo,
        referencia:  referencia.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago.")
    } finally {
      setLoading(false)
    }
  }

  const nombre = beneficiario
    ? `${beneficiario.nombres} ${beneficiario.apellidoPaterno}`
    : ""

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Membresía para{" "}
            <span className="font-semibold text-foreground">{nombre}</span>{" "}
            ({beneficiario?.curp ?? beneficiario?.folio}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Selector de meses + total calculado */}
          <div className="flex flex-col gap-2">
            <Label>Meses a pagar</Label>
            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMeses((m) => Math.max(1, m - 1))}
                  disabled={meses <= 1}
                  className="flex size-10 items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  −
                </button>
                <span className="min-w-[4rem] px-3 text-center text-base font-semibold tabular-nums">
                  {meses} {meses === 1 ? "mes" : "meses"}
                </span>
                <button
                  type="button"
                  onClick={() => setMeses((m) => Math.min(12, m + 1))}
                  disabled={meses >= 12}
                  className="flex size-10 items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Total calculado */}
              <div className="flex flex-1 flex-col rounded-lg border border-border bg-muted/40 px-4 py-2">
                <span className="text-xs text-muted-foreground">Total a cobrar</span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  ${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ${MONTO_PREDETERMINADO}/mes × {meses}
                </span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="flex flex-col gap-2">
            <Label>Método de Pago</Label>
            <Select value={metodo} onValueChange={(v) => { setMetodo(v as typeof metodo); setReferencia("") }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">
                  <span className="flex items-center gap-2"><Banknote className="size-4" />Efectivo</span>
                </SelectItem>
                <SelectItem value="transferencia">
                  <span className="flex items-center gap-2"><Building2 className="size-4" />Transferencia bancaria</span>
                </SelectItem>
                <SelectItem value="tarjeta">
                  <span className="flex items-center gap-2"><CreditCard className="size-4" />Tarjeta</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo condicional: referencia bancaria */}
          {metodo === "transferencia" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="referencia">Referencia bancaria</Label>
              <Input
                id="referencia"
                placeholder="Número de referencia o folio"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
          )}

          {/* Campo condicional: últimos 4 dígitos tarjeta */}
          {metodo === "tarjeta" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="referencia">Últimos 4 dígitos de tarjeta</Label>
              <Input
                id="referencia"
                placeholder="0000"
                maxLength={4}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              placeholder="Opcional"
              value={observaciones}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={loading}>
              {loading ? "Registrando..." : "Confirmar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function MembresiasSection() {
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<Beneficiario[]>([])
  const [pagos, setPagos]                           = useState<PagoReciente[]>([])
  const [loading, setLoading]                       = useState(true)
  const [error, setError]                           = useState<string | null>(null)
  const [searchTerm, setSearchTerm]                 = useState("")
  const [showPagoDialog, setShowPagoDialog]         = useState(false)
  const [selectedBenef, setSelectedBenef]           = useState<Beneficiario | null>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Sincronizar estados antes de cargar (best-effort)
      await syncEstados().catch(() => {})
      const [benef, pagosData] = await Promise.all([
        getBeneficiarios(),
        getPagosRecientes(20),
      ])
      setTodosBeneficiarios(benef)
      setPagos(pagosData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar membresías")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground text-sm">Cargando membresías...</p>
    </div>
  )
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )

  const beneficiarios = todosBeneficiarios.filter((b) => b.estatus !== "Baja")

  const filtered = beneficiarios.filter((b) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`.toLowerCase()
    const folio  = (b.curp ?? b.folio ?? "").toLowerCase()
    const term   = searchTerm.toLowerCase()
    return nombre.includes(term) || folio.includes(term)
  })

  const ordenados = sortByDiasRestantes(filtered)

  const conteos   = conteosEstatusBeneficiarios(todosBeneficiarios)
  const activas   = conteos.Activo
  const inactivas = conteos.Inactivo

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Membresías</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pago mensual por beneficiario. La tabla muestra primero a quienes están más cerca de vencer.
        </p>
      </div>

      {/* Chips de conteo */}
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

      {/* Tabla de control de membresías */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Control de Membresías</CardTitle>
              <CardDescription className="mt-1">
                Ordenado por proximidad de vencimiento. Monto mensual: ${MONTO_PREDETERMINADO}.00
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={cargarDatos} className="gap-2">
                <RefreshCw className="size-4" />
                Actualizar
              </Button>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o CURP..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
                <TableHead className="py-4 font-semibold text-center">Membresía</TableHead>
                <TableHead className="py-4 font-semibold text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Timer className="size-4" />Tiempo restante
                  </span>
                </TableHead>
                <TableHead className="py-4 pr-6 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              ) : (
                ordenados.map((b) => {
                  const estatus  = getMembresiaEstatus(b)
                  const nombre   = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`
                  const folio    = b.curp ?? b.folio ?? "—"
                  const { text: diasText, variant } = diasRestantesLabel(b.diasRestantes)
                  return (
                    <TableRow key={folio} className="transition-colors hover:bg-muted/20">
                      <TableCell className="py-4 pl-6 font-semibold text-primary text-xs">{folio}</TableCell>
                      <TableCell className="py-4 font-medium text-foreground">{nombre}</TableCell>
                      <TableCell className="py-4 hidden md:table-cell text-muted-foreground text-sm">{b.ciudad ?? "—"}</TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex justify-center"><StatusIcon status={estatus} /></div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant={variant} className="text-xs font-medium">
                          {diasText}
                        </Badge>
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

      {/* Últimos pagos */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 p-6">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Últimos pagos</CardTitle>
              <CardDescription className="mt-1">Movimientos recientes de pago y renovación de membresía.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-3 pl-6 font-semibold">Fecha pago</TableHead>
                <TableHead className="py-3 font-semibold">Beneficiario</TableHead>
                <TableHead className="py-3 font-semibold hidden sm:table-cell">Período cubierto</TableHead>
                <TableHead className="py-3 font-semibold text-right">Monto</TableHead>
                <TableHead className="py-3 font-semibold hidden md:table-cell">Método</TableHead>
                <TableHead className="py-3 pr-6 font-semibold hidden lg:table-cell">Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                    No hay pagos registrados aún.
                  </TableCell>
                </TableRow>
              ) : (
                pagos.map((p) => (
                  <TableRow key={p.idCredencial} className="transition-colors hover:bg-muted/20">
                    <TableCell className="py-3 pl-6 text-sm text-muted-foreground">
                      {formatFecha(p.ultimoPago ?? p.fechaEmision)}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-foreground text-sm">{p.nombre}</TableCell>
                    <TableCell className="py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {formatFecha(p.fechaInicio)} – {formatFecha(p.vigencia)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-semibold text-sm">
                      {formatMonto(p.monto)}
                    </TableCell>
                    <TableCell className="py-3 hidden md:table-cell text-sm text-muted-foreground">
                      {labelMetodo(p.metodoPago)}
                    </TableCell>
                    <TableCell className="py-3 pr-6 hidden lg:table-cell text-xs text-muted-foreground">
                      {p.referencia ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PagoDialog
        open={showPagoDialog}
        beneficiario={selectedBenef}
        onClose={() => setShowPagoDialog(false)}
        onSuccess={cargarDatos}
      />
    </div>
  )
}
