"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
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
import { ApiError } from "@/lib/api-client"
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

const AMBER = "#E8B043"
const NAVY  = "#0f4c81"

/**
 * Clave de prueba Cloudflare (solo si no defines NEXT_PUBLIC_TURNSTILE_SITE_KEY en desarrollo).
 * `3x…FF` fuerza un desafío interactivo para poder probar el flujo real; `1x…AA` siempre pasa sola.
 * @see https://developers.cloudflare.com/turnstile/reference/testing/
 */
const TURNSTILE_SITE_KEY_DEV = "3x00000000000000000000FF"

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
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
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
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Step header */}
      <div className="flex items-start gap-4 border-b border-slate-100 p-6 dark:border-slate-800 md:p-8">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0f4c81] dark:bg-slate-800 dark:text-blue-400">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1 w-5 rounded-full"
              style={{ backgroundColor: AMBER }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
              Paso {step}
            </p>
          </div>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {/* Step body */}
      <div className="p-6 md:p-8">{children}</div>
    </div>
  )
}

export interface PublicPreregistroSectionProps {
  /** Si true, no envuelve en `<section>` (el padre define la sección). */
  embedded?: boolean
  /** Oculta el encabezado interno cuando el padre ya puso el título. */
  hideIntro?: boolean
  /** Elemento al que hacer scroll tras envío exitoso. */
  scrollTargetOnSuccess?: string
  /** En modo embebido: segundo CTA del éxito cierra el contenedor. */
  onEmbeddedDismiss?: () => void
}

/**
 * Formulario público de pre-registro: solo datos mínimos obligatorios.
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
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const turnstileSiteKey = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim() ||
      (process.env.NODE_ENV === "development" ? TURNSTILE_SITE_KEY_DEV : ""),
    []
  )

  const turnstileDevFallback = useMemo(
    () => process.env.NODE_ENV === "development" && !(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim(),
    []
  )

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
    setTurnstileToken("")
    turnstileRef.current?.reset()
  }, [])

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
    setErrors((e) => {
      if (!e.turnstile) return e
      const next = { ...e }
      delete next.turnstile
      return next
    })
  }, [])

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken("")
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateAltaSolicitudPublica(form)
    const captchaErrs: Record<string, string> = {}
    if (!turnstileSiteKey) {
      captchaErrs._global =
        "El envío no está disponible: falta configurar la verificación humana en el sitio (NEXT_PUBLIC_TURNSTILE_SITE_KEY)."
    } else if (!turnstileToken.trim()) {
      captchaErrs.turnstile = "Completa la verificación antes de enviar la solicitud."
    }
    const merged = { ...v, ...captchaErrs }
    if (Object.keys(merged).length > 0) {
      setErrors(merged)
      const first = Object.keys(merged).find((k) => k !== "_global")
      if (first === "turnstile") {
        document.getElementById("prereg-turnstile")?.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (first) {
        document.getElementById(`prereg-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const payload = { ...buildAltaCreatePayload(form), turnstileToken: turnstileToken.trim() }
      await createBeneficiarioPublicSolicitud(payload)
      setDone(true)
      requestAnimationFrame(() => {
        document.getElementById(scrollTargetOnSuccess)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      toast.success("¡Gracias! Hemos recibido tu solicitud.", {
        description: "La asociación revisará tus datos y se pondrá en contacto contigo.",
      })
    } catch (err: unknown) {
      const raw =
        err instanceof ApiError && err.code
          ? JSON.stringify({ code: err.code, message: err.message })
          : err instanceof Error
            ? err.message
            : "Error al enviar"
      setErrors(parseBeneficiarioApiError(raw))
      setTurnstileToken("")
      turnstileRef.current?.reset()
    } finally {
      setSaving(false)
    }
  }

  const successDismiss =
    embedded && onEmbeddedDismiss ? (
      <Button
        type="button"
        style={{ backgroundColor: NAVY }}
        className="rounded-md text-white hover:opacity-90"
        onClick={onEmbeddedDismiss}
      >
        Cerrar
      </Button>
    ) : (
      <Button asChild style={{ backgroundColor: NAVY }} className="rounded-md text-white hover:opacity-90">
        <Link href="/">Volver al inicio</Link>
      </Button>
    )

  const successInner = (
    <div className="mx-auto max-w-lg px-4 py-12 text-center md:px-8">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-amber-50 dark:bg-slate-800">
        <CheckCircle2 className="size-7" style={{ color: AMBER }} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
        Solicitud enviada
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
        Gracias por confiar en nosotros. Conserva tu CURP a la mano; el equipo validará la solicitud. Podrás ampliar el
        expediente cuando esté aprobado.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" className="rounded-md" onClick={resetAll}>
          Enviar otra solicitud
        </Button>
        {successDismiss}
      </div>
    </div>
  )

  if (done) {
    if (embedded) return <div className="w-full">{successInner}</div>
    return (
      <section
        id="pre-registro"
        className="scroll-mt-24 border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
        aria-label="Solicitud enviada"
      >
        {successInner}
      </section>
    )
  }

  const intro = !hideIntro ? (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0f4c81] dark:text-blue-400">
        Pre-registro
      </p>
      <h2
        id="pre-registro-title"
        className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl"
      >
        Solicitud en línea
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
        Solo pedimos los datos esenciales para iniciar tu solicitud. Tras la aprobación, el equipo puede ayudarte a
        completar domicilio, contactos adicionales y demás campos del expediente.
      </p>
    </div>
  ) : null

  const formBody = (
    <>
      {intro}
      <form onSubmit={onSubmit} className={cn("mx-auto max-w-3xl space-y-6", hideIntro ? "" : "mt-12")}>
        {errors._global ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
          >
            {errors._global}
          </div>
        ) : null}

        {/* Step 1 – Identity & Location */}
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
                className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.nombres && "border-red-400")}
                placeholder="Ej. Ana Lucía"
                autoComplete="given-name"
              />
            </FieldShell>

            <FieldShell label="Apellido paterno" required error={errors.apellidoPaterno} htmlFor="prereg-ap-pat">
              <Input
                id="prereg-ap-pat"
                value={form.apellidoPaterno}
                onChange={(e) => change("apellidoPaterno", e.target.value)}
                className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.apellidoPaterno && "border-red-400")}
                placeholder="Ej. Martínez"
                autoComplete="family-name"
              />
            </FieldShell>

            <FieldShell label="Apellido materno" required error={errors.apellidoMaterno} htmlFor="prereg-ap-mat">
              <Input
                id="prereg-ap-mat"
                value={form.apellidoMaterno}
                onChange={(e) => change("apellidoMaterno", e.target.value)}
                className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.apellidoMaterno && "border-red-400")}
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
                  "h-11 rounded-lg bg-white font-mono uppercase tracking-wide dark:bg-slate-900",
                  errors.curp && "border-red-400"
                )}
                placeholder="18 caracteres"
                autoComplete="off"
              />
            </FieldShell>

            <FieldShell label="Fecha de nacimiento" required error={errors.fechaNacimiento} htmlFor="prereg-fn">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="prereg-fn"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => change("fechaNacimiento", e.target.value)}
                  className={cn("h-11 rounded-lg bg-white pl-10 dark:bg-slate-900", errors.fechaNacimiento && "border-red-400")}
                />
              </div>
            </FieldShell>

            <FieldShell label="Ciudad" required error={errors.ciudad} htmlFor="prereg-ciudad">
              <Input
                id="prereg-ciudad"
                value={form.ciudad}
                onChange={(e) => change("ciudad", e.target.value)}
                className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.ciudad && "border-red-400")}
                placeholder="Ciudad"
              />
            </FieldShell>

            <FieldShell label="Estado" required error={errors.estado} htmlFor="prereg-edo">
              <Input
                id="prereg-edo"
                value={form.estado}
                onChange={(e) => change("estado", e.target.value)}
                className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.estado && "border-red-400")}
                placeholder="Estado"
              />
            </FieldShell>
          </div>
        </StepCard>

        {/* Step 2 – Contact & Clinical Info */}
        <StepCard
          step={2}
          title="Contacto e información clínica"
          description="Cómo localizarte y datos básicos para orientar el seguimiento."
          icon={Stethoscope}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Correo electrónico" required error={errors.correoElectronico} htmlFor="prereg-mail">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="prereg-mail"
                  type="email"
                  value={form.correoElectronico}
                  onChange={(e) => change("correoElectronico", e.target.value)}
                  className={cn("h-11 rounded-lg bg-white pl-10 dark:bg-slate-900", errors.correoElectronico && "border-red-400")}
                  placeholder="nombre@correo.com"
                  autoComplete="email"
                />
              </div>
            </FieldShell>

            <FieldShell label="Teléfono celular" required error={errors.telefonoCelular} htmlFor="prereg-tcel">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="prereg-tcel"
                  value={form.telefonoCelular}
                  onChange={(e) => change("telefonoCelular", e.target.value)}
                  className={cn("h-11 rounded-lg bg-white pl-10 dark:bg-slate-900", errors.telefonoCelular && "border-red-400")}
                  placeholder="10 dígitos"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </FieldShell>

            <FieldShell label="¿Usa válvula?" required error={errors.usaValvula} htmlFor="prereg-valv">
              <Select
                value={form.usaValvula === undefined ? undefined : form.usaValvula ? "si" : "no"}
                onValueChange={(v) => change("usaValvula", v === "si")}
              >
                <SelectTrigger
                  id="prereg-valv"
                  className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.usaValvula && "border-red-400")}
                >
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
                value={form.tipo || undefined}
                onValueChange={(v) => change("tipo", v)}
              >
                <SelectTrigger
                  id="prereg-tipo"
                  className={cn("h-11 rounded-lg bg-white dark:bg-slate-900", errors.tipo && "border-red-400")}
                >
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ESPINA_BIFIDA_OPCIONES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
                className={cn(
                  "min-h-[100px] resize-y rounded-lg bg-white dark:bg-slate-900",
                  errors.notas && "border-red-400"
                )}
                placeholder="Opcional. Información adicional para el equipo."
              />
            </FieldShell>
          </div>

          {/* Submit area */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-800 md:pt-8">
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Al enviar, confirmas que la información es verídica. El expediente completo (domicilio, contactos de
              emergencia, foto, etc.) puede completarse después con la asociación.
            </p>

            {turnstileSiteKey ? (
              <div id="prereg-turnstile" className="mt-6 flex flex-col items-center justify-center gap-2">
                {turnstileDevFallback ? (
                  <p className="max-w-md text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                    En local, sin <span className="font-mono text-[11px]">NEXT_PUBLIC_TURNSTILE_SITE_KEY</span>, se usa
                    una clave de prueba de Cloudflare: el aviso de «solo pruebas» es esperado.
                  </p>
                ) : null}
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  options={{ theme: "auto" }}
                  onSuccess={onTurnstileSuccess}
                  onExpire={onTurnstileExpire}
                  onError={onTurnstileExpire}
                />
                {errors.turnstile ? (
                  <p className="text-xs font-medium text-red-500">{errors.turnstile}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm font-medium text-red-500">
                No se puede enviar: falta la clave pública de verificación humana (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
              </p>
            )}

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="submit"
                size="lg"
                disabled={saving || !turnstileSiteKey}
                style={saving || !turnstileSiteKey ? {} : { backgroundColor: AMBER, color: "#ffffff" }}
                className="flex min-w-[220px] items-center justify-center gap-2 rounded-md px-10 text-base font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-5 shrink-0 animate-spin" />
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
        </StepCard>
      </form>
    </>
  )

  if (embedded) return <div className="w-full">{formBody}</div>

  return (
    <section
      id="pre-registro"
      className="scroll-mt-24 border-t border-slate-100 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-950 md:px-8 md:py-24"
      aria-labelledby={hideIntro ? undefined : "pre-registro-title"}
      aria-label={hideIntro ? "Formulario de pre-registro de beneficiarios" : undefined}
    >
      {formBody}
    </section>
  )
}
