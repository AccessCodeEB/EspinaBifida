"use client"

import { cn } from "@/lib/utils"

export type GradualBlurProps = {
  className?: string
  /** El padre debe ser `relative` y recortar overflow si aplica. */
  target?: "parent"
  position?: "bottom" | "top"
  height?: string
  /** Multiplicador de intensidad del desenfoque */
  strength?: number
  /** Capas superpuestas (más capas = transición más suave) */
  divCount?: number
  curve?: "linear" | "bezier"
  /** Si true, la intensidad crece más rápido hacia el borde */
  exponential?: boolean
  opacity?: number
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

/**
 * Desenfoque gradual en un borde del contenedor (p. ej. sobre una imagen).
 * Coloca dentro de un padre `relative`; no captura eventos de puntero.
 */
export default function GradualBlur({
  className,
  position = "bottom",
  height = "6rem",
  strength = 2,
  divCount = 6,
  curve = "linear",
  exponential,
  opacity = 1,
}: GradualBlurProps) {
  const layers = Math.max(2, Math.min(divCount, 16))
  const fromBottom = position === "bottom"

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-[1] overflow-hidden",
        fromBottom ? "bottom-0" : "top-0",
        className
      )}
      style={{ height, opacity }}
      aria-hidden
    >
      {Array.from({ length: layers }, (_, i) => {
        let w = (i + 1) / layers
        if (exponential) w = w * w
        else if (curve === "bezier") w = smoothstep(w)

        const blurPx = Math.min(48, 0.25 + w * 12 * strength)
        const stop = `${(100 * (layers - i)) / layers}%`

        return (
          <div
            key={i}
            className={cn("absolute inset-x-0", fromBottom ? "bottom-0" : "top-0")}
            style={{
              height: "100%",
              backdropFilter: `blur(${blurPx}px)`,
              WebkitBackdropFilter: `blur(${blurPx}px)`,
              maskImage: fromBottom
                ? `linear-gradient(to top, black 0%, black ${stop}, transparent ${stop})`
                : `linear-gradient(to bottom, black 0%, black ${stop}, transparent ${stop})`,
              WebkitMaskImage: fromBottom
                ? `linear-gradient(to top, black 0%, black ${stop}, transparent ${stop})`
                : `linear-gradient(to bottom, black 0%, black ${stop}, transparent ${stop})`,
            }}
          />
        )
      })}
    </div>
  )
}
