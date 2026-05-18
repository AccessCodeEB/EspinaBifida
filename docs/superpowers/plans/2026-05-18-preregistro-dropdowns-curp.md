# Pre-registro: Dropdowns Estado/Ciudad + Autocompletado CURP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los campos de texto libre `estado`/`ciudad` con dropdowns en cascada del catálogo INEGI, agregar campo `genero`, y autocompletar las primeras 16 posiciones del CURP a partir de los datos del formulario.

**Architecture:** Datos geográficos estáticos en `data/mx-estados-municipios.ts`; algoritmo CURP en `lib/curp-generator.ts`; el formulario observa los campos relevantes con `useEffect` y actualiza el CURP reactivamente, respetando ediciones manuales del usuario.

**Tech Stack:** Next.js 14, React, TypeScript, shadcn/ui (`Select`), Jest (unit tests)

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `frontend/data/mx-estados-municipios.ts` | Crear | Catálogo estático de 32 estados y sus municipios |
| `frontend/lib/curp-generator.ts` | Crear | Función pura que calcula los primeros 16 chars del CURP |
| `frontend/lib/__tests__/curp-generator.test.ts` | Crear | Tests unitarios del generador |
| `frontend/lib/beneficiario-alta.ts` | Modificar | Agregar validación de `genero`; actualizar `estado`/`ciudad` contra catálogo |
| `frontend/components/public-preregistro-section.tsx` | Modificar | Dropdowns + campo género + CURP reactivo |

---

## Task 1: Catálogo estático de estados y municipios

**Files:**
- Create: `frontend/data/mx-estados-municipios.ts`

- [ ] **Step 1: Crear el archivo con los 32 estados y sus municipios principales**

```typescript
// frontend/data/mx-estados-municipios.ts

export const ESTADOS: string[] = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
]

export const MUNICIPIOS: Record<string, string[]> = {
  "Aguascalientes": [
    "Aguascalientes","Asientos","Calvillo","Cosío","El Llano",
    "Jesús María","Pabellón de Arteaga","Rincón de Romos",
    "San Francisco de los Romo","San José de Gracia","Tepezalá",
  ],
  "Baja California": [
    "Ensenada","Mexicali","Playas de Rosarito","Tecate","Tijuana",
  ],
  "Baja California Sur": [
    "Comondú","La Paz","Loreto","Los Cabos","Mulegé",
  ],
  "Campeche": [
    "Calakmul","Calkiní","Campeche","Candelaria","Carmen",
    "Champotón","Escárcega","Hecelchakán","Hopelchén","Palizada","Tenabo",
  ],
  "Chiapas": [
    "Berriozábal","Chiapa de Corzo","Comitán de Domínguez","Huixtla",
    "Mapastepec","Ocosingo","Palenque","San Cristóbal de las Casas",
    "Tapachula","Tonalá","Tuxtla Gutiérrez","Villaflores",
  ],
  "Chihuahua": [
    "Camargo","Chihuahua","Ciudad Juárez","Cuauhtémoc","Delicias",
    "Guachochi","Hidalgo del Parral","Jiménez","Nuevo Casas Grandes","Ojinaga",
  ],
  "Ciudad de México": [
    "Álvaro Obregón","Azcapotzalco","Benito Juárez","Coyoacán",
    "Cuajimalpa de Morelos","Cuauhtémoc","Gustavo A. Madero","Iztacalco",
    "Iztapalapa","La Magdalena Contreras","Miguel Hidalgo","Milpa Alta",
    "Tláhuac","Tlalpan","Venustiano Carranza","Xochimilco",
  ],
  "Coahuila": [
    "Acuña","Allende","Frontera","Monclova","Múzquiz",
    "Piedras Negras","Ramos Arizpe","Sabinas","Saltillo",
    "San Pedro","Torreón",
  ],
  "Colima": [
    "Armería","Colima","Comala","Coquimatlán","Cuauhtémoc",
    "Ixtlahuacán","Manzanillo","Minatitlán","Tecomán","Villa de Álvarez",
  ],
  "Durango": [
    "Canatlán","Durango","El Salto","Gómez Palacio","Guadalupe Victoria",
    "Lerdo","Pueblo Nuevo","Santiago Papasquiaro","Vicente Guerrero",
  ],
  "Guanajuato": [
    "Acámbaro","Celaya","Guanajuato","Irapuato","León",
    "Pénjamo","Salamanca","San Francisco del Rincón","San Miguel de Allende",
    "Silao de la Victoria","Uriangato","Yuriria",
  ],
  "Guerrero": [
    "Acapulco de Juárez","Ayutla de los Libres","Chilpancingo de los Bravo",
    "Iguala de la Independencia","Taxco de Alarcón","Tlapa de Comonfort",
    "Zihuatanejo de Azueta",
  ],
  "Hidalgo": [
    "Actopan","Huejutla de Reyes","Ixmiquilpan","Pachuca de Soto",
    "Tizayuca","Tula de Allende","Tulancingo de Bravo",
  ],
  "Jalisco": [
    "Acatlán de Juárez","Ameca","Autlán de Navarro","Guadalajara",
    "Lagos de Moreno","Puerto Vallarta","San Pedro Tlaquepaque",
    "Tepatitlán de Morelos","Tlajomulco de Zúñiga","Tonalá",
    "Zapopan","Zapotlanejo","Ocotlán",
  ],
  "México": [
    "Atizapán de Zaragoza","Chalco","Chimalhuacán","Coacalco de Berriozábal",
    "Cuautitlán","Cuautitlán Izcalli","Ecatepec de Morelos","Ixtapaluca",
    "La Paz","Naucalpan de Juárez","Nezahualcóyotl","Nicolás Romero",
    "Tecámac","Texcoco","Tlalnepantla de Baz","Toluca","Tultitlán","Valle de Chalco Solidaridad",
  ],
  "Michoacán": [
    "Apatzingán","Hidalgo","Lázaro Cárdenas","Los Reyes","Morelia",
    "Pátzcuaro","Sahuayo","Uruapan","Zamora","Zitácuaro",
  ],
  "Morelos": [
    "Cuernavaca","Cuautla","Emiliano Zapata","Jiutepec","Jojutla",
    "Puente de Ixtla","Temixco","Yautepec de Zaragoza","Zacatepec",
  ],
  "Nayarit": [
    "Acaponeta","Ahuacatlán","Amatlán de Cañas","Bahía de Banderas",
    "Compostela","El Nayar","Huajicori","Ixtlán del Río","Jala",
    "La Yesca","Rosamorada","Ruíz","San Blas","San Pedro Lagunillas",
    "Santa María del Oro","Santiago Ixcuintla","Tecuala","Tepic","Tuxpan","Xalisco",
  ],
  "Nuevo León": [
    "Apodaca","Cadereyta Jiménez","García","General Escobedo",
    "Guadalupe","Juárez","Linares","Montemorelos","Monterrey",
    "Pesquería","San Nicolás de los Garza","San Pedro Garza García","Santa Catarina",
  ],
  "Oaxaca": [
    "Huajuapan de León","Juchitán de Zaragoza","Oaxaca de Juárez",
    "Puerto Escondido","Salina Cruz","San Juan Bautista Tuxtepec",
    "Tehuantepec","Tlaxiaco",
  ],
  "Puebla": [
    "Acatzingo","Atlixco","Cholula","Ciudad Serdán","Izúcar de Matamoros",
    "Puebla","San Andrés Cholula","San Martín Texmelucan",
    "Tehuacán","Teziutlán","Zacatlán",
  ],
  "Querétaro": [
    "Amealco de Bonfil","Arroyo Seco","Cadereyta de Montes","Colón",
    "Corregidora","El Marqués","Ezequiel Montes","Huimilpan",
    "Jalpan de Serra","Landa de Matamoros","Pedro Escobedo","Peñamiller",
    "Pinal de Amoles","Querétaro","San Joaquín","San Juan del Río",
    "Tequisquiapan","Tolimán",
  ],
  "Quintana Roo": [
    "Bacalar","Benito Juárez","Cozumel","Felipe Carrillo Puerto",
    "Isla Mujeres","José María Morelos","Lázaro Cárdenas",
    "Othón P. Blanco","Puerto Morelos","Solidaridad","Tulum",
  ],
  "San Luis Potosí": [
    "Cárdenas","Ciudad Valles","Matehuala","Rioverde",
    "San Luis Potosí","Soledad de Graciano Sánchez","Tamazunchale","Tamuín",
  ],
  "Sinaloa": [
    "Ahome","Angostura","Badiraguato","Choix","Concordia",
    "Cosalá","Culiacán","El Fuerte","Elota","Escuinapa",
    "Guasave","Mazatlán","Mocorito","Navolato","Rosario",
    "Salvador Alvarado","San Ignacio","Sinaloa",
  ],
  "Sonora": [
    "Agua Prieta","Álamos","Cajeme","Caborca","Empalme",
    "Guaymas","Hermosillo","Huatabampo","Magdalena","Navojoa",
    "Nogales","Puerto Peñasco","San Luis Río Colorado",
  ],
  "Tabasco": [
    "Balancán","Cárdenas","Centla","Centro","Comalcalco",
    "Cunduacán","Emiliano Zapata","Huimanguillo","Jalapa",
    "Jalpa de Méndez","Jonuta","Macuspana","Nacajuca",
    "Paraíso","Tacotalpa","Teapa","Tenosique",
  ],
  "Tamaulipas": [
    "Altamira","Ciudad Madero","Ciudad Victoria","Matamoros",
    "Nuevo Laredo","Reynosa","Río Bravo","Tampico",
  ],
  "Tlaxcala": [
    "Apizaco","Chiautempan","Contla de Juan Cuamatzi","Huamantla",
    "Papalotla de Xicohténcatl","Sanctórum de Lázaro Cárdenas",
    "Tlaxcala","Xicohtzinco","Zacatelco",
  ],
  "Veracruz": [
    "Coatzacoalcos","Córdoba","Martínez de la Torre","Minatitlán",
    "Orizaba","Papantla","Poza Rica de Hidalgo","Tuxpan",
    "Veracruz","Xalapa",
  ],
  "Yucatán": [
    "Kanasín","Mérida","Motul","Oxkutzcab","Progreso",
    "Tekax","Ticul","Tizimín","Umán","Valladolid",
  ],
  "Zacatecas": [
    "Calera","Concepción del Oro","Fresnillo","Guadalupe",
    "Jerez de García Salinas","Loreto","Pinos","Río Grande",
    "Sombrerete","Zacatecas",
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/data/mx-estados-municipios.ts
git commit -m "feat(data): agregar catálogo estático de estados y municipios INEGI"
```

---

## Task 2: CURP Generator (TDD)

**Files:**
- Create: `frontend/lib/curp-generator.ts`
- Create: `frontend/lib/__tests__/curp-generator.test.ts`

- [ ] **Step 1: Escribir el archivo de tests primero**

```typescript
// frontend/lib/__tests__/curp-generator.test.ts
import { generateCurpPrefix } from "@/lib/curp-generator"

describe("generateCurpPrefix", () => {
  it("calcula correctamente el prefijo de 16 chars (caso base)", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "García",
        apellidoMaterno: "López",
        nombres: "Juan",
        fechaNacimiento: "1990-05-15",
        genero: "H",
        estado: "Jalisco",
      })
    ).toBe("GALJ900515HJCRPN")
  })

  it("usa X en posiciones 3 y 15 cuando apellido materno está vacío", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Hernández",
        apellidoMaterno: "",
        nombres: "Pedro",
        fechaNacimiento: "2000-12-01",
        genero: "H",
        estado: "Nuevo León",
      })
    ).toBe("HEXP001201HNLRXD")
  })

  it("omite JOSE cuando hay segundo nombre", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Martínez",
        apellidoMaterno: "Ruiz",
        nombres: "José Luis",
        fechaNacimiento: "1975-08-20",
        genero: "H",
        estado: "Jalisco",
      })
    ).toBe("MARL750820HJCRZS")
  })

  it("reemplaza pos 2 con X cuando las 4 letras forman palabra inconveniente", () => {
    // BUENDIA/ELIZONDO/IGNACIO → B-U-E-I = BUEI (inconveniente) → BXEI
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Buendía",
        apellidoMaterno: "Elizondo",
        nombres: "Ignacio",
        fechaNacimiento: "1988-07-14",
        genero: "M",
        estado: "Nuevo León",
      })
    ).toBe("BXEI880714MNLNLG")
  })

  it("retorna cadena vacía si faltan campos requeridos", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "",
        apellidoMaterno: "López",
        nombres: "Ana",
        fechaNacimiento: "1995-03-10",
        genero: "M",
        estado: "Jalisco",
      })
    ).toBe("")
  })

  it("retorna cadena vacía si el estado no está en el catálogo", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "García",
        apellidoMaterno: "López",
        nombres: "Ana",
        fechaNacimiento: "1995-03-10",
        genero: "M",
        estado: "EstadoInexistente",
      })
    ).toBe("")
  })

  it("normaliza acentos y mayúsculas", () => {
    // Mismo resultado con o sin acentos
    const withAccents = generateCurpPrefix({
      apellidoPaterno: "García",
      apellidoMaterno: "López",
      nombres: "Juan",
      fechaNacimiento: "1990-05-15",
      genero: "H",
      estado: "Jalisco",
    })
    const withoutAccents = generateCurpPrefix({
      apellidoPaterno: "Garcia",
      apellidoMaterno: "Lopez",
      nombres: "Juan",
      fechaNacimiento: "1990-05-15",
      genero: "H",
      estado: "Jalisco",
    })
    expect(withAccents).toBe(withoutAccents)
    expect(withAccents).toBe("GALJ900515HJCRPN")
  })

  it("el resultado siempre tiene exactamente 16 caracteres cuando hay datos", () => {
    const result = generateCurpPrefix({
      apellidoPaterno: "Sánchez",
      apellidoMaterno: "Torres",
      nombres: "María",
      fechaNacimiento: "2001-11-30",
      genero: "M",
      estado: "Veracruz",
    })
    expect(result).toHaveLength(16)
  })
})
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan (función no existe)**

```bash
cd /Users/leobardo/Desktop/EspinaBifida
npx jest --testPathPattern="curp-generator" --no-coverage 2>&1 | tail -20
```

Esperado: FAIL — "Cannot find module '@/lib/curp-generator'"

- [ ] **Step 3: Crear la implementación**

```typescript
// frontend/lib/curp-generator.ts

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

/** Clave RENAPO de 2 letras por estado (estándar oficial). */
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

/** Nombres/partículas que se omiten al determinar el primer nombre efectivo. */
const NOMBRES_IGNORADOS = new Set(["JOSE", "MARIA", "MA", "J"])
const PARTICULAS = new Set(["DA","DE","DEL","DER","DIE","DD","EL","LA","LAS","LOS","MAC","MC","VAN","VON","Y","I"])

/** Quita acentos y deja solo letras A-Z y números. */
function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
}

/** Primera vocal interna (a partir de la posición 1). Retorna "X" si no hay. */
function firstInternalVowel(s: string): string {
  for (let i = 1; i < s.length; i++) {
    if (VOCALES.has(s[i])) return s[i]
  }
  return "X"
}

/** Primera consonante interna (a partir de la posición 1). Retorna "X" si no hay. */
function firstInternalConsonant(s: string): string {
  for (let i = 1; i < s.length; i++) {
    if (CONSONANTES.has(s[i])) return s[i]
  }
  return "X"
}

/**
 * Devuelve el primer nombre efectivo para el CURP.
 * Si el primer token es JOSE/MARIA (y hay más tokens), usa el siguiente
 * token que no sea una partícula.
 */
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
  fechaNacimiento: string  // YYYY-MM-DD
  genero: string           // "H" | "M"
  estado: string           // nombre completo del estado (debe estar en CLAVES_ESTADO)
}

/**
 * Calcula las primeras 16 posiciones del CURP según el estándar RENAPO.
 * Las posiciones 17-18 (homoclave) son asignadas por RENAPO y deben
 * ingresarse manualmente.
 *
 * @returns String de 16 caracteres en mayúsculas, o "" si faltan datos.
 */
export function generateCurpPrefix(input: CurpGeneratorInput): string {
  const { apellidoPaterno, apellidoMaterno, nombres, fechaNacimiento, genero, estado } = input

  if (!apellidoPaterno.trim() || !nombres.trim() || !fechaNacimiento || !genero || !estado) {
    return ""
  }

  const pat = normalize(apellidoPaterno)
  const mat = normalize(apellidoMaterno)
  const nom = normalize(nombres)
  const primerNombre = effectiveName(nom)

  if (!pat || !primerNombre) return ""

  // Posiciones 1-4: bloque de letras
  const l1 = pat[0] ?? "X"
  const l2 = firstInternalVowel(pat)
  const l3 = mat.length > 0 ? (mat[0] ?? "X") : "X"
  const l4 = primerNombre[0] ?? "X"

  let letterBlock = `${l1}${l2}${l3}${l4}`
  if (PALABRAS_INCONVENIENTES.has(letterBlock)) {
    letterBlock = `${l1}X${l3}${l4}`
  }

  // Posiciones 5-10: YYMMDD
  const dateParts = fechaNacimiento.split("-")
  if (dateParts.length !== 3) return ""
  const [yyyy, mm, dd] = dateParts
  const yy = yyyy.slice(2)
  const dateBlock = `${yy}${mm}${dd}`

  // Posición 11: sexo
  const genderCode = genero === "H" || genero === "M" ? genero : ""
  if (!genderCode) return ""

  // Posiciones 12-13: clave del estado
  const stateCode = CLAVES_ESTADO[estado] ?? ""
  if (!stateCode) return ""

  // Posiciones 14-16: consonantes internas
  const c14 = firstInternalConsonant(pat)
  const c15 = mat.length > 0 ? firstInternalConsonant(mat) : "X"
  const c16 = firstInternalConsonant(primerNombre)

  return `${letterBlock}${dateBlock}${genderCode}${stateCode}${c14}${c15}${c16}`
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
npx jest --testPathPattern="curp-generator" --no-coverage 2>&1 | tail -20
```

Esperado: PASS — 8 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/curp-generator.ts frontend/lib/__tests__/curp-generator.test.ts
git commit -m "feat(curp): agregar generador de prefijo CURP con tests"
```

---

## Task 3: Actualizar validación en beneficiario-alta.ts

**Files:**
- Modify: `frontend/lib/beneficiario-alta.ts`

- [ ] **Step 1: Importar el catálogo en beneficiario-alta.ts**

Al inicio del archivo, después de las importaciones existentes, agregar:

```typescript
import { ESTADOS, MUNICIPIOS } from "@/data/mx-estados-municipios"
```

- [ ] **Step 2: Reemplazar la validación de `estado` y `ciudad` en `validateAltaSolicitudPublica`**

Ubicar (líneas 196-200 aprox.):
```typescript
  if (!form.estado.trim()) errs.estado = "Obligatorio"
  else {
    const ee = errTextNoDigits(form.estado)
    if (ee) errs.estado = ee
  }
```

Reemplazar con:
```typescript
  if (!form.estado.trim()) {
    errs.estado = "Obligatorio"
  } else if (!ESTADOS.includes(form.estado)) {
    errs.estado = "Selecciona un estado válido"
  }
```

Ubicar (líneas 191-195 aprox.):
```typescript
  if (!form.ciudad.trim()) errs.ciudad = "Obligatorio"
  else {
    const ce = errTextNoDigits(form.ciudad)
    if (ce) errs.ciudad = ce
  }
```

Reemplazar con:
```typescript
  if (!form.ciudad.trim()) {
    errs.ciudad = "Obligatorio"
  } else if (
    form.estado &&
    MUNICIPIOS[form.estado] &&
    !MUNICIPIOS[form.estado].includes(form.ciudad)
  ) {
    errs.ciudad = "Selecciona una ciudad válida"
  }
```

- [ ] **Step 3: Agregar validación de `genero` en `validateAltaSolicitudPublica`**

Después de la validación de `fechaNacimiento` (línea 190 aprox.), agregar:

```typescript
  if (!form.genero) {
    errs.genero = "Obligatorio"
  } else if (form.genero !== "H" && form.genero !== "M") {
    errs.genero = "Selecciona un género válido"
  }
```

- [ ] **Step 4: Ejecutar los tests existentes para verificar que no se rompió nada**

```bash
npx jest --testPathPattern="beneficiario" --no-coverage 2>&1 | tail -30
```

Esperado: todos los tests existentes siguen en PASS. Si alguno falla por el cambio de validación de `estado`/`ciudad`, actualizar los fixtures para usar valores del catálogo.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/beneficiario-alta.ts
git commit -m "feat(validacion): agregar género y validar estado/ciudad contra catálogo"
```

---

## Task 4: Actualizar el formulario de pre-registro

**Files:**
- Modify: `frontend/components/public-preregistro-section.tsx`

- [ ] **Step 1: Agregar imports del catálogo y del generador de CURP**

En las importaciones existentes del archivo (líneas 1-38), agregar:

```typescript
import { useEffect, useRef } from "react"  // useRef ya está, agregar useEffect si no está
import { ESTADOS, MUNICIPIOS } from "@/data/mx-estados-municipios"
import { generateCurpPrefix } from "@/lib/curp-generator"
```

> Nota: `useCallback`, `useMemo`, `useRef`, `useState` ya están importados en línea 3. Agregar `useEffect` a esa lista.

- [ ] **Step 2: Agregar estado local para rastrear edición manual del CURP**

Dentro del componente `PublicPreregistroSection`, después de la línea `const [turnstileToken, setTurnstileToken] = useState("")`:

```typescript
const curpEditadoManualmente = useRef(false)
```

- [ ] **Step 3: Agregar useEffect para autocompletar el CURP**

Después de `curpEditadoManualmente`, agregar:

```typescript
useEffect(() => {
  if (curpEditadoManualmente.current) return
  const prefix = generateCurpPrefix({
    apellidoPaterno: form.apellidoPaterno,
    apellidoMaterno: form.apellidoMaterno,
    nombres: form.nombres,
    fechaNacimiento: form.fechaNacimiento,
    genero: form.genero,
    estado: form.estado,
  })
  if (prefix) {
    setForm((p) => ({ ...p, curp: prefix }))
  }
}, [form.apellidoPaterno, form.apellidoMaterno, form.nombres, form.fechaNacimiento, form.genero, form.estado])
```

- [ ] **Step 4: Actualizar la función `change` para detectar edición manual del CURP**

Reemplazar la función `change` existente (líneas 156-164):

```typescript
const change = useCallback((field: keyof BeneficiarioAltaForm, value: string | boolean) => {
  if (field === "curp") {
    curpEditadoManualmente.current = true
    // Si el usuario borra el campo, permitir que vuelva a autocompletarse
    if (value === "") curpEditadoManualmente.current = false
  }
  if (field === "estado") {
    // Al cambiar estado, resetear ciudad
    setForm((p) => ({ ...p, [field]: value, ciudad: "" }))
    setErrors((e) => {
      const next = { ...e }
      delete next[field as string]
      delete next.ciudad
      return next
    })
    return
  }
  setForm((p) => ({ ...p, [field]: value }))
  setErrors((e) => {
    if (!e[field as string]) return e
    const next = { ...e }
    delete next[field as string]
    return next
  })
}, [])
```

- [ ] **Step 5: Actualizar `resetAll` para limpiar la flag de edición manual**

Reemplazar `resetAll` (líneas 166-172):

```typescript
const resetAll = useCallback(() => {
  setForm({ ...ALTA_FORM_INICIAL })
  setErrors({})
  setDone(false)
  setTurnstileToken("")
  curpEditadoManualmente.current = false
  turnstileRef.current?.reset()
}, [])
```

- [ ] **Step 6: Reemplazar los campos Estado y Ciudad con Selects, y agregar campo Género**

Localizar el bloque del Step 1 del formulario (dentro del `<StepCard step={1}>`). Reemplazar el contenido del `<div className="grid gap-5 sm:grid-cols-2">` con:

```tsx
<div className="grid gap-5 sm:grid-cols-2">
  <FieldShell label="Nombre(s)" required error={errors.nombres} htmlFor="prereg-nombres">
    <Input
      id="prereg-nombres"
      value={form.nombres}
      onChange={(e) => change("nombres", e.target.value)}
      className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.nombres && "border-red-400")}
      placeholder="Ej. Ana Lucía"
      autoComplete="given-name"
    />
  </FieldShell>

  <FieldShell label="Apellido paterno" required error={errors.apellidoPaterno} htmlFor="prereg-ap-pat">
    <Input
      id="prereg-ap-pat"
      value={form.apellidoPaterno}
      onChange={(e) => change("apellidoPaterno", e.target.value)}
      className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.apellidoPaterno && "border-red-400")}
      placeholder="Ej. Martínez"
      autoComplete="family-name"
    />
  </FieldShell>

  <FieldShell label="Apellido materno" required error={errors.apellidoMaterno} htmlFor="prereg-ap-mat">
    <Input
      id="prereg-ap-mat"
      value={form.apellidoMaterno}
      onChange={(e) => change("apellidoMaterno", e.target.value)}
      className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.apellidoMaterno && "border-red-400")}
      placeholder="Ej. Sánchez"
    />
  </FieldShell>

  <FieldShell label="Fecha de nacimiento" required error={errors.fechaNacimiento} htmlFor="prereg-fn">
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        id="prereg-fn"
        type="date"
        value={form.fechaNacimiento}
        onChange={(e) => change("fechaNacimiento", e.target.value)}
        className={cn("h-11 rounded-lg bg-white pl-10 dark:bg-slate-900", errors.fechaNacimiento && "border-red-400")}
      />
    </div>
  </FieldShell>

  <FieldShell label="Género" required error={errors.genero} htmlFor="prereg-genero">
    <Select
      value={form.genero || undefined}
      onValueChange={(v) => change("genero", v)}
    >
      <SelectTrigger
        id="prereg-genero"
        className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.genero && "border-red-400")}
      >
        <SelectValue placeholder="Selecciona un género" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="M">Femenino</SelectItem>
        <SelectItem value="H">Masculino</SelectItem>
      </SelectContent>
    </Select>
  </FieldShell>

  <FieldShell label="Estado" required error={errors.estado} htmlFor="prereg-estado">
    <Select
      value={form.estado || undefined}
      onValueChange={(v) => change("estado", v)}
    >
      <SelectTrigger
        id="prereg-estado"
        className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.estado && "border-red-400")}
      >
        <SelectValue placeholder="Selecciona un estado" />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {ESTADOS.map((e) => (
          <SelectItem key={e} value={e}>{e}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FieldShell>

  <FieldShell label="Ciudad / Municipio" required error={errors.ciudad} htmlFor="prereg-ciudad">
    <Select
      value={form.ciudad || undefined}
      onValueChange={(v) => change("ciudad", v)}
      disabled={!form.estado}
    >
      <SelectTrigger
        id="prereg-ciudad"
        className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.ciudad && "border-red-400")}
      >
        <SelectValue placeholder={form.estado ? "Selecciona una ciudad" : "Primero elige el estado"} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {(MUNICIPIOS[form.estado] ?? []).map((m) => (
          <SelectItem key={m} value={m}>{m}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FieldShell>

  <FieldShell label="CURP" required error={errors.curp} htmlFor="prereg-curp" className="sm:col-span-2">
    <Input
      id="prereg-curp"
      value={form.curp}
      onChange={(e) => change("curp", e.target.value.toUpperCase())}
      maxLength={18}
      className={cn(
        "h-11 rounded-lg bg-white font-mono uppercase tracking-wide dark:bg-slate-900",
        errors.curp && "border-red-400"
      )}
      placeholder="Se autocompleta — agrega los últimos 2 caracteres (homoclave)"
      autoComplete="off"
    />
  </FieldShell>
</div>
```

- [ ] **Step 7: Verificar en el navegador que el formulario funciona correctamente**

Con `npm run dev` corriendo:
1. Abrir `http://localhost:3001` (o la ruta del formulario público)
2. Llenar nombre, apellidos, fecha de nacimiento y género → verificar que el CURP se autocompleta (16 chars)
3. Seleccionar estado → verificar que el dropdown de ciudad se habilita y muestra municipios filtrados
4. Editar manualmente el CURP → verificar que deja de autocompletarse
5. Borrar el CURP → verificar que vuelve a autocompletarse
6. Intentar enviar con campos vacíos → verificar errores de validación en género, estado y ciudad

- [ ] **Step 8: Commit**

```bash
git add frontend/components/public-preregistro-section.tsx
git commit -m "feat(preregistro): dropdowns estado/ciudad, campo género y autocompletado CURP"
```

---

## Task 5: Push final

- [ ] **Step 1: Push a remote**

```bash
git pull --rebase origin main && git push origin main
```
