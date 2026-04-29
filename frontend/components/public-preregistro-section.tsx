"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  HeartPulse,
  Mail,
  MapPin,
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
import { ProfilePhotoUpload } from "@/components/profile-photo-upload"
import { createBeneficiarioPublicSolicitud, uploadBeneficiarioFotoPerfil } from "@/services/beneficiarios"
import {
  ALTA_FORM_INICIAL,
  TIPOS_SANGRE_OPCIONES,
  buildAltaCreatePayload,
  parseBeneficiarioApiError,
  validateAlta,
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
 * Formulario público de pre-registro: mismos datos que el alta de beneficiario en el panel,
 * presentación amigable para familias y visitantes.
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
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fotoFileRef = useRef<File | null>(null)

  const change = useCallback((field: keyof BeneficiarioAltaForm, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((e) => {
      if (!e[field as string]) return e
      const next = { ...e }
      delete next[field as string]
      return next
    })
  }, [])

  const resetFoto = useCallback(() => {
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    fotoFileRef.current = null
  }, [])

  const resetAll = useCallback(() => {
    setForm({ ...ALTA_FORM_INICIAL })
    setErrors({})
    setDone(false)
    resetFoto()
  }, [resetFoto])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateAlta(form)
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
      const curp = form.curp.toUpperCase()
      if (fotoFileRef.current) {
        try {
          await uploadBeneficiarioFotoPerfil(curp, fotoFileRef.current)
        } catch {
          toast.message("Registro guardado", {
            description: "No se pudo subir la foto; puedes enviarla más tarde con la asociación.",
          })
        }
      }
      resetFoto()
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
        Gracias por confiar en nosotros. Conserva tu CURP a la mano; el equipo de la asociación validará la información
        y te contactará si necesitan algún dato adicional.
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
        Completa el siguiente formulario con los datos de la persona que desea vincularse a la asociación. Es el mismo
        expediente que gestionamos internamente, pero pensado para que sea claro y sencillo desde casa.
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
          title="Identidad"
          description="Nombre completo, documento y datos básicos de salud."
          icon={User}
        >
          <div className="mb-8 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] p-5 md:p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <ProfilePhotoUpload
                variant="form"
                size="lg"
                previewSrc={fotoPreview}
                fotoPerfilUrl={null}
                fallbackText={`${form.nombres?.[0] ?? "?"}`}
                uploading={saving}
                disabled={saving}
                onFileSelected={(file) => {
                  fotoFileRef.current = file
                  setFotoPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev)
                    return URL.createObjectURL(file)
                  })
                }}
              />
              <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
                <span className="font-semibold text-foreground">Foto opcional.</span> Ayuda a reconocer el expediente;
                puedes encuadrarla en el paso siguiente. Si prefieres no adjuntar imagen, puedes omitir este paso.
              </p>
            </div>
          </div>

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
                className={cn("h-11 rounded-xl bg-background font-mono uppercase tracking-wide", errors.curp && "border-destructive")}
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
            <FieldShell label="Género" error={errors.genero} htmlFor="prereg-genero">
              <Select value={form.genero} onValueChange={(v) => change("genero", v)}>
                <SelectTrigger id="prereg-genero" className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder="Selecciona (opcional en BD; recomendado)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Tipo de sangre" error={errors.tipoSangre} htmlFor="prereg-ts">
              <Select
                value={form.tipoSangre ? form.tipoSangre : "__none__"}
                onValueChange={(v) => change("tipoSangre", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="prereg-ts" className={cn("h-11 rounded-xl bg-background", errors.tipoSangre && "border-destructive")}>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin especificar</SelectItem>
                  {TIPOS_SANGRE_OPCIONES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Nombre del padre, madre o tutor" htmlFor="prereg-pm" className="sm:col-span-2">
              <Input
                id="prereg-pm"
                value={form.nombrePadreMadre}
                onChange={(e) => change("nombrePadreMadre", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Opcional"
              />
            </FieldShell>
          </div>
        </StepCard>

        <StepCard
          step={2}
          title="Domicilio"
          description="Dónde podemos localizar o enviar correspondencia."
          icon={MapPin}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Calle y número" htmlFor="prereg-calle" className="sm:col-span-2">
              <Input
                id="prereg-calle"
                value={form.calle}
                onChange={(e) => change("calle", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Calle, número exterior e interior"
                autoComplete="street-address"
              />
            </FieldShell>
            <FieldShell label="Colonia" htmlFor="prereg-col">
              <Input
                id="prereg-col"
                value={form.colonia}
                onChange={(e) => change("colonia", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Colonia"
              />
            </FieldShell>
            <FieldShell label="Código postal" error={errors.cp} htmlFor="prereg-cp">
              <Input
                id="prereg-cp"
                value={form.cp}
                onChange={(e) => change("cp", e.target.value)}
                maxLength={8}
                inputMode="numeric"
                className={cn("h-11 rounded-xl bg-background", errors.cp && "border-destructive")}
                placeholder="5 dígitos (opcional)"
              />
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
            <FieldShell label="Municipio" htmlFor="prereg-mun">
              <Input
                id="prereg-mun"
                value={form.municipio}
                onChange={(e) => change("municipio", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Opcional"
              />
            </FieldShell>
          </div>
        </StepCard>

        <StepCard
          step={3}
          title="Contacto"
          description="Teléfonos y correo para comunicarnos contigo."
          icon={Phone}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Teléfono de casa" error={errors.telefonoCasa} htmlFor="prereg-tc">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-tc"
                  value={form.telefonoCasa}
                  onChange={(e) => change("telefonoCasa", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.telefonoCasa && "border-destructive")}
                  placeholder="10 dígitos (opcional)"
                  inputMode="tel"
                />
              </div>
            </FieldShell>
            <FieldShell label="Teléfono celular" required error={errors.telefonoCelular} htmlFor="prereg-tcel">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-tcel"
                  value={form.telefonoCelular}
                  onChange={(e) => change("telefonoCelular", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.telefonoCelular && "border-destructive")}
                  placeholder="10 dígitos"
                  inputMode="tel"
                />
              </div>
            </FieldShell>
            <FieldShell label="Correo electrónico" required error={errors.correoElectronico} htmlFor="prereg-mail" className="sm:col-span-2">
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
          </div>
        </StepCard>

        <StepCard
          step={4}
          title="Contacto de emergencia"
          description="Una persona a quien avisar si no podemos localizarte."
          icon={HeartPulse}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Nombre completo" error={errors.contactoEmergencia} htmlFor="prereg-ce">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-ce"
                  value={form.contactoEmergencia}
                  onChange={(e) => change("contactoEmergencia", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.contactoEmergencia && "border-destructive")}
                  placeholder="Opcional"
                />
              </div>
            </FieldShell>
            <FieldShell label="Teléfono" error={errors.telefonoEmergencia} htmlFor="prereg-te">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prereg-te"
                  value={form.telefonoEmergencia}
                  onChange={(e) => change("telefonoEmergencia", e.target.value)}
                  className={cn("h-11 rounded-xl bg-background pl-10", errors.telefonoEmergencia && "border-destructive")}
                  placeholder="10 dígitos (opcional)"
                  inputMode="tel"
                />
              </div>
            </FieldShell>
          </div>
        </StepCard>

        <StepCard
          step={5}
          title="Información clínica"
          description="Nos ayuda a orientar mejor el seguimiento."
          icon={Stethoscope}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Tipo de espina bífida" htmlFor="prereg-tipo">
              <Select value={form.tipo} onValueChange={(v) => change("tipo", v)}>
                <SelectTrigger id="prereg-tipo" className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder="Selecciona (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mielomeningocele">Mielomeningocele</SelectItem>
                  <SelectItem value="Meningocele">Meningocele</SelectItem>
                  <SelectItem value="Oculta">Oculta</SelectItem>
                  <SelectItem value="Lipomeningocele">Lipomeningocele</SelectItem>
                </SelectContent>
              </Select>
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
            <FieldShell label="Municipio de nacimiento" htmlFor="prereg-mn">
              <Input
                id="prereg-mn"
                value={form.municipioNacimiento}
                onChange={(e) => change("municipioNacimiento", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Opcional"
              />
            </FieldShell>
            <FieldShell label="Hospital de nacimiento" htmlFor="prereg-hn">
              <Input
                id="prereg-hn"
                value={form.hospitalNacimiento}
                onChange={(e) => change("hospitalNacimiento", e.target.value)}
                className="h-11 rounded-xl bg-background"
                placeholder="Opcional"
              />
            </FieldShell>
            <FieldShell label="Notas u observaciones" error={errors.notas} htmlFor="prereg-notas" className="sm:col-span-2">
              <Textarea
                id="prereg-notas"
                value={form.notas}
                onChange={(e) => change("notas", e.target.value)}
                rows={4}
                className={cn("rounded-xl bg-background resize-y min-h-[100px]", errors.notas && "border-destructive")}
                placeholder="Información adicional que consideres importante (opcional, máx. 500 caracteres)"
              />
            </FieldShell>
          </div>
        </StepCard>

        <div className="rounded-2xl border border-border/50 bg-card/90 p-6 text-center shadow-sm md:p-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Al enviar, confirmas que la información es verídica. Los datos se registran con el mismo criterio que en
            nuestras oficinas. Si necesitas corregir algo después, comunícate con la asociación.
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
