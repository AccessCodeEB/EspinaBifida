"use client"

import { useState } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardList,
  Package,
  CalendarDays,
  UserPlus,
  FileBarChart,
  Settings,
  User,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

const navGroups = [
  {
    label: null,
    items: [
      { title: "Dashboard",     icon: LayoutDashboard, id: "dashboard"     },
    ],
  },
  {
    label: "Gestión",
    items: [
      { title: "Beneficiarios", icon: Users,            id: "beneficiarios" },
      { title: "Membresías",    icon: CreditCard,       id: "membresias"    },
      { title: "Preregistro",   icon: UserPlus,         id: "preregistro"   },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { title: "Servicios",     icon: ClipboardList,    id: "servicios"     },
      { title: "Inventario",    icon: Package,          id: "inventario"    },
      { title: "Citas",         icon: CalendarDays,     id: "citas"         },
    ],
  },
  {
    label: "Análisis",
    items: [
      { title: "Reportes",      icon: FileBarChart,     id: "reportes"      },
    ],
  },
]

interface AppSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  userName?: string
  userRole?: string
  isDarkMode?: boolean
  onToggleDarkMode?: (val: boolean) => void
  onEditProfile?: () => void
  onLogout?: () => void
}

export function AppSidebar({
  activeSection,
  onSectionChange,
  userName,
  userRole,
  isDarkMode,
  onToggleDarkMode,
  onEditProfile,
  onLogout,
}: AppSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "?"

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-[#111827] border-r border-white/[0.06]">

      {/* ── Branding ── */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.08]">
          <Image
            src="/logo-espina-bifida.png"
            alt="Logo"
            width={26}
            height={26}
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-white">Espina Bífida</p>
          <p className="text-[10px] leading-tight text-white/30">Nuevo León · Panel admin</p>
        </div>
      </div>


      {/* ── Navegación ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`
                      relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150
                      ${isActive
                        ? "bg-white/[0.09] text-white font-medium"
                        : "text-white/45 hover:bg-white/[0.05] hover:text-white/70 font-normal"
                      }
                    `}
                  >
                    {/* Indicador activo */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#E8B043]" />
                    )}
                    <Icon className={`size-[17px] shrink-0 ${isActive ? "text-white" : "text-white/30"}`} />
                    <span className="truncate">{item.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Configuración expandible ── */}
      <div className="px-3 pb-6">

        {/* Línea superior — simétrica */}
        <div className="my-2 h-px bg-white/[0.06]" />

        {/* Panel — se despliega hacia ARRIBA */}
        {settingsOpen && (
          <div className="mb-1 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04]">
            <button
              onClick={() => { setSettingsOpen(false); onEditProfile?.() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/75"
            >
              <User className="size-3.5 shrink-0 text-white/25" />
              Editar perfil
            </button>
            <div className="flex items-center gap-3 px-4 py-2.5">
              {isDarkMode
                ? <Moon className="size-3.5 shrink-0 text-white/25" />
                : <Sun  className="size-3.5 shrink-0 text-white/25" />
              }
              <span className="flex-1 text-[12px] text-white/50">Modo oscuro</span>
              <Switch checked={isDarkMode ?? false} onCheckedChange={onToggleDarkMode} className="scale-[0.8]" />
            </div>
            <div className="mx-3 h-px bg-white/[0.06]" />

            {confirmLogout ? (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[11px] text-white/50 leading-tight">
                  ¿Seguro que quieres cerrar sesión?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmLogout(false); setSettingsOpen(false); onLogout?.() }}
                    className="flex-1 rounded-md bg-red-500/20 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/30"
                  >
                    Sí, salir
                  </button>
                  <button
                    onClick={() => setConfirmLogout(false)}
                    className="flex-1 rounded-md bg-white/[0.06] py-1.5 text-[11px] font-semibold text-white/40 transition-colors hover:bg-white/[0.10]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLogout(true)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="size-3.5 shrink-0" />
                Cerrar sesión
              </button>
            )}
          </div>
        )}

        {/* Botón Configuración */}
        <button
          onClick={() => { setSettingsOpen((v) => !v); setConfirmLogout(false) }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150
            ${settingsOpen ? "bg-white/[0.09] text-white/80" : "text-white/35 hover:bg-white/[0.05] hover:text-white/60"}`}
        >
          <Settings className="size-[17px] shrink-0" />
          <span className="flex-1 text-sm">Configuración</span>
          <ChevronRight className={`size-3.5 shrink-0 transition-transform duration-200 text-white/25 ${settingsOpen ? "-rotate-90" : ""}`} />
        </button>

      </div>

    </aside>
  )
}

export { AppSidebar as FloatingNav }
