"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginScreenProps {
  /** Callback al hacer login exitoso */
  onLogin: (email: string, password: string) => Promise<void>
}

/**
 * Pantalla de login completa.
 * Usa el mismo sistema de diseño (tokens CSS, componentes UI, tipografía Inter)
 * que el resto del front.  No crea ninguna ruta extra: se renderiza en page.tsx
 * cuando no hay sesión activa.
 */
export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail]           = useState("")
  const [password, setPassword]     = useState("")
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [mounted, setMounted]       = useState(false)

  // Micro-animación de entrada
  useEffect(() => { setMounted(true) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim())    { setError("Ingresa tu correo electrónico"); return }
    if (!password)        { setError("Ingresa tu contraseña"); return }

    setLoading(true)
    setError(null)
    try {
      await onLogin(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales inválidas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">

      {/* ── Fondo decorativo ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.55 0.15 250 / 0.12) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 50% at 110% 80%,  oklch(0.82 0.14 85  / 0.10) 0%, transparent 70%)",
        }}
      />

      {/* ── Tarjeta principal ────────────────────────────────────── */}
      <div
        className={`
          relative z-10 w-full max-w-md mx-4
          transition-all duration-500 ease-out
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        {/* Card con glassmorphism sutil */}
        <div className="rounded-3xl border border-border/50 bg-card/90 shadow-2xl backdrop-blur-sm overflow-hidden">

          {/* ── Header de la tarjeta ─────────────────────────────── */}
          <div className="px-8 pt-10 pb-6 text-center">
            {/* Logo */}
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-border/20">
              <Image
                src="/logo-espina-bifida.png"
                alt="Logo Espina Bífida"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sistema de Gestión · Asociación de Espina Bífida
            </p>
          </div>

          {/* ── Formulario ───────────────────────────────────────── */}
          <form
            id="login-form"
            onSubmit={handleSubmit}
            className="px-8 pb-8 space-y-5"
            autoComplete="on"
            noValidate
          >
            {/* Correo */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-sm font-semibold text-foreground"
              >
                Correo electrónico
              </Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                className="h-11 bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-password"
                className="text-sm font-semibold text-foreground"
              >
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  className="h-11 pr-11 bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm transition-all"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  id="login-toggle-password"
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw
                    ? <EyeOff className="size-4" />
                    : <Eye     className="size-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error inline */}
            {error && (
              <div
                id="login-error"
                role="alert"
                className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón de envío */}
            <Button
              id="login-submit"
              type="submit"
              className="w-full h-11 gap-2 text-sm font-semibold shadow-sm mt-2 transition-all duration-200"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="size-4 animate-spin" /> Verificando...</>
                : <><LogIn   className="size-4" />              Iniciar sesión</>
              }
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso exclusivo para administradores autorizados
        </p>
      </div>
    </div>
  )
}
