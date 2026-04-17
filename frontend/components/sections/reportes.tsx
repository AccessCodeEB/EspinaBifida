"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  FileSpreadsheet,
  Download,
  Users,
  CreditCard,
  ClipboardList,
  Package,
  CalendarDays,
  Eye,
  Printer,
  TrendingUp,
  BarChart3,
} from "lucide-react"

const reportTypes = [
  {
    id: "beneficiarios",
    title: "Reporte de Beneficiarios",
    description: "Listado completo de beneficiarios con datos demograficos",
    icon: Users,
    fields: ["Folio", "Nombre", "Estado", "Ciudad", "Tipo", "Membresia"],
  },
  {
    id: "membresias",
    title: "Reporte de Membresias",
    description: "Estado de membresias activas, por vencer y vencidas",
    icon: CreditCard,
    fields: ["Folio", "Beneficiario", "Fecha Inicio", "Fecha Vencimiento", "Estado", "Monto"],
  },
  {
    id: "servicios",
    title: "Reporte de Servicios",
    description: "Historial de servicios prestados por periodo",
    icon: ClipboardList,
    fields: ["Fecha", "Folio", "Beneficiario", "Servicio", "Monto", "Voluntario"],
  },
  {
    id: "inventario",
    title: "Reporte de Inventario",
    description: "Stock actual y movimientos de productos",
    icon: Package,
    fields: ["Clave", "Descripcion", "Unidad", "Existencia", "Ultimo Movimiento"],
  },
  {
    id: "citas",
    title: "Reporte de Citas",
    description: "Agenda de citas por especialista y periodo",
    icon: CalendarDays,
    fields: ["Fecha", "Hora", "Beneficiario", "Especialista", "Estado"],
  },
  {
    id: "estadisticas",
    title: "Reporte Estadistico",
    description: "Resumen estadistico de atencion mensual/anual",
    icon: BarChart3,
    fields: ["Periodo", "Beneficiarios Atendidos", "Servicios", "Ingresos", "Citas"],
  },
]

const generatedReports = [
  { id: 1, name: "Beneficiarios_Marzo_2024.pdf", type: "beneficiarios", date: "2024-03-15", size: "245 KB" },
  { id: 2, name: "Membresias_Q1_2024.xlsx", type: "membresias", date: "2024-03-10", size: "128 KB" },
  { id: 3, name: "Servicios_Febrero_2024.pdf", type: "servicios", date: "2024-03-01", size: "312 KB" },
  { id: 4, name: "Inventario_Marzo_2024.xlsx", type: "inventario", date: "2024-03-20", size: "89 KB" },
  { id: 5, name: "Estadisticas_Anual_2023.pdf", type: "estadisticas", date: "2024-01-15", size: "567 KB" },
]

// Sample data for preview
const sampleBeneficiariosData = [
  { folio: "B-001", nombre: "Maria Garcia Lopez", estado: "Jalisco", ciudad: "Guadalajara", tipo: "Mielomeningocele", membresia: "Activa" },
  { folio: "B-002", nombre: "Juan Rodriguez Martinez", estado: "CDMX", ciudad: "Coyoacan", tipo: "Meningocele", membresia: "Activa" },
  { folio: "B-003", nombre: "Ana Fernandez Ruiz", estado: "Nuevo Leon", ciudad: "Monterrey", tipo: "Mielomeningocele", membresia: "Por vencer" },
  { folio: "B-004", nombre: "Carlos Sanchez Diaz", estado: "Puebla", ciudad: "Puebla", tipo: "Oculta", membresia: "Vencida" },
  { folio: "B-005", nombre: "Laura Martinez Gomez", estado: "Jalisco", ciudad: "Zapopan", tipo: "Mielomeningocele", membresia: "Activa" },
]

export function ReportesSection() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("mes-actual")
  const [selectedFormat, setSelectedFormat] = useState("pdf")
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = () => {
    setIsGenerating(true)
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false)
      setShowPreview(true)
    }, 1500)
  }

  const currentReport = reportTypes.find(r => r.id === selectedReport)

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Seleccionar Tipo de Reporte</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                selectedReport === report.id ? "border-2 border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex size-12 items-center justify-center rounded-lg ${
                    selectedReport === report.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <report.icon className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{report.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report Configuration */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5" />
              Configurar Reporte: {currentReport?.title}
            </CardTitle>
            <CardDescription>
              Selecciona el periodo y formato de exportacion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="periodo" className="text-base font-medium">Periodo</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="periodo" className="h-12 text-base">
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes-actual">Mes Actual</SelectItem>
                    <SelectItem value="mes-anterior">Mes Anterior</SelectItem>
                    <SelectItem value="trimestre">Ultimo Trimestre</SelectItem>
                    <SelectItem value="semestre">Ultimo Semestre</SelectItem>
                    <SelectItem value="anual">Anual 2024</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formato" className="text-base font-medium">Formato</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger id="formato" className="h-12 text-base">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-red-500" />
                        PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-green-600" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-blue-500" />
                        CSV
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3 sm:col-span-2">
                <Button 
                  size="lg" 
                  className="h-12 flex-1 text-base"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>Generando...</>
                  ) : (
                    <>
                      <Eye className="mr-2 size-5" />
                      Vista Previa
                    </>
                  )}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 flex-1 text-base"
                  disabled={isGenerating}
                >
                  <Download className="mr-2 size-5" />
                  Descargar
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 text-base"
                  disabled={isGenerating}
                >
                  <Printer className="size-5" />
                </Button>
              </div>
            </div>

            {/* Fields Preview */}
            <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Campos incluidos en el reporte:</p>
              <div className="flex flex-wrap gap-2">
                {currentReport?.fields.map((field) => (
                  <Badge key={field} variant="secondary" className="text-sm">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5" />
            Reportes Generados Recientemente
          </CardTitle>
          <CardDescription>
            Historial de reportes generados para descargar nuevamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Nombre del Archivo</TableHead>
                <TableHead className="text-base">Tipo</TableHead>
                <TableHead className="text-base">Fecha</TableHead>
                <TableHead className="text-base">Tamano</TableHead>
                <TableHead className="text-right text-base">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {report.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-6" />
              Vista Previa: {currentReport?.title}
            </DialogTitle>
            <DialogDescription>
              Periodo: {selectedPeriod === "mes-actual" ? "Marzo 2024" : selectedPeriod} | Formato: {selectedFormat.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {currentReport?.fields.map((field) => (
                    <TableHead key={field} className="font-semibold">{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleBeneficiariosData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.folio}</TableCell>
                    <TableCell>{row.nombre}</TableCell>
                    <TableCell>{row.estado}</TableCell>
                    <TableCell>{row.ciudad}</TableCell>
                    <TableCell>{row.tipo}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          row.membresia === "Activa" ? "default" : 
                          row.membresia === "Por vencer" ? "secondary" : "destructive"
                        }
                      >
                        {row.membresia}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="lg" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            <Button size="lg">
              <Download className="mr-2 size-5" />
              Descargar {selectedFormat.toUpperCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
