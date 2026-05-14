"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const durationClass = "duration-[1100ms]"
const easeClass = "ease-[cubic-bezier(0.22,1,0.36,1)]"

type RevealOnMountProps = {
  children: ReactNode
  className?: string
  /** Retraso en ms al montar (escalonar bloques) */
  delay?: number
}

/** Aparece al cargar (hero, header): opacidad + leve desenfoque + desliz vertical. */
export function RevealOnMount({ children, className, delay = 0 }: RevealOnMountProps) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={cn(
        "will-change-[opacity,transform,filter] transition-all",
        durationClass,
        easeClass,
        "motion-reduce:duration-0 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:blur-0",
        on ? "translate-y-0 opacity-100 blur-0" : "translate-y-7 opacity-0 blur-sm",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

type RevealOnViewProps = {
  children: ReactNode
  className?: string
  delay?: number
  rootMargin?: string
}

/** Aparece al entrar en el viewport (secciones al hacer scroll). */
export function RevealOnView({ children, className, delay = 0, rootMargin = "0px 0px -10% 0px" }: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setOn(true)
            ob.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold: 0.06 }
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [rootMargin])

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-[opacity,transform,filter] transition-all",
        durationClass,
        easeClass,
        "motion-reduce:duration-0 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:blur-0",
        on ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-sm",
        className
      )}
      style={{ transitionDelay: on ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  )
}
