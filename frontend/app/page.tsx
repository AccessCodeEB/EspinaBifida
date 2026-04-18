"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Settings, Moon, LogOut, User } from "lucide-react"
import { FloatingNav } from "@/components/app-sidebar"
import { useAuth } from "@/hooks/useAuth"
import { LoginScreen } from "@/components/login-screen"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { DashboardSection } from "@/components/sections/dashboard"
import { BeneficiariosSection } from "@/components/sections/beneficiarios"
import { MembresiasSection } from "@/components/sections/membresias"
import { ServiciosSection } from "@/components/sections/servicios"
import { InventarioSection } from "@/components/sections/inventario"
import { CitasSection } from "@/components/sections/citas"
import { PreregistroSection } from "@/components/sections/preregistro"
import { ReportesSection } from "@/components/sections/reportes"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Secciones válidas de la SPA */
const VALID_SECTIONS = new Set([
  "dashboard",
  "beneficiarios",
  "membresias",
  "servicios",
  "inventario",
  "citas",
  "reportes",
  "preregistro",
])

function SectionContent({ section }: { section: string }) {
  switch (section) {
    case "dashboard":      return <DashboardSection />
    case "beneficiarios":  return <BeneficiariosSection />
    case "membresias":     return <MembresiasSection />
    case "servicios":      return <ServiciosSection />
    case "inventario":     return <InventarioSection />
    case "citas":          return <CitasSection />
    case "reportes":       return <ReportesSection />
    case "preregistro":    return <PreregistroSection />
    default:               return <DashboardSection />
  }
}

/** Derive initials from a full name (first two words). */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function HomeContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── Auth (fuente de verdad para sesión y datos del usuario) ─────────
  const { isAuthenticated, isLoading: authLoading, session, login: authLogin, logout: authLogout, updateSession } = useAuth()

  // ── Sección activa ──────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState(() => {
    const s = searchParams.get("section")
    return s && VALID_SECTIONS.has(s) ? s : "dashboard"
  })

  useEffect(() => {
    const s = searchParams.get("section")
    if (s && VALID_SECTIONS.has(s)) setActiveSection(s)
  }, [searchParams])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    router.replace(`/?section=${section}`, { scroll: false })
  }

  // ── UI state ────────────────────────────────────────────────────────
  const [showSettings,    setShowSettings]    = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [darkMode,        setDarkMode]        = useState(false)

  // ── Datos del usuario desde la sesión JWT (sin llamadas extra) ───────
  const userName     = session?.nombreCompleto ?? ""
  const userRole     = session?.nombreRol      ?? ""
  const userInitials = getInitials(userName)

  // ── Guards ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={authLogin} />
  }

  // ── App principal ───────────────────────────────────────────────────
  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen w-full bg-background">

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <FloatingNav activeSection={activeSection} onSectionChange={handleSectionChange} />

          <div className="ml-auto flex items-center gap-3">
            {/* Nombre y rol del usuario */}
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-foreground leading-tight">{userName}</span>
              <span className="text-xs text-muted-foreground leading-tight">{userRole}</span>
            </div>

            {/* Avatar con iniciales */}
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <span className="text-sm font-bold">{userInitials}</span>
            </div>

            {/* Dropdown de configuración */}
            <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-full border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-foreground hover:shadow-md text-muted-foreground transition-all duration-300"
                  aria-label="Configurar cuenta"
                >
                  <Settings className="size-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={12}
                className="w-72 rounded-2xl border border-border/40 bg-background/95 p-2 shadow-2xl backdrop-blur-md"
              >
                {/* Cabecera con info del usuario */}
                <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <span className="text-sm font-bold">{userInitials}</span>
                  </div>
                  <div className="flex min-w-0 flex-col space-y-0.5 leading-none">
                    <span className="truncate text-base font-semibold tracking-tight text-foreground">{userName}</span>
                    <span className="truncate text-xs font-medium text-muted-foreground">{userRole}</span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1 opacity-50" />

                <div className="mt-2 flex flex-col gap-1">
                  {/* Editar perfil */}
                  <DropdownMenuItem
                    id="btn-edit-profile"
                    onClick={() => { setShowSettings(false); setShowEditProfile(true) }}
                    className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    <User className="mt-0.5 size-[18px] shrink-0" />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-foreground">Editar perfil</span>
                      <span className="text-[11px] text-muted-foreground">Actualizar información básica</span>
                    </div>
                  </DropdownMenuItem>

                  {/* Modo oscuro */}
                  <div className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-accent/50">
                    <div className="flex min-w-0 items-start gap-3">
                      <Moon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-accent-foreground" />
                      <div className="flex min-w-0 flex-col pr-2">
                        <span className="text-sm font-medium text-foreground">Modo oscuro</span>
                        <span className="text-[11px] leading-tight text-muted-foreground">Cambiar la apariencia</span>
                      </div>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} className="shrink-0" />
                  </div>

                  <DropdownMenuSeparator className="my-1 opacity-50" />

                  {/* Cerrar sesión */}
                  <button
                    id="btn-logout"
                    type="button"
                    onClick={() => { setShowSettings(false); authLogout() }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-destructive transition-all duration-200 hover:bg-destructive/10 focus:outline-none focus:bg-destructive/10"
                  >
                    <LogOut className="size-[18px] shrink-0" />
                    <span className="text-sm font-medium">Cerrar sesión</span>
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Contenido ─────────────────────────────────────────────── */}
        <div className="p-4 md:p-6 lg:p-8">
          <SectionContent section={activeSection} />
        </div>

      </div>

      {/* ── Diálogo flotante: Editar perfil ──────────────────────── */}
      <EditProfileDialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        adminId={session?.idAdmin ?? null}
        onProfileSaved={(nombreCompleto, email) => updateSession({ nombreCompleto, email })}
      />

    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}