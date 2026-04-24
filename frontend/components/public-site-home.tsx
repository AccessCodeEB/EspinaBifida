"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

/**
 * Página de inicio para visitantes (usuarios generales).
 * Independiente del panel administrativo en `/panel`.
 */
export function PublicSiteHome() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -15%, oklch(0.55 0.14 250 / 0.14) 0%, transparent 65%), " +
            "radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.78 0.12 85 / 0.12) 0%, transparent 55%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-border/60 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/30">
            <Image
              src="/logo-espina-bifida.png"
              alt=""
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-foreground">Asociación de Espina Bífida</p>
            <p className="text-xs text-muted-foreground">Bienvenida</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full border-border/60"
            aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button asChild className="rounded-full bg-[#005bb5] px-4 text-white hover:bg-[#004a94]">
            <Link href="/panel">Acceso administradores</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 md:px-8 md:py-24">
        <div className="rounded-3xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm md:p-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Heart className="size-3.5" aria-hidden />
            Una sola bienvenida
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Estamos para acompañarte
          </h1>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Este es el sitio público de la asociación. Aquí encontrarás un mensaje de bienvenida y enlaces útiles.
            La gestión interna (beneficiarios, membresías, citas e inventario) la realizan las personas autorizadas
            desde el panel seguro.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Si formas parte del equipo administrativo, usa el botón superior &quot;Acceso administradores&quot; para
            iniciar sesión.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="rounded-full bg-[#005bb5] px-8 text-white hover:bg-[#004a94]">
              <Link href="/panel">Ir al panel administrativo</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Asociación de Espina Bífida
      </footer>
    </div>
  )
}
