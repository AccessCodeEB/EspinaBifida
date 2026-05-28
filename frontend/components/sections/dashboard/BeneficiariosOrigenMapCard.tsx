"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, MapPinned, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MapChart } from "./MapChart"
import { ESTADOS } from "@/data/mx-estados-municipios"
import { normalizeEstadoOrigen, type EstadoOrigenCount } from "@/lib/beneficiarios-origen"

interface BeneficiariosOrigenMapCardProps {
  stateCounts: EstadoOrigenCount[]
  loading?: boolean
}

function getIntensityStyle(total: number, maxTotal: number) {
  if (maxTotal <= 0) {
    return {
      backgroundColor: "rgba(15, 76, 129, 0.08)",
      borderColor: "rgba(15, 76, 129, 0.18)",
      color: "rgb(15, 23, 42)",
    }
  }

  const ratio = Math.max(0, Math.min(1, total / maxTotal))

  if (ratio >= 0.8) {
    return {
      backgroundColor: "#0f4c81",
      borderColor: "#0f4c81",
      color: "#ffffff",
    }
  }

  if (ratio >= 0.6) {
    return {
      backgroundColor: "#1d6fb8",
      borderColor: "#1d6fb8",
      color: "#ffffff",
    }
  }

  if (ratio >= 0.4) {
    return {
      backgroundColor: "#4b8cc8",
      borderColor: "#4b8cc8",
      color: "#ffffff",
    }
  }

  if (ratio >= 0.2) {
    return {
      backgroundColor: "#a9c9e6",
      borderColor: "#9bc0df",
      color: "#0f172a",
    }
  }

  return {
    backgroundColor: "#e6f0f8",
    borderColor: "#cfe0ef",
    color: "#0f172a",
  }
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export function BeneficiariosOrigenMapCard({ stateCounts, loading = false }: BeneficiariosOrigenMapCardProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [statePage, setStatePage] = useState(0)

  const summary = useMemo(() => {
    const total = stateCounts.reduce((sum, entry) => sum + entry.total, 0)
    const estadosConDato = stateCounts.length
    const estadoLider = stateCounts[0] ?? null
    const coverage = total > 0 ? Math.round((estadosConDato / 32) * 100) : 0

    return { total, estadosConDato, estadoLider, coverage }
  }, [stateCounts])

  const allStates = useMemo(() => {
    const byEstado = new Map(stateCounts.map((entry) => [normalizeEstadoOrigen(entry.estado) ?? entry.estado, entry.total] as const))

    return ESTADOS.map((estado) => ({
      estado,
      total: byEstado.get(estado) ?? 0,
    })).sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado, "es-MX"))
  }, [stateCounts])

  const statePageSize = 8
  const totalStatePages = Math.max(1, Math.ceil(allStates.length / statePageSize))
  const paginatedStates = allStates.slice(
    statePage * statePageSize,
    statePage * statePageSize + statePageSize,
  )
  const maxTotal = stateCounts[0]?.total ?? 0
  const hoveredNormalized = hoveredState ? normalizeEstadoOrigen(hoveredState) : null
  const hoveredTopState = hoveredNormalized
    ? allStates.find((entry) => normalizeEstadoOrigen(entry.estado) === hoveredNormalized)
    : null

  useEffect(() => {
    setStatePage(0)
  }, [allStates])

  const startStateIndex = allStates.length === 0 ? 0 : statePage * statePageSize + 1
  const endStateIndex = Math.min((statePage + 1) * statePageSize, allStates.length)

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">Origen de beneficiarios</CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Mapa coroplético preliminar por estado con distribución de origen
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <Sparkles className="size-3.5" />
            {loading ? "Cargando datos" : `${summary.total} beneficiarios`}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden border-b border-border/40 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,129,0.18),_transparent_38%),linear-gradient(180deg,_rgba(248,252,255,0.95),_rgba(239,246,255,0.75))] p-4 sm:p-5 lg:border-b-0 lg:border-r lg:border-border/40">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,76,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,76,129,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative flex h-full min-h-[420px] flex-col rounded-[1.75rem] border border-slate-200/80 bg-slate-950 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-5 sm:py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">México</p>
                  <p className="mt-1 text-lg font-semibold text-white">Vista preliminar del mapa</p>
                  <p className="text-xs text-white/55">La geometría real se conecta en la siguiente iteración.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Cobertura</p>
                  <p className="mt-1 text-sm font-semibold text-white">{loading ? "--" : formatPercent(summary.coverage)}</p>
                </div>
              </div>
              <div className="mt-4 flex-1">
                {/* MapChart: intenta cargar GeoJSON/TopoJSON desde /public/geo */}
                {/* Si no existe, MapChart muestra el mensaje de fallback */}
                <div className="h-full min-h-[320px] overflow-hidden rounded-[1.25rem]">
                  <MapChart
                    stateCounts={stateCounts}
                    height={380}
                    hoveredState={hoveredState}
                    onHoverState={setHoveredState}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/75">
                <span>Escala visual por cantidad de beneficiarios</span>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-white/20" />
                  <span className="size-3 rounded-full bg-[#a9c9e6]" />
                  <span className="size-3 rounded-full bg-[#4b8cc8]" />
                  <span className="size-3 rounded-full bg-[#1d6fb8]" />
                  <span className="size-3 rounded-full bg-[#0f4c81]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-[760px] flex-col gap-0">
            <div className="border-b border-border/40 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Lectura rápida</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Estados con dato</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{loading ? "--" : summary.estadosConDato}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Estado líder</p>
                  <p className={`mt-1 truncate text-sm font-semibold ${hoveredTopState ? "text-sky-700 dark:text-sky-300" : "text-foreground"}`}>
                    {loading ? "--" : summary.estadoLider?.estado ?? "Sin datos"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "" : summary.estadoLider ? `${summary.estadoLider.total} beneficiarios` : "Aún sin distribución"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Estados de la república</p>
                <span className="text-[11px] text-muted-foreground">{loading ? "--" : `${allStates.length} estados`}</span>
              </div>

              <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                {loading
                  ? Array.from({ length: statePageSize }).map((_, index) => (
                      <div key={index} className="h-14 animate-pulse rounded-2xl bg-muted/40" />
                    ))
                  : allStates.length === 0
                    ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                          Cuando haya datos, aquí verás el ranking de estados.
                        </div>
                      )
                    : paginatedStates.map((entry, index) => {
                        const absoluteIndex = statePage * statePageSize + index
                        const width = maxTotal > 0 ? Math.max(8, Math.round((entry.total / maxTotal) * 100)) : 0
                        const style = getIntensityStyle(entry.total, maxTotal)
                        const isHovered = hoveredNormalized && normalizeEstadoOrigen(entry.estado) === hoveredNormalized
                        return (
                          <div
                            key={entry.estado}
                            onMouseEnter={() => setHoveredState(entry.estado)}
                            onMouseLeave={() => setHoveredState(null)}
                            className={`cursor-pointer rounded-2xl border p-3 shadow-sm transition-all ${isHovered ? "border-sky-300 bg-sky-50/80 ring-2 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900/60" : "border-border/70 bg-card"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                                    {absoluteIndex + 1}
                                  </span>
                                  <p className={`truncate text-sm font-semibold ${isHovered ? "text-sky-700 dark:text-sky-300" : "text-foreground"}`}>{entry.estado}</p>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${width}%`,
                                      backgroundColor: isHovered ? "#0f4c81" : style.backgroundColor,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={`text-base font-bold tabular-nums ${isHovered ? "text-sky-700 dark:text-sky-300" : "text-foreground"}`}>{entry.total}</p>
                                <p className="text-[11px] text-muted-foreground">beneficiarios</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
              </div>

              {!loading && allStates.length > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {startStateIndex}–{endStateIndex} de {allStates.length} estados
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStatePage((page) => Math.max(0, page - 1))}
                      disabled={statePage === 0}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-[11px] font-medium text-foreground">
                      {statePage + 1} / {totalStatePages}
                    </span>
                    <button
                      onClick={() => setStatePage((page) => Math.min(totalStatePages - 1, page + 1))}
                      disabled={statePage >= totalStatePages - 1}
                      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
