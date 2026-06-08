"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Error desconocido" }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: "" })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Algo salió mal en esta sección</p>
          <p className="text-xs text-muted-foreground">Intenta recargar o navega a otra sección y regresa.</p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </button>
      </div>
    )
  }
}
