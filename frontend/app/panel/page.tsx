"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Moon, Sun, User, LogOut, ChevronDown } from "lucide-react"
import { useTheme } from "next-themes"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/hooks/useAuth"
import { LoginScreen } from "@/components/login-screen"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { DashboardSection } from "@/components/sections/dashboard"
import { BeneficiariosSection } from "@/components/sections/beneficiarios"
import { MembresiasSection } from "@/components/sections/membresias"
import { ServiciosSection } from "@/components/sections/servicios"
import { InventarioSection } from "@/components/sections/inventario"
import { CitasSection } from "@/components/sections/citas"
import { ComodatosSection } from "@/components/sections/comodatos"
import { PreregistroSection } from "@/components/sections/preregistro"
import { ReportesSection } from "@/components/sections/reportes"
import { AdministradoresSection } from "@/components/sections/administradores"
import { EspecialidadesConfigSection } from "@/components/sections/especialidades-config"
import { Switch } from "@/components/ui/switch"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { AiChatPanel, type AiAction } from "@/components/ai-chat-panel"
import { NotificacionesPanel } from "@/components/notificaciones-panel"
import { ErrorBoundary } from "@/components/error-boundary"

/** Secciones válidas de la SPA del panel */
const VALID_SECTIONS = new Set([
  "dashboard",
  "beneficiarios",
  "membresias",
  "servicios",
  "inventario",
  "comodatos",
  "citas",
  "especialidades-config",
  "reportes",
  "preregistro",
  "administradores",
])

function SectionContent({
  section,
  openEditBeneficiarioCurp,
  onConsumedOpenEditBeneficiario,
  onNavigate,
}: {
  section: string
  openEditBeneficiarioCurp?: string | null
  onConsumedOpenEditBeneficiario?: () => void
  onNavigate?: (section: string) => void
}) {
  switch (section) {
    case "dashboard": return <DashboardSection />
    case "beneficiarios":
      return (
        <BeneficiariosSection
          openEditCurp={openEditBeneficiarioCurp ?? null}
          onConsumedOpenEditCurp={onConsumedOpenEditBeneficiario}
        />
      )
    case "membresias": return <MembresiasSection />
    case "servicios": return <ServiciosSection />
    case "inventario": return <InventarioSection onNavigate={onNavigate} />
    case "comodatos": return <ComodatosSection />
    case "citas": return <CitasSection />
    case "reportes": return <ReportesSection />
    case "preregistro": return <PreregistroSection />
    case "administradores": return <AdministradoresSection />
    case "especialidades-config": return <EspecialidadesConfigSection />
    default: return <DashboardSection />
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function normalizeRoleLabel(rawRole: string): string {
  if (!rawRole) return ""

  return rawRole
    .replace(/RecepciÃ³n/gi, "Recepcion")
    .replace(/Recepción/gi, "Recepcion")
    .replace(/Super\s+Administrador/gi, "Administrador")
}

function PanelHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    isAuthenticated,
    isLoading: authLoading,
    session,
    login: authLogin,
    logout: authLogout,
    updateSession,
  } = useAuth()

  const isAdmin = (session?.idRol ?? 0) === 1

  const [activeSection, setActiveSection] = useState(() => {
    const s = searchParams.get("section")
    return s && VALID_SECTIONS.has(s) ? s : "dashboard"
  })

  useEffect(() => {
    const s = searchParams.get("section")
    if (!s || !VALID_SECTIONS.has(s)) return
    if (s === "administradores" && !isAdmin) {
      // Wait for auth to finish loading before redirecting — avoids falsely
      // locking out super-admins who arrive via a bookmarked direct URL.
      if (authLoading) return
      router.replace("/panel?section=dashboard", { scroll: false })
      return
    }
    setActiveSection(s)
  }, [searchParams, isAdmin, router, authLoading])

  // Bloquear back/forward del navegador para que no salgan del panel de administrador
  useEffect(() => {
    if (!isAuthenticated) return

    // Empujar la URL actual (preservando ?section=...) para crear un "tope" en el historial
    // que impide retroceder a la página de login u otras rutas fuera del panel.
    // Se usa window.location.href en lugar de '/panel' para no perder el ?section=.
    window.history.pushState(null, '', window.location.href)

    const preventLeave = () => {
      window.history.pushState(null, '', window.location.href)
    }

    // capture: true para interceptar antes de que Next.js procese el evento
    window.addEventListener('popstate', preventLeave, true)
    return () => window.removeEventListener('popstate', preventLeave, true)
  }, [isAuthenticated])

  const handleSectionChange = useCallback((section: string) => {
    if (section === "administradores" && !isAdmin) return
    setActiveSection(section)
    router.replace(`/panel?section=${section}`, { scroll: false })
  }, [router, isAdmin])

  const handleAiAction = useCallback((action: AiAction) => {
    if (action.type === "navigate" && VALID_SECTIONS.has(action.to)) {
      handleSectionChange(action.to)
    } else {
      // Las secciones escuchan este evento para abrir diálogos o ejecutar búsquedas
      window.dispatchEvent(new CustomEvent("ai-action", { detail: action }))
    }
  }, [handleSectionChange])

  const editBeneficiarioParam = searchParams.get("editBeneficiario")

  const clearEditBeneficiarioParam = useCallback(() => {
    if (!searchParams.get("editBeneficiario")) return
    router.replace("/panel?section=beneficiarios", { scroll: false })
  }, [router, searchParams])

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showUserMenu, setShowUserMenu]       = useState(false)
  const [confirmLogout, setConfirmLogout]     = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    if (!showUserMenu) return
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
        setConfirmLogout(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showUserMenu])

  const userName = session?.nombreCompleto ?? ""
  const userRole = normalizeRoleLabel(session?.nombreRol ?? "")
  const userInitials = getInitials(userName)
  const photoRev = session?.profilePhotoRevision ?? 0
  const headerAvatarSrc = resolvePublicUploadUrl(
    session?.fotoPerfilUrl ?? undefined,
    photoRev > 0 ? photoRev : null
  )

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

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* ── Sidebar ── */}
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          userName={userName}
          userRole={userRole}
          idRol={session?.idRol ?? null}
          isDarkMode={theme === "dark"}
          onToggleDarkMode={(val) => setTheme(val ? "dark" : "light")}
          onEditProfile={() => setShowEditProfile(true)}
          onLogout={() => authLogout()}
        />

        {/* ── Main ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Header — z-10 para que su stacking context quede sobre el <main> */}
          <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-5 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {/* Campana de notificaciones */}
              <NotificacionesPanel />

              {/* Separador */}
              <div className="h-6 w-px bg-border/60 mx-1" />

              {/* Botón de perfil con dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => { setShowUserMenu(v => !v); setConfirmLogout(false) }}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-all ${
                    showUserMenu
                      ? "border-border bg-muted"
                      : "border-transparent hover:border-border/60 hover:bg-muted/50"
                  }`}
                >
                  {/* Avatar */}
                  {headerAvatarSrc ? (
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={`${headerAvatarSrc}|${photoRev}`}
                        src={headerAvatarSrc}
                        alt=""
                        className="size-full object-cover object-center"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-xs font-bold">{userInitials}</span>
                    </div>
                  )}

                  {/* Nombre + rol */}
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-xs font-semibold text-foreground leading-tight">{userName}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{userRole}</span>
                  </div>

                  <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg z-50">

                    {/* Info del usuario */}
                    <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
                      {headerAvatarSrc ? (
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={headerAvatarSrc} alt="" className="size-full object-cover object-center" />
                        </div>
                      ) : (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <span className="text-xs font-bold">{userInitials}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{userName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{userRole}</p>
                      </div>
                    </div>

                    {/* Opciones */}
                    <div className="py-1">
                      <button
                        onClick={() => { setShowUserMenu(false); setShowEditProfile(true) }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <User className="size-3.5 shrink-0 text-muted-foreground" />
                        Editar perfil
                      </button>

                      <div className="flex items-center gap-3 px-4 py-2.5">
                        {theme === "dark"
                          ? <Moon className="size-3.5 shrink-0 text-muted-foreground" />
                          : <Sun  className="size-3.5 shrink-0 text-muted-foreground" />
                        }
                        <span className="flex-1 text-xs text-foreground/80">Modo oscuro</span>
                        <Switch
                          checked={theme === "dark"}
                          onCheckedChange={(val) => setTheme(val ? "dark" : "light")}
                          className="scale-[0.85]"
                        />
                      </div>
                    </div>

                    <div className="border-t border-border/50 py-1">
                      {confirmLogout ? (
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-[11px] text-muted-foreground">¿Seguro que quieres cerrar sesión?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowUserMenu(false); setConfirmLogout(false); authLogout() }}
                              className="flex-1 rounded-lg bg-red-500/15 py-1.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-500/25"
                            >
                              Sí, salir
                            </button>
                            <button
                              onClick={() => setConfirmLogout(false)}
                              className="flex-1 rounded-lg bg-muted py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/80"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmLogout(true)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <LogOut className="size-3.5 shrink-0" />
                          Cerrar sesión
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>


          {/* Content */}
          <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6">
            <ErrorBoundary key={activeSection}>
              <SectionContent
                section={activeSection}
                openEditBeneficiarioCurp={activeSection === "beneficiarios" ? editBeneficiarioParam : null}
                onConsumedOpenEditBeneficiario={clearEditBeneficiarioParam}
                onNavigate={handleSectionChange}
              />
            </ErrorBoundary>
          </main>

        </div>
      </div>

      <EditProfileDialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        adminId={session?.idAdmin ?? null}
        sessionIdRol={session?.idRol ?? null}
        onProfileSaved={(nombreCompleto, email) => updateSession({ nombreCompleto, email })}
        onFotoPerfilUpdated={(fotoPerfilUrl) => updateSession({ fotoPerfilUrl })}
      />

      <AiChatPanel onAction={handleAiAction} />
    </>
  )
}

export default function PanelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <PanelHomeContent />
    </Suspense>
  )
}
