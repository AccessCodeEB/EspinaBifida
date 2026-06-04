"use client"

import React, { useState, useEffect } from "react"
import {
  Edit, ZoomIn, X,
  User, MapPin, Phone, HeartPulse, Stethoscope, ClipboardList,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Beneficiario } from "@/services/beneficiarios"
import { cn } from "@/lib/utils"
import { resolvePublicUploadUrl } from "@/lib/media-url"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEstatusBadge(estatus: string) {
  switch (estatus) {
    case "Activo":
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Activo
        </span>
      )
    case "Inactivo":
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-semibold tracking-wide">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-amber-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
          </span>
          Inactivo
        </span>
      )
    case "Baja":
      return (
        <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-semibold tracking-wide">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-rose-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
          </span>
          Baja
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs font-semibold tracking-wide">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-muted-foreground/40 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-muted-foreground/40" />
          </span>
          Sin membresía
        </span>
      )
  }
}

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

function formatGeneroDetalle(g?: string | null) {
  if (g == null || g === "") return undefined
  if (g === "M") return "Masculino"
  if (g === "F") return "Femenino"
  if (g === "Masculino" || g === "Femenino") return g
  return g
}

function DetailField({
  label, value, badgeVariant,
}: {
  label: string
  value?: string | boolean | null | React.ReactNode
  badgeVariant?: "curp" | "curpPlain" | "blood" | "valve" | "membresia" | "credential"
}) {
  if (value === undefined || value === null || value === "") return null
  let display = typeof value === "boolean" ? (value ? "Sí" : "No") : value

  if (badgeVariant === "curp")
    display = <span className="inline-block whitespace-nowrap text-[13px] font-medium bg-muted text-foreground px-2 py-0.5 rounded-md">{display}</span>
  else if (badgeVariant === "curpPlain")
    display = <span className="block w-full max-w-full break-all text-[15px] font-medium text-foreground leading-snug">{display}</span>
  else if (badgeVariant === "blood")
    display = <span className="text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 rounded-md">{display}</span>
  else if (badgeVariant === "valve")
    display = <span className={`text-xs px-2.5 py-0.5 rounded-md ${value ? "bg-primary/10 text-primary font-semibold" : "bg-muted/80 text-muted-foreground font-medium"}`}>{display}</span>
  else if (badgeVariant === "credential")
    display = <span className="font-mono text-xs font-bold bg-amber-100/50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">{display}</span>
  else if (badgeVariant === "membresia" && typeof value === "string")
    display = getEstatusBadge(value)

  return (
    <div className="space-y-1.5 flex min-w-0 flex-col items-start">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="w-full wrap-break-word text-[15px] font-medium text-foreground leading-snug">{display}</div>
    </div>
  )
}

function DetailGroup({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const hasContent = React.Children.toArray(children).some((c) => React.isValidElement(c))
  if (!hasContent) return null
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 shadow-sm transition-all hover:bg-muted/30">
      <div className="flex items-center gap-2.5 mb-5 border-b border-border/50 pb-3">
        <div className="p-1.5 bg-background border border-border/50 rounded-lg text-primary shadow-sm">
          <Icon className="size-4" />
        </div>
        <h4 className="text-[13px] font-bold text-foreground uppercase tracking-widest">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">{children}</div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BeneficiarioDetailPanelProps {
  selectedBeneficiario: Beneficiario | null
  showExpedienteDialog: boolean
  setShowExpedienteDialog: (open: boolean) => void
  onEdit: (b: Beneficiario) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BeneficiarioDetailPanel({
  selectedBeneficiario,
  showExpedienteDialog,
  setShowExpedienteDialog,
  onEdit,
}: BeneficiarioDetailPanelProps) {
  const [fotoPerfilZoomOpen, setFotoPerfilZoomOpen] = useState(false)

  const fotoZoomUrl = selectedBeneficiario
    ? resolvePublicUploadUrl(selectedBeneficiario.fotoPerfilUrl ?? undefined)
    : undefined

  useEffect(() => {
    if (!showExpedienteDialog) setFotoPerfilZoomOpen(false)
  }, [showExpedienteDialog])

  return (
    <>
      {/* ── Dialog: Expediente (Detalles) ────────────────────────────────── */}
      <Dialog open={showExpedienteDialog} onOpenChange={setShowExpedienteDialog}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-w-4xl w-[calc(100vw-2rem)] max-h-[min(90vh,900px)] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl sm:rounded-3xl"
        >
          {selectedBeneficiario && (() => {
            const fotoUrl = resolvePublicUploadUrl(selectedBeneficiario.fotoPerfilUrl ?? undefined)
            return (
              <>
                {/* Encabezado del Expediente */}
                <div className="shrink-0 bg-background border-b border-border/40 px-6 py-6 sm:px-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">

                      {/* FOTO DE PERFIL CON HOVER Y ZOOM EN DETALLES */}
                      {fotoUrl ? (
                        <button
                          type="button"
                          onClick={() => setFotoPerfilZoomOpen(true)}
                          className={cn(
                            "group relative flex size-16 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-full text-xl font-bold shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                            getPhotoRingClasses(selectedBeneficiario.estatus)
                          )}
                          aria-label="Ampliar foto de perfil"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fotoUrl}
                            alt="Perfil del beneficiario"
                            className="size-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <ZoomIn className="absolute size-6 text-white opacity-0 drop-shadow-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" strokeWidth={2} />
                        </button>
                      ) : (
                        <div
                          className={cn(
                            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold shadow-sm",
                            getPhotoRingClasses(selectedBeneficiario.estatus)
                          )}
                        >
                          {`${selectedBeneficiario.nombres?.[0] ?? ""}${selectedBeneficiario.apellidoPaterno?.[0] ?? ""}`}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-2xl font-bold text-foreground">
                          {selectedBeneficiario.nombres} {selectedBeneficiario.apellidoPaterno} {selectedBeneficiario.apellidoMaterno}
                        </DialogTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-primary/80">{selectedBeneficiario.folio}</span>
                          <span>•</span>
                          {getEstatusBadge(selectedBeneficiario.estatus)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5 rounded-lg shadow-sm"
                      onClick={() => {
                        const b = selectedBeneficiario
                        setShowExpedienteDialog(false)
                        onEdit(b)
                      }}
                    >
                      <Edit className="size-3.5" />
                      Editar
                    </Button>
                  </div>
                </div>

                {/* Contenido del Expediente */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-muted/10 px-6 py-6 sm:px-8">
                  <div className="space-y-6 pb-2">
                    <DetailGroup title="Información Personal" icon={User}>
                      <DetailField label="Nombres" value={selectedBeneficiario.nombres} />
                      <DetailField label="Apellido Paterno" value={selectedBeneficiario.apellidoPaterno} />
                      <DetailField label="Apellido Materno" value={selectedBeneficiario.apellidoMaterno} />
                      <DetailField label="Fecha de Nacimiento" value={selectedBeneficiario.fechaNacimiento} />
                      <DetailField label="Género" value={formatGeneroDetalle(selectedBeneficiario.genero)} />
                      <DetailField label="Tipo de Sangre" value={selectedBeneficiario.tipoSangre} badgeVariant="blood" />
                      <DetailField label="Nombre del Padre / Madre" value={selectedBeneficiario.nombrePadreMadre} />
                      <div className="min-w-0 lg:col-span-2">
                        <DetailField label="CURP" value={selectedBeneficiario.curp} badgeVariant="curpPlain" />
                      </div>
                    </DetailGroup>

                    <DetailGroup title="Dirección" icon={MapPin}>
                      <DetailField label="Calle y Número" value={selectedBeneficiario.calle} />
                      <DetailField label="Colonia" value={selectedBeneficiario.colonia} />
                      <DetailField label="CP" value={selectedBeneficiario.cp} />
                      <DetailField label="Ciudad" value={selectedBeneficiario.ciudad} />
                      <DetailField label="Municipio" value={selectedBeneficiario.municipio} />
                      <DetailField label="Estado" value={selectedBeneficiario.estado} />
                    </DetailGroup>

                    <DetailGroup title="Contacto" icon={Phone}>
                      <DetailField label="Teléfono Casa" value={selectedBeneficiario.telefonoCasa} />
                      <DetailField label="Teléfono Celular" value={selectedBeneficiario.telefonoCelular} />
                      <DetailField label="Correo Electrónico" value={selectedBeneficiario.correoElectronico} />
                    </DetailGroup>

                    <DetailGroup title="Contacto de Emergencia" icon={HeartPulse}>
                      <DetailField label="Nombre" value={selectedBeneficiario.contactoEmergencia} />
                      <DetailField label="Teléfono" value={selectedBeneficiario.telefonoEmergencia} />
                    </DetailGroup>

                    <DetailGroup title="Médico / Diagnóstico" icon={Stethoscope}>
                      <DetailField label="Tipo de Espina Bífida" value={selectedBeneficiario.tipo} />
                      <DetailField label="¿Usa válvula?" value={selectedBeneficiario.usaValvula} badgeVariant="valve" />
                      <DetailField label="Hospital de Nacimiento" value={selectedBeneficiario.hospitalNacimiento} />
                      <DetailField label="Notas" value={selectedBeneficiario.notas} />
                    </DetailGroup>

                    <DetailGroup title="Administrativo" icon={ClipboardList}>
                      <DetailField label="Fecha de Alta" value={selectedBeneficiario.fechaAlta} />
                      <DetailField label="No. Credencial" value={selectedBeneficiario.numeroCredencial} badgeVariant="credential" />
                      <DetailField label="Estado de membresía" value={selectedBeneficiario.estatus} badgeVariant="membresia" />
                      <DetailField label="Credencial (vigencia)" value={selectedBeneficiario.membresiaEstatus} />
                    </DetailGroup>
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/40 bg-background px-6 py-4 sm:px-8 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg shadow-sm"
                    onClick={() => setShowExpedienteDialog(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Vista ampliada de foto de perfil (expediente) */}
      <Dialog
        open={fotoPerfilZoomOpen && Boolean(fotoZoomUrl)}
        onOpenChange={(open) => {
          if (!open) setFotoPerfilZoomOpen(false)
        }}
      >
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          overlayClassName="z-[190] bg-black/80 backdrop-blur-sm"
          className={cn(
            "z-200 max-h-screen w-auto max-w-none gap-0 border-none bg-transparent p-0 shadow-none",
            "translate-x-[-50%] translate-y-[-50%] outline-none overflow-visible sm:max-w-none",
          )}
        >
          <DialogTitle className="sr-only">Foto de perfil ampliada</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="fixed right-4 top-4 z-210 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setFotoPerfilZoomOpen(false)}
            aria-label="Cerrar vista ampliada"
          >
            <X className="size-6" />
          </Button>
          {fotoZoomUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoZoomUrl}
              alt="Foto de perfil"
              className="mx-auto aspect-square max-h-[min(85vh,800px)] w-auto max-w-[min(92vw,800px)] object-cover rounded-full shadow-2xl"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
