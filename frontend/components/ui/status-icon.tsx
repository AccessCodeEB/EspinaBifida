"use client"

import { CheckCircle, XCircle, AlertTriangle, Clock, MinusCircle } from "lucide-react"

type StatusType =
  | "Activa"
  | "Vencida"
  | "Por vencer"
  | "Sin membresia"
  | "Activo"
  | "Inactivo"
  | "Baja"
  | "Confirmada"
  | "Pendiente"
  | "Completada"
  | "Cancelada"
  | "Aprobado"

const statusConfig: Record<
  StatusType,
  { icon: React.ElementType; bg: string; border: string; text: string; label: string }
> = {
  Activa:     { icon: CheckCircle,   bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "Activa" },
  Vencida:    { icon: XCircle,       bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", label: "Vencida" },
  "Por vencer": { icon: AlertTriangle, bg: "bg-warning/10",   border: "border-warning/30", text: "text-warning", label: "Por vencer" },
  "Sin membresia": { icon: MinusCircle, bg: "bg-muted/10", border: "border-muted/30", text: "text-muted-foreground", label: "Sin membresia" },
  Activo:     { icon: CheckCircle,   bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "Activo" },
  Inactivo:   { icon: MinusCircle,   bg: "bg-muted/10", border: "border-muted/30", text: "text-muted-foreground", label: "Inactivo" },
  Baja:       { icon: XCircle,       bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", label: "Baja" },
  Confirmada: { icon: CheckCircle,   bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "Confirmada" },
  Pendiente:  { icon: Clock,         bg: "bg-warning/10",   border: "border-warning/30", text: "text-warning", label: "Pendiente" },
  Completada: { icon: CheckCircle,   bg: "bg-primary/10",   border: "border-primary/30", text: "text-primary", label: "Completada" },
  Cancelada:  { icon: XCircle,       bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", label: "Cancelada" },
  Aprobado:   { icon: CheckCircle,   bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "Aprobado" },
}

interface StatusIconProps {
  status: string
}

export function StatusIcon({ status }: StatusIconProps) {
  const config = statusConfig[status as StatusType]
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted/10 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <MinusCircle className="size-3.5" />{status}
      </span>
    )
  }

  const Icon = config.icon

  return (
    <span
      title={config.label}
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.border} ${config.bg} px-2.5 py-1 text-xs font-medium ${config.text}`}
    >
      <Icon className="size-3.5" />{config.label}
    </span>
  )
}
