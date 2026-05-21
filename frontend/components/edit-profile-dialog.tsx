"use client"

import { useState, useEffect } from "react"
import {
  User, Shield, Lock, Save, CheckCircle, Loader2, Eye, EyeOff, X,
  Phone, MessageSquare,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Label }     from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  getAdmin,
  updateAdmin,
  changePassword,
  solicitarCodigo,
  updateTelefono,
  uploadAdminFotoPerfil,
  type Admin,
} from "@/services/administradores"
import { ProfilePhotoUpload } from "@/components/profile-photo-upload"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── Tipos internos ──────────────────────────────────────────────────────────

interface ProfileForm {
  nombreCompleto: string
  email:          string
}

interface PwForm {
  passwordActual: string
  passwordNueva:  string
  confirmar:      string
  codigo:         string
}

const EMPTY_PW: PwForm = { passwordActual: "", passwordNueva: "", confirmar: "", codigo: "" }

type PwStep = "form" | "codigo"

// ── Props ───────────────────────────────────────────────────────────────────

interface EditProfileDialogProps {
  open:           boolean
  onOpenChange:   (open: boolean) => void
  /** idAdmin del usuario autenticado (viene de useAuth().session.idAdmin) */
  adminId:        number | null
  /** idRol del JWT: solo rol 1 puede guardar nombre y correo; rol 2 puede foto y contraseña */
  sessionIdRol:   number | null
  /** Callback para actualizar el nombre en el header tras guardar */
  onProfileSaved?: (nombreCompleto: string, email: string) => void
  /** Tras subir foto: actualiza avatar en header (cache-bust vía sesión) */
  onFotoPerfilUpdated?: (fotoPerfilUrl: string) => void
}

/**
 * Diálogo flotante para editar el perfil del administrador autenticado.
 * - Sección Perfil: nombre completo y correo (editables).
 * - Sección Contraseña: cambio con contraseña actual + nueva + confirmación.
 * - Sin formulario de login interno: el usuario ya está autenticado.
 */
export function EditProfileDialog({
  open,
  onOpenChange,
  adminId,
  sessionIdRol,
  onProfileSaved,
  onFotoPerfilUpdated,
}: EditProfileDialogProps) {
  /** Super Administrador: puede editar nombre y correo (coincide con PUT backend). */
  const canEditNombreYCorreo = sessionIdRol === 1

  // ── Estado de carga inicial ─────────────────────────────────────────
  const [admin,        setAdmin]       = useState<Admin | null>(null)
  const [loadError,    setLoadError]   = useState<string | null>(null)
  const [loadingAdmin, setLoadingAdmin]= useState(false)

  // ── Estado del formulario de perfil ────────────────────────────────
  const [form,      setForm]     = useState<ProfileForm>({ nombreCompleto: "", email: "" })
  const [saving,    setSaving]   = useState(false)
  const [saveError, setSaveError]= useState<string | null>(null)
  const [saveOk,    setSaveOk]   = useState(false)

  // ── Estado del formulario de contraseña ────────────────────────────
  const [showPwSection, setShowPwSection] = useState(false)
  const [pwStep,   setPwStep]   = useState<PwStep>("form")
  const [pwForm,   setPwForm]   = useState<PwForm>(EMPTY_PW)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError,  setPwError]  = useState<string | null>(null)
  const [pwOk,     setPwOk]     = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  // ── Estado del teléfono ─────────────────────────────────────────────
  const [telefono,        setTelefono]       = useState<string>("")
  const [telefonoSaving,  setTelefonoSaving] = useState(false)
  const [telefonoError,   setTelefonoError]  = useState<string | null>(null)
  const [telefonoOk,      setTelefonoOk]     = useState(false)

  const [fotoUploading, setFotoUploading] = useState(false)
  const [adminFotoRevision, setAdminFotoRevision] = useState(0)

  // ── Cargar datos del admin cuando se abre el diálogo ───────────────
  useEffect(() => {
    if (!open || adminId == null) return

    setAdminFotoRevision(0)
    setSaveOk(false)
    setSaveError(null)
    setPwOk(false)
    setPwError(null)
    setShowPwSection(false)
    setPwForm(EMPTY_PW)

    setTelefono("")
    setTelefonoOk(false)
    setTelefonoError(null)
    setPwStep("form")

    setLoadingAdmin(true)
    setLoadError(null)
    getAdmin(adminId)
      .then((data) => {
        setAdmin(data)
        setForm({ nombreCompleto: data.nombreCompleto, email: data.email })
        setTelefono(data.telefono ?? "")
      })
      .catch(() => setLoadError("No se pudieron cargar los datos. Intenta de nuevo."))
      .finally(() => setLoadingAdmin(false))
  }, [open, adminId])

  // ── Guardar perfil ──────────────────────────────────────────────────
  async function handleSave() {
    if (!admin || !canEditNombreYCorreo) return
    if (!form.nombreCompleto.trim()) { setSaveError("El nombre es obligatorio");  return }
    if (!form.email.trim())          { setSaveError("El correo es obligatorio");   return }

    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await updateAdmin(admin.idAdmin, {
        idRol:          admin.idRol,
        nombreCompleto: form.nombreCompleto.trim(),
        email:          form.email.trim().toLowerCase(),
      })
      setAdmin((prev) => prev ? { ...prev, ...form } : prev)
      setSaveOk(true)
      onProfileSaved?.(form.nombreCompleto.trim(), form.email.trim().toLowerCase())
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  // ── Guardar teléfono ────────────────────────────────────────────────
  async function handleSaveTelefono() {
    if (!admin) return
    const cleaned = telefono.replace(/\D/g, "")
    if (cleaned !== "" && cleaned.length !== 10) {
      setTelefonoError("El teléfono debe tener 10 dígitos"); return
    }
    setTelefonoSaving(true); setTelefonoError(null); setTelefonoOk(false)
    try {
      await updateTelefono(admin.idAdmin, cleaned === "" ? null : cleaned)
      setAdmin((prev) => prev ? { ...prev, telefono: cleaned === "" ? null : cleaned } : prev)
      setTelefono(cleaned)
      setTelefonoOk(true)
      toast.success("Teléfono actualizado")
    } catch (err: unknown) {
      setTelefonoError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setTelefonoSaving(false)
    }
  }

  // ── Cambiar contraseña — paso 1: solicitar código SMS ──────────────
  async function handleSolicitarCodigo() {
    if (!admin) return
    if (!pwForm.passwordActual)                    { setPwError("Ingresa tu contraseña actual"); return }
    if (!pwForm.passwordNueva)                     { setPwError("Ingresa la nueva contraseña");  return }
    if (pwForm.passwordNueva.length < 6)           { setPwError("Mínimo 6 caracteres");          return }
    if (pwForm.passwordNueva !== pwForm.confirmar) { setPwError("Las contraseñas no coinciden"); return }
    if (!admin.telefono) {
      setPwError("Registra un número de teléfono en tu perfil antes de cambiar la contraseña.")
      return
    }

    setPwSaving(true); setPwError(null)
    try {
      await solicitarCodigo(admin.idAdmin)
      setPwStep("codigo")
      toast.success("Código enviado a tu número registrado")
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Error al enviar el código")
    } finally {
      setPwSaving(false)
    }
  }

  // ── Cambiar contraseña — paso 2: confirmar con código ──────────────
  async function handleConfirmarCodigo() {
    if (!admin) return
    if (!pwForm.codigo.trim()) { setPwError("Ingresa el código SMS"); return }

    setPwSaving(true); setPwError(null); setPwOk(false)
    try {
      await changePassword(admin.idAdmin, {
        passwordActual: pwForm.passwordActual,
        passwordNueva:  pwForm.passwordNueva,
        codigo:         pwForm.codigo.trim(),
      })
      setPwOk(true)
      setPwForm(EMPTY_PW)
      setPwStep("form")
      setShowPwSection(false)
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Error al cambiar contraseña")
    } finally {
      setPwSaving(false)
    }
  }

  const NAVY = "#0f4c81"

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-lg rounded-2xl border-0 bg-card p-0 shadow-2xl gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* ── Banner superior con avatar ── */}
        <div className="relative overflow-hidden" style={{ background: NAVY }}>
          {/* Patrón decorativo */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -bottom-8 -right-8 size-40 rounded-full opacity-[0.06]" style={{ backgroundColor: "#E8B043" }} />

          <button
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>

          <div className="relative flex items-center gap-4 px-6 pt-5 pb-5">
            {!loadingAdmin && admin ? (
                <ProfilePhotoUpload
                  variant="form"
                  size="md"
                  imageRevision={adminFotoRevision}
                  fotoPerfilUrl={admin.fotoPerfilUrl}
                  fallbackText={admin.nombreCompleto.slice(0, 2)}
                  uploading={fotoUploading}
                  disabled={saving}
                  onFileSelected={async (file) => {
                    setFotoUploading(true)
                    try {
                      const r = await uploadAdminFotoPerfil(admin.idAdmin, file)
                      setAdmin((p) => (p ? { ...p, fotoPerfilUrl: r.fotoPerfilUrl } : p))
                      setAdminFotoRevision((n) => n + 1)
                      onFotoPerfilUpdated?.(r.fotoPerfilUrl)
                      toast.success("Foto de perfil actualizada")
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "No se pudo subir la foto")
                    } finally {
                      setFotoUploading(false)
                    }
                  }}
                />
              ) : (
                <div className="size-14 rounded-full bg-white/10" />
              )}
              <div className="min-w-0 pr-8">
                <DialogTitle className="text-base font-bold text-white leading-tight truncate">
                  {admin?.nombreCompleto ?? "Perfil"}
                </DialogTitle>
                <p className="text-[11px] text-white/60 truncate mt-0.5">{admin?.email ?? ""}</p>
                {admin && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5">
                    <Shield className="size-3 text-white/60" />
                    <span className="text-[10px] font-semibold text-white/70">{admin.nombreRol}</span>
                  </div>
                )}
              </div>
          </div>
          <DialogDescription className="sr-only">Editar perfil de administrador</DialogDescription>
        </div>

        {/* ── Cuerpo ── */}
        <div className="max-h-[60vh] overflow-y-auto">

          {loadingAdmin && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Cargando datos...</span>
            </div>
          )}

          {loadError && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {loadError}
            </div>
          )}

          {!loadingAdmin && !loadError && admin && (
            <div className="divide-y divide-border/40">

              {/* ── Información de perfil ── */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3" />Información de cuenta
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nombre completo
                    </label>
                    <Input
                      id="ep-nombre"
                      readOnly={!canEditNombreYCorreo}
                      value={form.nombreCompleto}
                      onChange={(e) => { setForm((p) => ({ ...p, nombreCompleto: e.target.value })); setSaveOk(false); setSaveError(null) }}
                      placeholder="Tu nombre"
                      className={cn(
                        "h-9 text-sm border-border/60",
                        canEditNombreYCorreo
                          ? "bg-background focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30"
                          : "cursor-not-allowed bg-muted/40 text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Correo electrónico
                    </label>
                    <Input
                      id="ep-email"
                      type="email"
                      readOnly={!canEditNombreYCorreo}
                      value={form.email}
                      onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setSaveOk(false); setSaveError(null) }}
                      placeholder="correo@ejemplo.com"
                      className={cn(
                        "h-9 text-sm border-border/60",
                        canEditNombreYCorreo
                          ? "bg-background focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30"
                          : "cursor-not-allowed bg-muted/40 text-muted-foreground"
                      )}
                    />
                  </div>
                </div>

                {!canEditNombreYCorreo && (
                  <p className="text-[11px] text-muted-foreground">
                    Solo un Super Administrador puede modificar el nombre y correo.
                  </p>
                )}

                {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
                {saveOk && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-3.5" />Cambios guardados.
                  </div>
                )}

                {canEditNombreYCorreo && (
                  <button
                    type="button" disabled={saving || loadingAdmin} onClick={handleSave}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {saving ? <><Loader2 className="size-3.5 animate-spin" />Guardando...</> : <><Save className="size-3.5" />Guardar cambios</>}
                  </button>
                )}
              </div>

              {/* ── Teléfono (editable por cualquier admin) ── */}
              <div className="px-6 py-5 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3" />Teléfono de contacto
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Número (10 dígitos)
                  </label>
                  <Input
                    id="ep-telefono"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Ej. 8181234567"
                    value={telefono}
                    onChange={(e) => { setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10)); setTelefonoOk(false); setTelefonoError(null) }}
                    className="h-9 text-sm border-border/60 bg-background focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Se usará para recibir el código SMS al cambiar tu contraseña.
                  </p>
                </div>
                {telefonoError && <p className="text-xs text-red-600 dark:text-red-400">{telefonoError}</p>}
                {telefonoOk && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-3.5" />Teléfono actualizado.
                  </div>
                )}
                <button
                  type="button"
                  disabled={telefonoSaving}
                  onClick={handleSaveTelefono}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {telefonoSaving ? <><Loader2 className="size-3.5 animate-spin" />Guardando...</> : <><Phone className="size-3.5" />Guardar teléfono</>}
                </button>
              </div>


              {/* ── Contraseña ── */}
              <div className="px-6 py-5">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="size-3" />Seguridad
                </p>

                {pwOk && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-3.5" />Contraseña actualizada.
                  </div>
                )}

                {!showPwSection ? (
                  <button
                    type="button"
                    onClick={() => { setShowPwSection(true); setPwStep("form"); setPwOk(false) }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/70 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Lock className="size-3.5 text-muted-foreground" />Cambiar contraseña
                  </button>
                ) : pwStep === "form" ? (
                  /* ── Paso 1: capturar contraseñas ── */
                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                    {([
                      { id: "ep-pw-actual", label: "Contraseña actual",  key: "passwordActual" as const, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                      { id: "ep-pw-nueva",  label: "Nueva contraseña",   key: "passwordNueva"  as const, show: showNew,     toggle: () => setShowNew(v => !v), placeholder: "Mínimo 6 caracteres" },
                    ]).map(({ id, label, key, show, toggle, placeholder }) => (
                      <div key={id} className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
                        <div className="relative">
                          <Input id={id} type={show ? "text" : "password"} placeholder={placeholder ?? "••••••••"}
                            value={pwForm[key]}
                            onChange={(e) => { setPwForm((p) => ({ ...p, [key]: e.target.value })); setPwError(null) }}
                            className="h-9 pr-10 text-sm border-border/60 focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30" />
                          <button type="button" onClick={toggle} tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Confirmar contraseña</label>
                      <Input id="ep-pw-confirm" type="password" placeholder="Repite la nueva contraseña"
                        value={pwForm.confirmar}
                        onChange={(e) => { setPwForm((p) => ({ ...p, confirmar: e.target.value })); setPwError(null) }}
                        className="h-9 text-sm border-border/60 focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30" />
                    </div>

                    {!admin?.telefono && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        <Phone className="size-3.5 mt-0.5 shrink-0" />
                        <span>Necesitas un teléfono registrado para recibir el código SMS. Agrégalo en la sección de arriba.</span>
                      </div>
                    )}

                    {pwError && <p className="text-xs text-red-600 dark:text-red-400">{pwError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" disabled={pwSaving}
                        onClick={() => { setShowPwSection(false); setPwForm(EMPTY_PW); setPwError(null); setPwStep("form") }}
                        className="flex-1 rounded-lg border border-border/70 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                        Cancelar
                      </button>
                      <button type="button" disabled={pwSaving || !admin?.telefono} onClick={handleSolicitarCodigo}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: NAVY }}>
                        {pwSaving ? <><Loader2 className="size-3.5 animate-spin" />Enviando...</> : <><MessageSquare className="size-3.5" />Enviar código SMS</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Paso 2: ingresar código SMS ── */
                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                      <MessageSquare className="size-3.5 shrink-0" />
                      <span>Ingresa el código de 6 dígitos enviado al número <strong>{admin?.telefono}</strong>.</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Código SMS</label>
                      <Input
                        id="ep-pw-codigo"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={pwForm.codigo}
                        onChange={(e) => { setPwForm((p) => ({ ...p, codigo: e.target.value.replace(/\D/g, "").slice(0, 6) })); setPwError(null) }}
                        className="h-10 text-center text-xl font-mono tracking-[0.5em] border-border/60 focus-visible:ring-1 focus-visible:ring-[#0f4c81]/30"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPwStep("form"); setPwError(null) }}
                      className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      ¿No llegó el código? Volver y reenviar
                    </button>
                    {pwError && <p className="text-xs text-red-600 dark:text-red-400">{pwError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" disabled={pwSaving}
                        onClick={() => { setShowPwSection(false); setPwForm(EMPTY_PW); setPwError(null); setPwStep("form") }}
                        className="flex-1 rounded-lg border border-border/70 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                        Cancelar
                      </button>
                      <button type="button" disabled={pwSaving || pwForm.codigo.length !== 6} onClick={handleConfirmarCodigo}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: NAVY }}>
                        {pwSaving ? <><Loader2 className="size-3.5 animate-spin" />Verificando...</> : <><CheckCircle className="size-3.5" />Confirmar cambio</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
