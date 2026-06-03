import {
  validateAlta,
  validateAltaSolicitudPublica,
  buildAltaCreatePayload,
  parseBeneficiarioApiError,
  ALTA_FORM_INICIAL,
  type BeneficiarioAltaForm,
} from "@/lib/beneficiario-alta"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CURP_VALIDA = "GAEJ900101HMNRRL09"

/** Formulario con todos los campos obligatorios de validateAlta cubiertos. */
const baseAlta: BeneficiarioAltaForm = {
  ...ALTA_FORM_INICIAL,
  nombres:          "Juan",
  apellidoPaterno:  "García",
  apellidoMaterno:  "López",
  curp:             CURP_VALIDA,
  fechaNacimiento:  "1990-01-01",
  ciudad:           "Guadalajara",
  estado:           "Jalisco",
  estadoNacimiento: "Jalisco",
  telefonoCelular:  "3312345678",
  correoElectronico: "juan@example.com",
  usaValvula:       false,
  genero:           "H",
}

/** Formulario válido para validateAltaSolicitudPublica (agrega genero + estadoNacimiento). */
const baseSolicitud: BeneficiarioAltaForm = { ...baseAlta }

// ═══════════════════════════════════════════════════════════════════════════════
// validateAlta — campo tipo (opcional, sentinela __no_se__)
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateAlta — campo tipo", () => {
  test("tipo vacío no genera error (campo opcional)", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo undefined no genera error", () => {
    const errs = validateAlta({ ...baseAlta, tipo: undefined as unknown as string })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo '__no_se__' no genera error (sentinela interno)", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "__no_se__" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo válido 'Mielomeningocele' no genera error", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "Mielomeningocele" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo válido case-insensitive 'oculta' no genera error", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "oculta" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo desconocido genera error 'Tipo no válido'", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "DesconocidoXYZ" })
    expect(errs.tipo).toBe("Tipo no válido")
  })

  test("formulario completo sin tipo no tiene errores", () => {
    const errs = validateAlta({ ...baseAlta, tipo: "" })
    expect(Object.keys(errs)).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateAltaSolicitudPublica — campo tipo (opcional, sentinela __no_se__)
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateAltaSolicitudPublica — campo tipo", () => {
  test("tipo vacío no genera error", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, tipo: "" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo '__no_se__' no genera error", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, tipo: "__no_se__" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo válido no genera error", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, tipo: "Meningocele" })
    expect(errs.tipo).toBeUndefined()
  })

  test("tipo desconocido genera error 'Tipo no válido'", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, tipo: "TipoInexistente" })
    expect(errs.tipo).toBe("Tipo no válido")
  })

  test("formulario completo con '__no_se__' no tiene errores de tipo", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, tipo: "__no_se__" })
    expect(errs.tipo).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateAltaSolicitudPublica — campos obligatorios y validaciones específicas
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateAltaSolicitudPublica — campos obligatorios", () => {
  test("formulario mínimo válido no genera errores", () => {
    const errs = validateAltaSolicitudPublica(baseSolicitud)
    expect(Object.keys(errs)).toHaveLength(0)
  })

  test("sin nombres → error Obligatorio", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, nombres: "" })
    expect(errs.nombres).toBe("Obligatorio")
  })

  test("sin correoElectronico → error Obligatorio", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, correoElectronico: "" })
    expect(errs.correoElectronico).toBe("Obligatorio")
  })

  test("usaValvula undefined → error Obligatorio", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, usaValvula: undefined })
    expect(errs.usaValvula).toBe("Obligatorio")
  })

  test("genero inválido → error de género", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, genero: "X" })
    expect(errs.genero).toBeTruthy()
  })

  test("genero H es válido", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, genero: "H" })
    expect(errs.genero).toBeUndefined()
  })

  test("genero M es válido", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, genero: "M" })
    expect(errs.genero).toBeUndefined()
  })

  test("estadoNacimiento vacío → error Obligatorio", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, estadoNacimiento: "" })
    expect(errs.estadoNacimiento).toBe("Obligatorio")
  })

  test("estadoNacimiento inválido → error de estado", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, estadoNacimiento: "EstadoFalso" })
    expect(errs.estadoNacimiento).toBeTruthy()
  })

  test("CURP inválida → error CURP inválida", () => {
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, curp: "INVALIDA" })
    expect(errs.curp).toBe("CURP inválida")
  })

  test("notas muy largas con marcador > 500 → error en notas", () => {
    const notasLargas = "x".repeat(480)
    const errs = validateAltaSolicitudPublica({ ...baseSolicitud, notas: notasLargas })
    expect(errs.notas).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildAltaCreatePayload — conversión de tipo (sentinela __no_se__)
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildAltaCreatePayload — campo tipo", () => {
  test("tipo '__no_se__' → tipo undefined en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipo: "__no_se__" })
    expect(payload.tipo).toBeUndefined()
  })

  test("tipo vacío '' → tipo undefined en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipo: "" })
    expect(payload.tipo).toBeUndefined()
  })

  test("tipo 'Mielomeningocele' → se preserva canonicalizado", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipo: "Mielomeningocele" })
    expect(payload.tipo).toBe("Mielomeningocele")
  })

  test("tipo en minúsculas 'mielomeningocele' → canonicaliza a 'Mielomeningocele'", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipo: "mielomeningocele" })
    expect(payload.tipo).toBe("Mielomeningocele")
  })

  test("tipo 'Oculta' → se preserva", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipo: "Oculta" })
    expect(payload.tipo).toBe("Oculta")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildAltaCreatePayload — conversión de género y otros campos
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildAltaCreatePayload — conversiones de campos", () => {
  test("genero 'H' (CURP) se convierte a 'M' (API = Masculino)", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, genero: "H" })
    expect(payload.genero).toBe("M")
  })

  test("genero 'M' (CURP) se convierte a 'F' (API = Femenino)", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, genero: "M" })
    expect(payload.genero).toBe("F")
  })

  test("usaValvula true → 'S' en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, usaValvula: true })
    expect(payload.usaValvula).toBe("S")
  })

  test("usaValvula false → 'N' en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, usaValvula: false })
    expect(payload.usaValvula).toBe("N")
  })

  test("estadoNacimiento NO se incluye en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, estadoNacimiento: "Jalisco" })
    expect("estadoNacimiento" in payload).toBe(false)
  })

  test("curp se convierte a mayúsculas", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, curp: CURP_VALIDA.toLowerCase() })
    expect(payload.curp).toBe(CURP_VALIDA.toUpperCase())
  })

  test("teléfono con guiones → solo dígitos en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, telefonoCelular: "331-234-5678" })
    expect(payload.telefonoCelular).toBe("3312345678")
  })

  test("CP con espacios → solo dígitos en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, cp: " 44100 " })
    expect(payload.cp).toBe("44100")
  })

  test("tipoSangre vacío → undefined en el payload", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipoSangre: "" })
    expect(payload.tipoSangre).toBeUndefined()
  })

  test("tipoSangre 'A+' → se preserva", () => {
    const payload = buildAltaCreatePayload({ ...baseAlta, tipoSangre: "A+" })
    expect(payload.tipoSangre).toBe("A+")
  })

  test("membresiaEstatus siempre es 'Sin membresia'", () => {
    const payload = buildAltaCreatePayload(baseAlta)
    expect(payload.membresiaEstatus).toBe("Sin membresia")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// parseBeneficiarioApiError — tipo ya NO genera error (fue removido)
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseBeneficiarioApiError — tipo ya no mapea a Obligatorio", () => {
  test("MISSING_REQUIRED_FIELDS con 'tipo' en el mensaje → NO genera errs.tipo", () => {
    const raw = JSON.stringify({ code: "MISSING_REQUIRED_FIELDS", message: "Campos obligatorios faltantes: tipo" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.tipo).toBeUndefined()
  })

  test("MISSING_REQUIRED_FIELDS con 'tipo' y otros campos → solo mapea los otros", () => {
    const raw = JSON.stringify({ code: "MISSING_REQUIRED_FIELDS", message: "Campos obligatorios faltantes: nombres, tipo" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.nombres).toBe("Obligatorio")
    expect(errs.tipo).toBeUndefined()
  })
})

describe("parseBeneficiarioApiError — mapeos correctos", () => {
  test("MISSING_REQUIRED_FIELDS con nombres → errs.nombres", () => {
    const raw = JSON.stringify({ code: "MISSING_REQUIRED_FIELDS", message: "Campos obligatorios faltantes: nombres" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.nombres).toBe("Obligatorio")
  })

  test("MISSING_REQUIRED_FIELDS con correoElectronico → errs.correoElectronico", () => {
    const raw = JSON.stringify({ code: "MISSING_REQUIRED_FIELDS", message: "Campos obligatorios faltantes: correoElectronico" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.correoElectronico).toBe("Obligatorio")
  })

  test("MISSING_REQUIRED_FIELDS con usaValvula → errs.usaValvula", () => {
    const raw = JSON.stringify({ code: "MISSING_REQUIRED_FIELDS", message: "Campos obligatorios faltantes: usaValvula" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.usaValvula).toBe("Obligatorio")
  })

  test("DUPLICATE_CURP → errs.curp", () => {
    const raw = JSON.stringify({ code: "DUPLICATE_CURP", message: "Ya existe" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.curp).toBe("Esta CURP ya está registrada")
  })

  test("INVALID_PHONE con CELULAR → errs.telefonoCelular", () => {
    const raw = JSON.stringify({ code: "INVALID_PHONE", message: "CELULAR inválido" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.telefonoCelular).toBe("10 dígitos")
  })

  test("INVALID_PHONE con CASA → errs.telefonoCasa", () => {
    const raw = JSON.stringify({ code: "INVALID_PHONE", message: "CASA inválido" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.telefonoCasa).toBe("10 dígitos")
  })

  test("INVALID_EMAIL → errs.correoElectronico", () => {
    const raw = JSON.stringify({ code: "INVALID_EMAIL", message: "" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.correoElectronico).toBe("Correo inválido")
  })

  test("INVALID_TIPO_SANGRE → errs.tipoSangre", () => {
    const raw = JSON.stringify({ code: "INVALID_TIPO_SANGRE", message: "" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.tipoSangre).toBe("Elige un tipo de sangre válido")
  })

  test("CAPTCHA_FAILED → errs.turnstile", () => {
    const raw = JSON.stringify({ code: "CAPTCHA_FAILED", message: "Captcha falló" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs.turnstile).toBeTruthy()
  })

  test("código desconocido → errs._global con el mensaje", () => {
    const raw = JSON.stringify({ code: "UNKNOWN_CODE", message: "Error raro" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs._global).toBe("Error raro")
  })

  test("texto plano (no JSON) → errs._global", () => {
    const errs = parseBeneficiarioApiError("Error interno del servidor")
    expect(errs._global).toBeTruthy()
  })

  test("BENEFICIARIO_BAJA → errs._global", () => {
    const raw = JSON.stringify({ code: "BENEFICIARIO_BAJA", message: "" })
    const errs = parseBeneficiarioApiError(raw)
    expect(errs._global).toBeTruthy()
  })

  test("texto con 'ya existe un beneficiario con la curp' → errs.curp", () => {
    const errs = parseBeneficiarioApiError("Ya existe un beneficiario con la CURP proporcionada")
    expect(errs.curp).toBe("Esta CURP ya está registrada")
  })
})
