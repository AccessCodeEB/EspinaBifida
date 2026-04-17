"use client"

import React from "react"
import {
  Search, Plus, Eye, Edit, CreditCard, FileText, MapPin,
  Download, CheckCircle, XCircle, AlertTriangle, User, Users,
  Phone, HeartPulse, Stethoscope, ClipboardList, Mail,
  Calendar, Hash, Droplet,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StatusIcon } from "@/components/ui/status-icon"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import type { Beneficiario } from "@/services/beneficiarios"

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

function DetailField({
  label, value, badgeVariant,
}: {
  label: string
  value?: string | boolean | null | React.ReactNode
  badgeVariant?: "curp" | "blood" | "valve" | "membresia" | "credential"
}) {
  if (value === undefined || value === null || value === "") return null
  let display = typeof value === "boolean" ? (value ? "Sí" : "No") : value

  if (badgeVariant === "curp")
    display = <span className="inline-block whitespace-nowrap text-[13px] font-medium bg-muted text-foreground px-2 py-0.5 rounded-md">{display}</span>
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
      <div className="w-full break-words text-[15px] font-medium text-foreground leading-snug">{display}</div>
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

// ─── Componente Principal ─────────────────────────────────────────────────────

export function BeneficiariosSection() {
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
    isSaving,
    confirmDelete, setConfirmDelete,
    confirmEditDelete, setConfirmEditDelete,
    saveError, setSaveError,
    editErrors,
    openEdit,
    handleEditChange,
    handleSaveEdit,
    handleEditDelete,
    handleHardDelete,
    handleAltaChange,
    handleAltaSubmit,
  } = useBeneficiarios()

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground text-sm">Cargando beneficiarios...</p>
    </div>
  )

  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Beneficiarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestión de beneficiarios registrados.</p>
      </div>

      {/* Buscador, filtros y nueva alta */}
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
              Todos:    activo ? "bg-[#005bb5] text-white border-[#005bb5]" : "border-border text-muted-foreground hover:border-[#005bb5]/40 hover:text-[#005bb5]",
              Activo:   activo ? "bg-success/20 text-success border-success/50 font-semibold" : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
              Inactivo: activo ? "bg-warning/20 text-warning border-warning/50 font-semibold" : "border-border text-muted-foreground hover:border-warning/40 hover:text-warning",
              Baja:     activo ? "bg-destructive/15 text-destructive border-destructive/40 font-semibold" : "border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive",
            }
            return (
              <button
                key={opcion}
                onClick={() => setFiltroEstatus(opcion)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-all ${colores[opcion]}`}
              >
                {opcion === "Activo"   && <CheckCircle className="size-3" />}
                {opcion === "Inactivo" && <AlertTriangle className="size-3" />}
                {opcion === "Baja"     && <XCircle className="size-3" />}
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

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((b) => {
          const initials = `${b.nombres[0]}${b.apellidoPaterno[0]}`
          const nombre   = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`
          return (
            <Card key={b.folio} className="flex flex-col items-center text-center border-border/60 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold ring-4 ring-background shadow-sm mb-2">
                {initials}
              </div>
              <p className="text-sm font-semibold text-primary/80 leading-none">{b.folio}</p>
              <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-1 mt-0.5">{nombre}</h3>
              <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="text-xs truncate">{b.ciudad}, {b.estado}</span>
              </div>
              <div className="mt-2">{getEstatusBadge(b.estatus)}</div>
              <div className="mt-6 flex items-center justify-between gap-3 w-full">
                <Button
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground shadow-sm rounded-lg"
                  onClick={() => { setSelectedBeneficiario(b); setShowExpedienteDialog(true) }}
                >
                  <Eye className="size-3.5 mr-1.5" />Detalles
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground shadow-sm rounded-lg"
                  onClick={() => openEdit(b)}
                >
                  <Edit className="size-3.5 mr-1.5" />Editar
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">{filtered.length} registros encontrados</p>

      {/* ── Dialog: Nueva Alta ─────────────────────────────────────────────── */}
      <Dialog open={showAltaDialog} onOpenChange={(open) => { if (!isSaving) { setShowAltaDialog(open); if (!open) setAltaErrors({}) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
          <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg">Nueva Alta de Beneficiario</DialogTitle>
              <DialogDescription>Complete los datos obligatorios (<span className="text-destructive font-semibold">*</span>) para registrar el perfil.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-8 space-y-6 bg-muted/20">
            {altaErrors._global && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <XCircle className="size-4 shrink-0" />{altaErrors._global}
              </div>
            )}

            <SectionCard title="Información Personal" icon={User}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={altaErrors.nombres}>
                  <Label>Nombres <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej. Juan Carlos" value={altaForm.nombres} onChange={(e) => handleAltaChange("nombres", e.target.value)} className={altaErrors.nombres ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap error={altaErrors.apellidoPaterno}>
                  <Label>Apellido Paterno <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej. Pérez" value={altaForm.apellidoPaterno} onChange={(e) => handleAltaChange("apellidoPaterno", e.target.value)} className={altaErrors.apellidoPaterno ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap error={altaErrors.apellidoMaterno}>
                  <Label>Apellido Materno <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej. Martínez" value={altaForm.apellidoMaterno} onChange={(e) => handleAltaChange("apellidoMaterno", e.target.value)} className={altaErrors.apellidoMaterno ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap error={altaErrors.curp}>
                  <Label>CURP <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="18 caracteres" value={altaForm.curp} onChange={(e) => handleAltaChange("curp", e.target.value.toUpperCase())} className={`uppercase pl-9 font-mono ${altaErrors.curp ? "border-destructive" : ""}`} maxLength={18} />
                  </div>
                </FieldWrap>
                <FieldWrap error={altaErrors.fechaNacimiento}>
                  <Label>Fecha de Nacimiento <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input type="date" value={altaForm.fechaNacimiento} onChange={(e) => handleAltaChange("fechaNacimiento", e.target.value)} className={`pl-9 ${altaErrors.fechaNacimiento ? "border-destructive" : ""}`} />
                  </div>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Género</Label>
                  <Select value={altaForm.genero} onValueChange={(v) => handleAltaChange("genero", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Sangre</Label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Ej. O+" value={altaForm.tipoSangre} onChange={(e) => handleAltaChange("tipoSangre", e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre del Padre / Madre</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Ej. Rosa López" value={altaForm.nombrePadreMadre} onChange={(e) => handleAltaChange("nombrePadreMadre", e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Dirección" icon={MapPin}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Calle y número</Label>
                  <Input placeholder="Ej. Av. Hidalgo 245" value={altaForm.calle} onChange={(e) => handleAltaChange("calle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Colonia</Label>
                  <Input placeholder="Ej. Centro" value={altaForm.colonia} onChange={(e) => handleAltaChange("colonia", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>CP</Label>
                  <Input placeholder="Ej. 44100" value={altaForm.cp} onChange={(e) => handleAltaChange("cp", e.target.value)} maxLength={5} />
                </div>
                <FieldWrap error={altaErrors.ciudad}>
                  <Label>Ciudad <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej. Guadalajara" value={altaForm.ciudad} onChange={(e) => handleAltaChange("ciudad", e.target.value)} className={altaErrors.ciudad ? "border-destructive" : ""} />
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Municipio</Label>
                  <Input placeholder="Ej. Guadalajara" value={altaForm.municipio} onChange={(e) => handleAltaChange("municipio", e.target.value)} />
                </div>
                <FieldWrap error={altaErrors.estado}>
                  <Label>Estado <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej. Jalisco" value={altaForm.estado} onChange={(e) => handleAltaChange("estado", e.target.value)} className={altaErrors.estado ? "border-destructive" : ""} />
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Contacto" icon={Phone}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Teléfono Casa</Label>
                  <IconInput icon={Phone}><Input placeholder="(000) 000-0000" value={altaForm.telefonoCasa} onChange={(e) => handleAltaChange("telefonoCasa", e.target.value)} className="pl-9" /></IconInput>
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono Celular</Label>
                  <IconInput icon={Phone}><Input placeholder="(000) 000-0000" value={altaForm.telefonoCelular} onChange={(e) => handleAltaChange("telefonoCelular", e.target.value)} className="pl-9" /></IconInput>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Correo Electrónico</Label>
                  <IconInput icon={Mail}><Input type="email" placeholder="correo@ejemplo.com" value={altaForm.correoElectronico} onChange={(e) => handleAltaChange("correoElectronico", e.target.value)} className="pl-9" /></IconInput>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Contacto de Emergencia" icon={HeartPulse}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <IconInput icon={User}><Input placeholder="Ej. María García" value={altaForm.contactoEmergencia} onChange={(e) => handleAltaChange("contactoEmergencia", e.target.value)} className="pl-9" /></IconInput>
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <IconInput icon={Phone}><Input placeholder="(000) 000-0000" value={altaForm.telefonoEmergencia} onChange={(e) => handleAltaChange("telefonoEmergencia", e.target.value)} className="pl-9" /></IconInput>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Médico / Diagnóstico" icon={Stethoscope}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Municipio de Nacimiento</Label>
                  <Input placeholder="Ej. Guadalajara" value={altaForm.municipioNacimiento} onChange={(e) => handleAltaChange("municipioNacimiento", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hospital de Nacimiento</Label>
                  <Input placeholder="Ej. Hospital Civil" value={altaForm.hospitalNacimiento} onChange={(e) => handleAltaChange("hospitalNacimiento", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="flex items-center gap-3">
                    <span>¿Usa válvula?</span>
                    <div className="flex items-center gap-2">
                      <Switch checked={altaForm.usaValvula} onCheckedChange={(v) => handleAltaChange("usaValvula", v)} />
                      <span className="text-sm text-muted-foreground">{altaForm.usaValvula ? "Sí" : "No"}</span>
                    </div>
                  </Label>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notas / Observaciones</Label>
                  <IconInput icon={FileText} alignTop><Input placeholder="Observaciones adicionales..." value={altaForm.notas} onChange={(e) => handleAltaChange("notas", e.target.value)} className="pl-9" /></IconInput>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="sticky bottom-0 bg-background border-t border-border/40 px-6 py-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowAltaDialog(false); setAltaErrors({}) }} disabled={isSaving}>Cancelar</Button>
            <Button type="button" onClick={handleAltaSubmit} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Beneficiario"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Expediente ────────────────────────────────────────────── */}
      <Dialog open={showExpedienteDialog} onOpenChange={setShowExpedienteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
          <div className="bg-slate-50/50 dark:bg-muted/10 px-8 py-6 flex items-center justify-between gap-6 border-b border-border/40">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="size-16 rounded-full bg-[#e6f0ff] flex items-center justify-center text-[#005bb5] font-bold text-2xl">
                {selectedBeneficiario?.nombres.charAt(0)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <DialogTitle className="w-full truncate text-left text-lg font-bold leading-none text-foreground">
                  {selectedBeneficiario && `${selectedBeneficiario.nombres} ${selectedBeneficiario.apellidoPaterno} ${selectedBeneficiario.apellidoMaterno}`}
                </DialogTitle>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <StatusIcon status={selectedBeneficiario?.estatus ?? ""} />
                    <span>{selectedBeneficiario?.estatus}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button size="sm" className="gap-2 bg-[#005bb5] hover:bg-[#004a94] text-white shadow-sm h-10 px-4 rounded-lg">
              <CreditCard className="size-4" />
              <span className="hidden sm:inline font-medium">Generar Credencial</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <Tabs defaultValue="datos" className="w-full">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-2 border-b border-border/40 pb-4">
                {["datos", "historial", "documentos"].map((tab) => (
                  <TabsTrigger
                    key={tab} value={tab}
                    className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2 px-4 text-sm font-medium transition-colors capitalize"
                  >
                    {tab === "datos" ? "Datos Personales" : tab === "historial" ? "Historial de Servicios" : "Documentos"}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="datos" className="mt-6 space-y-5">
                {selectedBeneficiario && (
                  <>
                    <DetailGroup title="Identificación" icon={User}>
                      <DetailField label="Nombres" value={selectedBeneficiario.nombres} />
                      <DetailField label="Apellido Paterno" value={selectedBeneficiario.apellidoPaterno} />
                      <DetailField label="Apellido Materno" value={selectedBeneficiario.apellidoMaterno} />
                      <DetailField label="Fecha de Nacimiento" value={selectedBeneficiario.fechaNacimiento} />
                      <DetailField label="Género" value={selectedBeneficiario.genero === "M" ? "Masculino" : selectedBeneficiario.genero === "F" ? "Femenino" : selectedBeneficiario.genero} />
                      <DetailField label="Tipo de Sangre" value={selectedBeneficiario.tipoSangre} badgeVariant="blood" />
                      <DetailField label="No. Credencial" value={selectedBeneficiario.numeroCredencial} badgeVariant="credential" />
                      <DetailField label="CURP" value={selectedBeneficiario.curp} badgeVariant="curp" />
                    </DetailGroup>
                    <DetailGroup title="Familia" icon={Users}>
                      <DetailField label="Nombre del Padre / Madre" value={selectedBeneficiario.nombrePadreMadre} />
                    </DetailGroup>
                    <DetailGroup title="Dirección" icon={MapPin}>
                      <DetailField label="Calle" value={selectedBeneficiario.calle} />
                      <DetailField label="Colonia" value={selectedBeneficiario.colonia} />
                      <DetailField label="Ciudad" value={selectedBeneficiario.ciudad} />
                      <DetailField label="Municipio" value={selectedBeneficiario.municipio} />
                      <DetailField label="Estado" value={selectedBeneficiario.estado} />
                      <DetailField label="CP" value={selectedBeneficiario.cp} />
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
                      <DetailField label="Usa Válvula" value={selectedBeneficiario.usaValvula} badgeVariant="valve" />
                      <DetailField label="Municipio de Nacimiento" value={selectedBeneficiario.municipioNacimiento} />
                      <DetailField label="Hospital de Nacimiento" value={selectedBeneficiario.hospitalNacimiento} />
                      <DetailField label="Notas" value={selectedBeneficiario.notas} />
                    </DetailGroup>
                    <DetailGroup title="Administrativo" icon={ClipboardList}>
                      <DetailField label="Fecha de Alta" value={selectedBeneficiario.fechaAlta} />
                      <DetailField label="Membresía" value={selectedBeneficiario.estatus} badgeVariant="membresia" />
                    </DetailGroup>
                  </>
                )}
              </TabsContent>

              <TabsContent value="historial" className="mt-8">
                <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="py-3">Fecha</TableHead>
                        <TableHead className="py-3">Servicio</TableHead>
                        <TableHead className="text-right py-3">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {([] as Array<{ fecha: string; servicio: string; monto: string }>).map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-4 text-muted-foreground">{s.fecha}</TableCell>
                          <TableCell className="py-4 font-medium">{s.servicio}</TableCell>
                          <TableCell className="py-4 text-right">{s.monto}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {["Acta_Nacimiento.pdf", "Comprobante_Domicilio.pdf", "CURP.pdf"].map((doc) => (
                    <div key={doc} className="flex items-center justify-between rounded-xl border border-border/60 p-4 bg-muted/10 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                          <FileText className="size-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{doc}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" title="Descargar">
                        <Download className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar ────────────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide p-0 gap-0 border-none shadow-2xl">
          <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg">Editar Beneficiario</DialogTitle>
              <DialogDescription>
                Modificando datos de{" "}
                <span className="font-semibold text-foreground">
                  {editForm.nombres} {editForm.apellidoPaterno} {editForm.apellidoMaterno}
                </span>{" "}
                — {editForm.folio}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-8 space-y-6 bg-muted/20">

            {/* Estado de membresía */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-5 shadow-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-foreground">Estado de Membresía</Label>
                <p className="text-xs text-muted-foreground">
                  {editForm.estatus === "Activo"   && "Al corriente — puede recibir servicios."}
                  {editForm.estatus === "Inactivo" && "Sin pago en el último mes — membresía suspendida."}
                  {editForm.estatus === "Baja"     && "Baja permanente por falta de pago (más de 3 meses)."}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {editForm.estatus === "Baja" ? (
                  confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" onClick={handleHardDelete} disabled={isSaving}>
                        {isSaving ? "Eliminando..." : "Confirmar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isSaving}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                      <XCircle className="size-4 mr-2" />Eliminar
                    </Button>
                  )
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${editForm.estatus === "Activo" ? "text-success" : "text-muted-foreground"}`}>
                      {editForm.estatus}
                    </span>
                    <Switch
                      checked={editForm.estatus === "Activo"}
                      onCheckedChange={(checked) => handleEditChange("estatus", checked ? "Activo" : "Inactivo")}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Información Personal */}
            <SectionCard title="Información Personal" icon={User}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap id="edit-nombres" error={editErrors.nombres}>
                  <Label>Nombres</Label>
                  <Input value={editForm.nombres ?? ""} onChange={(e) => handleEditChange("nombres", e.target.value)} className={editErrors.nombres ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap id="edit-apellidoPaterno" error={editErrors.apellidoPaterno}>
                  <Label>Apellido Paterno</Label>
                  <Input value={editForm.apellidoPaterno ?? ""} onChange={(e) => handleEditChange("apellidoPaterno", e.target.value)} className={editErrors.apellidoPaterno ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap id="edit-apellidoMaterno" error={editErrors.apellidoMaterno}>
                  <Label>Apellido Materno</Label>
                  <Input value={editForm.apellidoMaterno ?? ""} onChange={(e) => handleEditChange("apellidoMaterno", e.target.value)} className={editErrors.apellidoMaterno ? "border-destructive" : ""} />
                </FieldWrap>
                <FieldWrap id="edit-curp" error={editErrors.curp}>
                  <Label>CURP</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={editForm.curp ?? ""} onChange={(e) => handleEditChange("curp", e.target.value.toUpperCase())} className={`uppercase pl-9 font-mono ${editErrors.curp ? "border-destructive" : ""}`} />
                  </div>
                </FieldWrap>
                <FieldWrap id="edit-fechaNacimiento" error={editErrors.fechaNacimiento}>
                  <Label>Fecha de Nacimiento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input type="date" value={editForm.fechaNacimiento ?? ""} onChange={(e) => handleEditChange("fechaNacimiento", e.target.value)} className={`pl-9 ${editErrors.fechaNacimiento ? "border-destructive" : ""}`} />
                  </div>
                </FieldWrap>
                <FieldWrap id="edit-genero" error={editErrors.genero}>
                  <Label>Género</Label>
                  <Select value={editForm.genero ?? ""} onValueChange={(v) => handleEditChange("genero", v)}>
                    <SelectTrigger className={editErrors.genero ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap id="edit-tipoSangre" error={editErrors.tipoSangre}>
                  <Label>Tipo de Sangre</Label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={editForm.tipoSangre ?? ""} onChange={(e) => handleEditChange("tipoSangre", e.target.value)} placeholder="Ej. O+" className={`pl-9 ${editErrors.tipoSangre ? "border-destructive" : ""}`} />
                  </div>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Nombre del Padre / Madre</Label>
                  <IconInput icon={Users}><Input value={editForm.nombrePadreMadre ?? ""} onChange={(e) => handleEditChange("nombrePadreMadre", e.target.value)} className="pl-9" /></IconInput>
                </div>
              </div>
            </SectionCard>

            {/* Dirección */}
            <SectionCard title="Dirección" icon={MapPin}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Calle y número</Label>
                  <Input value={editForm.calle ?? ""} onChange={(e) => handleEditChange("calle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Colonia</Label>
                  <Input value={editForm.colonia ?? ""} onChange={(e) => handleEditChange("colonia", e.target.value)} />
                </div>
                <FieldWrap id="edit-cp" error={editErrors.cp}>
                  <Label>CP</Label>
                  <Input value={editForm.cp ?? ""} onChange={(e) => handleEditChange("cp", e.target.value)} className={editErrors.cp ? "border-destructive" : ""} />
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Ciudad</Label>
                  <Input value={editForm.ciudad ?? ""} onChange={(e) => handleEditChange("ciudad", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Municipio</Label>
                  <Input value={editForm.municipio ?? ""} onChange={(e) => handleEditChange("municipio", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Input value={editForm.estado ?? ""} onChange={(e) => handleEditChange("estado", e.target.value)} />
                </div>
              </div>
            </SectionCard>

            {/* Contacto */}
            <SectionCard title="Contacto" icon={Phone}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap id="edit-telefonoCasa" error={editErrors.telefonoCasa}>
                  <Label>Teléfono Casa</Label>
                  <IconInput icon={Phone}><Input value={editForm.telefonoCasa ?? ""} onChange={(e) => handleEditChange("telefonoCasa", e.target.value)} className={`pl-9 ${editErrors.telefonoCasa ? "border-destructive" : ""}`} /></IconInput>
                </FieldWrap>
                <FieldWrap id="edit-telefonoCelular" error={editErrors.telefonoCelular}>
                  <Label>Teléfono Celular</Label>
                  <IconInput icon={Phone}><Input value={editForm.telefonoCelular ?? ""} onChange={(e) => handleEditChange("telefonoCelular", e.target.value)} className={`pl-9 ${editErrors.telefonoCelular ? "border-destructive" : ""}`} /></IconInput>
                </FieldWrap>
                <FieldWrap id="edit-correoElectronico" error={editErrors.correoElectronico} className="sm:col-span-2">
                  <Label>Correo Electrónico</Label>
                  <IconInput icon={Mail}><Input type="email" value={editForm.correoElectronico ?? ""} onChange={(e) => handleEditChange("correoElectronico", e.target.value)} className={`pl-9 ${editErrors.correoElectronico ? "border-destructive" : ""}`} /></IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            {/* Contacto de Emergencia */}
            <SectionCard title="Contacto de Emergencia" icon={HeartPulse}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <IconInput icon={User}><Input value={editForm.contactoEmergencia ?? ""} onChange={(e) => handleEditChange("contactoEmergencia", e.target.value)} className="pl-9" /></IconInput>
                </div>
                <FieldWrap id="edit-telefonoEmergencia" error={editErrors.telefonoEmergencia}>
                  <Label>Teléfono</Label>
                  <IconInput icon={Phone}><Input value={editForm.telefonoEmergencia ?? ""} onChange={(e) => handleEditChange("telefonoEmergencia", e.target.value)} className={`pl-9 ${editErrors.telefonoEmergencia ? "border-destructive" : ""}`} /></IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            {/* Médico / Diagnóstico */}
            <SectionCard title="Médico / Diagnóstico" icon={Stethoscope}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de Espina Bífida</Label>
                  <Select value={editForm.tipo ?? ""} onValueChange={(v) => handleEditChange("tipo", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mielomeningocele">Mielomeningocele</SelectItem>
                      <SelectItem value="Meningocele">Meningocele</SelectItem>
                      <SelectItem value="Oculta">Oculta</SelectItem>
                      <SelectItem value="Lipomeningocele">Lipomeningocele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldWrap id="edit-usaValvula" error={editErrors.usaValvula}>
                  <Label>¿Usa válvula?</Label>
                  <Select value={editForm.usaValvula === undefined ? "" : editForm.usaValvula ? "si" : "no"} onValueChange={(v) => handleEditChange("usaValvula", v === "si")}>
                    <SelectTrigger className={editErrors.usaValvula ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Municipio de Nacimiento</Label>
                  <Input value={editForm.municipioNacimiento ?? ""} onChange={(e) => handleEditChange("municipioNacimiento", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hospital de Nacimiento</Label>
                  <Input value={editForm.hospitalNacimiento ?? ""} onChange={(e) => handleEditChange("hospitalNacimiento", e.target.value)} />
                </div>
                <FieldWrap id="edit-notas" error={editErrors.notas} className="sm:col-span-2">
                  <Label>Notas</Label>
                  <IconInput icon={FileText} alignTop><Input value={editForm.notas ?? ""} onChange={(e) => handleEditChange("notas", e.target.value)} placeholder="Observaciones adicionales" className={`pl-9 ${editErrors.notas ? "border-destructive" : ""}`} /></IconInput>
                </FieldWrap>
              </div>
            </SectionCard>
          </div>

          {saveError && (
            <div id="edit-error-banner" className="mx-6 mb-0 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-xs text-destructive flex items-center gap-2">
              <XCircle className="size-3.5 shrink-0" />{saveError}
            </div>
          )}

          <div className="sticky bottom-0 bg-background border-t border-border/40 px-6 py-4 flex items-center justify-between gap-3">
            {confirmEditDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">¿Eliminar permanentemente?</span>
                <button type="button" onClick={handleEditDelete} disabled={isSaving} className="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors">
                  {isSaving ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button type="button" onClick={() => setConfirmEditDelete(false)} disabled={isSaving} className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { setSaveError(null); setConfirmEditDelete(true) }} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50">
                <XCircle className="size-3.5" />Eliminar
              </button>
            )}
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => { setShowEditDialog(false); setConfirmEditDelete(false); setSaveError(null) }} disabled={isSaving}>Cancelar</Button>
              <Button type="button" onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Cambios"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Micro-componentes de estructura ─────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="p-6 border-border/50 shadow-sm rounded-2xl">
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground border-b border-border/50 pb-3 mb-5 flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      {children}
    </Card>
  )
}

function FieldWrap({ id, error, className, children }: { id?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div id={id} className={`space-y-1.5 ${className ?? ""}`}>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function IconInput({ icon: Icon, alignTop, children }: { icon: React.ElementType; alignTop?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className={`absolute left-3 size-4 text-muted-foreground ${alignTop ? "top-3" : "top-1/2 -translate-y-1/2"}`} />
      {children}
    </div>
  )
}
