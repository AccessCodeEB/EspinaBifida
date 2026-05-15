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
import { Switch } from "@/components/ui/switch"
import { resolvePublicUploadUrl } from "@/lib/media-url"

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
])

function SectionContent({
  section,
  openEditBeneficiarioCurp,
  onConsumedOpenEditBeneficiario,
}: {
  section: string
  openEditBeneficiarioCurp?: string | null
  onConsumedOpenEditBeneficiario?: () => void
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
    case "inventario": return <InventarioSection />
    case "citas": return <CitasSection />
    case "reportes": return <ReportesSection />
    case "preregistro": return <PreregistroSection />
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
    router.replace(`/panel?section=${section}`, { scroll: false })
  }

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
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <SectionContent
              section={activeSection}
              openEditBeneficiarioCurp={activeSection === "beneficiarios" ? editBeneficiarioParam : null}
              onConsumedOpenEditBeneficiario={clearEditBeneficiarioParam}
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
