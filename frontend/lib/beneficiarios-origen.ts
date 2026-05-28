import { ESTADOS } from "@/data/mx-estados-municipios"
import type { Beneficiario } from "@/services/beneficiarios"

export interface EstadoOrigenCount {
  estado: string
  total: number
}

export interface EstadoOrigenSummary {
  totalBeneficiarios: number
  estadosConDato: number
  totalEstadosCatalogo: number
  estadoLider: EstadoOrigenCount | null
}

const normalizedCatalog = new Map(
  ESTADOS.map((estado) => [normalizeText(estado), estado] as const)
)

const aliases: Record<string, string> = {
  "ciudad de mexico": "Ciudad de México",
  cdmx: "Ciudad de México",
  df: "Ciudad de México",
  "estado de mexico": "México",
  edomex: "México",
  mex: "México",
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function normalizeEstadoOrigen(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return null

  const normalized = normalizeText(raw)
  return aliases[normalized] ?? normalizedCatalog.get(normalized) ?? raw
}

export function buildEstadoOrigenCounts(beneficiarios: Beneficiario[]) {
  const counts = new Map<string, number>()

  for (const beneficiario of beneficiarios) {
    const estado = normalizeEstadoOrigen(beneficiario.estado)
    if (!estado) continue
    counts.set(estado, (counts.get(estado) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([estado, total]) => ({ estado, total }))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado, "es-MX"))
}

export function summarizeEstadoOrigen(counts: EstadoOrigenCount[]): EstadoOrigenSummary {
  const totalBeneficiarios = counts.reduce((sum, entry) => sum + entry.total, 0)

  return {
    totalBeneficiarios,
    estadosConDato: counts.length,
    totalEstadosCatalogo: ESTADOS.length,
    estadoLider: counts[0] ?? null,
  }
}
