"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const THUMB_PX = 48
const PAD = 4
const THRESHOLD = 0.88

const tones = {
  emerald: {
    track:
      "border-emerald-600/25 bg-emerald-500/15 shadow-inner dark:bg-emerald-950/40",
    chevron: "text-emerald-700/50 dark:text-emerald-400/50",
    chevronStrong: "text-emerald-600/60 dark:text-emerald-300/50",
    hint: "text-emerald-800/70 dark:text-emerald-200/60",
    thumb: "bg-emerald-500 shadow-md shadow-emerald-500/25",
  },
  sky: {
    track: "border-sky-600/25 bg-sky-500/12 shadow-inner dark:bg-sky-950/40",
    chevron: "text-sky-700/50 dark:text-sky-400/50",
    chevronStrong: "text-sky-600/60 dark:text-sky-300/50",
    hint: "text-sky-800/70 dark:text-sky-200/60",
    thumb: "bg-sky-500 shadow-md shadow-sky-500/25",
  },
} as const

export type SlideToConfirmTone = keyof typeof tones

type SlideToConfirmProps = {
  onComplete: () => void
  icon: ReactNode
  tone?: SlideToConfirmTone
  /** Texto junto a las flechas (p. ej. «Desliza →» o «Desliza para actualizar») */
  hintText?: string
  ariaLabel: string
  disabled?: boolean
  busy?: boolean
  className?: string
}

/**
 * Confirmación tipo «deslizar para desbloquear»: arrastra el control hacia la derecha para evitar acciones accidentales.
 */
export function SlideToConfirm({
  disabled,
  busy,
  onComplete,
  icon,
  tone = "emerald",
  hintText = "Desliza →",
  ariaLabel,
  className,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const xRef = useRef(0)
  const drag = useRef<{ pointerId: number; startClientX: number; startX: number } | null>(null)
  const t = tones[tone]

  const maxX = useCallback(() => {
    const w = trackRef.current?.clientWidth ?? 0
    return Math.max(0, w - THUMB_PX - PAD * 2)
  }, [])

  const setOffset = useCallback(
    (v: number) => {
      const m = maxX()
      const clamped = Math.min(m, Math.max(0, v))
      xRef.current = clamped
      setX(clamped)
    },
    [maxX]
  )

  useEffect(() => {
    if (disabled || busy) {
      xRef.current = 0
      setX(0)
    }
  }, [disabled, busy])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const m = maxX()
      const next = Math.min(m, Math.max(0, d.startX + (e.clientX - d.startClientX)))
      setOffset(next)
    },
    [maxX, setOffset]
  )

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
      try {
        thumbRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }

      const m = maxX()
      const finalX = xRef.current
      if (m > 0 && finalX >= m * THRESHOLD) {
        onComplete()
      }
      xRef.current = 0
      setX(0)
    },
    [maxX, onComplete, onPointerMove]
  )

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
    }
  }, [endDrag, onPointerMove])

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || busy) return
    e.preventDefault()
    e.stopPropagation()
    drag.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startX: xRef.current,
    }
    try {
      thumbRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
  }

  const m = maxX()
  const progress = m > 0 ? x / m : 0
  const hintOpacity = Math.max(0, 1 - progress * 1.35)

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-12 min-w-[168px] max-w-[200px] select-none rounded-xl border",
        t.track,
        (disabled || busy) && "pointer-events-none",
        disabled && !busy && "opacity-50",
        className
      )}
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-14 right-2 flex items-center justify-end gap-0.5 transition-opacity duration-150"
        style={{ opacity: hintOpacity }}
        aria-hidden
      >
        <ChevronRight className={cn("size-3.5 shrink-0", t.chevron)} />
        <ChevronRight className={cn("size-3.5 shrink-0 -ml-2", t.chevron)} />
        <ChevronRight className={cn("size-3.5 shrink-0 -ml-2", t.chevronStrong)} />
        <span
          className={cn(
            "ml-1 max-w-[min(8rem,40%)] truncate text-[10px] font-semibold uppercase tracking-wide",
            t.hint
          )}
        >
          {hintText}
        </span>
      </div>

      <div
        ref={thumbRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-disabled={disabled || busy}
        className={cn(
          "absolute left-1 top-1 z-10 flex size-12 cursor-grab touch-none items-center justify-center rounded-xl text-white",
          t.thumb,
          !disabled && !busy && "active:scale-[0.98]"
        )}
        style={{ transform: `translate3d(${x}px,0,0)` }}
        onPointerDown={onThumbPointerDown}
      >
        {busy ? <Loader2 className="size-6 animate-spin" /> : icon}
      </div>
    </div>
  )
}
