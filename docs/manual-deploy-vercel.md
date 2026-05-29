# Manual de Deploy — Frontend en Vercel

**Sistema:** Asociación de Espina Bífida de Nuevo León  
**Versión:** 1.0 — Mayo 2026

---

## Arquitectura del deploy

```
┌─────────────────────────────┐       ┌────────────────────────────────┐
│        VERCEL               │       │    SERVIDOR BACKEND (externo)  │
│  Next.js (frontend/)        │──────▶│  Node.js + Express             │
│                             │  API  │  Puerto 3000                   │
│  /api/* → proxy al backend  │       │  Conexión Oracle Cloud DB      │
│  /api/chat → Route Next.js  │       │  Archivos /uploads/            │
│  /api/turnstile → Route     │       │  Cron jobs (reportes, notifs)  │
└─────────────────────────────┘       └────────────────────────────────┘
```

> **El backend NO va a Vercel.** Express necesita conexión persistente a Oracle,
> acceso al sistema de archivos (fotos de perfil, PDFs) y procesos cron de larga
> duración — nada de eso es compatible con funciones serverless.
>
> Opciones para el backend: Railway, Render, Fly.io, una VM en Oracle Cloud,
> un VPS propio, o cualquier servidor con Node.js ≥ 20.

---

## Requisitos previos

- Cuenta en [vercel.com](https://vercel.com) (plan Hobby es suficiente)
- Repositorio en GitHub con el código del proyecto
- Backend ya desplegado y accesible por HTTPS (con URL conocida)
- API key de Groq ([console.groq.com](https://console.groq.com))
- Credenciales de Cloudflare Turnstile (panel.cloudflare.com → Turnstile)

---

## Paso 1 — Importar el proyecto en Vercel

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Hacer clic en **Add New → Project**
3. Conectar con GitHub y seleccionar el repositorio `AccessCodeEB/EspinaBifida`
4. En **"Root Directory"**, escribir: `frontend`

   > Esto es crítico. El proyecto Next.js vive en la carpeta `frontend/`,
   > no en la raíz del repositorio.

5. Vercel detectará automáticamente que es un proyecto Next.js
6. En **"Build Command"** dejar el valor por defecto: `next build`
7. En **"Output Directory"** dejar vacío (Next.js lo configura solo)
8. **No hacer clic en Deploy todavía** — primero configurar las variables de entorno

---

## Paso 2 — Variables de entorno en Vercel

Ir a **Settings → Environment Variables** del proyecto en Vercel y agregar las siguientes:

### Variables obligatorias

| Variable | Entorno | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Production, Preview | URL completa del backend Express, **sin barra al final**. Ej: `https://api.espinabifida.com` |
| `GROQ_API_KEY` | Production, Preview | API key de Groq para el asistente de IA. Se obtiene en console.groq.com |
| `TURNSTILE_SECRET_KEY` | Production, Preview | Secret key de Cloudflare Turnstile para verificar el formulario público |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production, Preview | Site key **pública** de Cloudflare Turnstile (va al navegador) |

### Notas sobre las variables

**`NEXT_PUBLIC_API_URL`**
```
https://api.espinabifida.com
```
- Debe ser HTTPS en producción
- Es la URL donde escucha el servidor Express
- El `next.config.mjs` reescribe `/api/*` → `NEXT_PUBLIC_API_URL/*` automáticamente
- **No incluir** `/api` al final — solo el dominio y puerto si es necesario

**`GROQ_API_KEY`**
- Se genera en [console.groq.com/keys](https://console.groq.com/keys)
- No tiene prefijo `NEXT_PUBLIC_` → es solo servidor (nunca llega al navegador)
- Si no se configura, el chat de IA no funcionará (mostrará error gracioso al usuario)

**`TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY`**
- Se obtienen creando un "widget" en el panel de Cloudflare → Turnstile
- Tipo de widget recomendado: **Managed**
- Agregar el dominio de Vercel en la lista de dominios permitidos del widget
- Si no se configuran, el formulario público de pre-registro rechazará todos los envíos

---

## Paso 3 — Deploy inicial

1. En el panel de Vercel, hacer clic en **Deploy**
2. Vercel correrá `npm install && next build` en la carpeta `frontend/`
3. El build tarda entre 2 y 4 minutos
4. Si el build falla, revisar la sección [Errores comunes](#errores-comunes) más abajo

Una vez completado, Vercel asigna una URL automática con formato:
```
https://espinabifida-xxxx.vercel.app
```

---

## Paso 4 — Configurar dominio personalizado (opcional)

1. En Vercel → **Settings → Domains**
2. Agregar el dominio deseado, ej: `espinabifida.vercel.app` o un dominio propio
3. Si se usa dominio propio, agregar los registros DNS indicados por Vercel en el panel del registrador

---

## Paso 5 — Configurar CORS en el backend

El servidor Express tiene CORS configurado por la variable `FRONTEND_URL`. Después del deploy en Vercel, agregar esta variable en el backend:

```bash
# En el servidor backend (no en Vercel):
FRONTEND_URL=https://tu-proyecto.vercel.app
```

Si se usa dominio personalizado:
```bash
FRONTEND_URL=https://sistema.espinabifida.org
```

Si el backend necesita permitir múltiples orígenes (ej. dominio de Vercel + dominio propio), editar temporalmente el middleware CORS en `src/app.js`.

---

## Paso 6 — Verificación post-deploy

Revisar los siguientes flujos después del primer deploy exitoso:

### Lista de verificación

- [ ] **Login de administrador** — ir a `/` e iniciar sesión con credenciales reales
- [ ] **Dashboard** — verificar que carga estadísticas (requiere backend + Oracle activos)
- [ ] **Formulario público** — ir a `/preregistro`, llenar y enviar una solicitud de prueba
- [ ] **Turnstile** — el widget de verificación humana debe aparecer y resolverse
- [ ] **Chat IA** — abrir el panel de chat y enviar un mensaje
- [ ] **Fotos de perfil** — las imágenes deben cargar correctamente desde el backend
- [ ] **Descarga de reportes** — generar y descargar un PDF/XLSX

### Verificar las variables de entorno

Si algo no funciona, abrir las DevTools del navegador (F12 → Network) y revisar:
- Que las llamadas a `/api/*` respondan desde el backend (no 404 de Vercel)
- Que el dominio del backend esté en HTTPS y acepte peticiones desde el origen de Vercel

---

## Deploys automáticos (CD)

Vercel despliega automáticamente en cada `git push` a la rama `main`.

- **Push a `main`** → deploy a **Production**
- **Push a otras ramas** → deploy a **Preview** (URL temporal para revisar cambios)

No se requiere configuración adicional. Los deploys de Preview usan las mismas variables de entorno de producción a menos que se configuren por separado.

---

## Errores comunes

### Build falla: `Module not found`

```
Error: Cannot find module '@/components/...'
```

**Causa:** El `Root Directory` en Vercel no está configurado como `frontend/`.  
**Fix:** Ir a Settings → General → Root Directory → cambiar a `frontend`.

---

### Las llamadas a `/api/*` devuelven 404

**Causa:** `NEXT_PUBLIC_API_URL` no está configurada o apunta a una URL incorrecta.  
**Fix:** Verificar la variable en Vercel → Settings → Environment Variables. Después de cambiarla, es necesario hacer **Redeploy** para que tome efecto.

---

### El formulario público dice "Verificación humana no disponible"

**Causa:** `TURNSTILE_SECRET_KEY` o `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no están configuradas.  
**Fix:** Configurar ambas variables en Vercel y hacer Redeploy. Asegurarse de que el dominio de Vercel esté en la lista de dominios permitidos del widget de Cloudflare Turnstile.

---

### El chat de IA muestra error al enviar mensajes

**Causa:** `GROQ_API_KEY` no está configurada o está vencida.  
**Fix:** Verificar la key en [console.groq.com](https://console.groq.com) y actualizarla en Vercel.

---

### Las fotos de perfil no cargan (imagen rota)

**Causa:** El backend sirve los archivos desde `/uploads/` y el frontend los referencia con el prefijo `/api/uploads/...`. Si el backend no está accesible o los archivos no existen en el servidor, las imágenes fallan.  
**Fix:** Verificar que el backend esté activo y que la carpeta `/uploads/` persista entre reinicios del servidor (no usar almacenamiento efímero como el sistema de archivos de Railway en su tier gratuito — usar un volumen persistente o migrar a un bucket S3/R2).

---

### Error de CORS en el browser

```
Access to fetch at 'https://api.espinabifida.com/...' from origin 'https://espinabifida.vercel.app' has been blocked by CORS policy
```

**Causa:** El backend no tiene configurado el origen de Vercel en la variable `FRONTEND_URL`.  
**Fix:** Agregar `FRONTEND_URL=https://espinabifida.vercel.app` en las variables de entorno del servidor backend y reiniciarlo.

---

## Variables de entorno — resumen rápido

```
# Copiar en Vercel → Settings → Environment Variables

NEXT_PUBLIC_API_URL=https://TU_BACKEND.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TURNSTILE_SECRET_KEY=0x4AAAAAAAxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAxxxxxxxxxxxxxxxxxxx
```

---

## Consideraciones de seguridad

- Las variables con prefijo `NEXT_PUBLIC_` son **públicas** — quedan expuestas en el JavaScript del navegador. Solo `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` deben tener ese prefijo.
- `GROQ_API_KEY` y `TURNSTILE_SECRET_KEY` **nunca** deben tener prefijo `NEXT_PUBLIC_`.
- Vercel cifra las variables de entorno en reposo. Aun así, no poner tokens de producción en ramas de preview si el repositorio es público.
- El formulario público (`/preregistro`) es accesible sin autenticación — es el comportamiento esperado.

---

*Asociación de Espina Bífida de Nuevo León — Sistema de Gestión — 2026*
