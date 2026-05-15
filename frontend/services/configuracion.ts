import { apiClient } from "@/lib/api-client"

export interface CuentaBancaria {
  banco:        string | null
  numeroCuenta: string | null
  clabe:        string | null
}

export interface ResumenFinanciero {
  mes:              string
  mesAnterior:      string
  totalActual:      number
  totalAnterior:    number
  porcentajeCambio: number
  cantidadPagos:    number
  desglosePorMetodo: {
    efectivo:      number
    transferencia: number
    tarjeta:       number
  }
}

export interface TipoServicio {
  idTipoServicio: number
  nombre:         string
  descripcion:    string | null
  montoSugerido:  number | null
}

export interface Especialista {
  id:           number
  nombre:       string
  especialidad: string | null
  label:        string
}

export function getConfiguracion() {
  return apiClient.get<Record<string, string>>("/configuracion")
}

export function getCuentasBancarias() {
  return apiClient.get<CuentaBancaria>("/configuracion/cuentas-bancarias")
}

export function getResumenFinanciero(mes?: string) {
  const q = mes ? `?mes=${mes}` : ""
  return apiClient.get<ResumenFinanciero>(`/configuracion/resumen-financiero${q}`)
}

export function getTiposServicio() {
  return apiClient.get<TipoServicio[]>("/servicios-catalogo")
}

export function getEspecialistas() {
  return apiClient.get<Especialista[]>("/especialistas")
}
