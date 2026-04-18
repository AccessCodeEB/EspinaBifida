"use client"

import { useState, useEffect } from "react"
import {
  User, Shield, Lock, Save, CheckCircle, Loader2, Eye, EyeOff, X,
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
  type Admin,
} from "@/services/administradores"

// ── Tipos internos ──────────────────────────────────────────────────────────

interface ProfileForm {
  nombreCompleto: string
  email:          string
}

interface PwForm {
  passwordActual: string
  passwordNueva:  string
  confirmar:      string
}

const EMPTY_PW: PwForm = { passwordActual: "", passwordNueva: "", confirmar: "" }

// ── Props ───────────────────────────────────────────────────────────────────

interface EditProfileDialogProps {
  open:           boolean
  onOpenChange:   (open: boolean) => void
  /** idAdmin del usuario autenticado (viene de useAuth().session.idAdmin) */
  adminId:        number | null
  /** Callback para actualizar el nombre en el header tras guardar */
  onProfileSaved?: (nombreCompleto: string, email: string) => void
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
  onProfileSaved,
}: EditProfileDialogProps) {

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
  const [pwForm,   setPwForm]   = useState<PwForm>(EMPTY_PW)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError,  setPwError]  = useState<string | null>(null)
  const [pwOk,     setPwOk]     = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  // ── Cargar datos del admin cuando se abre el diálogo ───────────────
  useEffect(() => {
    if (!open || adminId == null) return

    setSaveOk(false)
    setSaveError(null)
    setPwOk(false)
    setPwError(null)
    setShowPwSection(false)
    setPwForm(EMPTY_PW)

    setLoadingAdmin(true)
    setLoadError(null)
    getAdmin(adminId)
      .then((data) => {
        setAdmin(data)
        setForm({ nombreCompleto: data.nombreCompleto, email: data.email })
      })
      .catch(() => setLoadError("No se pudieron cargar los datos. Intenta de nuevo."))
      .finally(() => setLoadingAdmin(false))
  }, [open, adminId])

  // ── Guardar perfil ──────────────────────────────────────────────────
  async function handleSave() {
    if (!admin) return
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

  // ── Cambiar contraseña ──────────────────────────────────────────────
  async function handleChangePassword() {
    if (!admin) return
    if (!pwForm.passwordActual)                      { setPwError("Ingresa tu contraseña actual");  return }
    if (!pwForm.passwordNueva)                       { setPwError("Ingresa la nueva contraseña");   return }
    if (pwForm.passwordNueva.length < 6)             { setPwError("Mínimo 6 caracteres");           return }
    if (pwForm.passwordNueva !== pwForm.confirmar)   { setPwError("Las contraseñas no coinciden");  return }

    setPwSaving(true)
    setPwError(null)
    setPwOk(false)
    try {
      await changePassword(admin.idAdmin, {
        passwordActual: pwForm.passwordActual,
        passwordNueva:  pwForm.passwordNueva,
      })
      setPwOk(true)
      setPwForm(EMPTY_PW)
      setShowPwSection(false)
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Error al cambiar contraseña")
    } finally {
      setPwSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-md rounded-3xl border border-border/40 bg-background p-0 shadow-2xl gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* ── Cabecera ─────────────────────────────────────────────── */}
        <DialogHeader className="border-b border-border/40 px-6 py-5 bg-background">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-[18px] font-semibold text-foreground tracking-tight">
                Editar perfil
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">
                Actualiza tu información de cuenta.
              </DialogDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        {/* ── Cuerpo ───────────────────────────────────────────────── */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-7 space-y-7">

          {/* Estado de carga */}
          {loadingAdmin && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Cargando datos...</span>
            </div>
          )}

          {/* Error de carga */}
          {loadError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {!loadingAdmin && !loadError && admin && (
            <>
              {/* ── Rol (solo lectura) ──────────────────────────────── */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Shield className="size-3.5" />
                  Rol
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Shield className="size-4" />
                  </div>
                  <span className="text-[14px] font-semibold text-foreground">
                    {admin.nombreRol}
                  </span>
                </div>
              </section>

              <Separator className="bg-border/50" />

              {/* ── Perfil editable ─────────────────────────────────── */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <User className="size-3.5" />
                  Perfil
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ep-nombre" className="text-[13px] font-semibold text-foreground">
                      Nombre completo
                    </Label>
                    <Input
                      id="ep-nombre"
                      value={form.nombreCompleto}
                      onChange={(e) => { setForm((p) => ({ ...p, nombreCompleto: e.target.value })); setSaveOk(false); setSaveError(null) }}
                      placeholder="Tu nombre"
                      className="h-10 bg-card border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ep-email" className="text-[13px] font-semibold text-foreground">
                      Correo electrónico
                    </Label>
                    <Input
                      id="ep-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setSaveOk(false); setSaveError(null) }}
                      placeholder="correo@ejemplo.com"
                      className="h-10 bg-card border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm transition-all"
                    />
                  </div>
                </div>

                {saveError && (
                  <p className="mt-3 text-xs text-destructive">{saveError}</p>
                )}
                {saveOk && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
                    <CheckCircle className="size-3.5" />
                    Datos guardados correctamente.
                  </div>
                )}

                <Button
                  id="ep-save"
                  type="button"
                  className="mt-4 w-full gap-2 h-10 shadow-sm"
                  disabled={saving || loadingAdmin}
                  onClick={handleSave}
                >
                  {saving
                    ? <><Loader2 className="size-4 animate-spin" /> Guardando...</>
                    : <><Save    className="size-4" />              Guardar cambios</>
                  }
                </Button>
              </section>

              <Separator className="bg-border/50" />

              {/* ── Contraseña ──────────────────────────────────────── */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Lock className="size-3.5" />
                  Contraseña
                </div>

                {pwOk && (
                  <div className="mb-4 flex items-center gap-2 text-xs font-medium text-success">
                    <CheckCircle className="size-3.5" />
                    Contraseña actualizada correctamente.
                  </div>
                )}

                {!showPwSection ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 h-10 border-border/60 bg-card shadow-sm hover:bg-accent transition-colors"
                    onClick={() => { setShowPwSection(true); setPwOk(false) }}
                  >
                    <Lock className="size-4 text-muted-foreground" />
                    Cambiar contraseña
                  </Button>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/20 p-5 shadow-sm">

                    {/* Contraseña actual */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ep-pw-actual" className="text-xs font-semibold">Contraseña actual</Label>
                      <div className="relative">
                        <Input
                          id="ep-pw-actual"
                          type={showCurrent ? "text" : "password"}
                          placeholder="••••••••"
                          value={pwForm.passwordActual}
                          onChange={(e) => { setPwForm((p) => ({ ...p, passwordActual: e.target.value })); setPwError(null) }}
                          className="h-9 pr-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                        >
                          {showCurrent ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Nueva contraseña */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ep-pw-nueva" className="text-xs font-semibold">Nueva contraseña</Label>
                      <div className="relative">
                        <Input
                          id="ep-pw-nueva"
                          type={showNew ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={pwForm.passwordNueva}
                          onChange={(e) => { setPwForm((p) => ({ ...p, passwordNueva: e.target.value })); setPwError(null) }}
                          className="h-9 pr-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showNew ? "Ocultar" : "Mostrar"}
                        >
                          {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar contraseña */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ep-pw-confirm" className="text-xs font-semibold">Confirmar contraseña</Label>
                      <Input
                        id="ep-pw-confirm"
                        type="password"
                        placeholder="Repite la nueva contraseña"
                        value={pwForm.confirmar}
                        onChange={(e) => { setPwForm((p) => ({ ...p, confirmar: e.target.value })); setPwError(null) }}
                        className="h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                      />
                    </div>

                    {pwError && <p className="text-xs text-destructive">{pwError}</p>}

                    <div className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-9 shadow-sm"
                        disabled={pwSaving}
                        onClick={() => { setShowPwSection(false); setPwForm(EMPTY_PW); setPwError(null) }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        id="ep-pw-save"
                        type="button"
                        className="flex-1 gap-2 h-9 shadow-sm"
                        disabled={pwSaving}
                        onClick={handleChangePassword}
                      >
                        {pwSaving
                          ? <><Loader2 className="size-3.5 animate-spin" /> Guardando...</>
                          : "Confirmar"
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
