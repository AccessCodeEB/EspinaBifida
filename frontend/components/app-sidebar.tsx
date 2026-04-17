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
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Beneficiarios", icon: Users, id: "beneficiarios" },
  { title: "Membresías", icon: CreditCard, id: "membresias" },
  { title: "Servicios", icon: ClipboardList, id: "servicios" },
  { title: "Inventario", icon: Package, id: "inventario" },
  { title: "Citas", icon: CalendarDays, id: "citas" },
  { title: "Reportes", icon: FileBarChart, id: "reportes" },
  { title: "Preregistro", icon: UserPlus, id: "preregistro" },
]

interface FloatingNavProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function FloatingNav({ activeSection, onSectionChange }: FloatingNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {/* Botón disparador: Se hizo completamente redondo (rounded-full) con sombra para parecer un botón de acción flotante (FAB) */}
        <Button
          variant="outline"
          size="icon"
          className="size-12 rounded-full border border-border/50 bg-background/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-accent transition-all duration-300"
          aria-label="Abrir menú"
        >
          <MoreHorizontal className="size-5 text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      {/* Contenedor del menú: Más redondeado (rounded-2xl), sombra amplia (shadow-2xl) y efecto translúcido */}
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className="w-64 rounded-2xl shadow-2xl border border-border/40 bg-background/95 backdrop-blur-md p-2"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
          <div className="flex size-10 items-center justify-center rounded-xl overflow-hidden bg-white shadow-sm">
            <Image
              src="/logo-espina-bifida.png"
              alt="Logo Espina Bífida"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col space-y-0.5 leading-none">
            <span className="text-base font-semibold tracking-tight text-foreground">Espina Bífida</span>
            <span className="text-xs text-muted-foreground font-medium">Sistema de Gestión</span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-1 opacity-50" />
        
        {/* Envoltorio para los items para darles una separación general */}
        <div className="flex flex-col gap-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id)
                  setOpen(false)
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm focus:bg-primary focus:text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                }`}
              >
                <Icon className={`size-[18px] shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
                <span className="text-sm font-medium">{item.title}</span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Keep backward compat export
export { FloatingNav as AppSidebar }