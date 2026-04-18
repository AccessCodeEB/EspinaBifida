# Arquitectura del Frontend — Cáritas Monterrey

Este proyecto es una aplicación **Next.js 16 (App Router)** orientada exclusivamente al frontend.  
Se conecta a un backend externo en **JavaScript con base de datos Oracle** a través de una capa de servicios centralizada.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui + Radix UI |
| Íconos | lucide-react |
| Gráficas | Recharts |
| Formularios | react-hook-form + zod |
| HTTP Client | Fetch nativo (ver `lib/api-client.ts`) |

---

## Estructura de carpetas

```
Accesscode_PR/
│
├── app/                        # App Router de Next.js
│   ├── layout.tsx              # Layout raíz: fuentes, tema, analytics
│   ├── page.tsx                # Página principal (dashboard)
│   └── globals.css             # Variables CSS globales + utilidades Tailwind
│
├── components/                 # Componentes React reutilizables
│   ├── app-sidebar.tsx         # Barra lateral de navegación principal
│   ├── theme-provider.tsx      # Proveedor de tema claro/oscuro (next-themes)
│   ├── sections/               # Una sección = una pantalla del sistema
│   │   ├── beneficiarios.tsx   # Gestión de beneficiarios (CRUD + expediente)
│   │   ├── citas.tsx           # Calendario y lista de citas médicas
│   │   ├── dashboard.tsx       # Resumen general con métricas
│   │   ├── inventario.tsx      # Control de inventario
│   │   ├── membresias.tsx      # Control de membresías y pagos
│   │   ├── preregistro.tsx     # Formulario de pre-registro
│   │   ├── reportes.tsx        # Generación y visualización de reportes
│   │   └── servicios.tsx       # Catálogo de servicios ofrecidos
│   └── ui/                     # Componentes atómicos de shadcn/ui
│                               # (Button, Card, Dialog, Input, Select, etc.)
│
├── hooks/                      # Custom hooks de React
│   ├── use-current-user.ts     # Usuario autenticado — llama a GET /auth/me
│   ├── use-mobile.ts           # Detecta si el viewport es móvil
│   └── use-toast.ts            # Sistema de notificaciones toast
│
├── lib/                        # Utilidades y cliente HTTP
│   ├── utils.ts                # cn() — combina clases Tailwind (clsx + twMerge)
│   └── api-client.ts           # ⭐ Cliente HTTP centralizado hacia el backend
│                               #    Wrapper de fetch con manejo de errores,
│                               #    headers JSON y cookies de sesión
│
├── services/                   # ⭐ Capa de integración con el backend
│   ├── auth.ts                 # getMe(), login(), logout()
│   ├── beneficiarios.ts        # getBeneficiarios(), updateBeneficiario(), etc.
│   ├── citas.ts                # getCitas(), createCita(), updateEstatusCita()
│   └── membresias.ts           # getMembresias(), registrarPago()
│
├── public/                     # Assets estáticos servidos directamente
│   ├── logo-espina-bifida.png  # Logo de la organización
│   └── icon*.png / icon.svg    # Íconos de la app (PWA/favicon)
│
├── styles/
│   └── globals.css             # Estilos globales adicionales
│
├── .env.local                  # ⚠️ Variables de entorno locales (no versionar)
├── .env.local.example          # Plantilla de variables de entorno
├── next.config.mjs             # Configuración de Next.js + rewrites al backend
├── tsconfig.json               # Configuración de TypeScript
├── postcss.config.mjs          # PostCSS para Tailwind v4
└── components.json             # Configuración de shadcn/ui
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL base del backend JS/Oracle (Express) | `http://localhost:3000` |

> Copia `frontend/.env.example` como `frontend/.env.local` si necesitas otro host/puerto.

---

## Cómo conectar una sección al backend

Las secciones actualmente usan datos de ejemplo (mock). Para conectar una sección al backend real:

1. **Importa el servicio** correspondiente de `services/`:
   ```ts
   import { getBeneficiarios } from "@/services/beneficiarios"
   ```

2. **Llama al servicio** dentro de un `useEffect` o con React Server Components:
   ```ts
   useEffect(() => {
     getBeneficiarios().then(setData).catch(console.error)
   }, [])
   ```

3. **Reemplaza el array de mock** por el estado reactivo.

---

## Flujo de una petición HTTP

```
Componente / Hook
      │
      ▼
services/[dominio].ts     ← define qué endpoint llamar y el tipo de respuesta
      │
      ▼
lib/api-client.ts         ← agrega headers, credentials, manejo de errores
      │
      ▼
NEXT_PUBLIC_API_URL        ← apunta al backend JS/Oracle (configurable por env)
      │
      ▼
Backend JS + Oracle DB
```

---

## Rewrites en desarrollo (opcional)

`next.config.mjs` puede redirigir peticiones a **Next** (`/api/*` en el puerto del front) hacia el backend. El cliente en `lib/api-client.ts` usa por defecto **`http://localhost:3000`** (API directa con CORS ya permitido en Express).

```
Browser → localhost:3001/api/beneficiarios
                 ↓ (rewrite Next.js)
         localhost:3000/beneficiarios
```

En producción, configura el proxy a nivel de servidor web (nginx, etc.).
