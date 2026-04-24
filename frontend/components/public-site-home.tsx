"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Heart, Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PublicPreregistroSection } from "@/components/public-preregistro-section"

/**
 * Página de inicio para visitantes: bienvenida y pre-registro en ventana emergente.
 * El acceso al panel (login) es una ruta aparte: `/panel`.
 */
export function PublicSiteHome() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [preregOpen, setPreregOpen] = useState(false)
  const [preregFormKey, setPreregFormKey] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])
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
        </div>
      </header>

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-16 md:px-8">
        <div className="mx-auto w-full max-w-xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Heart className="size-3.5" aria-hidden />
            Bienvenida
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Estamos para acompañarte
          </h1>
          <p className="mx-auto mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Si deseas vincular a una persona beneficiaria, puedes llenar el pre-registro aquí. El equipo de la
            asociación revisará tus datos y se pondrá en contacto contigo.
          </p>

          <Dialog
            open={preregOpen}
            onOpenChange={(open) => {
              setPreregOpen(open)
              if (!open) setPreregFormKey((k) => k + 1)
            }}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                size="lg"
                className="mt-10 rounded-full bg-[#005bb5] px-10 text-base text-white hover:bg-[#004a94]"
              >
                Llenar pre-registro
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton
              className="top-[5%] max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl translate-y-0 gap-0 overflow-y-auto p-0 sm:top-[5%] sm:max-h-[90vh] sm:translate-y-0"
            >
              <div id="preregistro-dialog-top" className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
                <DialogHeader className="gap-1 text-left">
                  <DialogTitle>Pre-registro de beneficiario</DialogTitle>
                  <DialogDescription>
                    Mismos datos que en la asociación. Puedes cerrar esta ventana y volver cuando quieras; si ya enviaste,
                    conserva tu CURP.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="px-4 pb-6 pt-2 sm:px-6">
                <PublicPreregistroSection
                  key={preregFormKey}
                  embedded
                  hideIntro
                  scrollTargetOnSuccess="preregistro-dialog-top"
                  onEmbeddedDismiss={() => setPreregOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Asociación de Espina Bífida
      </footer>
    </div>
  )
}
