"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import React, { useState, useEffect, useRef } from "react"
import {
  Search, Plus, Eye, Edit, CreditCard, FileText, MapPin,
  Download, CheckCircle, XCircle, AlertTriangle, User, Users, Loader2,
  Phone, HeartPulse, Stethoscope, ClipboardList, Mail,
  Calendar, Hash, Droplet, Activity, ArrowLeft, Save, Trash2, ZoomIn, X,
  AlertCircle,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { TIPOS_SANGRE_OPCIONES } from "@/lib/beneficiario-alta"
import type { Beneficiario } from "@/services/beneficiarios"
import { cn } from "@/lib/utils"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { ProfilePhotoUpload } from "@/components/profile-photo-upload"
import { BeneficiariosEditDialog } from "@/components/beneficiarios-edit-dialog"
import { calcularCompletitudExpediente, UMBRAL_EXPEDIENTE_COMPLETO_PCT } from "@/lib/beneficiario-completitud"

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function getEstatusBadge(estatus: string) {
  switch (estatus) {
    case "Activo":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success border border-success/30 px-2 py-0.5 text-[10px] font-medium">
          <CheckCircle className="size-3" />Activo
        </span>
      )
    case "Inactivo":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium">
          <AlertTriangle className="size-3" />Inactivo
        </span>
      )
    case "Baja":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-medium">
          <XCircle className="size-3" />Baja
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">
          Sin membresía
        </span>
      )
  }
}

// Helper para los colores del contorno de la foto de perfil
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
    display = <span className="font-mono text-xs font-bold bg-amber-100/50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">{display}</span>
  else if (badgeVariant === "membresia" && typeof value === "string")
    display = getEstatusBadge(value)

  return (
    <div className="space-y-1.5 flex min-w-0 flex-col items-start">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="w-full wrap-break-word text-[15px] font-medium text-foreground leading-snug">{display}</div>
    </div>
  )
}

function formatGeneroDetalle(g?: string | null) {
  if (g == null || g === "") return undefined
  if (g === "M") return "Masculino"
  if (g === "F") return "Femenino"
  if (g === "Masculino" || g === "Femenino") return g
  return g
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

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2.5 mb-5 border-b border-border/40 pb-3">
        <Icon className="size-5 text-primary" />
        <h4 className="text-[14px] font-bold text-foreground uppercase tracking-widest">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function FieldWrap({ error, className, children }: { error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function LabelReq({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="text-destructive" aria-hidden> *</span>
    </Label>
  )
}

function IconInput({ icon: Icon, alignTop, children }: { icon: React.ElementType; alignTop?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className={`absolute left-3 ${alignTop ? "top-3" : "top-1/2 -translate-y-1/2"} size-4 text-muted-foreground pointer-events-none`} />
      {children}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function BeneficiariosSection({
  openEditCurp = null,
  onConsumedOpenEditCurp,
}: {
  openEditCurp?: string | null
  onConsumedOpenEditCurp?: () => void
} = {}) {
  const [overlayAction, setOverlayAction] = useState<"baja" | "eliminar" | null>(null)
  const [credencialBeneficiario, setCredencialBeneficiario] = useState<Beneficiario | null>(null)
  const [removeFotoConfirmOpen, setRemoveFotoConfirmOpen] = useState(false)
  const [fotoPerfilZoomOpen, setFotoPerfilZoomOpen] = useState(false)

  const {
    beneficiarios, loading, error,
    filtered, conteos,
    searchTerm, setSearchTerm,
    filtroEstatus, setFiltroEstatus,
    showAltaDialog, setShowAltaDialog,
    showExpedienteDialog, setShowExpedienteDialog,
    showEditDialog, setShowEditDialog,
    selectedBeneficiario, setSelectedBeneficiario,
    editForm, altaForm, altaErrors, setAltaErrors,
    isSaving, saveError, setSaveError, editErrors,
    openEdit, handleEditChange, handleSaveEdit, handleEditDelete,
    handleAltaChange, handleAltaSubmit, handleDarDeBaja,
    fotoUploading, handleUploadFotoBeneficiario, handleDeleteFotoBeneficiario,
    altaFotoPreview, handleAltaFotoSelected,
    editFotoPreview, handleEditFotoSelected,
  } = useBeneficiarios()

  const openEditRef = useRef(openEdit)
  openEditRef.current = openEdit

  useEffect(() => {
    const raw = openEditCurp?.trim()
    if (!raw || loading || error) return
    const c = raw.toUpperCase()
    const b = beneficiarios.find(
      (x) => String(x.folio ?? x.curp ?? "").trim().toUpperCase() === c
    )
    if (b) {
      openEditRef.current(b)
      onConsumedOpenEditCurp?.()
    }
  }, [openEditCurp, beneficiarios, loading, error, onConsumedOpenEditCurp])

  const fotoZoomUrl = selectedBeneficiario
    ? resolvePublicUploadUrl(selectedBeneficiario.fotoPerfilUrl ?? undefined)
    : undefined

  useEffect(() => {
    if (!showExpedienteDialog) setFotoPerfilZoomOpen(false)
  }, [showExpedienteDialog])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground text-sm">Cargando…</p>
    </div>
  )

  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
    <div className="flex flex-col gap-8 pb-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Beneficiarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestión de beneficiarios registrados.</p>
      </div>

      {/* ── Buscador, filtros y nueva alta ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, nombre o ciudad..."
            className="pl-9 h-10 bg-muted/30 focus-visible:bg-background transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1">
          {(["Todos", "Activo", "Inactivo", "Baja"] as const).map((opcion) => {
            const activo = filtroEstatus === opcion
            const colores = {
              Todos: activo ? "bg-[#005bb5] text-white border-[#005bb5]" : "border-border text-muted-foreground hover:border-[#005bb5]/40 hover:text-[#005bb5]",
              Activo: activo ? "bg-success/20 text-success border-success/50 font-semibold" : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
              Inactivo: activo ? "bg-warning/20 text-warning border-warning/50 font-semibold" : "border-border text-muted-foreground hover:border-warning/40 hover:text-warning",
              Baja: activo ? "bg-destructive/15 text-destructive border-destructive/40 font-semibold" : "border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive",
            }
            return (
              <button
                key={opcion}
                onClick={() => setFiltroEstatus(opcion)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-all ${colores[opcion]}`}
              >
                {opcion === "Activo" && <CheckCircle className="size-3" />}
                {opcion === "Inactivo" && <AlertTriangle className="size-3" />}
                {opcion === "Baja" && <XCircle className="size-3" />}
                {opcion}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activo ? "bg-white/20" : "bg-muted"}`}>
                  {conteos[opcion]}
                </span>
              </button>
            )
          })}
        </div>

        <Button className="gap-2 shadow-sm shrink-0" onClick={() => setShowAltaDialog(true)}>
          <Plus className="size-4" />
          Nueva Alta
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
                  onClick={() => { setSelectedBeneficiario(b); setShowExpedienteDialog(true) }}
                >
                  <Eye className="size-3.5 shrink-0" />Detalles
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="h-8 shrink-0 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-none rounded-lg gap-1"
                  onClick={() => setCredencialBeneficiario(b)}
                >
                  <CreditCard className="size-3.5 shrink-0" />Credencial
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">{filtered.length} registros encontrados</p>

      {/* ── Dialog: Expediente (Detalles) ─────────────────────────────────── */}
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
                        openEdit(b)
                      }}
                    >
                      <Edit className="size-3.5" />
                      Editar
                    </Button>
                  </div>
                </div>

                {/* Contenido del Expediente */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-muted/10 px-6 py-6 sm:px-8 scrollbar-hide">
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
          }
          )()}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Credencial digital (vista previa) ─────────────────────── */}
      <Dialog
        open={credencialBeneficiario !== null}
        onOpenChange={(open) => {
          if (!open) setCredencialBeneficiario(null)
        }}
      >
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] gap-0 overflow-hidden border-none p-0 shadow-2xl sm:rounded-2xl">
          {credencialBeneficiario && (() => {
            const credPhoto = resolvePublicUploadUrl(credencialBeneficiario.fotoPerfilUrl ?? undefined)
            return (
              <>
                <div className="border-b border-border/50 bg-primary/5 px-6 py-4">
                  <DialogHeader className="gap-1 text-left">
                    <DialogTitle className="text-lg font-bold">Credencial digital</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Vista previa de la credencial del beneficiario.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="bg-muted/20 px-6 py-6">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-md">
                    <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-primary/6 px-4 py-3">
                      <img
                        src="/logo-espina-bifida.png"
                        alt=""
                        className="h-9 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Beneficiario
                      </span>
                    </div>
                    <div className="flex gap-4 p-4">
                      <div
                        className={cn(
                          "relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl text-lg font-bold shadow-sm",
                          getPhotoRingClasses(credencialBeneficiario.estatus)
                        )}
                      >
                        {credPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={credPhoto}
                            alt=""
                            className="absolute inset-0 size-full object-contain object-center bg-muted/40"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            {(credencialBeneficiario.nombres?.[0] ?? "")}
                            {(credencialBeneficiario.apellidoPaterno?.[0] ?? "")}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-bold leading-tight text-foreground line-clamp-2">
                          {credencialBeneficiario.nombres} {credencialBeneficiario.apellidoPaterno}{" "}
                          {credencialBeneficiario.apellidoMaterno}
                        </p>
                        <p className="text-xs font-semibold text-primary/90">{credencialBeneficiario.folio}</p>
                        {credencialBeneficiario.numeroCredencial && (
                          <p className="font-mono text-[11px] font-bold text-amber-800">
                            No. {credencialBeneficiario.numeroCredencial}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border/40 bg-muted/30 px-4 py-3 text-xs">
                      {credencialBeneficiario.curp && (
                        <div>
                          <p className="font-bold uppercase tracking-wide text-muted-foreground">CURP</p>
                          <p className="mt-0.5 break-all font-medium text-foreground">{credencialBeneficiario.curp}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-muted-foreground">Membresía:</span>
                        {getEstatusBadge(credencialBeneficiario.estatus)}
                      </div>
                      {credencialBeneficiario.tipo && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Tipo: </span>
                          {credencialBeneficiario.tipo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nueva Alta ────────────────────────────────────────────── */}
      <Dialog open={showAltaDialog} onOpenChange={(open) => { if (!isSaving) setShowAltaDialog(open) }}>
        <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(90vh,880px)] flex flex-col overflow-hidden p-0 gap-0 border-none shadow-2xl sm:rounded-2xl">
          <div className="shrink-0 z-10 bg-background border-b border-border/40 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Registrar Beneficiario</DialogTitle>
              <DialogDescription>Ingresa los datos para registrar un nuevo beneficiario en el sistema.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 py-8 bg-muted/10">
            {saveError && (
              <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <XCircle className="size-4 shrink-0" />{saveError}
              </div>
            )}

            <SectionCard title="Información Personal" icon={User}>
              <div className="mb-8 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40 hover:bg-primary/10">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-start">
                  <div className="shrink-0">
                    <ProfilePhotoUpload
                      variant="form"
                      size="md"
                      previewSrc={altaFotoPreview}
                      fotoPerfilUrl={null}
                      fallbackText={`${altaForm.nombres?.[0] ?? "?"}${altaForm.apellidoPaterno?.[0] ?? ""}`}
                      uploading={isSaving}
                      disabled={isSaving}
                      onFileSelected={handleAltaFotoSelected}
                    />
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <h4 className="text-sm font-bold text-foreground">Foto de perfil</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ajusta el encuadre en el paso siguiente. <br className="hidden sm:block" />
                      Formatos: JPEG, PNG o WebP (máx. 2 MB).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={altaErrors?.nombres}>
                  <LabelReq htmlFor="alta-nombres">Nombres</LabelReq>
                  <Input
                    id="alta-nombres"
                    value={altaForm.nombres ?? ""}
                    onChange={(e) => handleAltaChange("nombres", e.target.value)}
                    className={`bg-background ${altaErrors?.nombres ? "border-destructive" : ""}`}
                    placeholder="Ej. Juan Carlos"
                  />
                </FieldWrap>
                <FieldWrap error={altaErrors?.apellidoPaterno}>
                  <LabelReq htmlFor="alta-apellido-paterno">Apellido paterno</LabelReq>
                  <Input
                    id="alta-apellido-paterno"
                    value={altaForm.apellidoPaterno ?? ""}
                    onChange={(e) => handleAltaChange("apellidoPaterno", e.target.value)}
                    className={`bg-background ${altaErrors?.apellidoPaterno ? "border-destructive" : ""}`}
                    placeholder="Ej. García"
                  />
                </FieldWrap>
                <FieldWrap error={altaErrors?.apellidoMaterno}>
                  <LabelReq htmlFor="alta-apellido-materno">Apellido materno</LabelReq>
                  <Input
                    id="alta-apellido-materno"
                    value={altaForm.apellidoMaterno ?? ""}
                    onChange={(e) => handleAltaChange("apellidoMaterno", e.target.value)}
                    className={`bg-background ${altaErrors?.apellidoMaterno ? "border-destructive" : ""}`}
                    placeholder="Ej. López"
                  />
                </FieldWrap>
                <FieldWrap error={altaErrors?.curp}>
                  <LabelReq htmlFor="alta-curp">CURP</LabelReq>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="alta-curp"
                      value={altaForm.curp ?? ""}
                      onChange={(e) => handleAltaChange("curp", e.target.value.toUpperCase())}
                      className={`pl-9 bg-background ${altaErrors?.curp ? "border-destructive" : ""}`}
                      maxLength={18}
                      placeholder="18 caracteres"
                    />
                  </div>
                </FieldWrap>
                <FieldWrap error={altaErrors?.fechaNacimiento}>
                  <LabelReq htmlFor="alta-fecha-nacimiento">Fecha de nacimiento</LabelReq>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="alta-fecha-nacimiento"
                      type="date"
                      value={altaForm.fechaNacimiento ?? ""}
                      onChange={(e) => handleAltaChange("fechaNacimiento", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.fechaNacimiento ? "border-destructive" : ""}`}
                    />
                  </div>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label htmlFor="alta-genero">Género</Label>
                  <Select value={altaForm.genero ?? ""} onValueChange={(v) => handleAltaChange("genero", v)}>
                    <SelectTrigger id="alta-genero" className="bg-background">
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldWrap error={altaErrors?.tipoSangre}>
                  <Label htmlFor="alta-tipo-sangre">Tipo de sangre</Label>
                  <Select
                    value={altaForm.tipoSangre ? altaForm.tipoSangre : "__none__"}
                    onValueChange={(v) => handleAltaChange("tipoSangre", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger
                      id="alta-tipo-sangre"
                      className={cn(
                        "bg-background",
                        altaErrors?.tipoSangre && "border-destructive",
                        !altaForm.tipoSangre && "text-muted-foreground"
                      )}
                    >
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">Sin especificar</SelectItem>
                      {TIPOS_SANGRE_OPCIONES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Dirección" icon={MapPin}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="alta-calle">Calle y número</Label>
                  <Input
                    id="alta-calle"
                    value={altaForm.calle ?? ""}
                    onChange={(e) => handleAltaChange("calle", e.target.value)}
                    className="bg-background"
                    placeholder="Calle, número exterior e interior"
                    autoComplete="street-address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alta-colonia">Colonia</Label>
                  <Input
                    id="alta-colonia"
                    value={altaForm.colonia ?? ""}
                    onChange={(e) => handleAltaChange("colonia", e.target.value)}
                    className="bg-background"
                    placeholder="Colonia o fraccionamiento"
                  />
                </div>
                <FieldWrap error={altaErrors?.cp}>
                  <Label htmlFor="alta-cp">Código postal</Label>
                  <Input
                    id="alta-cp"
                    value={altaForm.cp ?? ""}
                    onChange={(e) => handleAltaChange("cp", e.target.value)}
                    maxLength={8}
                    className={`bg-background ${altaErrors?.cp ? "border-destructive" : ""}`}
                    placeholder="5 dígitos"
                    inputMode="numeric"
                  />
                </FieldWrap>
                <FieldWrap error={altaErrors?.ciudad}>
                  <LabelReq htmlFor="alta-ciudad">Ciudad</LabelReq>
                  <Input
                    id="alta-ciudad"
                    value={altaForm.ciudad ?? ""}
                    onChange={(e) => handleAltaChange("ciudad", e.target.value)}
                    className={`bg-background ${altaErrors?.ciudad ? "border-destructive" : ""}`}
                    placeholder="Ciudad"
                    autoComplete="address-level2"
                  />
                </FieldWrap>
                <FieldWrap error={altaErrors?.estado}>
                  <LabelReq htmlFor="alta-estado">Estado</LabelReq>
                  <Input
                    id="alta-estado"
                    value={altaForm.estado ?? ""}
                    onChange={(e) => handleAltaChange("estado", e.target.value)}
                    className={`bg-background ${altaErrors?.estado ? "border-destructive" : ""}`}
                    placeholder="Estado"
                    autoComplete="address-level1"
                  />
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Contacto" icon={Phone}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={altaErrors?.telefonoCasa}>
                  <Label htmlFor="alta-tel-casa">Teléfono casa</Label>
                  <IconInput icon={Phone}>
                    <Input
                      id="alta-tel-casa"
                      value={altaForm.telefonoCasa ?? ""}
                      onChange={(e) => handleAltaChange("telefonoCasa", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.telefonoCasa ? "border-destructive" : ""}`}
                      placeholder="10 dígitos (opcional)"
                      inputMode="tel"
                      maxLength={16}
                      autoComplete="tel"
                    />
                  </IconInput>
                </FieldWrap>
                <FieldWrap error={altaErrors?.telefonoCelular}>
                  <LabelReq htmlFor="alta-tel-celular">Teléfono celular</LabelReq>
                  <IconInput icon={Phone}>
                    <Input
                      id="alta-tel-celular"
                      value={altaForm.telefonoCelular ?? ""}
                      onChange={(e) => handleAltaChange("telefonoCelular", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.telefonoCelular ? "border-destructive" : ""}`}
                      placeholder="10 dígitos"
                      inputMode="tel"
                      maxLength={16}
                      autoComplete="tel"
                    />
                  </IconInput>
                </FieldWrap>
                <FieldWrap error={altaErrors?.correoElectronico} className="sm:col-span-2">
                  <LabelReq htmlFor="alta-correo">Correo electrónico</LabelReq>
                  <IconInput icon={Mail}>
                    <Input
                      id="alta-correo"
                      type="email"
                      value={altaForm.correoElectronico ?? ""}
                      onChange={(e) => handleAltaChange("correoElectronico", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.correoElectronico ? "border-destructive" : ""}`}
                      placeholder="nombre@correo.com"
                      autoComplete="email"
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Contacto de Emergencia" icon={HeartPulse}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={altaErrors?.contactoEmergencia}>
                  <Label htmlFor="alta-contacto-emergencia">Nombre</Label>
                  <IconInput icon={User}>
                    <Input
                      id="alta-contacto-emergencia"
                      value={altaForm.contactoEmergencia ?? ""}
                      onChange={(e) => handleAltaChange("contactoEmergencia", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.contactoEmergencia ? "border-destructive" : ""}`}
                      placeholder="Nombre completo del contacto"
                    />
                  </IconInput>
                </FieldWrap>
                <FieldWrap error={altaErrors?.telefonoEmergencia}>
                  <Label htmlFor="alta-tel-emergencia">Teléfono</Label>
                  <IconInput icon={Phone}>
                    <Input
                      id="alta-tel-emergencia"
                      value={altaForm.telefonoEmergencia ?? ""}
                      onChange={(e) => handleAltaChange("telefonoEmergencia", e.target.value)}
                      className={`pl-9 bg-background ${altaErrors?.telefonoEmergencia ? "border-destructive" : ""}`}
                      placeholder="10 dígitos (opcional)"
                      inputMode="tel"
                      maxLength={16}
                      autoComplete="tel"
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Médico / Diagnóstico" icon={Stethoscope}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="alta-tipo-eb">Tipo de espina bífida</Label>
                  <Select value={altaForm.tipo ?? ""} onValueChange={(v) => handleAltaChange("tipo", v)}>
                    <SelectTrigger id="alta-tipo-eb" className="bg-background">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mielomeningocele">Mielomeningocele</SelectItem>
                      <SelectItem value="Meningocele">Meningocele</SelectItem>
                      <SelectItem value="Oculta">Oculta</SelectItem>
                      <SelectItem value="Lipomeningocele">Lipomeningocele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldWrap error={altaErrors?.usaValvula}>
                  <LabelReq htmlFor="alta-valvula">¿Usa válvula?</LabelReq>
                  <Select value={altaForm.usaValvula === undefined ? "" : altaForm.usaValvula ? "si" : "no"} onValueChange={(v) => handleAltaChange("usaValvula", v === "si")}>
                    <SelectTrigger id="alta-valvula" className={`bg-background ${altaErrors?.usaValvula ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label htmlFor="alta-hosp-nac">Hospital de nacimiento</Label>
                  <Input
                    id="alta-hosp-nac"
                    value={altaForm.hospitalNacimiento ?? ""}
                    onChange={(e) => handleAltaChange("hospitalNacimiento", e.target.value)}
                    className="bg-background"
                    placeholder="Nombre del hospital"
                  />
                </div>
                <FieldWrap error={altaErrors?.notas} className="sm:col-span-2">
                  <Label htmlFor="alta-notas">Notas</Label>
                  <IconInput icon={FileText}>
                    <Input
                      id="alta-notas"
                      value={altaForm.notas ?? ""}
                      onChange={(e) => handleAltaChange("notas", e.target.value)}
                      placeholder="Observaciones adicionales (opcional)"
                      className={`pl-9 bg-background ${altaErrors?.notas ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>
          </div>
          <div className="shrink-0 bg-background border-t border-border/40 px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAltaDialog(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleAltaSubmit} disabled={isSaving} className="bg-[#005bb5] hover:bg-[#004a94] text-white">
              {isSaving ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BeneficiariosEditDialog
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        isSaving={isSaving}
        overlayAction={overlayAction}
        setOverlayAction={setOverlayAction}
        handleDarDeBaja={handleDarDeBaja}
        handleEditDelete={handleEditDelete}
        editForm={editForm}
        handleEditChange={handleEditChange}
        editErrors={editErrors}
        saveError={saveError}
        setSaveError={setSaveError}
        handleSaveEdit={handleSaveEdit}
        selectedBeneficiario={selectedBeneficiario}
        setSelectedBeneficiario={setSelectedBeneficiario}
        beneficiarios={beneficiarios}
        fotoUploading={fotoUploading}
        editFotoPreview={editFotoPreview}
        handleEditFotoSelected={handleEditFotoSelected}
        handleDeleteFotoBeneficiario={handleDeleteFotoBeneficiario}
        removeFotoConfirmOpen={removeFotoConfirmOpen}
        setRemoveFotoConfirmOpen={setRemoveFotoConfirmOpen}
        setShowExpedienteDialog={setShowExpedienteDialog}
      />

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
            />
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
    </TooltipPrimitive.Provider>
  )
}