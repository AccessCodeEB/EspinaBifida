"use client"

import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Layers3,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const NAVY = "#0f4c81"
const PIE_COLORS = ["#005bb5", "#eab308", "#ef4444", "#10b981", "#9333ea", "#fb923c", "#14b8a6"]

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value)
}

interface MonthlyBarEntry {
  mes: string
  mesClave: string
  monto: number
}

interface DonutEntry {
  name: string
  value: number
  fill: string
}

interface ServiciosChartsKpisProps {
  selectedMonth: string
  monthInputToLabel: (key: string) => string

  totalMes: number
  montoMes: number
  pendientesMes: number
  tiposDistintosMes: number
  topTipoMes: { label: string; value: number }

  monthlyBarData: MonthlyBarEntry[]
  donutData: DonutEntry[]
}

export function ServiciosChartsKpis({
  selectedMonth,
  monthInputToLabel,
  totalMes,
  montoMes,
  pendientesMes,
  tiposDistintosMes,
  topTipoMes,
  monthlyBarData,
  donutData,
}: ServiciosChartsKpisProps) {
  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Servicios del mes",   value: totalMes,               sub: `Período: ${monthInputToLabel(selectedMonth)}`,          icon: ClipboardList,    color: NAVY      },
          { label: "Monto completado del mes", value: formatMoney(montoMes),  sub: "Solo servicios con estatus completado",                  icon: CircleDollarSign, color: "#10b981" },
          { label: "Pendientes",          value: pendientesMes,          sub: "Servicios con estatus pendiente",                        icon: AlertTriangle,    color: "#f59e0b" },
          { label: "Tipos distintos",     value: tiposDistintosMes,      sub: `Top: ${topTipoMes.label} (${topTipoMes.value})`,          icon: Layers3,         color: "#e11d48" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon className="size-3.5" style={{ color }} />
              </div>
            </div>
            <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">{value}</span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Bar chart */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:col-span-4">
          <div className="border-b border-border/40 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Monto por mes</p>
            <p className="text-[11px] text-muted-foreground">Últimos 6 meses con base en el mes seleccionado</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <div className="h-[260px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={55}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => {
                      if (value >= 1000) return `$${(value / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k`
                      return `$${value}`
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatMoney(Number(value))}
                    labelFormatter={(label) => `Mes: ${label}`}
                    cursor={{ fill: "rgba(0,0,0,0.06)" }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--card-foreground)",
                    }}
                    labelStyle={{ color: "var(--card-foreground)" }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                  />
                  <Bar dataKey="monto" fill="#005bb5" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {monthlyBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.mesClave === selectedMonth ? "#ef4444" : "#005bb5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie/Donut chart */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:col-span-3">
          <div className="border-b border-border/40 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Servicios por tipo</p>
            <p className="text-[11px] text-muted-foreground">Distribución del mes seleccionado</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <div className="flex h-[260px] w-full items-center justify-center [&_.recharts-legend-item-text]:!text-foreground">
              {donutData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos en este mes.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, item) => [`${value}`, item.payload.name]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        color: "var(--card-foreground)",
                      }}
                      labelStyle={{ fontWeight: 600, color: "var(--card-foreground)" }}
                      itemStyle={{ color: "var(--card-foreground)" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={56}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "15px", lineHeight: "2" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
