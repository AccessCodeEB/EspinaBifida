"use client"

import React, { useMemo, useState } from "react"
import mexicoMap from "@svg-maps/mexico"
import {
  normalizeEstadoOrigen,
  type EstadoOrigenCount,
} from "@/lib/beneficiarios-origen"

interface SvgMapLocation {
  id: string
  name: string
  path: string
}

interface MapChartProps {
  stateCounts: EstadoOrigenCount[]
  height?: number
  onHoverState?: (stateName: string | null) => void
  hoveredState?: string | null
}

interface TooltipState {
  name: string
  total: number
  percentOfTotal: number
  x: number
  y: number
}

function buildLookup(counts: EstadoOrigenCount[]) {
  const map = new Map<string, number>()
  for (const c of counts) {
    const key = normalizeEstadoOrigen(c.estado)
    if (key) map.set(key, c.total)
  }
  return map
}

function getColorFor(value: number | undefined, max: number) {
  if (!value || value <= 0) return "#dde4ed"
  const ratio = Math.max(0, Math.min(1, value / max))
  if (ratio > 0.8) return "#0f4c81"
  if (ratio > 0.6) return "#1d6fb8"
  if (ratio > 0.4) return "#3b82c4"
  if (ratio > 0.2) return "#7fb3d8"
  return "#b8d5ea"
}

export function MapChart({ stateCounts, height = 360, onHoverState, hoveredState = null }: MapChartProps) {
  const lookup = useMemo(() => buildLookup(stateCounts), [stateCounts])
  const max = useMemo(() => stateCounts[0]?.total ?? 0, [stateCounts])
  const totalBeneficiarios = useMemo(
    () => stateCounts.reduce((sum, entry) => sum + entry.total, 0),
    [stateCounts]
  )
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const locations = mexicoMap.locations
  const hoveredNormalized = hoveredState ? normalizeEstadoOrigen(hoveredState) : null

  if (!locations?.length) {
    return <div className="p-6 text-sm text-muted-foreground">No se pudo cargar la geometría del mapa.</div>
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ height }}>
      <svg
        viewBox={mexicoMap.viewBox}
        className="block h-[94%] w-[94%]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa de México con origen de beneficiarios por estado"
        style={{ transform: "translateY(18px) scale(1.05)", transformOrigin: "center" }}
      >
        {locations.map((location: SvgMapLocation) => {
          const estado = normalizeEstadoOrigen(location.name) ?? location.name
          const total = lookup.get(estado)
          const color = getColorFor(total, max)
          const isHovered = hoveredNormalized === estado

          return (
            <g key={location.id}>
              <path
                d={location.path}
                fill={color}
                stroke="#1f2937"
                strokeWidth="0.7"
                strokeOpacity="0.55"
                vectorEffect="non-scaling-stroke"
                className="transition-opacity duration-150 hover:opacity-90"
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  if (!rect) return

                  onHoverState?.(location.name)

                  const percentOfTotal = total && totalBeneficiarios > 0
                    ? Math.round((total / totalBeneficiarios) * 100)
                    : 0

                  setTooltip({
                    name: location.name,
                    total: total ?? 0,
                    percentOfTotal,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                  })
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  if (!rect) return

                  setTooltip((current) => current ? {
                    ...current,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                  } : current)
                }}
                onMouseLeave={() => {
                  setTooltip(null)
                  onHoverState?.(null)
                }}
              />
              {isHovered && (
                <path
                  d={location.path}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.95"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[180px] -translate-x-1/2 -translate-y-full rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur-sm"
          style={{
            left: `${Math.min(Math.max(tooltip.x, 96), 720)}px`,
            top: `${Math.max(tooltip.y - 14, 24)}px`,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Estado</p>
          <p className="mt-1 text-sm font-semibold leading-tight text-white">{tooltip.name}</p>
          <p className="mt-1 text-xs text-white/75">
            {tooltip.total > 0
              ? `${tooltip.total} beneficiario${tooltip.total === 1 ? "" : "s"}`
              : "Sin registros en este estado"}
          </p>
          <p className="mt-1 text-[11px] text-white/55">
            {tooltip.total > 0 && tooltip.percentOfTotal > 0
              ? `${tooltip.percentOfTotal}% del total analizado`
              : "Sin contribución en el total actual"}
          </p>
        </div>
      )}

    </div>
  )
}
