"use client"

import type { Dispatch, ElementType, ReactNode, SetStateAction } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  FileText,
  Hash,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProfilePhotoUpload } from "@/components/profile-photo-upload"
import { TIPOS_SANGRE_OPCIONES } from "@/lib/beneficiario-alta"
import type { Beneficiario } from "@/services/beneficiarios"
import { cn } from "@/lib/utils"

function SectionCard({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
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

function FieldWrap({ error, className, children }: { error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function IconInput({ icon: Icon, alignTop, children }: { icon: ElementType; alignTop?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon
        className={`pointer-events-none absolute left-3 ${alignTop ? "top-3" : "top-1/2 -translate-y-1/2"} size-4 text-muted-foreground`}
      />
      {children}
    </div>
  )
}

export type BeneficiariosEditDialogProps = {
  /** Si true: no abre expediente al «Regresar»; al cerrar se llama `onEditDialogClose`. */
  inlineMode?: boolean
  onEditDialogClose?: () => void
  showEditDialog: boolean
  setShowEditDialog: (open: boolean) => void
  isSaving: boolean
  overlayAction: "baja" | "eliminar" | null
  setOverlayAction: Dispatch<SetStateAction<"baja" | "eliminar" | null>>
  handleDarDeBaja: () => Promise<boolean>
  handleEditDelete: () => Promise<boolean>
  editForm: Partial<Beneficiario>
  handleEditChange: (field: keyof Beneficiario, value: string | boolean) => void
  editErrors: Record<string, string>
  saveError: string | null
  setSaveError: (msg: string | null) => void
  handleSaveEdit: () => void | Promise<void>
  selectedBeneficiario: Beneficiario | null
  setSelectedBeneficiario: Dispatch<SetStateAction<Beneficiario | null>>
  beneficiarios: Beneficiario[]
  fotoUploading: boolean
  editFotoPreview: string | null
  handleEditFotoSelected: (file: File) => void
  handleDeleteFotoBeneficiario: (curp: string) => Promise<boolean>
  removeFotoConfirmOpen: boolean
  setRemoveFotoConfirmOpen: (open: boolean) => void
  /** Solo se usa cuando `inlineMode` es false (vista Beneficiarios → expediente). */
  setShowExpedienteDialog?: (open: boolean) => void
}

export function BeneficiariosEditDialog({
  inlineMode = false,
  onEditDialogClose,
  showEditDialog,
  setShowEditDialog,
  isSaving,
  overlayAction,
  setOverlayAction,
  handleDarDeBaja,
  handleEditDelete,
  editForm,
  handleEditChange,
  editErrors,
  saveError,
  setSaveError,
  handleSaveEdit,
  selectedBeneficiario,
  setSelectedBeneficiario,
  beneficiarios,
  fotoUploading,
  editFotoPreview,
  handleEditFotoSelected,
  handleDeleteFotoBeneficiario,
  removeFotoConfirmOpen,
  setRemoveFotoConfirmOpen,
  setShowExpedienteDialog,
}: BeneficiariosEditDialogProps) {
  return (
    <>
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          if (!isSaving) {
            setShowEditDialog(open)
            if (!open) {
              setOverlayAction(null)
              onEditDialogClose?.()
            }
          }
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(90vh,880px)] flex flex-col overflow-hidden p-0 gap-0 border-none shadow-2xl sm:rounded-2xl"
        >
          {overlayAction ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
              <div className="mx-4 w-full max-w-sm rounded-2xl border border-border/60 bg-background p-6 text-center shadow-xl zoom-in-95 animate-in">
                {overlayAction === "baja" ? (
                  <>
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="size-6 text-destructive" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">¿Dar de baja?</h3>
                    <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                      El beneficiario se ocultará, pero no se borrará permanentemente. Podrás restaurarlo después.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setOverlayAction(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isSaving}
                        onClick={async () => {
                          const ok = await handleDarDeBaja()
                          if (ok) setOverlayAction(null)
                        }}
                      >
                        Sí, dar de baja
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <XCircle className="size-6 text-destructive" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">¿Eliminar definitivamente?</h3>
                    <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                      Esta acción no se puede deshacer. Se borrarán todos sus datos permanentemente.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setOverlayAction(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isSaving}
                        onClick={async () => {
                          const ok = await handleEditDelete()
                          if (ok) setOverlayAction(null)
                        }}
                      >
                        Sí, eliminar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <div className="z-10 shrink-0 border-b border-border/40 bg-background px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Editar Beneficiario</DialogTitle>
              <DialogDescription className="mt-1">
                Modificando datos de{" "}
                <span className="font-semibold text-foreground">
                  {editForm.nombres} {editForm.apellidoPaterno} {editForm.apellidoMaterno}
                </span>{" "}
                — {editForm.curp || "Sin CURP"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="scrollbar-hide min-h-0 flex-1 space-y-6 overflow-y-auto bg-muted/10 px-6 py-8">
            {saveError ? (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" />
                {saveError}
              </div>
            ) : null}

            <div className="mb-6 overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
              {editForm.estatus === "Baja" ? (
                <div className="flex flex-col gap-4 bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <XCircle className="size-5 shrink-0 text-destructive" aria-hidden />
                      Beneficiario en estado de baja
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Para eliminar el expediente permanentemente, usa el botón rojo en la parte inferior.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditChange("estatus", "Inactivo")}
                    className="shrink-0 self-start bg-background sm:self-auto"
                  >
                    Restaurar expediente
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Actividad del Beneficiario</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {editForm.estatus === "Activo"
                        ? "Actualmente activo y recibiendo beneficios."
                        : "Marcado como inactivo temporalmente."}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`text-sm font-medium transition-colors ${editForm.estatus === "Inactivo" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Inactivo
                    </span>
                    <Switch
                      checked={editForm.estatus === "Activo"}
                      onCheckedChange={(checked) => handleEditChange("estatus", checked ? "Activo" : "Inactivo")}
                      className="data-[state=checked]:bg-success"
                    />
                    <span
                      className={`text-sm font-medium transition-colors ${editForm.estatus === "Activo" ? "text-success" : "text-muted-foreground"}`}
                    >
                      Activo
                    </span>
                  </div>
                </div>
              )}
            </div>

            <SectionCard title="Información Personal" icon={User}>
              <div className="mb-8 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40 hover:bg-primary/10">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-start">
                  <ProfilePhotoUpload
                    variant="form"
                    size="md"
                    fotoPerfilUrl={editForm.fotoPerfilUrl}
                    previewSrc={editFotoPreview}
                    fallbackText={`${editForm.nombres?.[0] ?? ""}${editForm.apellidoPaterno?.[0] ?? ""}`}
                    uploading={fotoUploading}
                    onFileSelected={handleEditFotoSelected}
                    onRemovePhotoRequest={
                      editForm.fotoPerfilUrl || editFotoPreview ? () => setRemoveFotoConfirmOpen(true) : undefined
                    }
                  />
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-foreground">Actualizar Foto de perfil</h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Ajusta el encuadre a tu gusto. <br className="hidden sm:block" />
                      Formatos: JPEG, PNG o WebP (máx. 2 MB).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={editErrors?.nombres}>
                  <Label>Nombres</Label>
                  <Input
                    value={editForm.nombres ?? ""}
                    onChange={(e) => handleEditChange("nombres", e.target.value)}
                    className="bg-background"
                  />
                </FieldWrap>
                <FieldWrap error={editErrors?.apellidoPaterno}>
                  <Label>Apellido Paterno</Label>
                  <Input
                    value={editForm.apellidoPaterno ?? ""}
                    onChange={(e) => handleEditChange("apellidoPaterno", e.target.value)}
                    className="bg-background"
                  />
                </FieldWrap>
                <FieldWrap error={editErrors?.apellidoMaterno}>
                  <Label>Apellido Materno</Label>
                  <Input
                    value={editForm.apellidoMaterno ?? ""}
                    onChange={(e) => handleEditChange("apellidoMaterno", e.target.value)}
                    className="bg-background"
                  />
                </FieldWrap>
                <FieldWrap error={editErrors?.curp}>
                  <Label>CURP</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={editForm.curp ?? ""}
                      onChange={(e) => handleEditChange("curp", e.target.value.toUpperCase())}
                      className={`bg-background pl-9 ${editErrors?.curp ? "border-destructive" : ""}`}
                      maxLength={18}
                    />
                  </div>
                </FieldWrap>
                <FieldWrap error={editErrors?.fechaNacimiento}>
                  <Label>Fecha de Nacimiento</Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={editForm.fechaNacimiento ?? ""}
                      onChange={(e) => handleEditChange("fechaNacimiento", e.target.value)}
                      className={`bg-background pl-9 ${editErrors?.fechaNacimiento ? "border-destructive" : ""}`}
                    />
                  </div>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Género</Label>
                  <Select value={editForm.genero ?? ""} onValueChange={(v) => handleEditChange("genero", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldWrap error={editErrors?.tipoSangre}>
                  <Label htmlFor="edit-tipo-sangre">Tipo de sangre</Label>
                  <Select
                    value={editForm.tipoSangre ? editForm.tipoSangre : "__none__"}
                    onValueChange={(v) => handleEditChange("tipoSangre", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger
                      id="edit-tipo-sangre"
                      className={cn(
                        "bg-background",
                        editErrors?.tipoSangre && "border-destructive",
                        !editForm.tipoSangre && "text-muted-foreground"
                      )}
                    >
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">
                        Sin especificar
                      </SelectItem>
                      {TIPOS_SANGRE_OPCIONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Nombre del Padre / Madre</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={editForm.nombrePadreMadre ?? ""}
                      onChange={(e) => handleEditChange("nombrePadreMadre", e.target.value)}
                      className="bg-background pl-9"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Dirección" icon={MapPin}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Calle y Número</Label>
                  <Input value={editForm.calle ?? ""} onChange={(e) => handleEditChange("calle", e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Colonia</Label>
                  <Input value={editForm.colonia ?? ""} onChange={(e) => handleEditChange("colonia", e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>CP</Label>
                  <Input
                    value={editForm.cp ?? ""}
                    onChange={(e) => handleEditChange("cp", e.target.value)}
                    maxLength={5}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad</Label>
                  <Input value={editForm.ciudad ?? ""} onChange={(e) => handleEditChange("ciudad", e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Input value={editForm.estado ?? ""} onChange={(e) => handleEditChange("estado", e.target.value)} className="bg-background" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Contacto" icon={Phone}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FieldWrap error={editErrors?.telefonoCasa}>
                  <Label>Teléfono Casa</Label>
                  <IconInput icon={Phone}>
                    <Input
                      value={editForm.telefonoCasa ?? ""}
                      onChange={(e) => handleEditChange("telefonoCasa", e.target.value)}
                      className={`bg-background pl-9 ${editErrors?.telefonoCasa ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
                <FieldWrap error={editErrors?.telefonoCelular}>
                  <Label>Teléfono Celular</Label>
                  <IconInput icon={Phone}>
                    <Input
                      value={editForm.telefonoCelular ?? ""}
                      onChange={(e) => handleEditChange("telefonoCelular", e.target.value)}
                      className={`bg-background pl-9 ${editErrors?.telefonoCelular ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
                <FieldWrap error={editErrors?.correoElectronico}>
                  <Label>Correo Electrónico</Label>
                  <IconInput icon={Mail}>
                    <Input
                      type="email"
                      value={editForm.correoElectronico ?? ""}
                      onChange={(e) => handleEditChange("correoElectronico", e.target.value)}
                      className={`bg-background pl-9 ${editErrors?.correoElectronico ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Contacto de Emergencia" icon={HeartPulse}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <IconInput icon={User}>
                    <Input
                      value={editForm.contactoEmergencia ?? ""}
                      onChange={(e) => handleEditChange("contactoEmergencia", e.target.value)}
                      className="bg-background pl-9"
                    />
                  </IconInput>
                </div>
                <FieldWrap error={editErrors?.telefonoEmergencia}>
                  <Label>Teléfono</Label>
                  <IconInput icon={Phone}>
                    <Input
                      value={editForm.telefonoEmergencia ?? ""}
                      onChange={(e) => handleEditChange("telefonoEmergencia", e.target.value)}
                      className={`bg-background pl-9 ${editErrors?.telefonoEmergencia ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>

            <SectionCard title="Médico / Diagnóstico" icon={Stethoscope}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de Espina Bífida</Label>
                  <Select value={editForm.tipo ?? ""} onValueChange={(v) => handleEditChange("tipo", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mielomeningocele">Mielomeningocele</SelectItem>
                      <SelectItem value="Meningocele">Meningocele</SelectItem>
                      <SelectItem value="Oculta">Oculta</SelectItem>
                      <SelectItem value="Lipomeningocele">Lipomeningocele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldWrap error={editErrors?.usaValvula}>
                  <Label>¿Usa válvula?</Label>
                  <Select
                    value={editForm.usaValvula === undefined ? "" : editForm.usaValvula ? "si" : "no"}
                    onValueChange={(v) => handleEditChange("usaValvula", v === "si")}
                  >
                    <SelectTrigger className={`bg-background ${editErrors?.usaValvula ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <div className="space-y-1.5">
                  <Label>Hospital de Nacimiento</Label>
                  <Input
                    value={editForm.hospitalNacimiento ?? ""}
                    onChange={(e) => handleEditChange("hospitalNacimiento", e.target.value)}
                    className="bg-background"
                  />
                </div>
                <FieldWrap error={editErrors?.notas}>
                  <Label>Notas</Label>
                  <IconInput icon={FileText}>
                    <Input
                      value={editForm.notas ?? ""}
                      onChange={(e) => handleEditChange("notas", e.target.value)}
                      placeholder="Observaciones adicionales"
                      className={`bg-background pl-9 ${editErrors?.notas ? "border-destructive" : ""}`}
                    />
                  </IconInput>
                </FieldWrap>
              </div>
            </SectionCard>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/40 bg-background px-6 py-4">
            <div className="flex-1">
              {editForm.estatus === "Baja" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOverlayAction("eliminar")}
                  disabled={isSaving}
                  className="border-destructive/30 text-destructive transition-colors hover:bg-destructive hover:text-white"
                >
                  <XCircle className="mr-2 size-4" /> Eliminar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOverlayAction("baja")}
                  disabled={isSaving}
                  className="border-destructive/30 text-destructive transition-colors hover:bg-destructive hover:text-white"
                >
                  <AlertTriangle className="mr-2 size-4" /> Dar de baja
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                disabled={isSaving}
                onClick={() => {
                  setOverlayAction(null)
                  setSaveError(null)
                  setShowEditDialog(false)
                  if (!inlineMode && selectedBeneficiario) {
                    const latest =
                      beneficiarios.find((x) => x.folio === selectedBeneficiario.folio) ?? selectedBeneficiario
                    setSelectedBeneficiario(latest)
                    setShowExpedienteDialog?.(true)
                  }
                }}
              >
                <ArrowLeft className="size-4" />
                {inlineMode ? "Cerrar" : "Regresar"}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={isSaving}
                className="bg-[#005bb5] text-white hover:bg-[#004a94]"
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeFotoConfirmOpen} onOpenChange={setRemoveFotoConfirmOpen}>
        <AlertDialogContent className="w-full max-w-xs gap-3 p-5 sm:max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar foto de perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará definitivamente. Podrás subir otra foto después si lo deseas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fotoUploading}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={fotoUploading}
              className="gap-2 text-white [&_svg]:text-white"
              onClick={async () => {
                const curp = String(editForm.curp ?? editForm.folio ?? "").trim().toUpperCase()
                if (!curp) return
                const ok = await handleDeleteFotoBeneficiario(curp)
                if (ok) setRemoveFotoConfirmOpen(false)
              }}
            >
              {fotoUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Eliminar foto
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
