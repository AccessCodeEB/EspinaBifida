"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Moon } from "lucide-react"
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
import { PreregistroSection } from "@/components/sections/preregistro"
import { ReportesSection } from "@/components/sections/reportes"
import { AdministradoresSection } from "@/components/sections/administradores"
import { Switch } from "@/components/ui/switch"
import { resolvePublicUploadUrl } from "@/lib/media-url"
import { AiChatPanel, type AiAction } from "@/components/ai-chat-panel"
import { NotificacionesPanel } from "@/components/notificaciones-panel"

/** Secciones válidas de la SPA del panel */
const VALID_SECTIONS = new Set([
  "dashboard",
  "beneficiarios",
  "membresias",
  "servicios",
  "inventario",
  "citas",
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
    case "citas": return <CitasSection />
    case "reportes": return <ReportesSection />
    case "preregistro": return <PreregistroSection />
    case "administradores": return <AdministradoresSection />
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

  const isSuperAdmin = (session?.idRol ?? 0) === 1

  const [activeSection, setActiveSection] = useState(() => {
    const s = searchParams.get("section")
    return s && VALID_SECTIONS.has(s) ? s : "dashboard"
  })

  useEffect(() => {
    const s = searchParams.get("section")
    if (!s || !VALID_SECTIONS.has(s)) return
    if (s === "administradores" && !isSuperAdmin) {
      router.replace("/panel?section=dashboard", { scroll: false })
      return
    }
    setActiveSection(s)
  }, [searchParams, isSuperAdmin, router])

  // Bloquear back/forward del navegador para que no salgan del panel de administrador
  useEffect(() => {
    if (!isAuthenticated) return

    // Empujar una entrada al historial para que siempre haya un "/panel" arriba del stack
    window.history.pushState(null, '', '/panel')

    const preventLeave = () => {
      window.history.pushState(null, '', '/panel')
    }

    // capture: true para interceptar antes de que Next.js procese el evento
    window.addEventListener('popstate', preventLeave, true)
    return () => window.removeEventListener('popstate', preventLeave, true)
  }, [isAuthenticated])

  const handleSectionChange = useCallback((section: string) => {
    if (section === "administradores" && !isSuperAdmin) return
    setActiveSection(section)
    router.replace(`/panel?section=${section}`, { scroll: false })
  }, [router, isSuperAdmin])

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
  const { theme, setTheme } = useTheme()

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

          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-5 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <NotificacionesPanel />
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-medium text-foreground leading-tight">{userName}</span>
                <span className="text-xs text-muted-foreground leading-tight">{userRole}</span>
              </div>

              {headerAvatarSrc ? (
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted shadow-sm">
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
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <span className="text-sm font-bold">{userInitials}</span>
                </div>
              )}
            </div>
          </header>


          {/* Content */}
          <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6">
            <SectionContent
              section={activeSection}
              openEditBeneficiarioCurp={activeSection === "beneficiarios" ? editBeneficiarioParam : null}
              onConsumedOpenEditBeneficiario={clearEditBeneficiarioParam}
              onNavigate={handleSectionChange}
            />
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
