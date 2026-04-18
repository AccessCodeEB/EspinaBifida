"use client"

import { useEffect, useState } from "react"
import { Settings, Moon, User, Save, Lock, Send, CheckCircle, Shield, LogOut } from "lucide-react"
import { FloatingNav } from "@/components/app-sidebar"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useAdminData } from "@/hooks/useAdminData"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

function SectionContent({ section }: { section: string }) {
  switch (section) {
    case "dashboard":
      return <DashboardSection />
    case "beneficiarios":
      return <BeneficiariosSection />
    case "membresias":
      return <MembresiasSection />
    case "servicios":
      return <ServiciosSection />
    case "inventario":
      return <InventarioSection />
    case "citas":
      return <CitasSection />
    case "reportes":
      return <ReportesSection />
    case "preregistro":
      return <PreregistroSection />
    default:
      return <DashboardSection />
  }
}

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const { user } = useCurrentUser()
  const [showSettings, setShowSettings] = useState(false)
  const [showEditData, setShowEditData] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    return () => {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const {
    needsLogin,
    loginForm, setLoginForm,
    loginError, loggingIn,
    handleLogin,
    handleCloseAccount,
    admin, loadingAdmin, loadError,
    form, setForm,
    saving, saveError, saveOk,
    handleSave,
    showPwForm, setShowPwForm,
    pwForm, setPwForm,
    pwSaving, pwError, pwOk,
    handleChangePassword,
    codeSent, sendingCode, codeError,
    handleSendCode,
  } = useAdminData(showEditData)

  return (
    <div>
      <div className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <FloatingNav activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-foreground leading-tight">{user.name}</span>
              <span className="text-xs text-muted-foreground leading-tight">{user.role}</span>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <span className="text-sm font-bold">{user.initials}</span>
            </div>

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
                <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <span className="text-sm font-bold">{user.initials}</span>
                  </div>
                  <div className="flex min-w-0 flex-col space-y-0.5 leading-none">
                    <span className="truncate text-base font-semibold tracking-tight text-foreground">{user.name}</span>
                    <span className="truncate text-xs font-medium text-muted-foreground">{user.role}</span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1 opacity-50" />

                <div className="mt-2 flex flex-col gap-1">
                  <DropdownMenuItem
                    onClick={() => {
                      setShowSettings(false)
                      setShowEditData(true)
                    }}
                    className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    <User className="mt-0.5 size-[18px] shrink-0" />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-foreground">Editar datos</span>
                      <span className="text-[11px] text-muted-foreground">Actualizar información básica</span>
                    </div>
                  </DropdownMenuItem>

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
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <SectionContent section={activeSection} />
        </div>

        <Sheet open={showEditData} onOpenChange={(v) => { setShowEditData(v); setShowPwForm(false) }}>
          <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 bg-[#fbfcff] dark:bg-background border-l border-border/40 shadow-2xl">

            {/* Header (Igual a la imagen: alineado a la izquierda, sin avatar) */}
            <SheetHeader className="border-b border-border/40 px-6 py-6 bg-background">
              <div className="flex flex-col text-left">
                <SheetTitle className="text-[19px] font-semibold text-foreground tracking-tight">Editar datos</SheetTitle>
                <SheetDescription className="mt-1 text-[13px] text-muted-foreground">
                  Actualiza la información básica de tu cuenta.
                </SheetDescription>
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

              {needsLogin && (
                <section className="space-y-4 pt-2">
                  <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-muted-foreground">
                    Inicia sesión para editar los datos de tu cuenta.
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Correo electrónico</Label>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        className="h-10 bg-white dark:bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Contraseña</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        className="h-10 bg-white dark:bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm"
                      />
                    </div>
                    {loginError && <p className="text-xs text-destructive">{loginError}</p>}
                    <Button type="button" className="w-full gap-2 h-10 shadow-sm" disabled={loggingIn} onClick={handleLogin}>
                      {loggingIn ? "Verificando..." : "Iniciar sesión"}
                    </Button>
                  </div>
                </section>
              )}

              {/* Loading / error */}
              {!needsLogin && loadingAdmin && (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando datos...</p>
              )}
              {!needsLogin && loadError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {loadError}
                </div>
              )}

              {!needsLogin && !loadingAdmin && !loadError && (
                <>
                  {/* ── Rol (Solo lectura) ────────────────────────────── */}
                  <section>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      <Shield className="size-3.5" />
                      Rol
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 shadow-sm">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Shield className="size-4" />
                      </div>
                      <span className="text-[14px] font-semibold text-foreground">
                        {admin?.nombreRol ?? "Recepción"}
                      </span>
                    </div>
                  </section>

                  <Separator className="bg-border/50" />

                  {/* ── Perfil editable ───────────────────────────────── */}
                  <section>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      <User className="size-3.5" />
                      Perfil
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-semibold text-foreground">Nombre completo</Label>
                        <Input
                          value={form.nombreCompleto}
                          onChange={(e) => setForm((p) => ({ ...p, nombreCompleto: e.target.value }))}
                          placeholder="Tu nombre"
                          className="h-10 bg-white dark:bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-semibold text-foreground">Correo electrónico</Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="correo@ejemplo.com"
                          className="h-10 bg-white dark:bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 shadow-sm transition-all"
                        />
                      </div>
                    </div>

                    {saveError && (
                      <p className="mt-3 text-xs text-destructive">{saveError}</p>
                    )}
                    {saveOk && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
                        <CheckCircle className="size-3.5" />
                        Datos guardados correctamente.
                      </div>
                    )}
                  </section>

                  <Separator className="bg-border/50" />

                  {/* ── Contraseña ────────────────────────────────────── */}
                  <section>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      <Lock className="size-3.5" />
                      Contraseña
                    </div>

                    {!showPwForm ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 h-10 border-border/60 bg-white dark:bg-transparent shadow-sm hover:bg-accent transition-colors"
                        onClick={() => setShowPwForm(true)}
                      >
                        <Lock className="size-4 text-muted-foreground" />
                        Cambiar contraseña
                      </Button>
                    ) : (
                      <div className="space-y-4 rounded-2xl border border-border/50 bg-white dark:bg-muted/10 p-5 shadow-sm">

                        {/* Flujo de código por email */}
                        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-3">
                          <Send className="size-4 text-primary mt-0.5 shrink-0" />
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground block mb-0.5">Verificación de seguridad</span>
                            {codeSent
                              ? "Código enviado. Por favor, revisa tu bandeja de entrada."
                              : "Te enviaremos un código a tu correo para confirmar este cambio."}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full gap-2 text-xs font-semibold shadow-sm h-9"
                          disabled={codeSent || sendingCode}
                          onClick={handleSendCode}
                        >
                          <Send className="size-3.5" />
                          {sendingCode ? "Enviando..." : codeSent ? "Código enviado" : "Enviar código al correo"}
                        </Button>
                        {codeError && (
                          <p className="text-[11px] text-destructive">{codeError}</p>
                        )}

                        <Separator className="my-2 bg-border/50" />

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Contraseña actual</Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={pwForm.passwordActual}
                            onChange={(e) => setPwForm((p) => ({ ...p, passwordActual: e.target.value }))}
                            className="h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Nueva contraseña</Label>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={pwForm.passwordNueva}
                            onChange={(e) => setPwForm((p) => ({ ...p, passwordNueva: e.target.value }))}
                            className="h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Confirmar contraseña</Label>
                          <Input
                            type="password"
                            placeholder="Repite la nueva contraseña"
                            value={pwForm.confirmar}
                            onChange={(e) => setPwForm((p) => ({ ...p, confirmar: e.target.value }))}
                            className="h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                          />
                        </div>

                        {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                        {pwOk && (
                          <div className="flex items-center gap-2 text-xs font-medium text-success">
                            <CheckCircle className="size-3.5" />
                            Contraseña actualizada correctamente.
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-9 shadow-sm"
                            disabled={pwSaving}
                            onClick={() => { setShowPwForm(false) }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            className="flex-1 gap-2 h-9 shadow-sm"
                            disabled={pwSaving}
                            onClick={handleChangePassword}
                          >
                            {pwSaving ? "Guardando..." : "Confirmar"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 bg-background">
              {!needsLogin && !loadingAdmin && !loadError && admin && (
                <div className="px-6 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleCloseAccount}
                  >
                    <LogOut className="size-4" />
                    Cerrar cuenta
                  </Button>
                </div>
              )}
              <div className="flex gap-3 px-6 py-4">
                <Button type="button" variant="outline" className="flex-1 shadow-sm" onClick={() => setShowEditData(false)}>
                  Cancelar
                </Button>
                {!needsLogin && (
                  <Button
                    type="button"
                    className="flex-1 gap-2 shadow-sm"
                    disabled={saving || loadingAdmin}
                    onClick={handleSave}
                  >
                    <Save className="size-4" />
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                )}
              </div>
            </div>

          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}