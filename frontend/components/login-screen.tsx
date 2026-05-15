"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"

const NAVY  = "#0f4c81"
const AMBER = "#E8B043"

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return }
    if (!password)     { setError("Ingresa tu contraseña"); return }
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
    <div className="min-h-screen w-full flex">

      {/* ═══════════════════════════════════════════
          PANEL IZQUIERDO  —  Identidad  (sin cambios)
      ═══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ backgroundColor: NAVY }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: AMBER }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 size-[420px] rounded-full opacity-[0.06]"
          style={{ backgroundColor: AMBER }}
        />

        <div className="relative">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">
            Asociación de Espina Bífida
          </span>
        </div>

        <div className="relative space-y-10">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: AMBER }}>
              Panel Administrativo
            </p>
            <h2 className="text-[2.25rem] xl:text-[2.6rem] font-bold leading-[1.15] tracking-tight text-white">
              Gestión integral<br />de beneficiarios.
            </h2>
            <p className="mt-5 max-w-[280px] text-sm leading-[1.8] text-white/50">
              Expedientes, membresías, servicios e inventario centralizados en un solo sistema.
            </p>
          </div>

          <div className="relative pl-6">
            <span
              className="absolute -top-2 left-0 font-serif text-5xl leading-none"
              style={{ color: AMBER, opacity: 0.7 }}
              aria-hidden="true"
            >"</span>
            <p className="text-sm leading-[1.9] text-white/70 italic">
              Si cambiamos una vida,<br />cambiamos familias completas.
            </p>
          </div>
        </div>

        <p className="relative text-[11px] text-white/25">
          © {new Date().getFullYear()} Asociación de Espina Bífida de Nuevo León, A.B.P.
        </p>
      </div>

      {/* ═══════════════════════════════════════════
          PANEL DERECHO  —  Formulario mejorado
      ═══════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 dark:bg-slate-950 sm:px-12">

        {/* Acento ámbar superior en móvil */}
        <div className="absolute top-0 left-0 right-0 h-[3px] lg:hidden" style={{ backgroundColor: AMBER }} />

        {/* Nombre en móvil */}
        <div className="mb-10 lg:hidden text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Asociación de Espina Bífida
          </span>
        </div>

        {/* Contenedor del formulario */}
        <div className="w-full max-w-[400px]">

          {/* Encabezado con acento ámbar */}
          <div className="mb-10">
            <div className="mb-5 flex items-center justify-center gap-3">
              <div className="h-px w-8" style={{ backgroundColor: AMBER }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Bienvenido
              </span>
              <div className="h-px w-8" style={{ backgroundColor: AMBER }} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Iniciar sesión
            </h1>
            <p className="mt-2.5 text-[13px] text-slate-500 dark:text-slate-400">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on" noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                disabled={loading}
                required
                className="
                  w-full rounded-xl border border-slate-200 bg-slate-50
                  px-4 py-3.5 text-sm text-slate-900
                  placeholder:text-slate-300 outline-none
                  transition-all duration-150
                  hover:border-slate-300 hover:bg-white
                  focus:border-[#0f4c81] focus:bg-white focus:shadow-[0_0_0_4px_rgba(15,76,129,0.07)]
                  disabled:opacity-50
                  dark:border-slate-700 dark:bg-slate-800/60 dark:text-white
                  dark:placeholder:text-slate-600 dark:hover:bg-slate-800
                  dark:focus:border-blue-500 dark:focus:bg-slate-800
                "
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  disabled={loading}
                  required
                  className="
                    w-full rounded-xl border border-slate-200 bg-slate-50
                    px-4 py-3.5 pr-12 text-sm text-slate-900
                    placeholder:text-slate-300 outline-none
                    transition-all duration-150
                    hover:border-slate-300 hover:bg-white
                    focus:border-[#0f4c81] focus:bg-white focus:shadow-[0_0_0_4px_rgba(15,76,129,0.07)]
                    disabled:opacity-50
                    dark:border-slate-700 dark:bg-slate-800/60 dark:text-white
                    dark:placeholder:text-slate-600 dark:hover:bg-slate-800
                    dark:focus:border-blue-500 dark:focus:bg-slate-800
                  "
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
              >
                <AlertCircle className="mt-px size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="
                  group relative w-full overflow-hidden rounded-xl
                  py-3.5 text-sm font-semibold text-white
                  shadow-[0_2px_16px_rgba(15,76,129,0.30)]
                  transition-all duration-200
                  hover:shadow-[0_4px_20px_rgba(15,76,129,0.40)]
                  active:scale-[.99] active:shadow-[0_1px_8px_rgba(15,76,129,0.25)]
                  disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none
                "
                style={{ backgroundColor: NAVY }}
              >
                <span className="absolute inset-0 translate-x-[-100%] bg-white/10 transition-transform duration-300 group-hover:translate-x-0" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 className="size-4 animate-spin" />Verificando...</>
                    : "Acceder al panel"
                  }
                </span>
              </button>
            </div>

          </form>

          {/* Footer */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            <Link
              href="/"
              className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              Ir al sitio público
            </Link>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>

    </div>
  )
}
