"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Moon, SunMedium, ArrowRight, ClipboardEdit, CalendarDays, Building2, HeartPulse } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { PublicPreregistroSection } from "@/components/public-preregistro-section"
import { RevealOnMount, RevealOnView } from "@/components/reveal-motion"
// @ts-expect-error: Ignora la falta de tipos ya que GradualBlur es un componente JS
import GradualBlur from "@/components/ui/gradual-blur"

export function PublicSiteHome() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const isDark = mounted && resolvedTheme === "dark"

  const handleStartRegistration = useCallback(() => {
    setShowRegistrationForm(true)
    setTimeout(() => {
      document.getElementById("seccion-registro")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 font-sans dark:bg-slate-950 dark:text-slate-50">
      
      {/* Navegación */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md md:px-12 dark:border-slate-800 dark:bg-slate-950/80">
        <RevealOnMount className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image
                src="/logo-espina-bifida.png"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight text-[#0f4c81] dark:text-blue-400">Asociación de Espina Bífida</p>
            </div>
          </div>
          
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#mision" className="transition-colors hover:text-[#0f4c81]">Misión</a>
            <a href="#seccion-registro" className="transition-colors hover:text-[#0f4c81]">Registro</a>
            <a href="#proceso" className="transition-colors hover:text-[#0f4c81]">Proceso</a>
            <a href="#instalaciones" className="transition-colors hover:text-[#0f4c81]">Comunidad</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full transition-opacity duration-500"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button 
              className="rounded-full bg-[#0f4c81] px-6 text-white transition-all duration-300 hover:bg-[#0a365c]"
              onClick={handleStartRegistration}
            >
              Pre-registro
            </Button>
          </div>
        </RevealOnMount>
      </header>

      <main className="flex-1">
        {/* Sección Hero */}
        <section className="mx-auto w-full max-w-7xl px-6 py-12 md:py-20 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <RevealOnMount delay={70} className="flex flex-col items-start text-left">
              <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.1] dark:text-white">
                Apoyando cada paso de tu camino
              </h1>
              <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Únete a una comunidad dedicada al cuidado de la Espina Bífida, ofreciendo apoyo empático, recursos esenciales y un entorno acogedor para familias e individuos.
              </p>
              <Button
                size="lg"
                className="mt-8 rounded-full bg-[#0f4c81] px-8 text-base text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#0a365c]"
                onClick={handleStartRegistration}
              >
                Iniciar pre-registro
              </Button>
            </RevealOnMount>
            
            <RevealOnMount delay={180} className="relative mx-auto w-full">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop"
                  alt="Instalaciones de la asociación"
                  className="h-full w-full object-cover"
                />
                {/* Gradual Blur superpuesto en la imagen */}
                <GradualBlur
                  target="parent"
                  position="bottom"
                  height="8rem"
                  strength={3}
                  divCount={6}
                  curve="bezier"
                  exponential
                  opacity={1}
                />
              </div>
            </RevealOnMount.
          </div>
        </section>

        {/* Sección 1: Misión, Visión y Valores */}
<section id="mision" className="bg-white px-6 py-20 dark:bg-slate-950">
  <RevealOnView>
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        
        {/* MISIÓN */}
        <div className="flex gap-5 border-b border-slate-200 pb-6 dark:border-slate-700 md:border-b-0 md:border-r md:pb-0 md:pr-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-3xl dark:bg-slate-800">
            <Target className="h-8 w-8 text-[#0f4c81]" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-[#0f4c81] dark:text-white">
              Misión
            </h3>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Mejorar la calidad de vida de las personas con espina bífida y sus familias, a través de servicios integrales de salud, educación y desarrollo humano.
            </p>
          </div>
        </div>

        {/* VISIÓN */}
        <div className="flex gap-5 border-b border-slate-200 pb-6 dark:border-slate-700 md:border-b-0 md:border-r md:pb-0 md:pr-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-3xl dark:bg-slate-800">
            <Eye className="h-8 w-8 text-[#0f4c81]" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-[#0f4c81] dark:text-white">
              Visión
            </h3>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Ser una asociación líder y referente nacional en la atención integral de la espina bífida, reconocida por su calidad, calidez y compromiso social.
            </p>
          </div>
        </div>

        {/* VALORES */}
        <div className="flex gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-3xl dark:bg-slate-800">
            <HandHeart className="h-8 w-8 text-[#0f4c81]" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-[#0f4c81] dark:text-white">
              Valores
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span>● Respeto</span>
              <span>● Honestidad</span>
              <span>● Compromiso</span>
              <span>● Empatía</span>
              <span>● Solidaridad</span>
              <span>● Responsabilidad</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </RevealOnView>
</section>

        {/* Sección 2: Registro Centrado */}
        <section id="seccion-registro" className="scroll-mt-24 bg-white px-6 py-20 lg:px-12 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-4xl">
            <RevealOnView>
            {!showRegistrationForm ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-12 text-center shadow-xl md:p-20 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-blue-100 text-[#0f4c81] dark:bg-slate-800 dark:text-blue-400">
                  <HeartPulse className="size-8" />
                </div>
                <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-[#0f4c81] dark:text-white">
                  Estamos para acompañarte
                </h2>
                <p className="mb-8 max-w-2xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                  Si deseas vincular a una persona beneficiaria, puedes iniciar el proceso aquí. Haz clic en el botón a continuación para llenar tus datos y agendar tu primera cita. Nuestro equipo se pondrá en contacto contigo.
                </p>
                <Button 
                  size="lg" 
                  className="rounded-full bg-[#0f4c81] px-10 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#0a365c]"
                  onClick={handleStartRegistration}
                >
                  ¡Agenda tu cita!
                </Button>
              </div>
            ) : (
              // Transición mejorada para el formulario (smooth fade-in y slide-up)
              <RevealOnMount delay={100}>
                <div className="animate-in fade-in slide-in-from-bottom-8 zoom-in-[0.98] duration-1000 ease-out fill-mode-both">
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#0f4c81] dark:text-white">
                      Pre-registro de beneficiario
                    </h2>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                      Mismos datos que en la asociación. Si necesitas corregir algo después de enviar, comunícate con nosotros y conserva tu CURP.
                    </p>
                  </div>
                  {/* Contenedor del formulario centrado con fondo celestito */}
                  <div className="mx-auto overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-2xl dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                    <div className="p-6 md:p-10">
                      <PublicPreregistroSection 
                        embedded 
                        hideIntro 
                        scrollTargetOnSuccess="seccion-registro" 
                      />
                    </div>
                  </div>
                </div>
              </RevealOnMount>
            )}
            </RevealOnView>
          </div>
        </section>

        {/* Sección 3: El Proceso */}
<section id="proceso" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12">
  <RevealOnView>
    <div className="mb-14 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-[#0f4c81] sm:text-4xl dark:text-white">
        Tu camino con nosotros
      </h2>
      <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-[#f6b21a]" />
    </div>
  </RevealOnView>

  <div className="grid gap-8 md:grid-cols-3">
    <RevealOnView delay={0}>
      <div className="group relative h-full overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#eef7ff] to-white p-10 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <span className="pointer-events-none absolute right-4 top-4 text-[10rem] font-black leading-none text-[#dbeafe]">
          1
        </span>

        <div className="relative z-10">
          <div className="mb-20 flex size-16 items-center justify-center rounded-2xl bg-[#0f4c81] text-white shadow-lg transition group-hover:scale-110">
            <ClipboardEdit className="size-8" />
          </div>

          <h3 className="mb-4 text-2xl font-bold text-slate-950 dark:text-white">
            Registro en línea
          </h3>

          <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
            Completa el formulario de pre-registro para que podamos conocer tu caso y crear tu expediente inicial.
          </p>
        </div>
      </div>
    </RevealOnView>

    <RevealOnView delay={120}>
      <div className="group relative h-full overflow-hidden rounded-[2rem] border border-yellow-100 bg-gradient-to-br from-[#fff4d8] to-white p-10 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <span className="pointer-events-none absolute right-4 top-4 text-[10rem] font-black leading-none text-[#fde68a]">
          2
        </span>

        <div className="relative z-10">
          <div className="mb-20 flex size-16 items-center justify-center rounded-2xl bg-[#f6b21a] text-[#0f4c81] shadow-lg transition group-hover:scale-110">
            <CalendarDays className="size-8" />
          </div>

          <h3 className="mb-4 text-2xl font-bold text-slate-950 dark:text-white">
            Reservar cita
          </h3>

          <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
            Nuestro equipo se contactará contigo para agendar una consulta inicial y evaluar tus necesidades médicas y de apoyo.
          </p>
        </div>
      </div>
    </RevealOnView>

    <RevealOnView delay={240}>
      <div className="group relative h-full overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#eef7ff] to-white p-10 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <span className="pointer-events-none absolute right-4 top-4 text-[10rem] font-black leading-none text-[#dbeafe]">
          3
        </span>

        <div className="relative z-10">
          <div className="mb-20 flex size-16 items-center justify-center rounded-2xl bg-[#64748b] text-white shadow-lg transition group-hover:scale-110">
            <Building2 className="size-8" />
          </div>

          <h3 className="mb-4 text-2xl font-bold text-slate-950 dark:text-white">
            Visita la sede
          </h3>

          <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
            Te esperamos en nuestras instalaciones físicas, diseñadas 100% pensando en la accesibilidad y tu comodidad.
          </p>
        </div>
      </div>
    </RevealOnView>
  </div>
</section>

        {/* Sección 4: Instalaciones y Comunidad */}
        <section id="instalaciones" className="bg-[#f8fafc] py-20 dark:bg-slate-900">
          <RevealOnView>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
              <h2 className="mb-10 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Nuestras Instalaciones y Comunidad
              </h2>
              <div className="grid h-auto gap-4 md:h-[500px] md:grid-cols-4 md:grid-rows-2">
                <div className="group relative col-span-1 overflow-hidden rounded-3xl bg-[#134e4a] md:col-span-2 md:row-span-2">
                  <img src="https://images.unsplash.com/photo-1529156069898-49953eb1b5ce?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105" alt="Comunidad" />
                  <GradualBlur target="parent" position="bottom" height="6rem" strength={1.5} divCount={4} opacity={1} />
                  <div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
                    <h3 className="mb-2 text-2xl font-bold text-white">Comunidad de Apoyo</h3>
                    <p className="text-teal-100">Un espacio seguro para compartir y crecer juntos.</p>
                  </div>
                </div>
                <div className="relative hidden overflow-hidden rounded-3xl bg-slate-800 md:col-span-2 md:block group">
                  <img src="https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105" alt="Atención" />
                </div>
                <div className="flex overflow-hidden rounded-3xl bg-[#0f766e] p-6 text-center items-center justify-center transition-colors hover:bg-[#0d645e]">
                  <p className="font-medium text-white">Atención Empática</p>
                </div>
                <div className="group flex cursor-pointer flex-col justify-end overflow-hidden rounded-3xl bg-[#1e3a8a] p-6 transition-colors duration-300 hover:bg-[#1e40af]">
                  <p className="mb-4 text-lg font-medium text-white">Ver más</p>
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white transition-all duration-300 group-hover:bg-white group-hover:text-[#1e3a8a]">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </RevealOnView>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
        <RevealOnView rootMargin="0px 0px 0px 0px">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-slate-500 md:flex-row lg:px-12">
            <div className="text-center md:text-left">
              <p className="mb-1 font-bold text-[#0f4c81] dark:text-blue-400">Asociación de Espina Bífida</p>
              <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-[#0f4c81]">Privacidad</a>
              <a href="#" className="transition-colors hover:text-[#0f4c81]">Accesibilidad</a>
              <a href="#" className="transition-colors hover:text-[#0f4c81]">Contacto</a>
            </div>
          </div>
        </RevealOnView>
      </footer>
    </div>
  )
}
