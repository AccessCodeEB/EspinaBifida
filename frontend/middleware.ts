import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** Rutas que la app solo resolvía en `/` con estado local; sin esto Next devuelve 404. */
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

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const section = SECTION_BY_PATH[path]
  if (!section) {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = "/"
  url.searchParams.set("section", section)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
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
