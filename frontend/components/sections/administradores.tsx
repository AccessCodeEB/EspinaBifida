"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search, X, Loader2, RefreshCw, Plus, ShieldCheck, ShieldOff,
  Pencil, UserCog, Inbox, KeyRound, Eye, EyeOff, Users, Mail, Shield,
} from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/friendly-error"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type Admin, type CreateAdminBody, type UpdateAdminBody,
  getAllAdmins, createAdmin, updateAdmin, deactivateAdmin, resetPasswordBySuper,
} from "@/services/administradores"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const ROLES = [
  { id: 1, label: "Super Admin" },
  { id: 2, label: "Recepción" },
]

function rolLabel(idRol: number) {
  return ROLES.find((r) => r.id === idRol)?.label ?? `Rol ${idRol}`
}

const EMPTY_CREATE: CreateAdminBody = { idRol: 2, nombreCompleto: "", email: "", password: "" }
const EMPTY_EDIT: UpdateAdminBody   = { idRol: 2, nombreCompleto: "", email: "" }

// ─── Campo de formulario ──────────────────────────────────────────────────────

function Field({
  label, id, value, onChange, error, type = "text", placeholder, autoComplete,
}: {
  label: string; id: string; value: string
  onChange: (v: string) => void; error?: string
  type?: string; placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === "password"
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none",
            "placeholder:text-muted-foreground/50 transition-colors",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            isPassword && "pr-9",
            error ? "border-destructive" : "border-border/70",
          )}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function RolSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground">Rol</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
      <div>
        <DialogTitle className="text-sm font-bold text-foreground">{title}</DialogTitle>
        {subtitle && <DialogDescription className="mt-0.5 text-xs text-muted-foreground">{subtitle}</DialogDescription>}
      </div>
      <button
        onClick={onClose}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdministradoresSection() {
  const { session } = useAuth()
  const esSuper = session?.idRol === 1

  const [rows, setRows]             = useState<Admin[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [showCreate, setShowCreate]     = useState(false)
  const [createForm, setCreateForm]     = useState<CreateAdminBody>(EMPTY_CREATE)
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateAdminBody, string>>>({})
  const [saving, setSaving]             = useState(false)

  const [editTarget, setEditTarget] = useState<Admin | null>(null)
  const [editForm, setEditForm]     = useState<UpdateAdminBody>(EMPTY_EDIT)
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UpdateAdminBody, string>>>({})
  const [editSaving, setEditSaving] = useState(false)

  const [pwTarget, setPwTarget]   = useState<Admin | null>(null)
  const [pwNueva, setPwNueva]     = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwErrors, setPwErrors]   = useState<{ pwNueva?: string; pwConfirm?: string }>({})
  const [pwSaving, setPwSaving]   = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState<Admin | null>(null)
  const [deactivating, setDeactivating]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await getAllAdmins()) }
    catch (e: unknown) { toast.error(friendlyError(e, "No se pudieron cargar los administradores")) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase()
    if (!t) return rows
    return rows.filter(a =>
      a.nombreCompleto.toLowerCase().includes(t) ||
      a.email.toLowerCase().includes(t) ||
      rolLabel(a.idRol).toLowerCase().includes(t)
    )
  }, [rows, searchTerm])

  // ── Create ────────────────────────────────────────────────────────────────

  function validateCreate() {
    const e: Partial<Record<keyof CreateAdminBody, string>> = {}
    if (!createForm.nombreCompleto.trim()) e.nombreCompleto = "Requerido"
    if (!createForm.email.trim()) e.email = "Requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = "Correo inválido"
    if (!createForm.password) e.password = "Requerida"
    else if (createForm.password.length < 8) e.password = "Mínimo 8 caracteres"
    setCreateErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validateCreate()) return
    setSaving(true)
    try {
      await createAdmin({ ...createForm, nombreCompleto: createForm.nombreCompleto.trim(), email: createForm.email.trim().toLowerCase() })
      toast.success("Administrador creado")
      setShowCreate(false); setCreateForm(EMPTY_CREATE); await load()
    } catch (e: unknown) { toast.error(friendlyError(e, "No se pudo crear")) }
    finally { setSaving(false) }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(admin: Admin) {
    setEditTarget(admin)
    setEditForm({ idRol: admin.idRol, nombreCompleto: admin.nombreCompleto, email: admin.email })
    setEditErrors({})
  }

  function validateEdit() {
    const e: Partial<Record<keyof UpdateAdminBody, string>> = {}
    if (!editForm.nombreCompleto.trim()) e.nombreCompleto = "Requerido"
    if (!editForm.email.trim()) e.email = "Requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) e.email = "Correo inválido"
    setEditErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleEdit() {
    if (!editTarget || !validateEdit()) return
    setEditSaving(true)
    try {
      await updateAdmin(editTarget.idAdmin, { ...editForm, nombreCompleto: editForm.nombreCompleto.trim(), email: editForm.email.trim().toLowerCase() })
      toast.success("Administrador actualizado")
      setEditTarget(null); await load()
    } catch (e: unknown) { toast.error(friendlyError(e, "No se pudo actualizar")) }
    finally { setEditSaving(false) }
  }

  // ── Reset password ────────────────────────────────────────────────────────

  function openResetPw(admin: Admin) {
    setPwTarget(admin); setPwNueva(""); setPwConfirm(""); setPwErrors({})
  }

  function validatePw() {
    const e: { pwNueva?: string; pwConfirm?: string } = {}
    if (!pwNueva) e.pwNueva = "Requerida"
    else if (pwNueva.length < 8) e.pwNueva = "Mínimo 8 caracteres"
    if (!pwConfirm) e.pwConfirm = "Confirma la contraseña"
    else if (pwNueva !== pwConfirm) e.pwConfirm = "Las contraseñas no coinciden"
    setPwErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleResetPw() {
    if (!pwTarget || !validatePw()) return
    setPwSaving(true)
    try {
      await resetPasswordBySuper(pwTarget.idAdmin, pwNueva)
      toast.success(`Contraseña restablecida para ${pwTarget.nombreCompleto}`)
      setPwTarget(null)
    } catch (e: unknown) { toast.error(friendlyError(e, "No se pudo restablecer la contraseña")) }
    finally { setPwSaving(false) }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await deactivateAdmin(deactivateTarget.idAdmin)
      toast.success(`${deactivateTarget.nombreCompleto} desactivado`)
      setDeactivateTarget(null); await load()
    } catch (e: unknown) { toast.error(friendlyError(e, "No se pudo desactivar")) }
    finally { setDeactivating(false) }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!esSuper) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
          <ShieldOff className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">Acceso restringido</p>
        <p className="text-xs text-muted-foreground">Solo los super-administradores pueden gestionar cuentas.</p>
      </div>
    )
  }

  const activos   = rows.filter(a => a.activo === 1).length
  const inactivos = rows.length - activos

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Administradores</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Gestión de cuentas de acceso al sistema.</p>
        </div>
        <Button onClick={() => { setCreateForm(EMPTY_CREATE); setCreateErrors({}); setShowCreate(true) }} className="gap-2 shrink-0">
          <Plus className="size-4" /> Nuevo administrador
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: rows.length, icon: UserCog,     color: "text-primary bg-primary/10" },
          { label: "Activos",   value: activos,     icon: ShieldCheck, color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
          { label: "Inactivos", value: inactivos,   icon: ShieldOff,   color: "text-muted-foreground bg-muted/50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 shadow-sm">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", color)}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-foreground">
            {loading ? "Cargando…" : `${filtered.length} cuenta${filtered.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Buscar nombre, correo o rol…"
                className="h-8 w-full rounded-lg border border-border/70 bg-muted/40 pl-8 pr-8 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => void load()}
              className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Recargar"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cargando…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted/50">
              <Inbox className="size-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground">
              {searchTerm ? "Ninguna cuenta coincide." : "No hay administradores registrados."}
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-xs font-medium text-primary hover:underline">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="py-2.5 pl-5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Users className="size-3" />ADMINISTRADOR</span></th>
                  <th className="hidden py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground md:table-cell"><span className="inline-flex items-center gap-1"><Mail className="size-3" />CORREO</span></th>
                  <th className="py-2.5 text-left text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><Shield className="size-3" />ROL</span></th>
                  <th className="py-2.5 text-center text-[10px] font-bold tracking-widest text-foreground"><span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" />ESTATUS</span></th>
                  <th className="py-2.5 pr-5 text-right text-[10px] font-bold tracking-widest text-foreground">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((admin) => (
                  <tr key={admin.idAdmin} className="transition-colors hover:bg-muted/20">
                    <td className="py-3 pl-5">
                      <p className="text-xs font-semibold text-foreground">{admin.nombreCompleto}</p>
                      <p className="text-[10px] text-muted-foreground md:hidden">{admin.email}</p>
                    </td>
                    <td className="hidden py-3 text-xs text-muted-foreground md:table-cell">{admin.email}</td>
                    <td className="py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                        admin.idRol === 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {rolLabel(admin.idRol)}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                        admin.activo === 1
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}>
                        <span className={cn("size-1.5 rounded-full shrink-0", admin.activo === 1 ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                        {admin.activo === 1 ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          title="Editar"
                          disabled={admin.activo !== 1}
                          onClick={() => openEdit(admin)}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {admin.activo === 1 && (
                          <button
                            title="Cambiar contraseña"
                            onClick={() => openResetPw(admin)}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <KeyRound className="size-3.5" />
                          </button>
                        )}
                        {admin.activo === 1 && admin.idAdmin !== session?.idAdmin && (
                          <button
                            title="Desactivar"
                            onClick={() => setDeactivateTarget(admin)}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <ShieldOff className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Crear ── */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!saving) setShowCreate(o) }}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 overflow-hidden border border-border/60 shadow-xl sm:rounded-xl">
          <ModalHeader title="Nuevo administrador" subtitle="Crea una cuenta de acceso al sistema." onClose={() => { if (!saving) setShowCreate(false) }} />
          <div className="space-y-4 px-5 py-5">
            <Field label="Nombre completo" id="c-nombre" value={createForm.nombreCompleto} onChange={(v) => setCreateForm(f => ({ ...f, nombreCompleto: v }))} error={createErrors.nombreCompleto} placeholder="Ej. María García López" />
            <Field label="Correo electrónico" id="c-email" type="email" value={createForm.email} onChange={(v) => setCreateForm(f => ({ ...f, email: v }))} error={createErrors.email} placeholder="correo@ejemplo.com" autoComplete="off" />
            <RolSelect value={createForm.idRol} onChange={(v) => setCreateForm(f => ({ ...f, idRol: v }))} />
            <Field label="Contraseña temporal" id="c-pw" type="password" value={createForm.password} onChange={(v) => setCreateForm(f => ({ ...f, password: v }))} error={createErrors.password} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => { if (!saving) setShowCreate(false) }} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={() => void handleCreate()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Crear cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Editar ── */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!editSaving && !o) setEditTarget(null) }}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 overflow-hidden border border-border/60 shadow-xl sm:rounded-xl">
          <ModalHeader title="Editar administrador" subtitle={editTarget?.email} onClose={() => { if (!editSaving) setEditTarget(null) }} />
          <div className="space-y-4 px-5 py-5">
            <Field label="Nombre completo" id="e-nombre" value={editForm.nombreCompleto} onChange={(v) => setEditForm(f => ({ ...f, nombreCompleto: v }))} error={editErrors.nombreCompleto} />
            <Field label="Correo electrónico" id="e-email" type="email" value={editForm.email} onChange={(v) => setEditForm(f => ({ ...f, email: v }))} error={editErrors.email} autoComplete="off" />
            <RolSelect value={editForm.idRol} onChange={(v) => setEditForm(f => ({ ...f, idRol: v }))} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => { if (!editSaving) setEditTarget(null) }} disabled={editSaving}>Cancelar</Button>
            <Button size="sm" onClick={() => void handleEdit()} disabled={editSaving} className="gap-1.5">
              {editSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cambiar contraseña ── */}
      <Dialog open={pwTarget !== null} onOpenChange={(o) => { if (!pwSaving && !o) setPwTarget(null) }}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 overflow-hidden border border-border/60 shadow-xl sm:rounded-xl">
          <ModalHeader
            title="Restablecer contraseña"
            subtitle={`Cuenta: ${pwTarget?.nombreCompleto ?? ""}`}
            onClose={() => { if (!pwSaving) setPwTarget(null) }}
          />
          <div className="space-y-4 px-5 py-5">
            <Field label="Nueva contraseña" id="pw-nueva" type="password" value={pwNueva} onChange={setPwNueva} error={pwErrors.pwNueva} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            <Field label="Confirmar contraseña" id="pw-confirm" type="password" value={pwConfirm} onChange={setPwConfirm} error={pwErrors.pwConfirm} placeholder="Repite la contraseña" autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => { if (!pwSaving) setPwTarget(null) }} disabled={pwSaving}>Cancelar</Button>
            <Button size="sm" onClick={() => void handleResetPw()} disabled={pwSaving} className="gap-1.5">
              {pwSaving ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
              Restablecer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar desactivación ── */}
      <AlertDialog open={deactivateTarget !== null} onOpenChange={(o) => { if (!deactivating && !o) setDeactivateTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              La cuenta de{" "}
              <span className="font-semibold text-foreground">{deactivateTarget?.nombreCompleto}</span>{" "}
              quedará inactiva y no podrá iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivating}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
              onClick={() => void handleDeactivate()}
            >
              {deactivating && <Loader2 className="size-4 animate-spin" />}
              Sí, desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
