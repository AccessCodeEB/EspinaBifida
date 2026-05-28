const VOCALES = new Set(["A", "E", "I", "O", "U"])
const CONSONANTES = new Set([
  "B","C","D","F","G","H","J","K","L","M","N","P","Q","R","S","T","V","W","X","Y","Z",
])

const PALABRAS_INCONVENIENTES = new Set([
  "BACA","BAKA","BUEI","BUEY","CACA","CACO","CAGA","CAGO","CAKA","CAKO",
  "COGE","COGI","COJA","COJE","COJI","COJO","COLA","CULO","FALO","FETO",
  "GETA","GUEI","GUEY","JETA","JOTO","KACA","KACO","KAGA","KAGO","KAKA",
  "KAKO","KOGE","KOGI","KOJA","KOJE","KOJI","KOJO","KOLA","KULO","LELO",
  "LOCA","LOCO","LOKA","LOKO","MAME","MAMO","MEAR","MEAS","MEON","MIAR",
  "MION","MOCO","MOKO","MULA","MULO","NACA","NACO","PEDA","PEDO","PENE",
  "PIPI","PITO","POPO","PUTA","PUTO","QULO","RATA","ROBA","ROBE","ROBO",
  "RUIN","SENO","TETA","VACA","VAGA","VAGO","VAKA","VUEI","VUEY","WUEI","WUEY",
])

const CLAVES_ESTADO: Record<string, string> = {
  "Aguascalientes": "AS",
  "Baja California": "BC",
  "Baja California Sur": "BS",
  "Campeche": "CC",
  "Chiapas": "CS",
  "Chihuahua": "CH",
  "Ciudad de México": "DF",
  "Coahuila": "CL",
  "Colima": "CM",
  "Durango": "DG",
  "Guanajuato": "GT",
  "Guerrero": "GR",
  "Hidalgo": "HG",
  "Jalisco": "JC",
  "México": "MC",
  "Michoacán": "MN",
  "Morelos": "MS",
  "Nayarit": "NT",
  "Nuevo León": "NL",
  "Oaxaca": "OC",
  "Puebla": "PL",
  "Querétaro": "QT",
  "Quintana Roo": "QR",
  "San Luis Potosí": "SP",
  "Sinaloa": "SL",
  "Sonora": "SR",
  "Tabasco": "TC",
  "Tamaulipas": "TS",
  "Tlaxcala": "TL",
  "Veracruz": "VZ",
  "Yucatán": "YN",
  "Zacatecas": "ZS",
}

const NOMBRES_IGNORADOS = new Set(["JOSE", "MARIA", "MA", "J"])
const PARTICULAS = new Set(["DA","DE","DEL","DER","DIE","DD","EL","LA","LAS","LOS","MAC","MC","VAN","VON","Y","I"])

function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
}

function firstInternalVowel(s: string): string {
  for (let i = 1; i < s.length; i++) {
    if (VOCALES.has(s[i])) return s[i]
  }
  return "X"
}

function firstInternalConsonant(s: string): string {
  for (let i = 1; i < s.length; i++) {
    if (CONSONANTES.has(s[i])) return s[i]
  }
  return "X"
}

/** Elimina partículas (de, del, la, las…) de un apellido normalizado y retorna el resto. */
function stripParticlesFromApellido(normalized: string): string {
  const parts = normalized.split(/\s+/).filter(Boolean)
  const filtered = parts.filter((p) => !PARTICULAS.has(p))
  // Si todas las palabras son partículas, usa el valor original sin filtrar
  return (filtered.length > 0 ? filtered : parts).join(" ")
}

function effectiveName(normalizedNombres: string): string {
  const parts = normalizedNombres.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length >= 2 && NOMBRES_IGNORADOS.has(parts[0])) {
    const rest = parts.slice(1).filter((p) => !PARTICULAS.has(p))
    if (rest.length > 0) return rest[0]
  }
  return parts[0]
}

export interface CurpGeneratorInput {
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  fechaNacimiento: string
  genero: string
  estado: string
}

export function generateCurpPrefix(input: CurpGeneratorInput): string {
  const { apellidoPaterno, apellidoMaterno, nombres, fechaNacimiento, genero, estado } = input

  if (!apellidoPaterno.trim() || !nombres.trim() || !fechaNacimiento || !genero || !estado) {
    return ""
  }

  const pat = stripParticlesFromApellido(normalize(apellidoPaterno))
  const mat = stripParticlesFromApellido(normalize(apellidoMaterno))
  const nom = normalize(nombres)
  const primerNombre = effectiveName(nom)

  if (!pat || !primerNombre) return ""

  const l1 = pat[0] ?? "X"
  const l2 = firstInternalVowel(pat)
  const l3 = mat.length > 0 ? (mat[0] ?? "X") : "X"
  const l4 = primerNombre[0] ?? "X"

  let letterBlock = `${l1}${l2}${l3}${l4}`
  if (PALABRAS_INCONVENIENTES.has(letterBlock)) {
    letterBlock = `${l1}X${l3}${l4}`
  }

  const dateParts = fechaNacimiento.split("-")
  if (dateParts.length !== 3) return ""
  const [yyyy, mm, dd] = dateParts
  const yy = yyyy.slice(2)
  const dateBlock = `${yy}${mm}${dd}`

  const genderCode = genero === "H" || genero === "M" ? genero : ""
  if (!genderCode) return ""

  const stateCode = CLAVES_ESTADO[estado] ?? ""
  if (!stateCode) return ""

  const c14 = firstInternalConsonant(pat)
  const c15 = mat.length > 0 ? firstInternalConsonant(mat) : "X"
  const c16 = firstInternalConsonant(primerNombre)

  return `${letterBlock}${dateBlock}${genderCode}${stateCode}${c14}${c15}${c16}`
}
