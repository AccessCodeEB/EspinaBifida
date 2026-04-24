import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const VALID_PANEL_SECTIONS = new Set([
  "dashboard",
  "beneficiarios",
  "membresias",
  "servicios",
  "inventario",
  "citas",
  "reportes",
  "preregistro",
])

/** Rutas “limpias” → panel con `?section=…` */
const SECTION_BY_PATH: Record<string, string> = {
  "/beneficiarios": "beneficiarios",
  "/membresias": "membresias",
  "/servicios": "servicios",
  "/inventario": "inventario",
  "/citas": "citas",
  "/reportes": "reportes",
  "/preregistro": "preregistro",
  "/dashboard": "dashboard",
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Antes el panel vivía en `/?section=…`; ahora es `/panel?section=…`
  if (path === "/") {
    const s = request.nextUrl.searchParams.get("section")
    if (s && VALID_PANEL_SECTIONS.has(s)) {
      const url = request.nextUrl.clone()
      url.pathname = "/panel"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const section = SECTION_BY_PATH[path]
  if (!section) {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = "/panel"
  url.searchParams.set("section", section)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/",
    "/beneficiarios",
    "/membresias",
    "/servicios",
    "/inventario",
    "/citas",
    "/reportes",
    "/preregistro",
    "/dashboard",
  ],
}
