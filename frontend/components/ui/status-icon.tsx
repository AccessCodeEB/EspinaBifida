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
  { icon: React.ElementType; bg: string; label: string }
> = {
  Activa:     { icon: CheckCircle,   bg: "bg-success",     label: "Activa" },
  Vencida:    { icon: XCircle,       bg: "bg-destructive", label: "Vencida" },
  "Por vencer": { icon: AlertTriangle, bg: "bg-warning",   label: "Por vencer" },
  "Sin membresia": { icon: MinusCircle, bg: "bg-muted-foreground", label: "Sin membresia" },
  Activo:     { icon: CheckCircle,   bg: "bg-success",     label: "Activo" },
  Inactivo:   { icon: MinusCircle,   bg: "bg-muted-foreground", label: "Inactivo" },
  Baja:       { icon: XCircle,       bg: "bg-destructive", label: "Baja" },
  Confirmada: { icon: CheckCircle,   bg: "bg-success",     label: "Confirmada" },
  Pendiente:  { icon: Clock,         bg: "bg-warning",     label: "Pendiente" },
  Completada: { icon: CheckCircle,   bg: "bg-primary",     label: "Completada" },
  Cancelada:  { icon: XCircle,       bg: "bg-destructive", label: "Cancelada" },
  Aprobado:   { icon: CheckCircle,   bg: "bg-success",     label: "Aprobado" },
}

interface StatusIconProps {
  status: string
}

export function StatusIcon({ status }: StatusIconProps) {
  const config = statusConfig[status as StatusType]

  if (!config) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MinusCircle className="size-5 text-white" />
        <span className="sr-only">{status}</span>
      </span>
    )
  }

  const Icon = config.icon

  return (
    <span
      title={config.label}
      className={`inline-flex size-8 items-center justify-center rounded-full ${config.bg} text-white`}
    >
      <Icon className="size-5 text-white" />
      <span className="sr-only">{config.label}</span>
    </span>
  )
}
