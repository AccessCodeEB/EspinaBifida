"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  X,
  Loader2,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldOff,
  Pencil,
  UserCog,
  Inbox,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type Admin,
  type CreateAdminBody,
  type UpdateAdminBody,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deactivateAdmin,
} from "@/services/administradores"
import { useAuth } from "@/hooks/useAuth"

const ROLES = [
  { id: 1, label: "Super Admin" },
  { id: 2, label: "Recepción" },
]

function rolLabel(idRol: number): string {
  return ROLES.find((r) => r.id === idRol)?.label ?? `Rol ${idRol}`
}

const EMPTY_CREATE: CreateAdminBody = {
  idRol: 2,
  nombreCompleto: "",
  email: "",
  password: "",
}

const EMPTY_EDIT: UpdateAdminBody = {
  idRol: 2,
  nombreCompleto: "",
  email: "",
}

export function AdministradoresSection() {
  const { session } = useAuth()
  const esSuper = session?.idRol === 1

  const [rows, setRows] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateAdminBody>(EMPTY_CREATE)
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateAdminBody, string>>>({})
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Admin | null>(null)
  const [editForm, setEditForm] = useState<UpdateAdminBody>(EMPTY_EDIT)
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UpdateAdminBody, string>>>({})
  const [editSaving, setEditSaving] = useState(false)

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<Admin | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllAdmins()
      setRows(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los administradores")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    if (!term) return rows
    return rows.filter(
      (a) =>
        a.nombreCompleto.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        rolLabel(a.idRol).toLowerCase().includes(term)
    )
  }, [rows, searchTerm])

  // ── Create ────────────────────────────────────────────────────────────────

  function validateCreate(): boolean {
    const errs: Partial<Record<keyof CreateAdminBody, string>> = {}
    if (!createForm.nombreCompleto.trim()) errs.nombreCompleto = "El nombre es requerido"
    if (!createForm.email.trim()) errs.email = "El correo es requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errs.email = "Correo inválido"
    if (!createForm.password) errs.password = "La contraseña es requerida"
    else if (createForm.password.length < 8) errs.password = "Mínimo 8 caracteres"
    setCreateErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate() {
    if (!validateCreate()) return
    setSaving(true)
    try {
      await createAdmin({
        ...createForm,
        nombreCompleto: createForm.nombreCompleto.trim(),
        email: createForm.email.trim().toLowerCase(),
      })
      toast.success("Administrador creado exitosamente")
      setShowCreate(false)
      setCreateForm(EMPTY_CREATE)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el administrador")
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(admin: Admin) {
    setEditTarget(admin)
    setEditForm({
      idRol: admin.idRol,
      nombreCompleto: admin.nombreCompleto,
      email: admin.email,
    })
    setEditErrors({})
  }

  function validateEdit(): boolean {
    const errs: Partial<Record<keyof UpdateAdminBody, string>> = {}
    if (!editForm.nombreCompleto.trim()) errs.nombreCompleto = "El nombre es requerido"
    if (!editForm.email.trim()) errs.email = "El correo es requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) errs.email = "Correo inválido"
    setEditErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleEdit() {
    if (!editTarget || !validateEdit()) return
    setEditSaving(true)
    try {
      await updateAdmin(editTarget.idAdmin, {
        ...editForm,
        nombreCompleto: editForm.nombreCompleto.trim(),
        email: editForm.email.trim().toLowerCase(),
      })
      toast.success("Administrador actualizado")
      setEditTarget(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar")
    } finally {
      setEditSaving(false)
    }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await deactivateAdmin(deactivateTarget.idAdmin)
      toast.success(`${deactivateTarget.nombreCompleto} fue desactivado`)
      setDeactivateTarget(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo desactivar")
    } finally {
      setDeactivating(false)
    }
  }

  if (!esSuper) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
          <ShieldOff className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-foreground">Acceso restringido</p>
        <p className="text-xs text-muted-foreground">Solo los super-administradores pueden gestionar cuentas.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Administradores
          </h1>
          <p className="mt-1 text-base text-foreground">
            Gestiona las cuentas de acceso al sistema.
          </p>
        </div>
        <Button
          onClick={() => { setCreateForm(EMPTY_CREATE); setCreateErrors({}); setShowCreate(true) }}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Nuevo administrador
        </Button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-5 py-4 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/40">
            <UserCog className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{rows.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-5 py-4 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
            <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {rows.filter((a) => a.activo === 1).length}
            </p>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <button
            type="button"
            className="flex w-full items-center gap-4 rounded-xl border border-border/70 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-muted/40 active:scale-[.99]"
            onClick={() => void load()}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
              <RefreshCw className="size-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Actualizar</p>
              <p className="text-xs text-muted-foreground">Recargar lista</p>
            </div>
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Lista de administradores</p>
            <p className="text-[11px] text-muted-foreground">
              {loading ? "Cargando..." : `${filtered.length} cuenta${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o rol..."
              className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-8 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cargando administradores...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted/50">
              <Inbox className="size-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No se encontraron resultados</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {searchTerm ? "Ninguna cuenta coincide con la búsqueda." : "No hay administradores registrados."}
              </p>
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-xs font-medium text-[#0f4c81] hover:underline">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="py-2.5 pl-5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Nombre</th>
                  <th className="hidden py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground md:table-cell">Correo</th>
                  <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-foreground">Rol</th>
                  <th className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Estatus</th>
                  <th className="py-2.5 pr-5 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((admin) => (
                  <tr key={admin.idAdmin} className="transition-colors hover:bg-muted/20">
                    <td className="py-3 pl-5">
                      <p className="text-xs font-semibold text-foreground">{admin.nombreCompleto}</p>
                      <p className="text-[10px] text-muted-foreground md:hidden">{admin.email}</p>
                    </td>
                    <td className="hidden py-3 text-xs text-foreground md:table-cell">{admin.email}</td>
                    <td className="py-3 text-xs text-foreground">{rolLabel(admin.idRol)}</td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          admin.activo === 1
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {admin.activo === 1 ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Editar"
                          className="flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                          onClick={() => openEdit(admin)}
                          disabled={admin.activo !== 1}
                        >
                          <Pencil className="size-3" />
                          Editar
                        </button>
                        {admin.activo === 1 && admin.idAdmin !== session?.idAdmin && (
                          <button
                            title="Desactivar"
                            className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                            onClick={() => setDeactivateTarget(admin)}
                          >
                            <ShieldOff className="size-3" />
                            Desactivar
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

      {/* ── Crear administrador ── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!saving) setShowCreate(open)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden border-0 shadow-2xl sm:rounded-2xl">
          <div className="relative overflow-hidden" style={{ background: "#0f4c81" }}>
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
            <div className="relative flex items-start justify-between gap-3 px-5 py-4">
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">
                  Nuevo administrador
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-white/60">
                  Crea una nueva cuenta de acceso al sistema.
                </DialogDescription>
              </div>
              <button
                onClick={() => { if (!saving) setShowCreate(false) }}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-border/40 px-5 py-4 space-y-3">
            <FormField
              label="Nombre completo"
              id="create-nombre"
              value={createForm.nombreCompleto}
              onChange={(v) => setCreateForm((f) => ({ ...f, nombreCompleto: v }))}
              error={createErrors.nombreCompleto}
              placeholder="Ej. María García López"
            />
            <div className="pt-3">
              <FormField
                label="Correo electrónico"
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))}
                error={createErrors.email}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="pt-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Rol
              </label>
              <select
                value={createForm.idRol}
                onChange={(e) => setCreateForm((f) => ({ ...f, idRol: Number(e.target.value) }))}
                className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="pt-3">
              <FormField
                label="Contraseña temporal"
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))}
                error={createErrors.password}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/40 px-5 py-3">
            <button
              onClick={() => { if (!saving) setShowCreate(false) }}
              disabled={saving}
              className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <Button onClick={() => void handleCreate()} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Crear cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Editar administrador ── */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!editSaving && !open) setEditTarget(null)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden border-0 shadow-2xl sm:rounded-2xl">
          <div className="relative overflow-hidden" style={{ background: "#0f4c81" }}>
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
            <div className="relative flex items-start justify-between gap-3 px-5 py-4">
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">
                  Editar administrador
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-white/60">
                  {editTarget?.email}
                </DialogDescription>
              </div>
              <button
                onClick={() => { if (!editSaving) setEditTarget(null) }}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-border/40 px-5 py-4 space-y-3">
            <FormField
              label="Nombre completo"
              id="edit-nombre"
              value={editForm.nombreCompleto}
              onChange={(v) => setEditForm((f) => ({ ...f, nombreCompleto: v }))}
              error={editErrors.nombreCompleto}
            />
            <div className="pt-3">
              <FormField
                label="Correo electrónico"
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
                error={editErrors.email}
              />
            </div>
            <div className="pt-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Rol
              </label>
              <select
                value={editForm.idRol}
                onChange={(e) => setEditForm((f) => ({ ...f, idRol: Number(e.target.value) }))}
                className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/10"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/40 px-5 py-3">
            <button
              onClick={() => { if (!editSaving) setEditTarget(null) }}
              disabled={editSaving}
              className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <Button onClick={() => void handleEdit()} disabled={editSaving} className="gap-2">
              {editSaving ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar desactivación ── */}
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => { if (!deactivating && !open) setDeactivateTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground">¿Desactivar administrador?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              La cuenta de{" "}
              <span className="font-semibold text-foreground">{deactivateTarget?.nombreCompleto}</span>{" "}
              quedará inactiva y no podrá iniciar sesión. Puedes reactivarla manualmente en la base de datos si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivating}
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white gap-2"
              onClick={() => void handleDeactivate()}
            >
              {deactivating ? <Loader2 className="size-4 animate-spin" /> : null}
              Sí, desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Helper component ──────────────────────────────────────────────────────────

function FormField({
  label,
  id,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-9 w-full rounded-lg border bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#0f4c81]/10 ${
          error ? "border-destructive focus:border-destructive" : "border-border/70 focus:border-[#0f4c81]"
        }`}
      />
      {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
