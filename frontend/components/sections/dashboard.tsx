"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Inbox, ClipboardList, Package, CalendarDays, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getInventario } from "@/services/inventario"
import { getBeneficiarios } from "@/services/beneficiarios"
import { conteosEstatusBeneficiarios, conteoSolicitudesPendientes } from "@/lib/beneficiarios-conteos"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts"

const INVENTARIO_BAJO_UMBRAL = 3

const monthlyData = [
  { mes: "Sep", atenciones: 65 },
  { mes: "Oct", atenciones: 78 },
  { mes: "Nov", atenciones: 90 },
  { mes: "Dic", atenciones: 55 },
  { mes: "Ene", atenciones: 72 },
  { mes: "Feb", atenciones: 83 },
]

const locationData = [
  { name: "Locales", value: 168, fill: "#005bb5" },
  { name: "Foráneos", value: 79, fill: "#eab308" },
]

/** Solo membresías activas (estatus Activo), mismo criterio que Beneficiarios. */
function MembresiasActivasCard({
  activosMembresia,
  loading,
}: {
  activosMembresia: number | null
  loading: boolean
}) {
  return (
    <Card className="shadow-sm border-border/60 relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Membresías
        </CardTitle>
        <div className="flex size-9 items-center justify-center rounded-lg shadow-sm bg-primary text-primary-foreground transition-colors duration-300">
          <UserCheck className="size-4" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {loading ? "—" : activosMembresia === null ? "--" : String(activosMembresia)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {loading ? "Cargando datos…" : "Membresías activas (estatus Activo, como en Beneficiarios)"}
        </p>
      </CardContent>
    </Card>
  )
}

export function DashboardSection() {
  const [activeBar, setActiveBar] = useState<{ mes: string; atenciones: number } | null>(null)
  const [inventarioBajoCount, setInventarioBajoCount] = useState<number | null>(null)

  // Beneficiarios desde la API
  const [activosMembresia, setActivosMembresia] = useState<number | null>(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number | null>(null)
  const [loadingBenef, setLoadingBenef] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Inventario
    getInventario()
      .then((items) => {
        if (cancelled) return
        const lowCount = items.filter((item) => Number(item.cantidad ?? 0) <= INVENTARIO_BAJO_UMBRAL).length
        setInventarioBajoCount(lowCount)
      })
      .catch(() => {
        if (cancelled) return
        setInventarioBajoCount(null)
      })

    getBeneficiarios()
      .then((beneficiarios) => {
        if (cancelled) return
        const c = conteosEstatusBeneficiarios(beneficiarios)
        setActivosMembresia(c.Activo)
        setSolicitudesPendientes(conteoSolicitudesPendientes(beneficiarios))
      })
      .catch(() => {
        if (cancelled) return
        setActivosMembresia(null)
        setSolicitudesPendientes(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingBenef(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const metricCards = useMemo(
    () => [
      {
        title: "Solicitudes pendientes",
        value: solicitudesPendientes === null ? "--" : String(solicitudesPendientes),
        description:
          solicitudesPendientes === null
            ? "Cargando beneficiarios…"
            : "Registros de posibles beneficiarios en espera de revisión (Preregistro)",
        icon: Inbox,
        color: "bg-amber-500 text-white",
        iconClassName: "",
      },
      {
        title: "Servicios del Mes",
        value: "83",
        description: "Cierre proyectado: Febrero",
        icon: ClipboardList,
        color: "bg-primary text-primary-foreground",
        iconClassName: "",
      },
      {
        title: "Inventario Bajo",
        value: inventarioBajoCount === null ? "--" : String(inventarioBajoCount),
        description:
          inventarioBajoCount === null
            ? "No se pudo cargar inventario"
            : `${inventarioBajoCount} ${inventarioBajoCount === 1 ? "artículo requiere" : "artículos requieren"} atención`,
        icon: Package,
        color: "bg-destructive text-destructive-foreground",
        iconClassName: "text-white",
      },
    ],
    [solicitudesPendientes, inventarioBajoCount]
  )

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen general del sistema de gestión.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-foreground">
            <CalendarDays className="size-4" />
            <span>Últimos 6 meses</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tarjeta especial de beneficiarios con slide */}
        <MembresiasActivasCard activosMembresia={activosMembresia} loading={loadingBenef} />

        {/* Tarjetas estáticas restantes */}
        {metricCards.map((card) => (
          <Card key={card.title} className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg shadow-sm ${card.color}`}>
                <card.icon className={`size-[18px] ${card.iconClassName ?? ""}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="shadow-sm border-border/60 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Atenciones Mensuales</CardTitle>
              <CardDescription>Volumen de servicios otorgados por mes</CardDescription>
            </div>
            <div className="text-right min-w-[60px]">
              {activeBar ? (
                <>
                  <p className="text-[10px] leading-none text-muted-foreground">{activeBar.mes}</p>
                  <p className="text-sm font-bold text-foreground leading-snug">{activeBar.atenciones} <span className="text-[10px] font-normal text-muted-foreground">atenciones</span></p>
                </>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  onMouseMove={(state) => {
                    if (state.isTooltipActive && state.activePayload?.[0]) {
                      setActiveBar(state.activePayload[0].payload)
                    }
                  }}
                  onMouseLeave={() => setActiveBar(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
                  <XAxis
                    dataKey="mes"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={() => null} cursor={{ fill: "rgba(0,0,0,0.06)" }} />
                  <Bar
                    dataKey="atenciones"
                    fill="#005bb5"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Locales vs Foráneos</CardTitle>
            <CardDescription>Distribución geográfica de beneficiarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={locationData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    position={{ x: 10, y: 10 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      color: "#0f172a",
                      opacity: 1,
                    }}
                    labelStyle={{ fontWeight: 600, color: "#0f172a" }}
                    itemStyle={{ color: "#0f172a" }}
                    isAnimationActive={false}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}