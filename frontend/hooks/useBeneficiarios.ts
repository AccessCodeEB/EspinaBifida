"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import {
  getBeneficiarios,
  createBeneficiario,
  updateBeneficiario,
  updateEstatusBeneficiario,
  deactivateBeneficiario,
  deleteBeneficiario,
  uploadBeneficiarioFotoPerfil,
  deleteBeneficiarioFotoPerfil,
  type Beneficiario,
} from "@/services/beneficiarios"
import { conteosEstatusBeneficiarios } from "@/lib/beneficiarios-conteos"
import { esSolicitudPublicaPendiente } from "@/lib/solicitud-publica-beneficiario"
import {
  ALTA_FORM_INICIAL,
  CURP_RE,
  EMAIL_RE,
  TIPOS_SANGRE_OPCIONES,
  buildAltaCreatePayload,
  errCpField,
  errPhoneField,
  errTextNoDigits,
  parseBeneficiarioApiError,
  validateAlta,
} from "@/lib/beneficiario-alta"

function normalizeTipoSangre(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim()
  return TIPOS_SANGRE_OPCIONES.includes(t) ? t : ""
}

const TOAST_OK =
  "border border-border/70 bg-popover text-popover-foreground shadow-md"

/** Tarjetas: Activo → Inactivo → Baja; otros al final. */
function estatusOrdenTarjetas(estatus: string | undefined): number {
  if (estatus === "Activo") return 0
  if (estatus === "Inactivo") return 1
  if (estatus === "Baja") return 2
  return 3
}

/** Clave estable para ordenar por CURP (si falta, folio). */
function curpClaveOrden(b: Beneficiario): string {
  const c = String(b.curp ?? "").trim().toUpperCase()
  if (c) return c
  return String(b.folio ?? "").trim().toUpperCase()
}

// ─── Helpers de lógica pura ───────────────────────────────────────────────────
function validateEditForm(
  form: Partial<Beneficiario>,
  original: Beneficiario
): Record<string, string> {
  const errs: Record<string, string> = {}
  const changed = (f: keyof Beneficiario) =>
    String(form[f] ?? "") !== String(original[f] ?? "")

  if (!String(form.nombres ?? "").trim()) errs.nombres = "Obligatorio"
  else {
    const ne = errTextNoDigits(form.nombres)
    if (ne) errs.nombres = ne
  }
  if (!String(form.apellidoPaterno ?? "").trim()) errs.apellidoPaterno = "Obligatorio"
  else {
    const pe = errTextNoDigits(form.apellidoPaterno)
    if (pe) errs.apellidoPaterno = pe
  }
  if (!String(form.apellidoMaterno ?? "").trim()) errs.apellidoMaterno = "Obligatorio"
  else {
    const me = errTextNoDigits(form.apellidoMaterno)
    if (me) errs.apellidoMaterno = me
  }

  if (changed("curp")) {
    const curp = String(form.curp ?? "").trim().toUpperCase()
    if (curp && !CURP_RE.test(curp)) errs.curp = "CURP inválida"
  }

  const email = String(form.correoElectronico ?? "").trim()
  if (email && !EMAIL_RE.test(email)) {
    const looksNumericOnly = /^[\d\s+.-]+$/.test(email)
    errs.correoElectronico = looksNumericOnly ? "Correo: usa letras y @" : "Correo inválido"
  }

  if (changed("tipoSangre")) {
    const ts = String(form.tipoSangre ?? "").trim()
    if (ts && !TIPOS_SANGRE_OPCIONES.includes(ts)) errs.tipoSangre = "Tipo inválido"
  }
  if (String(form.telefonoCelular ?? "").trim()) {
    const pe = errPhoneField(form.telefonoCelular, false)
    if (pe) errs.telefonoCelular = pe
  }
  if (String(form.telefonoCasa ?? "").trim()) {
    const pe = errPhoneField(form.telefonoCasa, false)
    if (pe) errs.telefonoCasa = pe
  }
  if (String(form.telefonoEmergencia ?? "").trim()) {
    const pe = errPhoneField(form.telefonoEmergencia, false)
    if (pe) errs.telefonoEmergencia = pe
  }
  if (String(form.cp ?? "").trim()) {
    const pe = errCpField(form.cp)
    if (pe) errs.cp = pe
  }
  if (String(form.ciudad ?? "").trim()) {
    const ce = errTextNoDigits(form.ciudad)
    if (ce) errs.ciudad = ce
  }
  if (String(form.estado ?? "").trim()) {
    const ee = errTextNoDigits(form.estado)
    if (ee) errs.estado = ee
  }
  if (String(form.nombrePadreMadre ?? "").trim()) {
    const n = errTextNoDigits(form.nombrePadreMadre)
    if (n) errs.nombrePadreMadre = n
  }
  if (String(form.contactoEmergencia ?? "").trim()) {
    const c = errTextNoDigits(form.contactoEmergencia)
    if (c) errs.contactoEmergencia = c
  }
  if (changed("fechaNacimiento")) {
    const v = String(form.fechaNacimiento ?? "").trim()
    if (v) {
      const d = new Date(v)
      if (isNaN(d.getTime()) || d > new Date()) errs.fechaNacimiento = "Fecha no válida"
    }
  }
  return errs
}

function scrollToFirstError(errors: Record<string, string>, prefix = "edit-") {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const firstField = Object.keys(errors).find((k) => k !== "_global")
      const targetId = firstField ? `${prefix}${firstField}` : "edit-error-banner"
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  })
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useBeneficiarios() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const [searchTerm, setSearchTerm]       = useState("")
  const [filtroEstatus, setFiltroEstatus] = useState<"Todos" | "Activo" | "Inactivo" | "Baja">("Todos")

  const [showAltaDialog, setShowAltaDialog]             = useState(false)
  const [showExpedienteDialog, setShowExpedienteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog]             = useState(false)

  const [selectedBeneficiario, setSelectedBeneficiario] = useState<Beneficiario | null>(null)
  const [editForm, setEditForm]       = useState<Partial<Beneficiario>>({})
  const [altaForm, setAltaForm]       = useState(ALTA_FORM_INICIAL)

  const [isSaving, setIsSaving]                   = useState(false)
  const [confirmDelete, setConfirmDelete]         = useState(false)
  const [confirmEditDelete, setConfirmEditDelete] = useState(false)
  const [saveError, setSaveError]                 = useState<string | null>(null)
  const [editErrors, setEditErrors]               = useState<Record<string, string>>({})
  const [altaErrors, setAltaErrors]               = useState<Record<string, string>>({})
  const [fotoUploading, setFotoUploading]         = useState(false)
  const [altaFotoPreview, setAltaFotoPreview]     = useState<string | null>(null)
  const altaFotoFileRef                         = useRef<File | null>(null)
  const [editFotoPreview, setEditFotoPreview]     = useState<string | null>(null)
  const editFotoFileRef                         = useRef<File | null>(null)
  /** Por CURP/folio: incrementa al subir foto para evitar caché del navegador */
  const [fotoBustByCurp, setFotoBustByCurp]     = useState<Record<string, number>>({})

  const resetAltaFoto = useCallback(() => {
    setAltaFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    altaFotoFileRef.current = null
  }, [])

  const resetEditFoto = useCallback(() => {
    setEditFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    editFotoFileRef.current = null
  }, [])

  const handleAltaFotoSelected = useCallback((file: File) => {
    altaFotoFileRef.current = file
    setAltaFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  const handleEditFotoSelected = useCallback((file: File) => {
    editFotoFileRef.current = file
    setEditFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  useEffect(() => {
    if (!showAltaDialog) resetAltaFoto()
  }, [showAltaDialog, resetAltaFoto])

  useEffect(() => {
    if (!showEditDialog) resetEditFoto()
  }, [showEditDialog, resetEditFoto])

  useEffect(() => {
    getBeneficiarios()
      .then(data => setBeneficiarios(data))
      .catch(err => setError(err?.message ?? "Error al cargar"))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtrado y conteos ────────────────────────────────────────────────────
  const filtered = beneficiarios
    .filter((b) => {
      if (esSolicitudPublicaPendiente(b)) return false
      const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`
      const term   = searchTerm.toLowerCase()
      const matchesSearch  = nombre.toLowerCase().includes(term) || b.folio.toLowerCase().includes(term) || b.ciudad.toLowerCase().includes(term)
      const matchesEstatus = filtroEstatus === "Todos" || b.estatus === filtroEstatus
      return matchesSearch && matchesEstatus
    })
    .sort((a, b) => {
      const da = estatusOrdenTarjetas(a.estatus)
      const db = estatusOrdenTarjetas(b.estatus)
      if (da !== db) return da - db
      return curpClaveOrden(a).localeCompare(curpClaveOrden(b), "es")
    })

  const conteos = conteosEstatusBeneficiarios(beneficiarios)

  // ── Edición ───────────────────────────────────────────────────────────────
  function openEdit(b: Beneficiario) {
    setSelectedBeneficiario(b)
    const pk = String(b.folio ?? b.curp ?? "").trim()
    setEditForm({
      ...b,
      folio: pk || b.folio,
      curp: pk || b.curp,
      tipoSangre: normalizeTipoSangre(b.tipoSangre),
    })
    setConfirmDelete(false)
    setConfirmEditDelete(false)
    setSaveError(null)
    setEditErrors({})
    setShowEditDialog(true)
  }

  function handleEditChange(field: keyof Beneficiario, value: string | boolean) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
    if (editErrors[field as string])
      setEditErrors((prev) => { const e = { ...prev }; delete e[field as string]; return e })
  }

  function matchesCurp(b: Beneficiario, curp: string) {
    const c = curp.toUpperCase()
    return (b.folio ?? "").toUpperCase() === c || (b.curp ?? "").toUpperCase() === c
  }

  /** CURP/folio del expediente abierto (prioriza selección; el formulario puede no traer `folio`). */
  function beneficioIdParaMutaciones(): string | null {
    const raw =
      selectedBeneficiario?.folio ??
      selectedBeneficiario?.curp ??
      editForm.folio ??
      editForm.curp
    const id = String(raw ?? "").trim()
    return id || null
  }

  async function handleUploadFotoBeneficiario(curp: string, file: File) {
    const c = curp.trim().toUpperCase()
    setFotoUploading(true)
    try {
      const { fotoPerfilUrl } = await uploadBeneficiarioFotoPerfil(c, file)
      setBeneficiarios((prev) =>
        prev.map((b) => (matchesCurp(b, c) ? { ...b, fotoPerfilUrl } : b))
      )
      setSelectedBeneficiario((prev) =>
        prev && matchesCurp(prev, c) ? { ...prev, fotoPerfilUrl } : prev
      )
      setEditForm((prev) => {
        const pid = String(prev.curp ?? prev.folio ?? "").trim().toUpperCase()
        if (!pid || pid !== c) return prev
        return { ...prev, fotoPerfilUrl }
      })
      setFotoBustByCurp((prev) => ({ ...prev, [c]: (prev[c] ?? 0) + 1 }))
      toast.success("Foto de perfil actualizada", { duration: 2800, className: TOAST_OK })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto")
    } finally {
      setFotoUploading(false)
    }
  }

  async function handleDeleteFotoBeneficiario(curp: string): Promise<boolean> {
    const c = curp.trim().toUpperCase()
    setFotoUploading(true)
    try {
      await deleteBeneficiarioFotoPerfil(c)
      setBeneficiarios((prev) =>
        prev.map((b) => (matchesCurp(b, c) ? { ...b, fotoPerfilUrl: null } : b))
      )
      setSelectedBeneficiario((prev) =>
        prev && matchesCurp(prev, c) ? { ...prev, fotoPerfilUrl: null } : prev
      )
      setEditForm((prev) => {
        const pid = String(prev.curp ?? prev.folio ?? "").trim().toUpperCase()
        if (!pid || pid !== c) return prev
        return { ...prev, fotoPerfilUrl: null }
      })
      setFotoBustByCurp((prev) => ({ ...prev, [c]: (prev[c] ?? 0) + 1 }))
      toast.success("Foto de perfil eliminada", { duration: 2800, className: TOAST_OK })
      return true
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la foto")
      return false
    } finally {
      setFotoUploading(false)
    }
  }

  async function handleSaveEdit() {
    const saveId = beneficioIdParaMutaciones()
    if (!selectedBeneficiario || !saveId) return
    setSaveError(null)

    const frontendErrs = validateEditForm({ ...editForm }, selectedBeneficiario)
    if (Object.keys(frontendErrs).length > 0) {
      setEditErrors(frontendErrs)
      scrollToFirstError(frontendErrs)
      return
    }

    setEditErrors({})
    setIsSaving(true)
    try {
      const rawEstatus = String(editForm.estatus ?? "").trim()
      const hadBajaAtOpen = selectedBeneficiario.estatus === "Baja"
      const nuevoEstatus =
        rawEstatus === "Activo" || rawEstatus === "Inactivo" ? rawEstatus : null

      /** Salir de Baja: si el formulario pasa a Activo/Inactivo, PATCH antes del PUT. */
      if (hadBajaAtOpen && nuevoEstatus) {
        await updateEstatusBeneficiario(saveId, nuevoEstatus)
        setSelectedBeneficiario((prev) =>
          prev && matchesCurp(prev, saveId) ? { ...prev, estatus: nuevoEstatus } : prev
        )
      }

      const tipoSangrePayload = (() => {
        const t = editForm.tipoSangre
        if (t === undefined || t === null) return null
        const s = String(t).trim()
        return s === "" ? null : s
      })()
      await updateBeneficiario(saveId, {
        ...editForm,
        folio: saveId,
        curp: String(editForm.curp ?? saveId).trim() || saveId,
        tipoSangre: tipoSangrePayload ?? undefined,
        usaValvula: (editForm.usaValvula ? "S" : "N") as unknown as boolean,
      })

      if (
        !hadBajaAtOpen &&
        nuevoEstatus &&
        nuevoEstatus !== selectedBeneficiario.estatus
      ) {
        await updateEstatusBeneficiario(saveId, nuevoEstatus)
      }

      // Subir foto solo si el usuario la cambio durante la edicion
      const curp = saveId.toUpperCase()
      if (editFotoFileRef.current) {
        try {
          const { fotoPerfilUrl } = await uploadBeneficiarioFotoPerfil(curp, editFotoFileRef.current)
          setEditForm((prev) => ({ ...prev, fotoPerfilUrl }))
          setFotoBustByCurp((prev) => ({ ...prev, [curp]: (prev[curp] ?? 0) + 1 }))
          setBeneficiarios((prev) =>
            prev.map((b) => (matchesCurp(b, curp) ? { ...b, fotoPerfilUrl } : b))
          )
          resetEditFoto()
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "No se pudo subir la foto")
        }
      }

      setBeneficiarios((prev) =>
        prev.map((b) =>
          matchesCurp(b, saveId) ? { ...b, ...editForm, folio: saveId } as Beneficiario : b
        )
      )
      toast.success("Guardado correcto", { duration: 2800, className: TOAST_OK })
      setShowEditDialog(false)
    } catch (err: unknown) {
      const raw    = err instanceof Error ? err.message : "Error al guardar"
      const errors = parseBeneficiarioApiError(raw)
      setEditErrors(errors)
      if (errors._global) setSaveError(errors._global)
      scrollToFirstError(errors)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEditDelete(): Promise<boolean> {
    const fid = beneficioIdParaMutaciones()
    if (!fid) return false
    setIsSaving(true)
    try {
      await deleteBeneficiario(fid)
      setBeneficiarios((prev) => prev.filter((b) => !matchesCurp(b, fid)))
      setConfirmEditDelete(false)
      setShowEditDialog(false)
      return true
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDarDeBaja(): Promise<boolean> {
    const fid = beneficioIdParaMutaciones()
    if (!fid) return false
    setIsSaving(true)
    setSaveError(null)
    try {
      await deactivateBeneficiario(fid)
      setBeneficiarios((prev) =>
        prev.map((b) => (matchesCurp(b, fid) ? { ...b, estatus: "Baja" } as Beneficiario : b))
      )
      setEditForm((prev) => ({ ...prev, estatus: "Baja" }))
      setSelectedBeneficiario((prev) =>
        prev && matchesCurp(prev, fid) ? { ...prev, estatus: "Baja" } : prev
      )
      return true
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al dar de baja")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleHardDelete(): Promise<boolean> {
    const fid = beneficioIdParaMutaciones()
    if (!fid) return false
    setIsSaving(true)
    try {
      await deleteBeneficiario(fid)
      setBeneficiarios((prev) => prev.filter((b) => !matchesCurp(b, fid)))
      setConfirmDelete(false)
      setShowEditDialog(false)
      return true
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // ── Nueva Alta ────────────────────────────────────────────────────────────
  function handleAltaChange(field: keyof typeof ALTA_FORM_INICIAL, value: string | boolean) {
    setAltaForm((prev) => ({ ...prev, [field]: value }))
    if (altaErrors[field as string])
      setAltaErrors((prev) => { const e = { ...prev }; delete e[field as string]; return e })
  }

  async function handleAltaSubmit() {
    const errs = validateAlta(altaForm)
    if (Object.keys(errs).length > 0) { setAltaErrors(errs); return }
    setIsSaving(true)
    try {
      const payload = buildAltaCreatePayload(altaForm)
      await createBeneficiario(payload)
      const curpUpper = altaForm.curp.toUpperCase()
      const celularDigits = String(altaForm.telefonoCelular ?? "").replace(/\D/g, "")
      const casaDigits = String(altaForm.telefonoCasa ?? "").replace(/\D/g, "")
      const emergenciaDigits = String(altaForm.telefonoEmergencia ?? "").replace(/\D/g, "")
      const cpDigits = String(altaForm.cp ?? "").replace(/\D/g, "")
      let fotoPerfilUrl: string | undefined
      const pendingFoto = altaFotoFileRef.current
      if (pendingFoto) {
        try {
          const r = await uploadBeneficiarioFotoPerfil(curpUpper, pendingFoto)
          fotoPerfilUrl = r.fotoPerfilUrl
          setFotoBustByCurp((prev) => ({ ...prev, [curpUpper]: (prev[curpUpper] ?? 0) + 1 }))
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "No se pudo subir la foto de perfil")
        }
      }
      resetAltaFoto()
      const nuevo: Beneficiario = {
        folio:              curpUpper,
        curp:               curpUpper,
        nombres:            altaForm.nombres.trim(),
        apellidoPaterno:    altaForm.apellidoPaterno.trim(),
        apellidoMaterno:    altaForm.apellidoMaterno.trim(),
        fechaNacimiento:    altaForm.fechaNacimiento,
        genero:             altaForm.genero,
        tipoSangre:         altaForm.tipoSangre,
        nombrePadreMadre:   altaForm.nombrePadreMadre,
        calle:              altaForm.calle,
        colonia:            altaForm.colonia,
        ciudad:             altaForm.ciudad,
        municipio:          altaForm.municipio,
        estado:             altaForm.estado,
        cp:                 cpDigits,
        telefonoCasa:       casaDigits,
        telefonoCelular:    celularDigits,
        correoElectronico:  String(altaForm.correoElectronico ?? "").trim(),
        contactoEmergencia: altaForm.contactoEmergencia,
        telefonoEmergencia: emergenciaDigits,
        municipioNacimiento: altaForm.municipioNacimiento,
        hospitalNacimiento:  altaForm.hospitalNacimiento,
        usaValvula:  altaForm.usaValvula,
        notas:       altaForm.notas,
        tipo:        "",
        estatus:     "Activo",
        membresiaEstatus: "Sin membresia",
        fotoPerfilUrl:    fotoPerfilUrl ?? undefined,
      }
      setBeneficiarios((prev) => [...prev, nuevo])
      setAltaForm(ALTA_FORM_INICIAL)
      setAltaErrors({})
      toast.success("Registro correcto", { duration: 2800, className: TOAST_OK })
      setShowAltaDialog(false)
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Error al guardar"
      setAltaErrors(parseBeneficiarioApiError(raw))
    } finally {
      setIsSaving(false)
    }
  }

  return {
    // Datos
    beneficiarios, loading, error,
    filtered, conteos,
    // Búsqueda y filtros
    searchTerm, setSearchTerm,
    filtroEstatus, setFiltroEstatus,
    // Diálogos
    showAltaDialog, setShowAltaDialog,
    showExpedienteDialog, setShowExpedienteDialog,
    showEditDialog, setShowEditDialog,
    // Expediente / edición
    selectedBeneficiario, setSelectedBeneficiario,
    editForm,
    isSaving,
    fotoUploading,
    confirmDelete, setConfirmDelete,
    confirmEditDelete, setConfirmEditDelete,
    saveError,
    editErrors,
    // Nueva alta
    altaForm, altaErrors, setAltaErrors,
    // Setters varios
    setSaveError,
    // Handlers
    openEdit,
    handleEditChange,
    handleSaveEdit,
    handleDarDeBaja,
    handleEditDelete,
    handleHardDelete,
    handleAltaChange,
    handleAltaSubmit,
    handleUploadFotoBeneficiario,
    handleDeleteFotoBeneficiario,
    altaFotoPreview,
    handleAltaFotoSelected,
    editFotoPreview,
    handleEditFotoSelected,
    fotoBustByCurp,
  }
}
