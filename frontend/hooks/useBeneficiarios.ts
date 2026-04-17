"use client"

import { useState, useEffect } from "react"
import {
  getBeneficiarios,
  createBeneficiario,
  updateBeneficiario,
  updateEstatusBeneficiario,
  deleteBeneficiario,
  type Beneficiario,
} from "@/services/beneficiarios"

// ─── Constantes de validación ────────────────────────────────────────────────
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEL_RE       = /^\d{10}$/
const CP_RE        = /^\d{5}$/
const CURP_RE      = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const ALTA_FORM_INICIAL = {
  nombres: "", apellidoPaterno: "", apellidoMaterno: "", curp: "",
  fechaNacimiento: "", genero: "", tipoSangre: "", nombrePadreMadre: "",
  calle: "", colonia: "", ciudad: "", municipio: "", estado: "", cp: "",
  telefonoCasa: "", telefonoCelular: "", correoElectronico: "",
  contactoEmergencia: "", telefonoEmergencia: "",
  municipioNacimiento: "", hospitalNacimiento: "",
  usaValvula: false, notas: "", estatus: "Activo",
}

// ─── Helpers de lógica pura ───────────────────────────────────────────────────
function parseBackendError(raw: string): Record<string, string> {
  let code = ""
  let msg = raw
  try { const p = JSON.parse(raw); code = p.code ?? ""; msg = p.message ?? raw } catch { /* raw is not JSON */ }
  switch (code) {
    case "INVALID_PHONE":
      if (msg.includes("CELULAR"))    return { telefonoCelular:    "Debe tener exactamente 10 dígitos" }
      if (msg.includes("CASA"))       return { telefonoCasa:        "Debe tener exactamente 10 dígitos" }
      if (msg.includes("EMERGENCIA")) return { telefonoEmergencia:  "Debe tener exactamente 10 dígitos" }
      return { _global: msg }
    case "INVALID_CP":              return { cp:                  "Debe tener exactamente 5 dígitos" }
    case "INVALID_EMAIL":           return { correoElectronico:   "Formato de correo inválido" }
    case "INVALID_GENERO":          return { genero:              "Selecciona Masculino o Femenino" }
    case "INVALID_USA_VALVULA":     return { usaValvula:          "Selecciona Sí o No" }
    case "NOTES_TOO_LONG":          return { notas:               "Máximo 500 caracteres" }
    case "INVALID_DATE_FORMAT":     return { fechaNacimiento:     "Formato inválido (YYYY-MM-DD)" }
    case "DATE_IN_FUTURE":          return { fechaNacimiento:     "No puede ser una fecha futura" }
    case "DATE_TOO_OLD":            return { fechaNacimiento:     "Fecha demasiado antigua (máx. 120 años)" }
    case "INVALID_CURP":            return { curp:                "Formato de CURP inválido (18 caracteres)" }
    case "MISSING_REQUIRED_FIELDS": {
      const errs: Record<string, string> = {}
      if (msg.includes("nombres"))         errs.nombres         = "Campo obligatorio"
      if (msg.includes("apellidoPaterno")) errs.apellidoPaterno = "Campo obligatorio"
      if (msg.includes("apellidoMaterno")) errs.apellidoMaterno = "Campo obligatorio"
      return Object.keys(errs).length > 0 ? errs : { _global: msg }
    }
    case "BENEFICIARIO_BAJA":  return { _global: "No se puede editar un beneficiario dado de baja" }
    case "BIND_ERROR":         return { _global: "Uno o más campos contienen un valor no aceptado. Revisa los datos e intenta de nuevo." }
    case "INTERNAL_ERROR":     return { _global: "Error interno del servidor. Verifica que todos los campos sean válidos e intenta de nuevo." }
    default:                   return { _global: msg || "Error desconocido. Revisa los datos e intenta de nuevo." }
  }
}

function validateEditForm(
  form: Partial<Beneficiario>,
  original: Beneficiario
): Record<string, string> {
  const errs: Record<string, string> = {}
  const changed = (f: keyof Beneficiario) =>
    String(form[f] ?? "") !== String(original[f] ?? "")

  if (!String(form.nombres ?? "").trim())        errs.nombres        = "Campo obligatorio"
  if (!String(form.apellidoPaterno ?? "").trim()) errs.apellidoPaterno = "Campo obligatorio"
  if (!String(form.apellidoMaterno ?? "").trim()) errs.apellidoMaterno = "Campo obligatorio"

  const curp = String(form.curp ?? "").trim().toUpperCase()
  if (curp && !CURP_RE.test(curp)) errs.curp = "Formato inválido (ej. ABCD900101HMCRRN01)"

  const email = String(form.correoElectronico ?? "").trim()
  if (email && !EMAIL_RE.test(email)) errs.correoElectronico = "Formato de correo inválido"

  if (changed("tipoSangre")) {
    const ts = String(form.tipoSangre ?? "").trim()
    if (ts && !TIPOS_SANGRE.includes(ts))
      errs.tipoSangre = `Debe ser uno de: ${TIPOS_SANGRE.join(", ")}`
  }
  if (changed("telefonoCelular")) {
    const v = String(form.telefonoCelular ?? "").trim()
    if (v && !TEL_RE.test(v)) errs.telefonoCelular = "Debe tener exactamente 10 dígitos"
  }
  if (changed("telefonoCasa")) {
    const v = String(form.telefonoCasa ?? "").trim()
    if (v && !TEL_RE.test(v)) errs.telefonoCasa = "Debe tener exactamente 10 dígitos"
  }
  if (changed("telefonoEmergencia")) {
    const v = String(form.telefonoEmergencia ?? "").trim()
    if (v && !TEL_RE.test(v)) errs.telefonoEmergencia = "Debe tener exactamente 10 dígitos"
  }
  if (changed("cp")) {
    const v = String(form.cp ?? "").trim()
    if (v && !CP_RE.test(v)) errs.cp = "Debe tener exactamente 5 dígitos"
  }
  if (changed("fechaNacimiento")) {
    const v = String(form.fechaNacimiento ?? "").trim()
    if (v) {
      const d = new Date(v)
      if (isNaN(d.getTime()) || d > new Date()) errs.fechaNacimiento = "Fecha inválida o futura"
    }
  }
  return errs
}

function validateAlta(form: typeof ALTA_FORM_INICIAL): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.nombres.trim())         errs.nombres         = "Campo obligatorio"
  if (!form.apellidoPaterno.trim()) errs.apellidoPaterno = "Campo obligatorio"
  if (!form.apellidoMaterno.trim()) errs.apellidoMaterno = "Campo obligatorio"
  if (!form.curp.trim()) {
    errs.curp = "Campo obligatorio"
  } else if (!CURP_RE.test(form.curp.toUpperCase())) {
    errs.curp = "Formato inválido (18 caracteres)"
  }
  if (!form.fechaNacimiento) errs.fechaNacimiento = "Campo obligatorio"
  if (!form.ciudad.trim())   errs.ciudad           = "Campo obligatorio"
  if (!form.estado.trim())   errs.estado           = "Campo obligatorio"
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

  useEffect(() => {
    getBeneficiarios()
      .then(data => setBeneficiarios(data))
      .catch(err => setError(err?.message ?? "Error al cargar beneficiarios"))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtrado y conteos ────────────────────────────────────────────────────
  const filtered = beneficiarios.filter((b) => {
    const nombre = `${b.nombres} ${b.apellidoPaterno} ${b.apellidoMaterno}`
    const term   = searchTerm.toLowerCase()
    const matchesSearch  = nombre.toLowerCase().includes(term) || b.folio.toLowerCase().includes(term) || b.ciudad.toLowerCase().includes(term)
    const matchesEstatus = filtroEstatus === "Todos" || b.estatus === filtroEstatus
    return matchesSearch && matchesEstatus
  })

  const conteos = {
    Todos:    beneficiarios.length,
    Activo:   beneficiarios.filter((b) => b.estatus === "Activo").length,
    Inactivo: beneficiarios.filter((b) => b.estatus === "Inactivo").length,
    Baja:     beneficiarios.filter((b) => b.estatus === "Baja").length,
  }

  // ── Edición ───────────────────────────────────────────────────────────────
  function openEdit(b: Beneficiario) {
    setSelectedBeneficiario(b)
    setEditForm({ ...b })
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

  async function handleSaveEdit() {
    if (!selectedBeneficiario || !editForm.folio) return
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
      await updateBeneficiario(editForm.folio, {
        ...editForm,
        usaValvula: (editForm.usaValvula ? "S" : "N") as unknown as boolean,
      })

      const nuevoEstatus = editForm.estatus as "Activo" | "Inactivo"
      if (
        nuevoEstatus !== selectedBeneficiario.estatus &&
        (nuevoEstatus === "Activo" || nuevoEstatus === "Inactivo")
      ) {
        await updateEstatusBeneficiario(editForm.folio, nuevoEstatus)
      }

      setBeneficiarios((prev) =>
        prev.map((b) => b.folio === editForm.folio ? { ...b, ...editForm } as Beneficiario : b)
      )
      setShowEditDialog(false)
    } catch (err: unknown) {
      const raw    = err instanceof Error ? err.message : "Error al guardar cambios"
      const errors = parseBackendError(raw)
      setEditErrors(errors)
      if (errors._global) setSaveError(errors._global)
      scrollToFirstError(errors)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEditDelete() {
    if (!editForm.folio) return
    setIsSaving(true)
    try {
      await deleteBeneficiario(editForm.folio)
      setBeneficiarios((prev) => prev.filter((b) => b.folio !== editForm.folio))
      setConfirmEditDelete(false)
      setShowEditDialog(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleHardDelete() {
    if (!editForm.folio) return
    setIsSaving(true)
    try {
      await deleteBeneficiario(editForm.folio)
      setBeneficiarios((prev) => prev.filter((b) => b.folio !== editForm.folio))
      setConfirmDelete(false)
      setShowEditDialog(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar")
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
      await createBeneficiario({
        ...altaForm,
        curp:     altaForm.curp.toUpperCase(),
        usaValvula: (altaForm.usaValvula ? "S" : "N") as unknown as boolean,
        tipo:     "",
        ciudad:   altaForm.ciudad,
        estado:   altaForm.estado,
        membresiaEstatus: "Sin membresia",
      })
      const nuevo: Beneficiario = {
        folio:              altaForm.curp.toUpperCase(),
        curp:               altaForm.curp.toUpperCase(),
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
        cp:                 altaForm.cp,
        telefonoCasa:       altaForm.telefonoCasa,
        telefonoCelular:    altaForm.telefonoCelular,
        correoElectronico:  altaForm.correoElectronico,
        contactoEmergencia: altaForm.contactoEmergencia,
        telefonoEmergencia: altaForm.telefonoEmergencia,
        municipioNacimiento: altaForm.municipioNacimiento,
        hospitalNacimiento:  altaForm.hospitalNacimiento,
        usaValvula:  altaForm.usaValvula,
        notas:       altaForm.notas,
        tipo:        "",
        estatus:     "Activo",
        membresiaEstatus: "Sin membresia",
      }
      setBeneficiarios((prev) => [...prev, nuevo])
      setAltaForm(ALTA_FORM_INICIAL)
      setAltaErrors({})
      setShowAltaDialog(false)
    } catch (err: unknown) {
      setAltaErrors({ _global: err instanceof Error ? err.message : "Error al guardar" })
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
    handleEditDelete,
    handleHardDelete,
    handleAltaChange,
    handleAltaSubmit,
  }
}
