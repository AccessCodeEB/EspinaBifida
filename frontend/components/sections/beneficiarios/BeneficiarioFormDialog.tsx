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

  function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf)
    let binary = ""
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return btoa(binary)
  }

  let logoDataUrl = ""
  try {
    const res = await fetch("/logo-espina-bifida.png")
    const buf = await res.arrayBuffer()
    logoDataUrl = `data:image/png;base64,${arrayBufferToBase64(buf)}`
  } catch { /* logo opcional */ }

  let fotoDataUrl = ""
  if (fotoSrc) {
    try {
      const res = await fetch(fotoSrc)
      const buf = await res.arrayBuffer()
      const mime = res.headers.get("content-type") || "image/jpeg"
      fotoDataUrl = `data:${mime};base64,${arrayBufferToBase64(buf)}`
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

  const esActivo = b.estatus === "Activo"
  const statusColor = esActivo ? "#10b981" : "#f43f5e"
  const statusBg   = esActivo ? "rgba(16,185,129,0.18)" : "rgba(244,63,94,0.18)"

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Credencial</title>
<style>
  @page { size: 85.6mm 54mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── FRENTE ───────────────────────────────── */
  .card { width: 85.6mm; height: 54mm; overflow: hidden; position: relative;
          background: linear-gradient(135deg, #0a3460 0%, #1260a8 60%, #0f4c81 100%); }
  .dots { position:absolute;inset:0;opacity:.05;
          background-image:radial-gradient(circle,#fff 1px,transparent 1px);
          background-size:11px 11px; }
  .glow { position:absolute;bottom:0;right:0;width:38mm;height:38mm;
          background:radial-gradient(circle,#fff,transparent);
          opacity:.08;transform:translate(35%,35%);border-radius:50%; }
  .accent { position:absolute;top:0;left:0;right:0;height:1.5px;
            background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b); }

  /* Header */
  .hdr { position:relative;display:flex;align-items:center;justify-content:space-between;
         padding:2.2mm 3mm 1.8mm 3mm;border-bottom:0.3mm solid rgba(255,255,255,0.12); }
  .hdr-logo { height:6mm;width:auto;object-fit:contain; }
  .hdr-right { text-align:right; }
  .hdr-assoc { font-size:4.8pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.55); }
  .hdr-title { font-size:5.5pt;font-weight:700;color:rgba(255,255,255,0.90); }

  /* Body */
  .body { position:relative;display:flex;align-items:stretch;gap:2.5mm;padding:2mm 3mm 1.8mm 3mm;flex:1; }
  .photo-wrap { flex-shrink:0;display:flex;align-items:center; }
  .photo { width:16mm;height:21mm;overflow:hidden;border-radius:1.5mm;
           border:0.5mm solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.1); }
  .photo img { width:100%;height:100%;object-fit:cover;object-position:center; }
  .photo-initials { width:100%;height:100%;display:flex;align-items:center;justify-content:center;
                    font-size:9pt;font-weight:700;color:rgba(255,255,255,0.6); }
  .info { flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0; }
  .name { font-size:7.5pt;font-weight:900;color:#fff;text-transform:uppercase;
          letter-spacing:0.02em;line-height:1.25;word-break:break-word; }
  .curp-line { font-family:Courier New,monospace;font-size:5pt;font-weight:600;
               color:#fbbf24;letter-spacing:0.06em;margin-top:0.8mm; }
  .grid { display:grid;grid-template-columns:1fr 1fr;gap:0.5mm 3mm;margin-top:1.5mm; }
  .field-lbl { font-size:4pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.45); }
  .field-val { font-size:5.5pt;font-weight:700;color:rgba(255,255,255,0.92);line-height:1.3; }
  .field-val.blood { color:#fca5a5; }
  .field-val.folio { font-family:Courier New,monospace; }

  /* Footer */
  .ftr { position:relative;display:flex;align-items:center;justify-content:space-between;
         background:rgba(0,0,0,0.28);padding:1.2mm 3mm; }
  .ftr-tipo { font-size:5pt;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.50); }
  .ftr-status { display:inline-flex;align-items:center;gap:1mm;
                border-radius:99mm;padding:0.4mm 2mm;font-size:5pt;font-weight:700;
                background:${statusBg};color:${statusColor}; }
  .ftr-dot { width:1.5mm;height:1.5mm;border-radius:50%;background:${statusColor}; }

  /* ── REVERSO ──────────────────────────────── */
  .back { width:85.6mm;height:54mm;overflow:hidden;position:relative;background:#fff;page-break-before:always; }
  .back-stripe { height:8mm;background:linear-gradient(135deg,#0a3460,#1260a8);
                 display:flex;align-items:center;padding:0 3mm;gap:2mm; }
  .back-logo { height:5mm;width:auto;object-fit:contain; }
  .back-stripe-txt { font-size:5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.80); }
  .back-body { padding:1.5mm 3mm 1mm 3mm;display:flex;flex-direction:column;gap:1mm; }
  .bk-row { display:flex;gap:2mm;align-items:baseline;line-height:1.4; }
  .bk-lbl { font-size:4.5pt;color:#555;white-space:nowrap;min-width:20mm; }
  .bk-val { font-size:5pt;font-weight:700;color:#111;word-break:break-word; }
  .bk-sep { border-top:0.3mm solid #ddd;margin:1mm 0; }
  .bk-grid { display:grid;grid-template-columns:1fr 1fr;gap:0.5mm 3mm; }
  .back-footer { position:absolute;bottom:0;left:0;right:0;border-top:0.3mm solid #ddd;
                 display:flex;padding:1.2mm 3mm;align-items:flex-end; }
  .assoc-block { flex:1; }
  .assoc-name { font-size:4.8pt;font-weight:700;color:#0a3d6e;line-height:1.4; }
  .assoc-detail { font-size:4pt;color:#555;line-height:1.5; }
  .qr-placeholder { width:12mm;height:12mm;border:0.4mm solid #ccc;display:flex;align-items:center;
                    justify-content:center;font-size:3.5pt;color:#aaa;text-align:center; }
</style>
</head>
<body>

<!-- FRENTE -->
<div class="card">
  <div class="dots"></div>
  <div class="glow"></div>
  <div class="accent"></div>

  <div class="hdr">
    ${logoHtml ? `<img class="hdr-logo" src="${logoDataUrl}" alt="AEBNL" />` : `<span style="font-size:6pt;font-weight:900;color:#fff;">AEBNL</span>`}
    <div class="hdr-right">
      <div class="hdr-assoc">Asociación Espina Bífida NL</div>
      <div class="hdr-title">Credencial de Beneficiario</div>
    </div>
  </div>

  <div class="body">
    <div class="photo-wrap">
      <div class="photo">${photoHtml}</div>
    </div>
    <div class="info">
      <div>
        <div class="name">${nombre}</div>
        ${b.curp ? `<div class="curp-line">${b.curp}</div>` : ""}
      </div>
      <div class="grid">
        ${b.fechaNacimiento ? `<div><div class="field-lbl">Fecha de Nac.</div><div class="field-val">${fv(b.fechaNacimiento)}</div></div>` : ""}
        ${b.tipoSangre ? `<div><div class="field-lbl">Tipo de Sangre</div><div class="field-val blood">${fv(b.tipoSangre)}</div></div>` : ""}
        ${b.numeroCredencial ? `<div><div class="field-lbl">No. Credencial</div><div class="field-val">${fv(b.numeroCredencial)}</div></div>` : ""}
        <div><div class="field-lbl">Folio</div><div class="field-val folio">${b.folio ?? ""}</div></div>
        ${b.genero ? `<div><div class="field-lbl">Género</div><div class="field-val">${fv(b.genero)}</div></div>` : ""}
        ${b.fechaAlta ? `<div><div class="field-lbl">Expedición</div><div class="field-val">${fv(b.fechaAlta)}</div></div>` : ""}
      </div>
    </div>
  </div>

  <div class="ftr">
    <span class="ftr-tipo">${b.tipo ?? "Beneficiario"}${b.genero ? " · " + b.genero : ""}</span>
    <span class="ftr-status"><span class="ftr-dot"></span>${b.estatus}</span>
  </div>
</div>

<!-- REVERSO -->
<div class="back">
  <div class="back-stripe">
    ${logoHtml ? `<img class="back-logo" src="${logoDataUrl}" alt="AEBNL" />` : ""}
    <span class="back-stripe-txt">Asociación de Espina Bífida de Nuevo León, A.B.P.</span>
  </div>
  <div class="back-body">
    <div class="bk-grid">
      <div class="bk-row"><span class="bk-lbl">Tipo de Sangre:</span><span class="bk-val">${fv(b.tipoSangre)}</span></div>
      <div class="bk-row"><span class="bk-lbl">Usa Válvula:</span><span class="bk-val">${fv(b.usaValvula)}</span></div>
    </div>
    <div class="bk-sep"></div>
    <div class="bk-row"><span class="bk-lbl">Nombre padres/tutor:</span><span class="bk-val">${fv(b.nombrePadreMadre)}</span></div>
    <div class="bk-sep"></div>
    <div style="font-size:4.5pt;font-weight:700;color:#333;margin-bottom:0.5mm;">En caso de accidente avisar a:</div>
    <div class="bk-row"><span class="bk-lbl">${fv(b.contactoEmergencia)}</span><span class="bk-val">Tel: ${fv(b.telefonoEmergencia || b.telefonoCasa)}</span></div>
    ${b.correoElectronico ? `<div class="bk-row" style="margin-top:0.3mm;"><span class="bk-lbl">Correo:</span><span class="bk-val">${fv(b.correoElectronico)}</span></div>` : ""}
  </div>
  <div class="back-footer">
    <div class="assoc-block">
      <div class="assoc-name">ASOCIACIÓN DE ESPINA BÍFIDA<br/>DE NUEVO LEÓN, A.B.P.</div>
      <div class="assoc-detail">Monterrey, Nuevo León · www.espinabifida.org.mx</div>
    </div>
    <div class="qr-placeholder">QR<br/>Folio</div>
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
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40">

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

          {/* ── Control Interno ── */}
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Control interno</p>
              <div className="flex flex-col gap-1.5 sm:max-w-[200px]">
                <Label htmlFor="alta-tipo-cuota">Tipo de cuota</Label>
                <Select
                  value={altaForm.tipoCuota ?? ""}
                  onValueChange={(v) => handleAltaChange("tipoCuota", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="alta-tipo-cuota" className="h-10 text-sm bg-background">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground">Sin asignar</SelectItem>
                    <SelectItem value="A">Cuota A (menor)</SelectItem>
                    <SelectItem value="B">Cuota B (mayor)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Determina el precio aplicado al registrar servicios.</p>
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
        <DialogContent className="max-w-[480px] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-none p-0 shadow-2xl sm:rounded-2xl">
          {credencialBeneficiario && (() => {
            const credPhoto = resolvePublicUploadUrl(credencialBeneficiario.fotoPerfilUrl ?? undefined)
            const nombre = [credencialBeneficiario.nombres, credencialBeneficiario.apellidoPaterno, credencialBeneficiario.apellidoMaterno].filter(Boolean).join(" ")
            const esActivo = credencialBeneficiario.estatus === "Activo"
            const iniciales = `${credencialBeneficiario.nombres?.[0] ?? ""}${credencialBeneficiario.apellidoPaterno?.[0] ?? ""}`
            return (
              <>
                {/* ── Header del dialog ── */}
                <div className="flex items-center justify-between border-b border-border/50 px-5 py-2.5">
                  <div>
                    <DialogTitle className="text-sm font-bold text-foreground">Credencial digital</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Vista previa · CR80</DialogDescription>
                  </div>
                </div>

                {/* ── Tarjeta CR80 ── */}
                <div className="bg-muted/30 px-5 py-3">
                  {/* Proporciones CR80: 85.6mm × 54mm ≈ 1.586 ratio */}
                  <div className="w-full overflow-hidden rounded-xl shadow-2xl" style={{ aspectRatio: "85.6/54" }}>

                    {/* Cara frontal */}
                    <div className="relative flex h-full flex-col" style={{ background: "linear-gradient(135deg, #0a3460 0%, #1260a8 58%, #0f4c81 100%)" }}>

                      {/* Decoraciones de fondo */}
                      <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "11px 11px" }} />
                      <div className="pointer-events-none absolute bottom-0 right-0 rounded-full opacity-[0.07]"
                        style={{ width: "160px", height: "160px", background: "radial-gradient(circle, #fff, transparent)", transform: "translate(35%, 35%)" }} />

                      {/* Línea dorada superior */}
                      <div className="absolute top-0 left-0 right-0 z-10" style={{ height: "2.5px", background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)" }} />

                      {/* ── Header institucional ── */}
                      <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-1.5"
                        style={{ background: "rgba(0,0,0,0.18)" }}>
                        <div className="flex shrink-0 items-center justify-center rounded bg-white" style={{ padding: "2px", width: "20px", height: "20px" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logo-espina-bifida.png" alt="" style={{ height: "14px", width: "auto", objectFit: "contain" }} />
                        </div>
                        <div className="flex flex-1 min-w-0 items-baseline justify-between gap-2">
                          <p style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>
                            Asociación Espina Bífida de Nuevo León
                          </p>
                          <p style={{ fontSize: "7.5px", fontWeight: 800, color: "rgba(255,255,255,0.90)", lineHeight: 1, whiteSpace: "nowrap" }}>
                            Credencial de Beneficiario
                          </p>
                        </div>
                      </div>

                      {/* ── Cuerpo: foto + datos ── */}
                      <div className="relative z-10 flex flex-1 min-h-0 items-stretch gap-3 px-3 py-2.5">

                        {/* Foto: columna izquierda, tamaño retrato proporcional */}
                        <div className="shrink-0 self-center">
                          <div className="overflow-hidden border-2 border-white/35 shadow-lg bg-white/10"
                            style={{ width: "72px", height: "90px", borderRadius: "8px" }}>
                            {credPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={credPhoto} alt="" className="size-full object-cover object-center" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-xl font-black" style={{ color: "rgba(255,255,255,0.65)" }}>
                                {iniciales}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Datos: columna derecha, centrada verticalmente */}
                        <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: "8px" }}>

                          {/* Nombre + CURP */}
                          <div>
                            <p style={{ fontSize: "15px", fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.15, wordBreak: "break-word" }}>
                              {nombre}
                            </p>
                            {credencialBeneficiario.curp && (
                              <p style={{ fontFamily: "Courier New, monospace", fontSize: "9px", fontWeight: 600, color: "#fbbf24", letterSpacing: "0.08em", marginTop: "3px" }}>
                                {credencialBeneficiario.curp}
                              </p>
                            )}
                          </div>

                          {/* Divisor */}
                          <div style={{ height: "1px", background: "rgba(255,255,255,0.18)" }} />

                          {/* Grid de campos — 2 columnas */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                            {credencialBeneficiario.fechaNacimiento && (
                              <div>
                                <p style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.48)", marginBottom: "2px" }}>Fecha de Nac.</p>
                                <p style={{ fontSize: "11px", fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>{credencialBeneficiario.fechaNacimiento}</p>
                              </div>
                            )}
                            {credencialBeneficiario.tipoSangre && (
                              <div>
                                <p style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.48)", marginBottom: "2px" }}>Tipo de Sangre</p>
                                <p style={{ fontSize: "11px", fontWeight: 700, color: "#fca5a5", lineHeight: 1.1 }}>{credencialBeneficiario.tipoSangre}</p>
                              </div>
                            )}
                            <div>
                              <p style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.48)", marginBottom: "2px" }}>Folio</p>
                              <p style={{ fontFamily: "Courier New, monospace", fontSize: "11px", fontWeight: 700, color: "#fde68a", lineHeight: 1.1 }}>{credencialBeneficiario.folio}</p>
                            </div>
                            {credencialBeneficiario.genero && (
                              <div>
                                <p style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.48)", marginBottom: "2px" }}>Género</p>
                                <p style={{ fontSize: "11px", fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>{credencialBeneficiario.genero === "M" ? "Masculino" : credencialBeneficiario.genero === "F" ? "Femenino" : credencialBeneficiario.genero}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Footer: tipo + estatus ── */}
                      <div className="relative z-10 shrink-0 flex items-center justify-between px-3 py-1"
                        style={{ background: "rgba(0,0,0,0.28)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <p style={{ fontSize: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.50)" }}>
                          {credencialBeneficiario.tipo ?? "Beneficiario"}
                        </p>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          borderRadius: "999px", padding: "2px 8px",
                          background: esActivo ? "rgba(16,185,129,0.20)" : "rgba(244,63,94,0.20)",
                          color: esActivo ? "#10b981" : "#f43f5e",
                        }}>
                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: esActivo ? "#10b981" : "#f43f5e", flexShrink: 0 }} />
                          <p style={{ fontSize: "6.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                            {credencialBeneficiario.estatus}
                          </p>
                        </div>
                      </div>

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
