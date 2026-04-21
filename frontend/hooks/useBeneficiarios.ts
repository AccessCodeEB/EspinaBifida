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

// ─── Constantes de validación ────────────────────────────────────────────────
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEL_RE       = /^\d{10}$/
const CP_RE        = /^\d{5}$/
const CURP_RE      = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
/** Valores permitidos por CHECK en BD (columna TIPOS_SANGRE) y en la API como `tipoSangre`. */
export const TIPOS_SANGRE_OPCIONES: string[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

function normalizeTipoSangre(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim()
  return TIPOS_SANGRE_OPCIONES.includes(t) ? t : ""
}

const TOAST_OK =
  "border border-border/70 bg-popover text-popover-foreground shadow-md"

/** Letras (incl. acentos y ñ) en un campo que debe ser solo numérico */
const HAS_LETTER = /[A-Za-zÀ-ÿ\u00f1\u00d1]/

/** Teléfono a 10 dígitos: sin letras; se ignoran espacios y guiones al contar dígitos. */
function errPhoneField(raw: string | undefined, required: boolean): string | undefined {
  const t = String(raw ?? "").trim()
  if (!t) return required ? "Obligatorio" : undefined
  if (HAS_LETTER.test(t)) return "Solo números (10 dígitos)."
  const digits = t.replace(/\D/g, "")
  if (!digits) return required ? "Obligatorio" : "Solo números."
  if (!TEL_RE.test(digits)) return "Deben ser 10 dígitos."
  return undefined
}

/** Código postal: solo 5 dígitos, sin letras. */
function errCpField(raw: string | undefined): string | undefined {
  const t = String(raw ?? "").trim()
  if (!t) return undefined
  if (HAS_LETTER.test(t)) return "CP: solo números."
  if (/\D/.test(t)) return "CP: 5 dígitos, sin símbolos."
  if (!CP_RE.test(t)) return "CP: 5 dígitos."
  return undefined
}

/** Texto sin dígitos (nombres, ciudad, etc.). */
function errTextNoDigits(value: string | undefined): string | undefined {
  const t = String(value ?? "").trim()
  if (!t) return undefined
  if (/\d/.test(t)) return "Sin números aquí."
  return undefined
}

const ALTA_FORM_INICIAL = {
  nombres: "", apellidoPaterno: "", apellidoMaterno: "", curp: "",
  fechaNacimiento: "", genero: "", tipoSangre: "", nombrePadreMadre: "",
  calle: "", colonia: "", ciudad: "", municipio: "", estado: "", cp: "",
  telefonoCasa: "", telefonoCelular: "", correoElectronico: "",
  contactoEmergencia: "", telefonoEmergencia: "",
  municipioNacimiento: "", hospitalNacimiento: "",
  usaValvula: undefined as boolean | undefined,
  notas: "", estatus: "Activo", tipo: "",
}

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
function parseBackendError(raw: string): Record<string, string> {
  let code = ""
  let msg = raw
  try { const p = JSON.parse(raw); code = p.code ?? ""; msg = p.message ?? raw } catch { /* raw is not JSON */ }
  switch (code) {
    case "INVALID_PHONE":
      if (msg.includes("CELULAR"))    return { telefonoCelular:    "10 dígitos" }
      if (msg.includes("CASA"))       return { telefonoCasa:        "10 dígitos" }
      if (msg.includes("EMERGENCIA")) return { telefonoEmergencia:  "10 dígitos" }
      return { _global: msg }
    case "INVALID_CP":              return { cp:                  "CP: 5 dígitos" }
    case "INVALID_EMAIL":           return { correoElectronico:   "Correo inválido" }
    case "INVALID_GENERO":          return { genero:              "Elige género" }
    case "INVALID_USA_VALVULA":     return { usaValvula:          "Elige Sí o No" }
    case "NOTES_TOO_LONG":          return { notas:               "Máx. 500 caracteres" }
    case "INVALID_DATE_FORMAT":     return { fechaNacimiento:     "Fecha inválida" }
    case "DATE_IN_FUTURE":          return { fechaNacimiento:     "No fecha futura" }
    case "DATE_TOO_OLD":            return { fechaNacimiento:     "Fecha muy antigua" }
    case "INVALID_CURP":            return { curp:                "CURP inválida" }
    case "INVALID_TIPO_SANGRE":     return { tipoSangre:         "Elige un tipo de sangre válido" }
    case "MISSING_REQUIRED_FIELDS": {
      const errs: Record<string, string> = {}
      if (msg.includes("nombres"))         errs.nombres         = "Obligatorio"
      if (msg.includes("apellidoPaterno")) errs.apellidoPaterno = "Obligatorio"
      if (msg.includes("apellidoMaterno")) errs.apellidoMaterno = "Obligatorio"
      return Object.keys(errs).length > 0 ? errs : { _global: msg }
    }
    case "BENEFICIARIO_BAJA":  return { _global: "En baja: no editable" }
    case "BIND_ERROR":         return { _global: "Dato no aceptado" }
    case "INTERNAL_ERROR":     return { _global: "Error del servidor" }
    default:                   return { _global: msg || "Error al guardar" }
  }
}

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

function validateAlta(form: typeof ALTA_FORM_INICIAL): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.nombres.trim()) errs.nombres = "Obligatorio"
  else {
    const ne = errTextNoDigits(form.nombres)
    if (ne) errs.nombres = ne
  }
  if (!form.apellidoPaterno.trim()) errs.apellidoPaterno = "Obligatorio"
  else {
    const pe = errTextNoDigits(form.apellidoPaterno)
    if (pe) errs.apellidoPaterno = pe
  }
  if (!form.apellidoMaterno.trim()) errs.apellidoMaterno = "Obligatorio"
  else {
    const me = errTextNoDigits(form.apellidoMaterno)
    if (me) errs.apellidoMaterno = me
  }
  if (!form.curp.trim()) {
    errs.curp = "Obligatorio"
  } else if (!CURP_RE.test(form.curp.toUpperCase())) {
    errs.curp = "CURP inválida"
  }
  if (!form.fechaNacimiento) errs.fechaNacimiento = "Obligatorio"
  if (!form.ciudad.trim()) errs.ciudad = "Obligatorio"
  else {
    const ce = errTextNoDigits(form.ciudad)
    if (ce) errs.ciudad = ce
  }
  if (!form.estado.trim()) errs.estado = "Obligatorio"
  else {
    const ee = errTextNoDigits(form.estado)
    if (ee) errs.estado = ee
  }

  const celErr = errPhoneField(form.telefonoCelular, true)
  if (celErr) errs.telefonoCelular = celErr

  const casaErr = errPhoneField(form.telefonoCasa, false)
  if (casaErr) errs.telefonoCasa = casaErr

  const emergErr = errPhoneField(form.telefonoEmergencia, false)
  if (emergErr) errs.telefonoEmergencia = emergErr

  const cpErr = errCpField(form.cp)
  if (cpErr) errs.cp = cpErr

  const cEmerg = errTextNoDigits(form.contactoEmergencia)
  if (cEmerg) errs.contactoEmergencia = cEmerg

  const email = String(form.correoElectronico ?? "").trim()
  if (!email) {
    errs.correoElectronico = "Obligatorio"
  } else if (!EMAIL_RE.test(email)) {
    const looksNumericOnly = /^[\d\s+.-]+$/.test(email)
    errs.correoElectronico = looksNumericOnly ? "Correo: usa letras y @" : "Correo inválido"
  }

  if (form.usaValvula === undefined) errs.usaValvula = "Obligatorio"

  const tsAlta = String(form.tipoSangre ?? "").trim()
  if (tsAlta && !TIPOS_SANGRE_OPCIONES.includes(tsAlta)) errs.tipoSangre = "Tipo inválido"

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
  /** Por CURP/folio: incrementa al subir foto para evitar caché del navegador */
  const [fotoBustByCurp, setFotoBustByCurp]     = useState<Record<string, number>>({})

  const resetAltaFoto = useCallback(() => {
    setAltaFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    altaFotoFileRef.current = null
  }, [])

  const handleAltaFotoSelected = useCallback((file: File) => {
    altaFotoFileRef.current = file
    setAltaFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  useEffect(() => {
    if (!showAltaDialog) resetAltaFoto()
  }, [showAltaDialog, resetAltaFoto])

  useEffect(() => {
    getBeneficiarios()
      .then(data => setBeneficiarios(data))
      .catch(err => setError(err?.message ?? "Error al cargar"))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtrado y conteos ────────────────────────────────────────────────────
  const filtered = beneficiarios
    .filter((b) => {
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
    setEditForm({ ...b, tipoSangre: normalizeTipoSangre(b.tipoSangre) })
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
      const tipoSangrePayload = (() => {
        const t = editForm.tipoSangre
        if (t === undefined || t === null) return null
        const s = String(t).trim()
        return s === "" ? null : s
      })()
      await updateBeneficiario(editForm.folio, {
        ...editForm,
        tipoSangre: tipoSangrePayload,
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
      toast.success("Guardado correcto", { duration: 2800, className: TOAST_OK })
      setShowEditDialog(false)
    } catch (err: unknown) {
      const raw    = err instanceof Error ? err.message : "Error al guardar"
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

  async function handleDarDeBaja() {
    if (!editForm.folio) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await deactivateBeneficiario(editForm.folio)
      setBeneficiarios((prev) =>
        prev.map((b) => (b.folio === editForm.folio ? { ...b, estatus: "Baja" } as Beneficiario : b))
      )
      setEditForm((prev) => ({ ...prev, estatus: "Baja" }))
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al dar de baja")
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
      const celularDigits = String(altaForm.telefonoCelular ?? "").replace(/\D/g, "")
      const casaDigits = String(altaForm.telefonoCasa ?? "").replace(/\D/g, "")
      const emergenciaDigits = String(altaForm.telefonoEmergencia ?? "").replace(/\D/g, "")
      const cpDigits = String(altaForm.cp ?? "").replace(/\D/g, "")
      const tipoSangreAlta = (() => {
        const t = altaForm.tipoSangre
        if (t === undefined || t === null) return null
        const s = String(t).trim()
        return s === "" ? null : s
      })()
      await createBeneficiario({
        ...altaForm,
        curp:     altaForm.curp.toUpperCase(),
        telefonoCelular: celularDigits,
        telefonoCasa: casaDigits,
        telefonoEmergencia: emergenciaDigits,
        cp: cpDigits,
        correoElectronico: String(altaForm.correoElectronico ?? "").trim(),
        tipoSangre: tipoSangreAlta,
        usaValvula: (altaForm.usaValvula ? "S" : "N") as unknown as boolean,
        tipo:     "",
        ciudad:   altaForm.ciudad,
        estado:   altaForm.estado,
        membresiaEstatus: "Sin membresia",
      })
      const curpUpper = altaForm.curp.toUpperCase()
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
    fotoBustByCurp,
  }
}
