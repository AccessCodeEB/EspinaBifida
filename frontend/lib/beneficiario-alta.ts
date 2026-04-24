import type { Beneficiario } from "@/services/beneficiarios"

/** Valores permitidos por CHECK en BD (columna TIPOS_SANGRE) y en la API como `tipoSangre`. */
export const TIPOS_SANGRE_OPCIONES: string[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEL_RE = /^\d{10}$/
const CP_RE = /^\d{5}$/
export const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

const HAS_LETTER = /[A-Za-zÀ-ÿ\u00f1\u00d1]/

export function errPhoneField(raw: string | undefined, required: boolean): string | undefined {
  const t = String(raw ?? "").trim()
  if (!t) return required ? "Obligatorio" : undefined
  if (HAS_LETTER.test(t)) return "Solo números (10 dígitos)."
  const digits = t.replace(/\D/g, "")
  if (!digits) return required ? "Obligatorio" : "Solo números."
  if (!TEL_RE.test(digits)) return "Deben ser 10 dígitos."
  return undefined
}

export function errCpField(raw: string | undefined): string | undefined {
  const t = String(raw ?? "").trim()
  if (!t) return undefined
  if (HAS_LETTER.test(t)) return "CP: solo números."
  if (/\D/.test(t)) return "CP: 5 dígitos, sin símbolos."
  if (!CP_RE.test(t)) return "CP: 5 dígitos."
  return undefined
}

export function errTextNoDigits(value: string | undefined): string | undefined {
  const t = String(value ?? "").trim()
  if (!t) return undefined
  if (/\d/.test(t)) return "Sin números aquí."
  return undefined
}

export const ALTA_FORM_INICIAL = {
  nombres: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  curp: "",
  fechaNacimiento: "",
  genero: "",
  tipoSangre: "",
  nombrePadreMadre: "",
  calle: "",
  colonia: "",
  ciudad: "",
  municipio: "",
  estado: "",
  cp: "",
  telefonoCasa: "",
  telefonoCelular: "",
  correoElectronico: "",
  contactoEmergencia: "",
  telefonoEmergencia: "",
  municipioNacimiento: "",
  hospitalNacimiento: "",
  usaValvula: undefined as boolean | undefined,
  notas: "",
  estatus: "Activo",
  tipo: "",
}

export type BeneficiarioAltaForm = typeof ALTA_FORM_INICIAL

export function validateAlta(form: BeneficiarioAltaForm): Record<string, string> {
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

/** Cuerpo para `POST /beneficiarios` (misma forma que el alta del panel). */
export function buildAltaCreatePayload(form: BeneficiarioAltaForm): Omit<Beneficiario, "folio"> {
  const celularDigits = String(form.telefonoCelular ?? "").replace(/\D/g, "")
  const casaDigits = String(form.telefonoCasa ?? "").replace(/\D/g, "")
  const emergenciaDigits = String(form.telefonoEmergencia ?? "").replace(/\D/g, "")
  const cpDigits = String(form.cp ?? "").replace(/\D/g, "")
  const tipoSangreAlta = (() => {
    const t = form.tipoSangre
    if (t === undefined || t === null) return null
    const s = String(t).trim()
    return s === "" ? null : s
  })()
  return {
    ...form,
    curp: form.curp.toUpperCase(),
    telefonoCelular: celularDigits,
    telefonoCasa: casaDigits,
    telefonoEmergencia: emergenciaDigits,
    cp: cpDigits,
    correoElectronico: String(form.correoElectronico ?? "").trim(),
    tipoSangre: tipoSangreAlta ?? undefined,
    usaValvula: (form.usaValvula ? "S" : "N") as unknown as boolean,
    tipo: form.tipo || "",
    ciudad: form.ciudad,
    estado: form.estado,
    membresiaEstatus: "Sin membresia",
  }
}

export function parseBeneficiarioApiError(raw: string): Record<string, string> {
  let code = ""
  let msg = raw
  try {
    const p = JSON.parse(raw) as { code?: string; message?: string }
    code = p.code ?? ""
    msg = p.message ?? raw
  } catch {
    /* texto plano */
  }
  switch (code) {
    case "INVALID_PHONE":
      if (msg.includes("CELULAR")) return { telefonoCelular: "10 dígitos" }
      if (msg.includes("CASA")) return { telefonoCasa: "10 dígitos" }
      if (msg.includes("EMERGENCIA")) return { telefonoEmergencia: "10 dígitos" }
      return { _global: msg }
    case "INVALID_CP":
      return { cp: "CP: 5 dígitos" }
    case "INVALID_EMAIL":
      return { correoElectronico: "Correo inválido" }
    case "INVALID_GENERO":
      return { genero: "Elige género" }
    case "INVALID_USA_VALVULA":
      return { usaValvula: "Elige Sí o No" }
    case "NOTES_TOO_LONG":
      return { notas: "Máx. 500 caracteres" }
    case "INVALID_DATE_FORMAT":
      return { fechaNacimiento: "Fecha inválida" }
    case "DATE_IN_FUTURE":
      return { fechaNacimiento: "No fecha futura" }
    case "DATE_TOO_OLD":
      return { fechaNacimiento: "Fecha muy antigua" }
    case "INVALID_CURP":
      return { curp: "CURP inválida" }
    case "INVALID_TIPO_SANGRE":
      return { tipoSangre: "Elige un tipo de sangre válido" }
    case "MISSING_REQUIRED_FIELDS": {
      const errs: Record<string, string> = {}
      if (msg.includes("nombres")) errs.nombres = "Obligatorio"
      if (msg.includes("apellidoPaterno")) errs.apellidoPaterno = "Obligatorio"
      if (msg.includes("apellidoMaterno")) errs.apellidoMaterno = "Obligatorio"
      return Object.keys(errs).length > 0 ? errs : { _global: msg }
    }
    case "DUPLICATE_CURP":
      return { curp: "Esta CURP ya está registrada" }
    case "BENEFICIARIO_BAJA":
      return { _global: "No se pudo guardar (estatus baja)" }
    case "BIND_ERROR":
      return { _global: "Dato no aceptado" }
    case "INTERNAL_ERROR":
      return { _global: "Error del servidor" }
    default: {
      if (/ya existe un beneficiario con la curp/i.test(msg)) {
        return { curp: "Esta CURP ya está registrada" }
      }
      return { _global: msg || "Error al guardar" }
    }
  }
}
