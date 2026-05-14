"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import {
  Moon, SunMedium, ArrowRight,
  ClipboardEdit, CalendarDays, Building2,
  HeartPulse, Target, Eye, HandHeart, CheckCircle2,
  Stethoscope, Heart, Phone, Mail, MapPin,
  CreditCard, ExternalLink, Quote,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { PublicPreregistroSection } from "@/components/public-preregistro-section"
import { RevealOnMount, RevealOnView } from "@/components/reveal-motion"

const AMBER = "#E8B043"
const NAVY  = "#0f4c81"

const PROCESS_STEPS = [
  {
    n: "01",
    icon: ClipboardEdit,
    title: "Registro en línea",
    desc: "Completa el formulario de pre-registro con los datos esenciales del beneficiario.",
    colCls: "md:pr-10",
  },
  {
    n: "02",
    icon: Building2,
    title: "Proceso de aprobación",
    desc: "Nuestro equipo revisa la solicitud, valida los datos y notifica la resolución en un plazo de 48 horas.",
    colCls: "md:px-10 md:border-l md:border-slate-200 dark:md:border-slate-700",
  },
  {
    n: "03",
    icon: CalendarDays,
    title: "Agendar cita e ir al centro",
    desc: "Una vez aprobado, el beneficiario agenda su primera cita y acude a nuestras instalaciones para comenzar su atención.",
    colCls: "md:pl-10 md:border-l md:border-slate-200 dark:md:border-slate-700",
  },
]

const COMMUNITY_FEATURES = [
  "Acceso inclusivo y accesible",
  "Atención personalizada y empática",
  "Equipo médico especializado",
  "Área de apoyo familiar",
]

const REGISTRATION_TRUST = [
  "Solo datos esenciales",
  "Sin compromiso",
  "Respuesta en 48 h",
]

const ESPINA_TYPES = [
  {
    title: "Espina Bífida Oculta",
    desc: "La forma más leve. La columna no cierra completamente pero la médula permanece intacta y sin exposición.",
    color: "#e8f4fd",
    textColor: NAVY,
    img: "/tipo-oculta.png",
  },
  {
    title: "Meningocele",
    desc: "Los meninges sobresalen a través de la abertura en la columna vertebral, generalmente sin daño nervioso.",
    color: "#d6eaf8",
    textColor: NAVY,
    img: "/tipo-meningocele.png",
  },
  {
    title: "Lipomielomeningocele",
    desc: "Una masa de grasa se conecta a la médula espinal a través de una abertura en la columna.",
    color: "#aed6f1",
    textColor: NAVY,
    img: "/tipo-lipomielomeningocele.png",
  },
  {
    title: "Mielomeningocele",
    desc: "La forma más severa: la médula espinal y los nervios se desarrollan fuera del cuerpo, requiriendo cirugía.",
    color: NAVY,
    textColor: "#ffffff",
    img: "/tipo-mielomeningocele.png",
  },
]

const DONORS = [
  "Laboratorios Dr. Moreira", "Christus Muguerza", "Uro-Pelvic Experts", "Médicolira",
  "Digraf", "Energex", "Fundación Maiz Velarde", "Fundación R. A. y J.A. Chapa González",
  "Treviño Elizondo", "Ox School", "GNP Seguros", "Fundación Promax",
  "Cemefi", "UTEL Universidad", "OXXO", "S-Mart",
  "BanBajío", "AFL", "Ternium", "Advenio",
  "La Salle Regio Country", "Viakable", "Kathion", "Lambi",
  "Prosesa", "Fundación de Beneficencia J.M. Montemayor",
]

export function PublicSiteHome() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  const isDark = mounted && resolvedTheme === "dark"

  const handleStartRegistration = useCallback(() => {
    setShowRegistrationForm(true)
    setTimeout(() => {
      document.getElementById("seccion-registro")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }, [])

  const scrollTo = useCallback((id: string, block: ScrollLogicalPosition = "start") => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block })
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-50">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">

          <RevealOnMount className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <Image
                src="/logo-espina-bifida.png"
                alt="Logo Espina Bífida"
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#0f4c81] dark:text-blue-400">
              Asociación de Espina Bífida
            </span>
          </RevealOnMount>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex dark:text-slate-400">
            <button onClick={() => scrollTo("mision", "center")}   className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Misión</button>
            <button onClick={() => scrollTo("espina-bifida")}      className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Espina Bífida</button>
            <button onClick={() => scrollTo("seccion-registro")}   className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Registro</button>
            <button onClick={() => scrollTo("proceso")}            className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Proceso</button>
            <button onClick={() => scrollTo("apoyanos")}           className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Apóyanos</button>
            <button onClick={() => scrollTo("contacto")}           className="transition-colors hover:text-[#0f4c81] dark:hover:text-blue-400">Contacto</button>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-md"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              style={{ backgroundColor: AMBER, color: "#ffffff" }}
              className="rounded-md px-5 text-sm font-bold shadow-sm hover:opacity-90"
              onClick={() => scrollTo("apoyanos")}
            >
              Donar ahora
            </Button>
          </div>

        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12">
          <div className="grid items-center gap-14 lg:grid-cols-2">

            {/* Left */}
            <RevealOnMount delay={60} className="flex flex-col items-start">
              <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-6xl dark:text-white">
                Apoyo integral<br />
                <span className="text-[#0f4c81] dark:text-blue-400">para cada familia</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-slate-500 dark:text-slate-400">
                Somos una asociación única en su tipo en México, dedicada a brindar servicios de asistencia en el área de la salud a personas con espina bífida desde 1993.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  style={{ backgroundColor: AMBER, color: "#ffffff" }}
                  className="rounded-md px-8 text-base font-bold shadow-sm hover:opacity-90"
                  onClick={handleStartRegistration}
                >
                  Iniciar pre-registro
                </Button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-medium text-[#0f4c81] hover:underline dark:text-blue-400"
                  onClick={() => scrollTo("mision", "center")}
                >
                  
                </button>
              </div>

              {/* Stats strip */}
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-100 pt-8 dark:border-slate-800">
                {[
                  { n: "30+",   label: "Años de experiencia" },
                  { n: "1,167", label: "Familias integradas"  },
                  { n: "8",     label: "Servicios activos"   },
                ].map(({ n, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-black" style={{ color: AMBER }}>{n}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </RevealOnMount>

            {/* Right – image with amber accent border */}
            <RevealOnMount delay={180} className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <img
                  src="./comunidad-apoyo.jpg"
                  alt="Imagen de familia recibiendo apoyo de la asociación"
                  className="h-full w-full object-cover"
                />
              </div>
            </RevealOnMount>

          </div>
        </section>

        {/* ── Mission – dark navy ───────────────────────────────── */}
        <section id="mision" className="bg-[#0f4c81] px-6 py-20 dark:bg-slate-900">
          <RevealOnView>
            <div className="mx-auto max-w-7xl lg:px-6">

              <div className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-white/10">
                <div className="md:pr-10">
                  <div className="mb-4 flex items-center gap-3">
                    <Target className="size-5" style={{ color: AMBER }} />
                    <h3 className="text-lg font-bold text-white">Misión</h3>
                  </div>
                  <p className="text-sm leading-7 text-blue-100">
                    Mejorar la calidad de vida de las personas con espina bífida y sus familias, a través de servicios integrales de salud, educación y desarrollo humano.
                  </p>
                </div>

                <div className="md:px-10">
                  <div className="mb-4 flex items-center gap-3">
                    <Eye className="size-5" style={{ color: AMBER }} />
                    <h3 className="text-lg font-bold text-white">Visión</h3>
                  </div>
                  <p className="text-sm leading-7 text-blue-100">
                    Ser una asociación líder y referente nacional en la atención integral de la espina bífida, reconocida por su calidad, calidez y compromiso social.
                  </p>
                </div>

                <div className="md:pl-10">
                  <div className="mb-4 flex items-center gap-3">
                    <HandHeart className="size-5" style={{ color: AMBER }} />
                    <h3 className="text-lg font-bold text-white">Valores</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2.5 text-sm text-blue-100">
                    {["Respeto", "Honestidad", "Compromiso", "Empatía", "Solidaridad", "Responsabilidad"].map((v) => (
                      <span key={v} className="flex items-center gap-2">
                        <span className="size-1 shrink-0 rounded-full" style={{ backgroundColor: AMBER }} />
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </RevealOnView>
        </section>

        {/* ── ¿Qué es la Espina Bífida? ────────────────────────── */}
        <section id="espina-bifida" className="scroll-mt-20 bg-[#f8faff] px-6 py-20 lg:px-12 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl">
            <RevealOnView>
              <div className="mb-14">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f4c81] dark:text-blue-400">
                  Información
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  ¿Qué es la <span className="text-[#0f4c81] dark:text-blue-400">Espina Bífida?</span>
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                  La espina bífida es una malformación congénita del tubo neural, que se caracteriza porque uno o varios arcos vertebrales posteriores no han fusionado correctamente durante la gestación y la médula espinal queda sin protección ósea.
                </p>
              </div>
            </RevealOnView>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ESPINA_TYPES.map(({ title, desc, color, textColor, img } : { title: string; desc: string; color: string; textColor: string; img?: string }, i: number) => (
                <RevealOnView key={title} delay={i * 80} className="h-full">
                  <div
                    className="flex h-full flex-col rounded-xl p-6"
                    style={{ backgroundColor: color }}
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/20">
                      <Stethoscope className="size-4" style={{ color: textColor === "#ffffff" ? "#ffffff" : NAVY }} />
                    </div>
                    <h3 className="mb-3 text-base font-bold leading-snug" style={{ color: textColor }}>{title}</h3>
                    <p className="text-sm leading-6" style={{ color: textColor === "#ffffff" ? "rgba(255,255,255,0.85)" : "#64748b" }}>{desc}</p>
                    {img && (
                      <div className="mt-auto w-full shrink-0 pt-4">
                        <div className="flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl">
                          <img
                            src={img}
                            alt={title}
                            className="h-full w-full object-contain p-3"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </RevealOnView>
              ))}
            </div>

          </div>
        </section>

        {/* ── Registration ─────────────────────────────────────── */}
        <section id="seccion-registro" className="scroll-mt-24 px-6 py-20 lg:px-12">
          <div className="mx-auto w-full max-w-3xl">
            <RevealOnView>
              {!showRegistrationForm ? (
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-blue-50 text-[#0f4c81] dark:bg-slate-800 dark:text-blue-400">
                    <HeartPulse className="size-7" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                    Inicia tu pre-registro
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                    Si deseas vincular a una persona beneficiaria, puedes iniciar el proceso aquí. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo.
                  </p>
                  <Button
                    size="lg"
                    style={{ backgroundColor: NAVY, color: "#ffffff" }}
                    className="mt-8 rounded-md px-10 text-base font-bold shadow-sm hover:opacity-90"
                    onClick={handleStartRegistration}
                  >
                    Llenar solicitud
                  </Button>
                  <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-400 dark:text-slate-500">
                    {REGISTRATION_TRUST.map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" style={{ color: AMBER }} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <RevealOnMount delay={80}>
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-10 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0f4c81] dark:text-blue-400">
                        Formulario de pre-registro
                      </p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Pre-registro de beneficiario
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        Solo los datos esenciales. El expediente completo se puede ampliar después con el equipo.
                      </p>
                    </div>
                    <PublicPreregistroSection
                      embedded
                      hideIntro
                      scrollTargetOnSuccess="seccion-registro"
                    />
                  </div>
                </RevealOnMount>
              )}
            </RevealOnView>
          </div>
        </section>

        {/* ── Process ──────────────────────────────────────────── */}
        <section id="proceso" className="bg-[#f8faff] px-6 py-20 lg:px-12 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl">

            <RevealOnView>
              <div className="mb-14">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f4c81] dark:text-blue-400">
                  Cómo funciona
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Tu camino con nosotros
                </h2>
              </div>
            </RevealOnView>

            <div className="grid gap-10 md:grid-cols-3 md:gap-0">
              {PROCESS_STEPS.map(({ n, icon: Icon, title, desc, colCls }, i) => (
                <RevealOnView key={n} delay={i * 100}>
                  <div className={`relative flex flex-col border-t-2 pt-8 ${colCls}`} style={{ borderTopColor: "#E8B043" }}>
                    <span
                      className="absolute -top-[5px] left-0 size-2.5 rounded-full"
                      style={{ backgroundColor: "#E8B043" }}
                    />
                    <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "#E8B043" }}>{n}</p>
                    <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <Icon className="size-5 text-[#0f4c81] dark:text-blue-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">{desc}</p>
                  </div>
                </RevealOnView>
              ))}
            </div>

          </div>
        </section>

        {/* ── Community ────────────────────────────────────────── */}
        <section id="instalaciones" className="px-6 py-20 lg:px-12">
          <RevealOnView>
            <div className="mx-auto max-w-7xl">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f4c81] dark:text-blue-400">
                    Comunidad
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Nuestras instalaciones
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Contamos con un espacio diseñado pensando en la accesibilidad y la comodidad de nuestros beneficiarios y sus familias, donde encontrarán un ambiente acogedor y profesional.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {COMMUNITY_FEATURES.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-slate-800">
                          <CheckCircle2 className="size-3" style={{ color: AMBER }} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src="/consulta-medica.jpg"
                      className="h-full w-full object-cover"
                      alt="Consulta médica con familia"
                      loading="lazy"
                    />
                  </div>
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src="/beneficiaria-silla.jpg"
                      className="h-full w-full object-cover object-top"
                      alt="Beneficiaria recibiendo atención"
                      loading="lazy"
                    />
                  </div>
                </div>

              </div>
            </div>
          </RevealOnView>
        </section>

        {/* ── Apóyanos ─────────────────────────────────────────── */}
        <section id="apoyanos" className="scroll-mt-20 bg-[#0f4c81] px-6 py-20 lg:px-12 dark:bg-slate-900">
          <RevealOnView>
            <div className="mx-auto max-w-7xl">

              <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">

                {/* Left – text + quote */}
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    Con tu apoyo cambiamos<br />
                    <span style={{ color: AMBER }}>vidas completas</span>
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-blue-100">
                    Con tu apoyo puedes contribuir a mejorar la calidad de vida de las familias y niños que padecen espina bífida. Necesitamos de tu ayuda para mantener el contacto con la gente que necesita un lugar en donde encontrar apoyo y colaboración.
                  </p>

                  <div className="relative mt-8 rounded-2xl border border-white/20 bg-white/10 p-8">
                    <Quote className="mb-4 size-8 opacity-40" style={{ color: AMBER }} />
                    <blockquote className="text-base leading-8 text-blue-50 italic">
                      "Ver cómo los pacientes van recuperándose y las familias comienzan a tener calma y esperanza de nuevo cuando les brindamos ayuda. Si cambiamos una vida, cambiamos familias completas."
                    </blockquote>
                    <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-6">
                      <div className="size-12 shrink-0 overflow-hidden rounded-full">
                        <img src="/bertha-garza.png" alt="Bertha Alicia Garza Treviño" className="h-full w-full object-cover mix-blend-luminosity" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Bertha Alicia Garza Treviño</p>
                        <p className="text-xs text-blue-200">Fundadora</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right – payment options */}
                <div className="flex flex-col justify-center space-y-4">
                  {/* PayPal */}
                  <a
                    href="https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=7GBV72MMBQG7S&source=url"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl border border-white/20 bg-white/10 p-5 transition-colors hover:bg-white/20"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-2">
                        <img src="/paypal-logo.svg" alt="PayPal" className="h-full w-full object-contain" />
                      </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">Donar con PayPal</p>
                      <p className="text-xs text-blue-200">Donación segura en línea</p>
                    </div>
                    <ExternalLink className="size-4 text-blue-200" />
                  </a>

                  {/* Banorte */}
                  <div className="rounded-xl border border-white/20 bg-white/10 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                          <img src="/banorte-logo.png" alt="Banorte" className="h-full w-full object-contain" />
                        </div>
                      <div>
                        <p className="font-bold text-white">Transferencia Banorte</p>
                        <p className="text-xs text-blue-200">Banorte banco</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 rounded-lg bg-white/10 p-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-blue-200">Número de cuenta</span>
                        <span className="font-mono font-bold text-white">0001617086-5</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-blue-200">CLABE</span>
                        <span className="font-mono font-bold text-white">072 580 00016170865 0</span>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-xs font-bold tracking-wider" style={{ color: AMBER }}>
                      CONTAMOS CONTIGO
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </RevealOnView>
        </section>

        {/* ── Donantes ─────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-12">
          <RevealOnView>
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f4c81] dark:text-blue-400">Gracias a ellos es posible</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nuestros Donantes</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {DONORS.map((donor) => (
                  <span
                    key={donor}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {donor}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnView>
        </section>

      </main>

      {/* ── Footer / Contacto ────────────────────────────────── */}
      <footer id="contacto" className="scroll-mt-20 border-t border-slate-100 bg-[#f8faff] dark:border-slate-800 dark:bg-slate-900">

        {/* Contact strip */}
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">

            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0f4c81]">
                  <Image src="/logo-espina-bifida.png" alt="Logo" width={32} height={32} className="h-full w-full object-contain" />
                </div>
                <span className="font-bold text-[#0f4c81] dark:text-blue-400">Asociación de Espina Bífida</span>
              </div>
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                Asociación de Espina Bífida de Nuevo León, A.B.P.<br />
                La inclusión no es un favor, es un derecho.
              </p>
              <div className="mt-5 flex gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full bg-[#0f4c81] text-white transition-opacity hover:opacity-80">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full bg-[#0f4c81] text-white transition-opacity hover:opacity-80">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://wa.me/528182542033" target="_blank" rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white transition-opacity hover:opacity-80">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Contacto</h3>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#0f4c81]" />
                  <span>J. Villagrán #344 Sur, Col. Centro, Monterrey, N.L., C.P. 64000<br />(Entre Washington y 5 de Mayo)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-[#0f4c81]" />
                  <a href="mailto:espinabifidanl@yahoo.com.mx" className="hover:text-[#0f4c81]">espinabifidanl@yahoo.com.mx</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-[#0f4c81]" />
                  <span>T: 81 1099 0168 · C: 81 8254 2033</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Donar ahora</h3>
              <p className="mb-4 text-xs leading-6 text-slate-500 dark:text-slate-400">
                Tu donación hace posible que más familias reciban atención integral.
              </p>
              <Button
                style={{ backgroundColor: AMBER, color: "#ffffff" }}
                className="w-full rounded-md font-bold shadow-sm hover:opacity-90"
                onClick={() => scrollTo("apoyanos")}
              >
                <Heart className="mr-2 size-4" />
                Ver opciones de donación
              </Button>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-5 text-xs text-slate-400 md:flex-row lg:px-12">
            <p>© {new Date().getFullYear()} Asociación de Espina Bífida de Nuevo León, A.B.P. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-[#0f4c81]">Privacidad</a>
              <a href="#" className="transition-colors hover:text-[#0f4c81]">Accesibilidad</a>
            </div>
          </div>
        </div>

      </footer>

    </div>
  )
}
