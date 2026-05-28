"use client"

import { useState } from "react"
import { Mail, KeyRound, Loader2, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { solicitarRecuperacion, resetPasswordPublico } from "@/services/administradores"

type Step = "email" | "codigo" | "done"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep]           = useState<Step>("email")
  const [email, setEmail]         = useState("")
  const [codigo, setCodigo]       = useState("")
  const [nuevaPass, setNuevaPass] = useState("")
  const [devMode, setDevMode]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function reset() {
    setStep("email")
    setEmail("")
    setCodigo("")
    setNuevaPass("")
    setDevMode(false)
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  async function handleSolicitarCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return }
    setLoading(true); setError(null)
    try {
      const res = await solicitarRecuperacion(email.trim())
      if (res.codigoDev) {
        setDevMode(true)
        setCodigo(res.codigoDev)
        toast.info(`Modo desarrollo: código ${res.codigoDev} (sin correo real)`)
      } else {
        toast.success("Código enviado a tu correo electrónico")
      }
      setStep("codigo")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar el código"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim())    { setError("Ingresa el código de verificación"); return }
    if (!nuevaPass.trim()) { setError("Ingresa la nueva contraseña"); return }
    setLoading(true); setError(null)
    try {
      await resetPasswordPublico(email, codigo, nuevaPass)
      setStep("done")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restablecer la contraseña"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar contraseña</DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Ingresa tu correo y te enviaremos un código de verificación."
              : step === "codigo"
              ? "Ingresa el código recibido y tu nueva contraseña."
              : "Tu contraseña fue actualizada correctamente."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleSolicitarCodigo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Enviar código por correo
            </Button>
          </form>
        )}

        {step === "codigo" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {devMode ? (
              <div className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-[11px] text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                <Mail className="size-3.5 shrink-0" />
                <span><strong>Modo desarrollo:</strong> SMTP no configurado — código auto-llenado.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                <Mail className="size-3.5 shrink-0" />
                <span>Código de 6 dígitos enviado a <strong>{email}</strong>.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Código de verificación
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                autoFocus={!devMode}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("email"); setError(null) }}
                disabled={loading}
              >
                Atrás
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Restablecer contraseña
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              Tu contraseña fue actualizada. Ya puedes iniciar sesión con ella.
            </p>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Ir al login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
