"use client"

import React, { useRef } from "react"
import {
  X, XCircle, User, MapPin, Phone, Stethoscope,
  Loader2, Hash, Download, Printer,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { TIPOS_SANGRE_OPCIONES } from "@/lib/beneficiario-alta"
import type { BeneficiarioAltaForm } from "@/lib/beneficiario-alta"
import type { Beneficiario } from "@/services/beneficiarios"
import { cn } from "@/lib/utils"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { ProfilePhotoUpload } from "@/components/profile-photo-upload"
import { CheckCircle, AlertTriangle } from "lucide-react"

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">
          {estatus}
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

async function buildCredencialBlobUrl(b: Beneficiario & { fotoPerfilUrl?: string | null }): Promise<string> {
  const nombre = [b.nombres, b.apellidoPaterno, b.apellidoMaterno].filter(Boolean).join(" ")
  const direccion = [b.calle, b.colonia, b.ciudad, b.municipio, b.estado].filter(Boolean).join(", ")
  const telefono = b.telefonoCasa || b.telefonoCelular || ""
  const fotoSrc = b.fotoPerfilUrl ?? ""
  const iniciales = `${b.nombres?.[0] ?? ""}${b.apellidoPaterno?.[0] ?? ""}`

  let logoDataUrl = ""
  try {
    const res = await fetch("/logo-espina-bifida.png")
    const buf = await res.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    logoDataUrl = `data:image/png;base64,${b64}`
  } catch { /* logo opcional */ }

  let fotoDataUrl = ""
  if (fotoSrc) {
    try {
      const res = await fetch(fotoSrc)
      const buf = await res.arrayBuffer()
      const mime = res.headers.get("content-type") || "image/jpeg"
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      fotoDataUrl = `data:${mime};base64,${b64}`
    } catch { /* foto opcional */ }
  }

  const photoHtml = fotoDataUrl
    ? `<img src="${fotoDataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center;" />`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:11pt;font-weight:700;color:#94a3b8;">${iniciales}</div>`

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="AEBNL" style="height:9mm;width:auto;object-fit:contain;" />`
    : `<span style="font-size:6pt;font-weight:900;color:#0f4c81;">ESPINA<br/>BÍFIDA</span>`

  const fv = (value?: string | boolean | null) =>
    (value === undefined || value === null || value === "")
      ? ""
      : (typeof value === "boolean" ? (value ? "Sí" : "No") : String(value))

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Credencial</title>
<style>
  @page { size: 85.6mm 54mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 5.5pt; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 85.6mm; height: 54mm; overflow: hidden; position: relative; }
  .lbl  { font-size: 5pt; color: #333; }
  .val  { font-size: 5.5pt; font-weight: 600; color: #000; }
  .f    { margin-bottom: 0.8mm; line-height: 1.3; }
  .fr-top { display: flex; height: 26mm; border-bottom: 0.3mm solid #ccc; }
  .fr-logo-col { width: 23mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 1.5mm; border-right: 0.3mm solid #ccc; }
  .fr-logo-col img { width: 100%; height: auto; object-fit: contain; }
  .fr-info-col { flex: 1; padding: 1.5mm 2mm 1mm 2mm; display: flex; flex-direction: column; gap: 0mm; }
  .fr-folio { text-align: right; font-size: 6pt; margin-bottom: 1mm; }
  .fr-folio .folio-lbl { color: #333; }
  .fr-folio .folio-val { font-weight: 700; color: #000; }
  .fr-tipo-badge { display: inline-block; font-size: 5pt; font-weight: 700; color: #c00; border: 0.4mm solid #c00; padding: 0 0.8mm; margin-left: 1mm; vertical-align: middle; }
  .fr-bot { display: flex; height: 28mm; }
  .fr-photo-col { width: 23mm; flex-shrink: 0; display: flex; align-items: flex-start; justify-content: center; padding: 1.5mm 1.5mm 1mm 1.5mm; border-right: 0.3mm solid #ccc; }
  .fr-photo { width: 18mm; height: 22mm; overflow: hidden; border: 0.4mm solid #999; background: #e8e8e8; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 700; color: #888; }
  .fr-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
  .fr-bot-info { flex: 1; padding: 1.5mm 2mm 1mm 2mm; display: flex; flex-direction: column; justify-content: space-between; }
  .bk-body { padding: 2mm 2.5mm 1.5mm 2.5mm; }
  .bk-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1mm; line-height: 1.3; }
  .bk-row .lbl { font-size: 5pt; color: #333; }
  .bk-row .val { font-size: 5.5pt; font-weight: 600; }
  .bk-sep { border-top: 0.3mm solid #ccc; margin: 1.5mm 0; }
  .bk-bot { position: absolute; bottom: 0; left: 0; right: 0; border-top: 0.3mm solid #ccc; display: flex; }
  .bk-assoc { flex: 1; padding: 1.5mm 2mm; font-size: 4.2pt; color: #333; line-height: 1.5; border-right: 0.3mm solid #ccc; }
  .bk-assoc .assoc-name { font-size: 4.5pt; font-weight: 700; color: #0a3d6e; line-height: 1.3; }
  .bk-nacimiento { width: 38mm; flex-shrink: 0; padding: 1.5mm 2mm; font-size: 4.8pt; }
  .bk-nacimiento .nac-title { font-size: 5pt; font-weight: 700; margin-bottom: 1mm; }
  .bk-nacimiento table { border-collapse: collapse; width: 100%; }
  .bk-nacimiento td { padding: 0.3mm 0; font-size: 4.5pt; vertical-align: top; }
  .bk-nacimiento td:first-child { color: #444; padding-right: 1mm; white-space: nowrap; }
  .bk-nacimiento td:last-child  { font-weight: 600; color: #000; }
</style>
</head>
<body>
<div class="page">
  <div class="fr-top">
    <div class="fr-logo-col">${logoHtml}</div>
    <div class="fr-info-col">
      <div class="fr-folio">
        <span class="folio-lbl">Folio:</span>
        <span class="folio-val"> ${b.folio ?? ""}</span>
      </div>
      <div class="f">
        <span class="lbl">Nombre:</span>
        <span class="val"> ${nombre}</span>
        ${b.tipo ? `<span class="fr-tipo-badge">${b.tipo.charAt(0).toUpperCase()}</span>` : ""}
      </div>
      ${direccion ? `<div class="f"><span class="lbl">Dirección:</span> <span class="val">${direccion}</span></div>` : ""}
    </div>
  </div>
  <div class="fr-bot">
    <div class="fr-photo-col">
      <div class="fr-photo">${photoHtml}</div>
    </div>
    <div class="fr-bot-info">
      <div>
        ${telefono ? `<div class="f"><span class="lbl">Tel. Casa</span> <span class="val">${telefono}</span></div>` : ""}
        ${b.nombrePadreMadre ? `<div class="f"><span class="lbl">Nombre de padres:</span><br/><span class="val">${b.nombrePadreMadre}</span></div>` : ""}
      </div>
      <div class="f">
        <span class="lbl">Fecha de Expedicion:</span>
        <span class="val"> ${b.fechaAlta ?? ""}</span>
      </div>
    </div>
  </div>
</div>
<div class="page" style="page-break-before:always;">
  <div class="bk-body">
    <div class="bk-row"><div><span class="lbl">Padecimiento:</span></div></div>
    <div class="bk-row">
      <div><span class="lbl">Tipo de Sangre:</span> <span class="val">${fv(b.tipoSangre)}</span></div>
      <div><span class="lbl">Tiene Valvula?</span> <span class="val">${fv(b.usaValvula)}</span></div>
    </div>
    <div class="bk-row" style="margin-top:1mm;"><span class="lbl">En caso de accidente avisar a:</span></div>
    <div class="bk-row">
      <span class="val">${fv(b.contactoEmergencia)}</span>
      <div><span class="lbl">Teléfono:</span> <span class="val">${fv(b.telefonoEmergencia || b.telefonoCasa)}</span></div>
    </div>
    <div class="bk-row" style="margin-top:0.5mm;">
      <span class="lbl">Correo Electrónico:</span> <span class="val">${fv(b.correoElectronico)}</span>
    </div>
  </div>
  <div class="bk-bot">
    <div class="bk-assoc">
      <div class="assoc-name">ASOCIACION DE ESPINA BIFIDA<br/>DE NUEVO LEON ABP</div>
      <div style="margin-top:0.8mm;">Monterrey, NL</div>
      <div>Teléfono: ${fv(b.telefonoCasa) || ""}</div>
      <div>www.espinabifida.org.mx</div>
    </div>
    <div class="bk-nacimiento">
      <div class="nac-title">Datos de Nacimiento:</div>
      <table>
        <tr><td>Fecha</td><td>${fv(b.fechaNacimiento)}</td></tr>
        <tr><td>Lugar Nac.</td><td>${fv(b.ciudad || b.municipio)}</td></tr>
        <tr><td>Hospital</td><td>${fv(b.hospitalNacimiento)}</td></tr>
      </table>
    </div>
  </div>
</div>
</body>
</html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  return URL.createObjectURL(blob)
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

// ─── Props ────────────────────────────────────────────────────────────────────

type AltaErrorsType = Partial<Record<keyof BeneficiarioAltaForm, string>>

interface BeneficiarioFormDialogProps {
  // Alta dialog
  showAltaDialog: boolean
  setShowAltaDialog: (open: boolean) => void
  isSaving: boolean
  saveError: string | null
  altaForm: BeneficiarioAltaForm
  altaErrors: AltaErrorsType | null
  handleAltaChange: (field: keyof BeneficiarioAltaForm, value: string | boolean) => void
  handleAltaSubmit: () => void
  altaFotoPreview: string | null
  handleAltaFotoSelected: (file: File) => void
  // Credencial dialogs
  credencialBeneficiario: Beneficiario | null
  setCredencialBeneficiario: (b: Beneficiario | null) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BeneficiarioFormDialog({
  showAltaDialog,
  setShowAltaDialog,
  isSaving,
  saveError,
  altaForm,
  altaErrors,
  handleAltaChange,
  handleAltaSubmit,
  altaFotoPreview,
  handleAltaFotoSelected,
  credencialBeneficiario,
  setCredencialBeneficiario,
}: BeneficiarioFormDialogProps) {
  const [credImpresionOpen, setCredImpresionOpen] = React.useState(false)
  const [credImpresionUrl, setCredImpresionUrl] = React.useState<string | null>(null)
  const credImpresionBlobRef = useRef<string | null>(null)
  const credImpresionIframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <>
      {/* ── Dialog: Nueva Alta ─────────────────────────────────────────────── */}
      <Dialog open={showAltaDialog} onOpenChange={(open) => { if (!isSaving) setShowAltaDialog(open) }}>
        <DialogContent showCloseButton={false} className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(90vh,880px)] flex flex-col overflow-hidden p-0 gap-0 border-0 shadow-2xl sm:rounded-2xl">

          {/* ── Banner navy ── */}
          <div className="relative shrink-0 overflow-hidden" style={{ background: "#0f4c81" }}>
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative flex items-center justify-between gap-3 px-6 py-4">
              <div>
                <DialogTitle className="text-base font-bold text-white">Registrar beneficiario</DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-white/60">
                  Completa los campos obligatorios marcados con <span className="text-red-300">*</span>
                </DialogDescription>
              </div>
              <button onClick={() => setShowAltaDialog(false)} disabled={isSaving}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Cuerpo ── */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide divide-y divide-border/40">

            {saveError && (
              <div className="px-6 py-3 flex items-center gap-2 bg-red-50 border-b border-red-200 text-xs text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
                <XCircle className="size-3.5 shrink-0" />{saveError}
              </div>
            )}

            {/* ── Personal ── */}
            <div>
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-6 py-3">
                <User className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Información personal</span>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="flex items-center gap-4">
                  <ProfilePhotoUpload variant="form" size="md" previewSrc={altaFotoPreview}
                    fotoPerfilUrl={null}
                    fallbackText={`${altaForm.nombres?.[0] ?? "?"}${altaForm.apellidoPaterno?.[0] ?? ""}`}
                    uploading={isSaving} disabled={isSaving} onFileSelected={handleAltaFotoSelected} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Foto de perfil</p>
                    <p className="text-[11px] text-muted-foreground">JPEG, PNG o WebP · máx. 2 MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FieldWrap error={altaErrors?.nombres}>
                    <LabelReq htmlFor="alta-nombres">Nombres</LabelReq>
                    <Input id="alta-nombres" value={altaForm.nombres ?? ""} onChange={(e) => handleAltaChange("nombres", e.target.value)}
                      className={`h-10 text-sm ${altaErrors?.nombres ? "border-destructive" : ""}`} placeholder="Ej. Juan Carlos" />
                  </FieldWrap>
                  <FieldWrap error={altaErrors?.apellidoPaterno}>
                    <LabelReq htmlFor="alta-ap">Apellido paterno</LabelReq>
                    <Input id="alta-ap" value={altaForm.apellidoPaterno ?? ""} onChange={(e) => handleAltaChange("apellidoPaterno", e.target.value)}
                      className={`h-10 text-sm ${altaErrors?.apellidoPaterno ? "border-destructive" : ""}`} placeholder="Ej. García" />
                  </FieldWrap>
                  <FieldWrap error={altaErrors?.apellidoMaterno}>
                    <LabelReq htmlFor="alta-am">Apellido materno</LabelReq>
                    <Input id="alta-am" value={altaForm.apellidoMaterno ?? ""} onChange={(e) => handleAltaChange("apellidoMaterno", e.target.value)}
                      className={`h-10 text-sm ${altaErrors?.apellidoMaterno ? "border-destructive" : ""}`} placeholder="Ej. López" />
                  </FieldWrap>
                  <FieldWrap error={altaErrors?.curp}>
                    <LabelReq htmlFor="alta-curp">CURP</LabelReq>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input id="alta-curp" value={altaForm.curp ?? ""} onChange={(e) => handleAltaChange("curp", e.target.value.toUpperCase())}
                        className={`h-10 pl-9 font-mono text-sm ${altaErrors?.curp ? "border-destructive" : ""}`} maxLength={18} placeholder="18 caracteres" />
                    </div>
                  </FieldWrap>
                  <FieldWrap error={altaErrors?.fechaNacimiento}>
                    <LabelReq htmlFor="alta-fn">Fecha de nacimiento</LabelReq>
                    <Input id="alta-fn" type="date" value={altaForm.fechaNacimiento ?? ""} onChange={(e) => handleAltaChange("fechaNacimiento", e.target.value)}
                      className={`h-10 text-sm ${altaErrors?.fechaNacimiento ? "border-destructive" : ""}`} />
                  </FieldWrap>
                  <div className="space-y-2">
                    <Label htmlFor="alta-genero">Género</Label>
                    <Select value={altaForm.genero ?? ""} onValueChange={(v) => handleAltaChange("genero", v)}>
                      <SelectTrigger id="alta-genero" className="h-10 text-sm"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldWrap error={altaErrors?.tipoSangre}>
                    <Label htmlFor="alta-sangre">Tipo de sangre</Label>
                    <Select value={altaForm.tipoSangre ? altaForm.tipoSangre : "__none__"} onValueChange={(v) => handleAltaChange("tipoSangre", v === "__none__" ? "" : v)}>
                      <SelectTrigger id="alta-sangre" className={cn("h-10 text-sm", altaErrors?.tipoSangre && "border-destructive")}>
                        <SelectValue placeholder="Sin especificar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin especificar</SelectItem>
                        {TIPOS_SANGRE_OPCIONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWrap>
                </div>
              </div>
            </div>

            {/* ── Dirección ── */}
            <div>
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-6 py-3">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Dirección</span>
              </div>
              <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="alta-calle">Calle y número</Label>
                  <Input id="alta-calle" value={altaForm.calle ?? ""} onChange={(e) => handleAltaChange("calle", e.target.value)}
                    className="h-10 text-sm" placeholder="Calle, número exterior e interior" autoComplete="street-address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alta-colonia">Colonia</Label>
                  <Input id="alta-colonia" value={altaForm.colonia ?? ""} onChange={(e) => handleAltaChange("colonia", e.target.value)}
                    className="h-10 text-sm" placeholder="Colonia o fraccionamiento" />
                </div>
                <FieldWrap error={altaErrors?.cp}>
                  <Label htmlFor="alta-cp">Código postal</Label>
                  <Input id="alta-cp" value={altaForm.cp ?? ""} onChange={(e) => handleAltaChange("cp", e.target.value)}
                    maxLength={8} className={`h-10 text-sm ${altaErrors?.cp ? "border-destructive" : ""}`} placeholder="5 dígitos" inputMode="numeric" />
                </FieldWrap>
                <FieldWrap error={altaErrors?.ciudad}>
                  <LabelReq htmlFor="alta-ciudad">Ciudad</LabelReq>
                  <Input id="alta-ciudad" value={altaForm.ciudad ?? ""} onChange={(e) => handleAltaChange("ciudad", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.ciudad ? "border-destructive" : ""}`} placeholder="Ciudad" autoComplete="address-level2" />
                </FieldWrap>
                <FieldWrap error={altaErrors?.estado}>
                  <LabelReq htmlFor="alta-estado">Estado</LabelReq>
                  <Input id="alta-estado" value={altaForm.estado ?? ""} onChange={(e) => handleAltaChange("estado", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.estado ? "border-destructive" : ""}`} placeholder="Estado" autoComplete="address-level1" />
                </FieldWrap>
              </div>
            </div>

            {/* ── Contacto ── */}
            <div>
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-6 py-3">
                <Phone className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Contacto</span>
              </div>
              <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2">
                <FieldWrap error={altaErrors?.telefonoCasa}>
                  <Label htmlFor="alta-tel-casa">Teléfono casa</Label>
                  <Input id="alta-tel-casa" value={altaForm.telefonoCasa ?? ""} onChange={(e) => handleAltaChange("telefonoCasa", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.telefonoCasa ? "border-destructive" : ""}`} placeholder="10 dígitos (opcional)" inputMode="tel" maxLength={16} />
                </FieldWrap>
                <FieldWrap error={altaErrors?.telefonoCelular}>
                  <LabelReq htmlFor="alta-tel-cel">Teléfono celular</LabelReq>
                  <Input id="alta-tel-cel" value={altaForm.telefonoCelular ?? ""} onChange={(e) => handleAltaChange("telefonoCelular", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.telefonoCelular ? "border-destructive" : ""}`} placeholder="10 dígitos" inputMode="tel" maxLength={16} />
                </FieldWrap>
                <FieldWrap error={altaErrors?.correoElectronico} className="sm:col-span-2">
                  <LabelReq htmlFor="alta-correo">Correo electrónico</LabelReq>
                  <Input id="alta-correo" type="email" value={altaForm.correoElectronico ?? ""} onChange={(e) => handleAltaChange("correoElectronico", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.correoElectronico ? "border-destructive" : ""}`} placeholder="nombre@correo.com" autoComplete="email" />
                </FieldWrap>
                <FieldWrap error={altaErrors?.contactoEmergencia}>
                  <Label htmlFor="alta-cont-emerg">Contacto emergencia</Label>
                  <Input id="alta-cont-emerg" value={altaForm.contactoEmergencia ?? ""} onChange={(e) => handleAltaChange("contactoEmergencia", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.contactoEmergencia ? "border-destructive" : ""}`} placeholder="Nombre completo" />
                </FieldWrap>
                <FieldWrap error={altaErrors?.telefonoEmergencia}>
                  <Label htmlFor="alta-tel-emerg">Tel. emergencia</Label>
                  <Input id="alta-tel-emerg" value={altaForm.telefonoEmergencia ?? ""} onChange={(e) => handleAltaChange("telefonoEmergencia", e.target.value)}
                    className={`h-10 text-sm ${altaErrors?.telefonoEmergencia ? "border-destructive" : ""}`} placeholder="10 dígitos" inputMode="tel" maxLength={16} />
                </FieldWrap>
              </div>
            </div>

            {/* ── Clínico ── */}
            <div>
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-6 py-3">
                <Stethoscope className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Clínico</span>
              </div>
              <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="alta-tipo-eb">Tipo de espina bífida</Label>
                  <Select value={altaForm.tipo ?? ""} onValueChange={(v) => handleAltaChange("tipo", v)}>
                    <SelectTrigger id="alta-tipo-eb" className="h-10 text-sm"><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
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
                    <SelectTrigger id="alta-valvula" className={`h-10 text-sm ${altaErrors?.usaValvula ? "border-destructive" : ""}`}><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <div className="space-y-2">
                  <Label htmlFor="alta-hosp">Hospital de nacimiento</Label>
                  <Input id="alta-hosp" value={altaForm.hospitalNacimiento ?? ""} onChange={(e) => handleAltaChange("hospitalNacimiento", e.target.value)}
                    className="h-10 text-sm" placeholder="Nombre del hospital" />
                </div>
                <FieldWrap error={altaErrors?.notas} className="sm:col-span-2">
                  <Label htmlFor="alta-notas">Notas</Label>
                  <Input id="alta-notas" value={altaForm.notas ?? ""} onChange={(e) => handleAltaChange("notas", e.target.value)}
                    placeholder="Observaciones adicionales (opcional)"
                    className={`h-10 text-sm ${altaErrors?.notas ? "border-destructive" : ""}`} />
                </FieldWrap>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-border/40 bg-card px-6 py-5 flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAltaDialog(false)} disabled={isSaving}
                className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleAltaSubmit} disabled={isSaving}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#0f4c81" }}>
                {isSaving ? <><Loader2 className="size-3.5 animate-spin" />Guardando...</> : "Registrar beneficiario"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Credencial digital (vista previa) ────────────────────── */}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          <p className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-400">
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
                <DialogFooter className="flex justify-end gap-2 border-t border-border/50 bg-muted/10 px-6 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCredencialBeneficiario(null)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      const url = await buildCredencialBlobUrl({
                        ...credencialBeneficiario,
                        fotoPerfilUrl: resolvePublicUploadUrl(credencialBeneficiario.fotoPerfilUrl ?? undefined),
                      })
                      const nombre = [credencialBeneficiario.nombres, credencialBeneficiario.apellidoPaterno]
                        .filter(Boolean).join("-").replace(/\s+/g, "-")
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `credencial-${nombre}.html`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      setTimeout(() => URL.revokeObjectURL(url), 2000)
                    }}
                  >
                    <Download className="size-4" />
                    Descargar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      if (credImpresionBlobRef.current) {
                        URL.revokeObjectURL(credImpresionBlobRef.current)
                      }
                      const url = await buildCredencialBlobUrl({
                        ...credencialBeneficiario,
                        fotoPerfilUrl: resolvePublicUploadUrl(credencialBeneficiario.fotoPerfilUrl ?? undefined),
                      })
                      credImpresionBlobRef.current = url
                      setCredImpresionUrl(url)
                      setCredImpresionOpen(true)
                    }}
                  >
                    <Printer className="size-4" />
                    Imprimir credencial
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Impresión de credencial ──────────────────────────────── */}
      <Dialog
        open={credImpresionOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCredImpresionOpen(false)
            setCredImpresionUrl(null)
            if (credImpresionBlobRef.current) {
              URL.revokeObjectURL(credImpresionBlobRef.current)
              credImpresionBlobRef.current = null
            }
          }
        }}
      >
        <DialogContent
          className="flex w-[min(560px,92vw)] flex-col gap-0 p-0"
          style={{ height: "min(85vh, 700px)", maxHeight: "90vh" }}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="size-4 text-primary" />
              Vista previa — Credencial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Revisa la credencial antes de imprimir.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
            {credImpresionUrl && (
              <iframe
                ref={credImpresionIframeRef}
                src={credImpresionUrl}
                className="h-full w-full border-0"
                title="Vista previa de la credencial"
              />
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCredImpresionOpen(false)
                setCredImpresionUrl(null)
                if (credImpresionBlobRef.current) {
                  URL.revokeObjectURL(credImpresionBlobRef.current)
                  credImpresionBlobRef.current = null
                }
              }}
            >
              Cerrar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!credImpresionUrl}
              onClick={() => {
                if (!credImpresionUrl || !credencialBeneficiario) return
                const nombre = [credencialBeneficiario.nombres, credencialBeneficiario.apellidoPaterno]
                  .filter(Boolean).join("-").replace(/\s+/g, "-")
                const a = document.createElement("a")
                a.href = credImpresionUrl
                a.download = `credencial-${nombre}.html`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
            >
              <Download className="size-4" />
              Descargar
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => credImpresionIframeRef.current?.contentWindow?.print()}
            >
              <Printer className="size-4" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
