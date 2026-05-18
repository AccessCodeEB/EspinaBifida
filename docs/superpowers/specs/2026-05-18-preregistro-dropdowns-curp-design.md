# Spec: Pre-registro — Dropdowns de Estado/Ciudad + Autocompletado de CURP

**Fecha:** 2026-05-18
**Entrega objetivo:** 2026-06-05
**Alcance:** Solo frontend — no requiere cambios en backend ni BD

---

## Objetivo

Mejorar el formulario público de pre-registro con:
1. Dropdowns de Estado y Ciudad/Municipio con datos estáticos del catálogo INEGI
2. Campo de Género (requerido para CURP)
3. Autocompletado de las primeras 16 posiciones del CURP a partir de los datos del formulario

---

## Arquitectura

### Archivos nuevos

```
frontend/
├── data/
│   └── mx-estados-municipios.ts   ← catálogo estático: Record<string, string[]>
└── lib/
    └── curp-generator.ts          ← función pura: generateCurpPrefix(campos) → string 16 chars
```

### Archivos modificados

```
frontend/
├── components/
│   └── public-preregistro-section.tsx   ← dropdowns + género + CURP reactivo
└── lib/
    └── beneficiario-alta.ts             ← agregar genero al tipo BeneficiarioAltaForm y validación
```

No se modifica el backend ni la BD. La columna `GENERO` ya existe en `BENEFICIARIOS` y el campo ya puede enviarse en el payload.

---

## Datos estáticos: mx-estados-municipios.ts

```ts
export const ESTADOS: string[] = [
  "Aguascalientes", "Baja California", "Baja California Sur",
  "Campeche", "Chiapas", "Chihuahua", "Ciudad de México",
  "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos",
  "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
  "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
  "Yucatán", "Zacatecas"
]

export const MUNICIPIOS: Record<string, string[]> = {
  "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", ...],
  // ... 32 estados con todos sus municipios del catálogo INEGI
}
```

Fuente: Marco Geoestadístico Nacional INEGI. Dato estático — los municipios cambian raramente y se actualizan manualmente si es necesario.

---

## CURP Generator: lib/curp-generator.ts

Función pura que calcula las primeras **16 posiciones** del CURP según el estándar RENAPO. Las posiciones 17–18 (homoclave, asignada por RENAPO) quedan en blanco para entrada manual.

### Interfaz

```ts
interface CurpInput {
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  fechaNacimiento: string  // formato YYYY-MM-DD
  genero: "H" | "M"
  estado: string           // nombre del estado (se convierte a clave INEGI)
}

export function generateCurpPrefix(input: CurpInput): string
// Devuelve string de 16 chars en mayúsculas, o "" si faltan datos
```

### Algoritmo (estándar RENAPO)

| Pos | Fuente | Regla |
|---|---|---|
| 1 | `apellidoPaterno` | Primera letra |
| 2 | `apellidoPaterno` | Primera vocal interna (a partir de pos 2) |
| 3 | `apellidoMaterno` | Primera letra (`X` si está vacío) |
| 4 | `nombres` | Primera letra del primer nombre (omite "JOSE" / "MARIA" si hay segundo nombre) |
| 5–10 | `fechaNacimiento` | `YYMMDD` |
| 11 | `genero` | `H` o `M` |
| 12–13 | `estado` | Clave de 2 letras según tabla lookup INEGI |
| 14 | `apellidoPaterno` | Primera consonante interna (`X` si no hay) |
| 15 | `apellidoMaterno` | Primera consonante interna (`X` si está vacío o no hay) |
| 16 | `nombres` | Primera consonante interna del primer nombre (`X` si no hay) |

### Edge cases

- **Palabras inconvenientes (lista RENAPO):** si las 4 primeras letras forman una palabra de la lista, la posición 2 se reemplaza con `X`
- **Apellido materno vacío:** posición 3 = `X`, posición 15 = `X`
- **Nombre compuesto con "JOSE" o "MARIA":** si el primer token es JOSE/JOSE o MARIA/MARÍA y existe un segundo token, se usa el segundo token para posiciones 4 y 16
- **Retorna `""` si faltan campos requeridos** (apellidoPaterno, nombres, fechaNacimiento, genero, estado)

### Tabla de claves INEGI por estado (lookup interno)

```ts
const CLAVES_ESTADO: Record<string, string> = {
  "Aguascalientes": "AS", "Baja California": "BC",
  "Baja California Sur": "BS", "Campeche": "CC",
  "Chiapas": "CS", "Chihuahua": "CH", "Ciudad de México": "DF",
  "Coahuila": "CL", "Colima": "CM", "Durango": "DG",
  "Guanajuato": "GT", "Guerrero": "GR", "Hidalgo": "HG",
  "Jalisco": "JC", "México": "MC", "Michoacán": "MN",
  "Morelos": "MS", "Nayarit": "NT", "Nuevo León": "NL",
  "Oaxaca": "OC", "Puebla": "PL", "Querétaro": "QT",
  "Quintana Roo": "QR", "San Luis Potosí": "SP", "Sinaloa": "SL",
  "Sonora": "SR", "Tabasco": "TC", "Tamaulipas": "TS",
  "Tlaxcala": "TL", "Veracruz": "VZ", "Yucatán": "YN",
  "Zacatecas": "ZS"
}
```

---

## Cambios en el formulario

### Nuevo campo: Género

- Tipo: `<Select>` con opciones Masculino (`H`) / Femenino (`M`)
- Requerido
- Posición en Step 1: junto a `fechaNacimiento`
- Se agrega `genero: "H" | "M"` al tipo `BeneficiarioAltaForm` y a `validateAltaSolicitudPublica`

### Estado → Select

- Reemplaza `<Input>` por `<Select>` con los 32 estados de `ESTADOS[]`
- Al cambiar estado: resetea `ciudad` a `""`
- Validación: debe pertenecer al catálogo

### Ciudad → Select en cascada

- Deshabilitado hasta que se seleccione un estado
- Opciones: `MUNICIPIOS[estado]` (filtrado)
- Validación: debe pertenecer al catálogo filtrado por estado seleccionado

### Layout Step 1 (orden de campos)

```
[ Nombres            ] [ Apellido Paterno  ] [ Apellido Materno ]
[ Fecha Nacimiento   ] [ Género            ]
[ Estado             ] [ Ciudad            ]
[ CURP (pre-llenado) ]
```

### CURP reactivo

- `useEffect` que observa: `apellidoPaterno`, `apellidoMaterno`, `nombres`, `fechaNacimiento`, `genero`, `estado`
- Al cambiar cualquiera: llama `generateCurpPrefix()` y actualiza el campo CURP **solo si el usuario no lo ha editado manualmente**
- Se detecta edición manual con una flag `curpEditadoManualmente: boolean` en el estado local
- Al limpiar el campo CURP: la flag se resetea y vuelve a autocompletar

---

## Validación actualizada (beneficiario-alta.ts)

Cambios en `validateAltaSolicitudPublica`:
- `genero`: requerido, debe ser `"H"` o `"M"`
- `estado`: requerido, debe estar en `ESTADOS[]`
- `ciudad`: requerido, debe estar en `MUNICIPIOS[estado]`
- CURP: mantiene regex existente `/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/`

---

## Testing

- `lib/curp-generator.test.ts` — tests unitarios con casos conocidos (CURP reales sanitizados), edge cases (apellido materno vacío, nombres compuestos, palabras inconvenientes)
- No se requieren nuevos tests de integración — los existentes de `solicitud-publica` cubren el endpoint

---

## Restricciones

- No modificar backend ni esquema de BD
- El campo CURP sigue siendo editable manualmente
- Si el estado o ciudad no tienen match en catálogo al cargar datos existentes, mostrar el valor guardado como texto
- El catálogo de municipios se actualiza manualmente cuando INEGI publica cambios
