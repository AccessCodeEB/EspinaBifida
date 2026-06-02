import type { Beneficiario } from "@/services/beneficiarios"
import { MARCADOR_SOLICITUD_PUBLICA_PENDIENTE } from "@/lib/solicitud-publica-beneficiario"
import { ESTADOS, MUNICIPIOS } from "@/data/mx-estados-municipios"

/** Valores permitidos por CHECK en BD (columna TIPOS_SANGRE) y en la API como `tipoSangre`. */
export const TIPOS_SANGRE_OPCIONES: string[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

/** Valores del selector público / clínico (columna `tipo` en beneficiario). */
export const TIPOS_ESPINA_BIFIDA_OPCIONES = [
  "Mielomeningocele",
  "Meningocele",
  "Oculta",
  "Lipomeningocele",
] as const

export type TipoEspinaBifida = (typeof TIPOS_ESPINA_BIFIDA_OPCIONES)[number]

export function labelTipoEspinaBifida(value: string | undefined): string {
  const v = String(value ?? "").trim()
  if (!v) return "—"
  const canon = TIPOS_ESPINA_BIFIDA_OPCIONES.find(
    (t) => t.toLowerCase() === v.toLowerCase()
  )
  if (canon) return canon
  return v
}

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
  estadoNacimiento: "",
  cp: "",
  telefonoCasa: "",
  telefonoCelular: "",
  correoElectronico: "",
  contactoEmergencia: "",
  telefonoEmergencia: "",
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

  const tipoEbRaw = String(form.tipo ?? "").trim()
  const tipoEbCanon = TIPOS_ESPINA_BIFIDA_OPCIONES.find(
    (t) => t.toLowerCase() === tipoEbRaw.toLowerCase()
  )
  if (!tipoEbRaw) {
    errs.tipo = "Selecciona un tipo de espina bífida"
  } else if (!tipoEbCanon) {
    errs.tipo = "Tipo no válido"
  }

  const tsAlta = String(form.tipoSangre ?? "").trim()
  if (tsAlta && !TIPOS_SANGRE_OPCIONES.includes(tsAlta)) errs.tipoSangre = "Tipo inválido"

  return errs
}

/**
 * Validación solo para solicitud pública (pre-registro): datos mínimos para enviar la solicitud.
 * El resto del expediente puede completarse en el panel tras la aprobación.
 */
export function validateAltaSolicitudPublica(form: BeneficiarioAltaForm): Record<string, string> {
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
  if (!form.genero) {
    errs.genero = "Obligatorio"
  } else if (form.genero !== "H" && form.genero !== "M") {
    errs.genero = "Selecciona un género válido"
  }
  if (!form.ciudad.trim()) {
    errs.ciudad = "Obligatorio"
  } else if (
    form.estado &&
    MUNICIPIOS[form.estado] &&
    !MUNICIPIOS[form.estado].includes(form.ciudad)
  ) {
    errs.ciudad = "Selecciona una ciudad válida"
  }
  if (!form.estado.trim()) {
    errs.estado = "Obligatorio"
  } else if (!ESTADOS.includes(form.estado)) {
    errs.estado = "Selecciona un estado válido"
  }
  if (!form.estadoNacimiento.trim()) {
    errs.estadoNacimiento = "Obligatorio"
  } else if (!ESTADOS.includes(form.estadoNacimiento)) {
    errs.estadoNacimiento = "Selecciona un estado válido"
  }

  const celErr = errPhoneField(form.telefonoCelular, true)
  if (celErr) errs.telefonoCelular = celErr

  const email = String(form.correoElectronico ?? "").trim()
  if (!email) {
    errs.correoElectronico = "Obligatorio"
  } else if (!EMAIL_RE.test(email)) {
    const looksNumericOnly = /^[\d\s+.-]+$/.test(email)
    errs.correoElectronico = looksNumericOnly ? "Correo: usa letras y @" : "Correo inválido"
  }

  if (form.usaValvula === undefined) errs.usaValvula = "Obligatorio"

  const tipoEbRaw = String(form.tipo ?? "").trim()
  if (tipoEbRaw) {
    const tipoEbCanon = TIPOS_ESPINA_BIFIDA_OPCIONES.find(
      (t) => t.toLowerCase() === tipoEbRaw.toLowerCase()
    )
    if (!tipoEbCanon) errs.tipo = "Tipo no válido"
  }

  const notasUsuario = String(form.notas ?? "").trim()
  if (notasUsuario.length > 0) {
    const notasConMarca = `${MARCADOR_SOLICITUD_PUBLICA_PENDIENTE}\n${notasUsuario}`
    if (notasConMarca.length > 500) {
      const maxUsuario = 500 - MARCADOR_SOLICITUD_PUBLICA_PENDIENTE.length - 1
      errs.notas = `Máximo ${maxUsuario} caracteres en motivo o notas (el sistema reserva espacio interno).`
    }
  }

  return errs
}

/** Cuerpo para `POST /beneficiarios` (misma forma que el alta del panel). */
export function buildAltaCreatePayload(form: BeneficiarioAltaForm): Omit<Beneficiario, "folio"> {
  // estadoNacimiento es solo para calcular la CURP en el front; no se envía al API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { estadoNacimiento: _sn, ...formData } = form
  const celularDigits = String(formData.telefonoCelular ?? "").replace(/\D/g, "")
  const casaDigits = String(formData.telefonoCasa ?? "").replace(/\D/g, "")
  const emergenciaDigits = String(formData.telefonoEmergencia ?? "").replace(/\D/g, "")
  const cpDigits = String(formData.cp ?? "").replace(/\D/g, "")
  const tipoSangreAlta = (() => {
    const t = formData.tipoSangre
    if (t === undefined || t === null) return null
    const s = String(t).trim()
    return s === "" ? null : s
  })()
  const tipoCanon =
    TIPOS_ESPINA_BIFIDA_OPCIONES.find(
      (t) => t.toLowerCase() === String(formData.tipo ?? "").trim().toLowerCase()
    ) ?? String(formData.tipo ?? "").trim()
  // CURP usa H=Hombre / M=Mujer; el backend espera M=Masculino / F=Femenino
  const generoApi = formData.genero === "H" ? "M" : formData.genero === "M" ? "F" : formData.genero
  return {
    ...formData,
    curp: formData.curp.toUpperCase(),
    genero: generoApi,
    telefonoCelular: celularDigits || undefined,
    telefonoCasa: casaDigits || undefined,
    telefonoEmergencia: emergenciaDigits || undefined,
    cp: cpDigits || undefined,
    correoElectronico: String(formData.correoElectronico ?? "").trim() || undefined,
    tipoSangre: tipoSangreAlta ?? undefined,
    usaValvula: (formData.usaValvula ? "S" : "N") as unknown as boolean,
    tipo: tipoCanon,
    ciudad: formData.ciudad,
    estado: formData.estado,
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
      if (msg.includes("fechaNacimiento")) errs.fechaNacimiento = "Obligatorio"
      if (msg.includes("ciudad")) errs.ciudad = "Obligatorio"
      if (msg.includes("estado")) errs.estado = "Obligatorio"
      if (msg.includes("telefonoCelular")) errs.telefonoCelular = "Obligatorio"
      if (msg.includes("correoElectronico")) errs.correoElectronico = "Obligatorio"
      if (msg.includes("tipo")) errs.tipo = "Obligatorio"
      if (msg.includes("usaValvula")) errs.usaValvula = "Obligatorio"
      return Object.keys(errs).length > 0 ? errs : { _global: msg }
    }
    case "CAPTCHA_REQUIRED":
    case "CAPTCHA_FAILED":
      return { turnstile: msg || "Completa la verificación humana e intenta de nuevo." }
    case "CAPTCHA_CONFIG":
      return { _global: msg || "Verificación humana no disponible. Intenta más tarde." }
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
