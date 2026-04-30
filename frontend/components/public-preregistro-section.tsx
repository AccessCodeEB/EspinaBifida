"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  Send,
  Stethoscope,
  User,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createBeneficiarioPublicSolicitud } from "@/services/beneficiarios"
import {
  ALTA_FORM_INICIAL,
  TIPOS_ESPINA_BIFIDA_OPCIONES,
  buildAltaCreatePayload,
  parseBeneficiarioApiError,
  validateAltaSolicitudPublica,
  type BeneficiarioAltaForm,
} from "@/lib/beneficiario-alta"
import { cn } from "@/lib/utils"

function FieldShell({
  label,
  required,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

function StepCard({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: number
  title: string
  description: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/80 p-6 shadow-sm md:p-8">
      <div className="absolute right-0 top-0 size-32 translate-x-8 -translate-y-8 rounded-full bg-primary/[0.06]" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Paso {step}
          </p>
          <h3 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="relative mt-8 border-t border-border/40 pt-8">{children}</div>
    </div>
  )
}

export interface PublicPreregistroSectionProps {
  /** Si true, no envuelve en `<section>` (el padre define la sección, p. ej. «Panel administrativo»). */
  embedded?: boolean
  /** Oculta el encabezado interno «Solicitud en línea» cuando el padre ya puso el título de sección. */
  hideIntro?: boolean
  /** Elemento al que hacer scroll tras envío exitoso (id del contenedor padre). */
  scrollTargetOnSuccess?: string
  /** En modo embebido: segundo CTA del éxito cierra el contenedor (p. ej. diálogo) en lugar de ir al inicio. */
  onEmbeddedDismiss?: () => void
}

/**
 * Formulario público de pre-registro: solo datos mínimos obligatorios; el expediente completo se puede completar en el panel.
 */
export function PublicPreregistroSection({
  embedded = false,
  hideIntro = false,
  scrollTargetOnSuccess = "panel-administrativo",
  onEmbeddedDismiss,
}: PublicPreregistroSectionProps) {
  const [form, setForm] = useState<BeneficiarioAltaForm>({ ...ALTA_FORM_INICIAL })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const change = useCallback((field: keyof BeneficiarioAltaForm, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((e) => {
      if (!e[field as string]) return e
      const next = { ...e }
      delete next[field as string]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setForm({ ...ALTA_FORM_INICIAL })
    setErrors({})
    setDone(false)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateAltaSolicitudPublica(form)
    if (Object.keys(v).length > 0) {
      setErrors(v)
      const first = Object.keys(v).find((k) => k !== "_global")
      if (first) document.getElementById(`prereg-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const payload = buildAltaCreatePayload(form)
      await createBeneficiarioPublicSolicitud(payload)
      setDone(true)
      requestAnimationFrame(() => {
        document.getElementById(scrollTargetOnSuccess)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      toast.success("¡Gracias! Hemos recibido tu solicitud.", {
        description: "La asociación revisará tus datos y se pondrá en contacto contigo.",
      })
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Error al enviar"
      setErrors(parseBeneficiarioApiError(raw))
    } finally {
      setSaving(false)
    }
  }

  const successDismiss =
    embedded && onEmbeddedDismiss ? (
      <Button
        type="button"
        className="rounded-full bg-[#005bb5] text-white hover:bg-[#004a94]"
        onClick={onEmbeddedDismiss}
      >
        Cerrar
      </Button>
    ) : (
      <Button asChild className="rounded-full bg-[#005bb5] text-white hover:bg-[#004a94]">
        <Link href="/">Volver al inicio</Link>
      </Button>
    )

  const successInner = (
    <div className="mx-auto max-w-lg px-4 py-12 text-center md:px-8">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-9" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Solicitud enviada</h2>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Gracias por confiar en nosotros. Conserva tu CURP a la mano; el equipo validará la solicitud. Podrás ampliar el
        expediente cuando esté aprobado.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" className="rounded-full" onClick={resetAll}>
          Enviar otra solicitud
        </Button>
        {successDismiss}
      </div>
    </div>
  )

  if (done) {
    if (embedded) {
      return <div className="w-full">{successInner}</div>
    }
    return (
      <section
        id="pre-registro"
        className="scroll-mt-24 border-t border-border/50 bg-gradient-to-b from-muted/30 to-background"
        aria-label="Solicitud enviada"
      >
        {successInner}
      </section>
    )
  }

  const intro = !hideIntro ? (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">Pre-registro</p>
      <h2 id="pre-registro-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Solicitud en línea
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
        Solo pedimos los datos esenciales para iniciar tu solicitud. Tras la aprobación, el equipo puede ayudarte a
        completar domicilio, contactos adicionales y demás campos del expediente.
      </p>
    </div>
  ) : null

  const formBody = (
    <>
      {intro}
      <form onSubmit={onSubmit} className={cn("mx-auto max-w-3xl space-y-10", hideIntro ? "" : "mt-12")}>
        {errors._global ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          >
            {errors._global}
          </div>
        ) : null}

        <StepCard
          step={1}
          title="Beneficiario y ubicación"
          description="Identidad oficial y ciudad o estado donde vive."
          icon={User}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Nombre(s)" required error={errors.nombres} htmlFor="prereg-nombres">
              <Input
                id="prereg-nombres"
                value={form.nombres}
                onChange={(e) => change("nombres", e.target.value)}
                className={cn("h-11 rounded-xl bg-background", errors.nombres && "border-destructive")}
                placeholder="Ej. Ana Lucía"
                autoComplete="given-name"
              />
            </FieldShell>
            <FieldShell label="Apellido paterno" required error={errors.apellidoPaterno} htmlFor="prereg-ap-pat">
              <Input
                id="prereg-ap-pat"
                value={form.apellidoPaterno}
                onChange={(e) => change("apellidoPaterno", e.target.value)}
                className={cn("h-11 rounded-xl bg-background", errors.apellidoPaterno && "border-destructive")}
                placeholder="Ej. Martínez"
                autoComplete="family-name"
              />
            </FieldShell>
            <FieldShell label="Apellido materno" required error={errors.apellidoMaterno} htmlFor="prereg-ap-mat">
              <Input
                id="prereg-ap-mat"
                value={form.apellidoMaterno}
                onChange={(e) => change("apellidoMaterno", e.target.value)}
                className={cn("h-11 rounded-xl bg-background", errors.apellidoMaterno && "border-destructive")}
                placeholder="Ej. Sánchez"
              />
            </FieldShell>
            <FieldShell label="CURP" required error={errors.curp} htmlFor="prereg-curp">
              <Input
                id="prereg-curp"
                value={form.curp}
                onChange={(e) => change("curp", e.target.value.toUpperCase())}
                maxLength={18}
                className={cn(
                  "h-11 rounded-xl bg-background font-mono uppercase tracking-wide",
                  errors.curp && "border-destructive"
                )}
                placeholder="18 caracteres"
                autoComplete="off"
              />
            </FieldShell>
            <FieldShell label="Fecha de nacimiento" required error={errors.fechaNacimiento} htmlFor="prereg-fn">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-fn"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => change("fechaNacimiento", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.fechaNacimiento && "border-destructive")}
                />
              </div>
            </FieldShell>
            <FieldShell label="Ciudad" required error={errors.ciudad} htmlFor="prereg-ciudad">
              <Input
                id="prereg-ciudad"
                value={form.ciudad}
                onChange={(e) => change("ciudad", e.target.value)}
                className={cn("h-11 rounded-xl bg-background", errors.ciudad && "border-destructive")}
                placeholder="Ciudad"
              />
            </FieldShell>
            <FieldShell label="Estado" required error={errors.estado} htmlFor="prereg-edo">
              <Input
                id="prereg-edo"
                value={form.estado}
                onChange={(e) => change("estado", e.target.value)}
                className={cn("h-11 rounded-xl bg-background", errors.estado && "border-destructive")}
                placeholder="Estado"
              />
            </FieldShell>
          </div>
        </StepCard>

        <StepCard
          step={2}
          title="Contacto e información clínica"
          description="Cómo localizarte y datos básicos para orientar el seguimiento."
          icon={Stethoscope}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell
              label="Correo electrónico"
              required
              error={errors.correoElectronico}
              htmlFor="prereg-mail"
              className="min-w-0"
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-mail"
                  type="email"
                  value={form.correoElectronico}
                  onChange={(e) => change("correoElectronico", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.correoElectronico && "border-destructive")}
                  placeholder="nombre@correo.com"
                  autoComplete="email"
                />
              </div>
            </FieldShell>
            <FieldShell
              label="Teléfono celular"
              required
              error={errors.telefonoCelular}
              htmlFor="prereg-tcel"
              className="min-w-0"
            >
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-tcel"
                  value={form.telefonoCelular}
                  onChange={(e) => change("telefonoCelular", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.telefonoCelular && "border-destructive")}
                  placeholder="10 dígitos"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </FieldShell>
            <FieldShell label="¿Usa válvula?" required error={errors.usaValvula} htmlFor="prereg-valv">
              <Select
                value={form.usaValvula === undefined ? "" : form.usaValvula ? "si" : "no"}
                onValueChange={(v) => change("usaValvula", v === "si")}
              >
                <SelectTrigger id="prereg-valv" className={cn("h-11 rounded-xl bg-background", errors.usaValvula && "border-destructive")}>
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Tipo de espina bífida" required error={errors.tipo} htmlFor="prereg-tipo">
              <Select
                value={form.tipo ? form.tipo : "__none__"}
                onValueChange={(v) => change("tipo", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="prereg-tipo" className={cn("h-11 rounded-xl bg-background", errors.tipo && "border-destructive")}>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecciona un tipo</SelectItem>
                  {TIPOS_ESPINA_BIFIDA_OPCIONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell
              label="Motivo o notas breves"
              error={errors.notas}
              htmlFor="prereg-notas"
              className="sm:col-span-2"
            >
              <Textarea
                id="prereg-notas"
                value={form.notas}
                onChange={(e) => change("notas", e.target.value)}
                rows={4}
                className={cn("min-h-[100px] resize-y rounded-xl bg-background", errors.notas && "border-destructive")}
                placeholder="Opcional. Información adicional para el equipo (respeta el límite de caracteres indicado si escribes mucho)."
              />
            </FieldShell>
          </div>
        </StepCard>

        <div className="rounded-2xl border border-border/50 bg-card/90 p-6 text-center shadow-sm md:p-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Al enviar, confirmas que la información es verídica. El resto del expediente (domicilio completo, emergencias,
            foto, etc.) puede completarse después con la asociación.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              disabled={saving}
              className="flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#005bb5] px-10 text-base text-white hover:bg-[#004a94]"
            >
              {saving ? (
                <>
                  <Loader2 className="size-5 animate-spin shrink-0" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="size-5 shrink-0" />
                  Enviar solicitud
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  )

  if (embedded) {
    return <div className="w-full">{formBody}</div>
  }

  return (
    <section
      id="pre-registro"
      className="scroll-mt-24 border-t border-border/50 bg-gradient-to-b from-muted/25 via-background to-muted/20 px-4 py-16 md:px-8 md:py-24"
      aria-labelledby={hideIntro ? undefined : "pre-registro-title"}
      aria-label={hideIntro ? "Formulario de pre-registro de beneficiarios" : undefined}
    >
      {formBody}
    </section>
  )
}
