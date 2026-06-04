"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { Search, Plus, Eye, CreditCard, MapPin, CheckCircle, AlertTriangle, XCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Beneficiario } from "@/services/beneficiarios"
import { cn } from "@/lib/utils"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { calcularCompletitudExpediente, UMBRAL_EXPEDIENTE_COMPLETO_PCT } from "@/lib/beneficiario-completitud"

function getPhotoRingClasses(estatus?: string) {
  switch (estatus) {
    case "Activo":
      return "bg-success/10 text-success ring-2 ring-offset-2 ring-offset-background ring-success"
    case "Inactivo":
      return "bg-warning/10 text-warning ring-2 ring-offset-2 ring-offset-background ring-warning"
    case "Baja":
      return "bg-destructive/10 text-destructive ring-2 ring-offset-2 ring-offset-background ring-destructive"
    default:
      return "bg-muted text-muted-foreground ring-2 ring-offset-2 ring-offset-background ring-border"
  }
}

interface Conteos {
  Todos: number
  Activo: number
  Inactivo: number
  Baja: number
}

interface BeneficiariosTableProps {
  filtered: Beneficiario[]
  conteos: Conteos
  searchTerm: string
  setSearchTerm: (v: string) => void
  filtroEstatus: "Todos" | "Activo" | "Inactivo" | "Baja"
  setFiltroEstatus: (v: "Todos" | "Activo" | "Inactivo" | "Baja") => void
  onNuevaAlta: () => void
  onVerDetalles: (b: Beneficiario) => void
  onVerCredencial: (b: Beneficiario) => void
}

export function BeneficiariosTable({
  filtered,
  conteos,
  searchTerm,
  setSearchTerm,
  filtroEstatus,
  setFiltroEstatus,
  onNuevaAlta,
  onVerDetalles,
  onVerCredencial,
}: BeneficiariosTableProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Beneficiarios</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Gestión y consulta de beneficiarios registrados en el sistema.</p>
        </div>
      </div>

      {/* ── Toolbar administrativa ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Izquierda: buscador + filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar folio, nombre, ciudad o estado..."
              className="pl-9 h-9 w-full sm:w-80 border-border/80 bg-muted/40 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-background focus-visible:border-primary/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Separador vertical */}
          <div className="hidden sm:block h-9 w-px bg-border/60" />

          {/* Filtros de estatus — control segmentado */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/50 p-1.5">
            {(["Todos", "Activo", "Inactivo", "Baja"] as const).map((opcion) => {
              const activo = filtroEstatus === opcion
              const estilos = {
                Todos: activo
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                Activo: activo
                  ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                  : "text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40",
                Inactivo: activo
                  ? "bg-amber-500 text-white shadow-sm dark:bg-amber-500"
                  : "text-muted-foreground hover:text-amber-700 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950/40",
                Baja: activo
                  ? "bg-rose-600 text-white shadow-sm dark:bg-rose-500"
                  : "text-muted-foreground hover:text-rose-700 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40",
              }
              return (
                <button
                  key={opcion}
                  onClick={() => setFiltroEstatus(opcion)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                    estilos[opcion]
                  )}
                >
                  {opcion === "Activo" && <CheckCircle className="size-3 shrink-0" />}
                  {opcion === "Inactivo" && <AlertTriangle className="size-3 shrink-0" />}
                  {opcion === "Baja" && <XCircle className="size-3 shrink-0" />}
                  <span>{opcion}</span>
                  <span className={cn(
                    "ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    activo ? "bg-white/25 text-inherit" : "bg-muted-foreground/10 text-muted-foreground"
                  )}>
                    {conteos[opcion]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Derecha: botón nueva alta */}
        <Button
          className="gap-2 shrink-0 h-9 px-4 text-sm font-semibold shadow-sm"
          style={{ backgroundColor: "#0f4c81" }}
          onClick={onNuevaAlta}
        >
          <Plus className="size-4" />
          Nuevo Beneficiario
        </Button>
      </div>

      {/* ── Grid de tarjetas ── */}
      <div className="grid justify-center gap-2 sm:gap-2.5 grid-cols-[repeat(auto-fill,minmax(min(100%,264px),264px))]">
        {filtered.map((b) => {
          const initials = `${b.nombres?.[0] ?? ""}${b.apellidoPaterno?.[0] ?? ""}`
          const nombre = `${b.nombres ?? ""} ${b.apellidoPaterno ?? ""} ${b.apellidoMaterno ?? ""}`.trim()
          const cardPhoto = resolvePublicUploadUrl(b.fotoPerfilUrl ?? undefined)
          const completitud = calcularCompletitudExpediente(b)
          const alertaIncompleto = !completitud.cumpleUmbral
          return (
            <Card key={b.folio} className="relative flex w-full min-w-0 flex-col items-center text-center rounded-xl border-border/40 bg-muted/20 shadow-xs p-6">
              {alertaIncompleto ? (
                <TooltipPrimitive.Root>
                  <TooltipPrimitive.Trigger asChild>
                    <button
                      type="button"
                      className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border-0 bg-amber-500/15 text-amber-700 shadow-none outline-none transition-colors hover:bg-amber-500/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-amber-500/20 dark:text-amber-300"
                      aria-label="Expediente incompleto"
                    >
                      <AlertCircle className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    </button>
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                      side="left"
                      sideOffset={6}
                      className={cn(
                        "z-50 max-w-[240px] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md",
                        "animate-in fade-in-0 zoom-in-95"
                      )}
                    >
                      <p className="font-semibold text-foreground">Falta información por completar</p>
                      <p className="mt-1.5 leading-snug text-muted-foreground">
                        Expediente al <span className="font-bold text-foreground">{completitud.porcentaje}%</span>{" "}
                        ({completitud.llenos} de {completitud.total} campos). Se requiere al menos{" "}
                        {UMBRAL_EXPEDIENTE_COMPLETO_PCT}% para considerarlo completo.
                      </p>
                      <TooltipPrimitive.Arrow className="fill-popover" />
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </TooltipPrimitive.Root>
              ) : null}
              <div className={cn("mb-3 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold shadow-sm", getPhotoRingClasses(b.estatus))}>
                {cardPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cardPhoto}
                    alt=""
                    className="size-full object-contain object-center"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.style.display = "none" }}
                  />
                ) : (
                  initials
                )}
              </div>
              <p className="text-sm font-semibold text-primary/80 leading-none">{b.folio}</p>
              <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-1 mt-0.5">{nombre}</h3>
              <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="text-xs truncate">{b.ciudad}, {b.estado}</span>
              </div>
              <div className="mt-5 flex w-full items-center justify-center gap-2">
                <Button
                  variant="outline" size="sm"
                  className="h-8 shrink-0 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-none rounded-lg gap-1"
                  onClick={() => onVerDetalles(b)}
                >
                  <Eye className="size-3.5 shrink-0" />Detalles
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="h-8 shrink-0 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-none rounded-lg gap-1"
                  onClick={() => onVerCredencial(b)}
                >
                  <CreditCard className="size-3.5 shrink-0" />Credencial
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">{filtered.length} registros encontrados</p>
    </>
  )
}
