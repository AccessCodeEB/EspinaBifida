# Recuperación de Contraseña — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un admin que olvidó su contraseña la restablezca via SMS OTP — sin requerir autenticación previa.

**Architecture:** Reutiliza la infraestructura SMS y OTP existente (`otpStore.js`, `sms.js`). Flujo: el admin ingresa su email → el sistema busca su teléfono registrado → envía OTP por SMS → el admin ingresa el código + nueva contraseña. Sin migración de BD (OTP en memoria como el flujo autenticado). Dos nuevos endpoints públicos. Un nuevo dialog en el frontend con 2 pasos.

**Tech Stack:** Express, Oracle (oracledb), bcryptjs, crypto.randomInt, otpStore.js existente, sms.js existente, React/TSX, shadcn/ui, JWT (sin token requerido en estos endpoints).

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/services/administradores.service.js` | Modificar | Agregar `solicitarRecuperacion` y `resetPasswordPublico` |
| `src/controllers/administradores.controller.js` | Modificar | Agregar handlers `solicitarRecuperacion` y `resetPasswordPublico` |
| `src/routes/administradores.routes.js` | Modificar | Agregar 2 rutas públicas |
| `src/app.js` | Modificar | Aplicar `otpLimiter` a la nueva ruta de solicitud |
| `src/tests/administradores.service.test.js` | Modificar | Tests unitarios de los 2 nuevos métodos del servicio |
| `src/tests/controllers-misc.test.js` | Modificar | Tests de integración de los 2 nuevos endpoints |
| `frontend/services/administradores.ts` | Modificar | Agregar `solicitarRecuperacion` y `resetPasswordPublico` |
| `frontend/components/forgot-password-dialog.tsx` | Crear | Dialog 2-pasos: email → código + nueva contraseña |
| `frontend/components/login-screen.tsx` | Modificar | Agregar link "¿Olvidaste tu contraseña?" que abre el dialog |

---

## Task 1: Servicio — `solicitarRecuperacion`

**Files:**
- Modify: `src/services/administradores.service.js`
- Modify: `src/tests/administradores.service.test.js`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final del bloque `describe("solicitarCodigo")` (línea ~266 en `src/tests/administradores.service.test.js`) el siguiente bloque nuevo:

```js
// ═══════════════════════════════════════════════════════════════════════════════
// solicitarRecuperacion
// ═══════════════════════════════════════════════════════════════════════════════

describe("solicitarRecuperacion", () => {
  test("lanza 404 si no existe admin con ese email", async () => {
    mockFindByEmail.mockResolvedValueOnce(null);
    await expect(
      Service.solicitarRecuperacion("noexiste@test.com")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 400 NO_PHONE si el admin no tiene teléfono registrado", async () => {
    mockFindByEmail.mockResolvedValueOnce({ ...adminRow, TELEFONO: null });
    await expect(
      Service.solicitarRecuperacion("admin@test.com")
    ).rejects.toMatchObject({ statusCode: 400, code: "NO_PHONE" });
  });

  test("genera OTP, llama sendSmsCode y retorna mensaje", async () => {
    mockFindByEmail.mockResolvedValueOnce({ ...adminRow, TELEFONO: "8181234567" });

    const result = await Service.solicitarRecuperacion("admin@test.com");

    expect(mockSaveOtp).toHaveBeenCalledWith(
      adminRow.ID_ADMIN,
      expect.stringMatching(/^\d{6}$/)
    );
    expect(mockSendSmsCode).toHaveBeenCalledWith(
      "8181234567",
      expect.stringMatching(/^\d{6}$/)
    );
    expect(result).toHaveProperty("message");
  });

  test("incluye codigoDev en desarrollo cuando sendSmsCode lo devuelve", async () => {
    mockFindByEmail.mockResolvedValueOnce({ ...adminRow, TELEFONO: "8181234567" });
    mockSendSmsCode.mockResolvedValueOnce("111222");

    const result = await Service.solicitarRecuperacion("admin@test.com");

    expect(result).toHaveProperty("codigoDev", "111222");
  });

  test("no incluye codigoDev en producción", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      mockFindByEmail.mockResolvedValueOnce({ ...adminRow, TELEFONO: "8181234567" });
      mockSendSmsCode.mockResolvedValueOnce("111222");

      const result = await Service.solicitarRecuperacion("admin@test.com");

      expect(result).not.toHaveProperty("codigoDev");
    } finally {
      process.env.NODE_ENV = orig;
    }
  });
});
```

- [ ] **Step 2: Verificar que el test falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="administradores.service" 2>&1 | grep -E "PASS|FAIL|solicitarRecuperacion"
```

Esperado: `FAIL` con "Service.solicitarRecuperacion is not a function"

- [ ] **Step 3: Implementar `solicitarRecuperacion` en el servicio**

En `src/services/administradores.service.js`, después de la función `solicitarCodigo` (línea ~163), agregar:

```js
export async function solicitarRecuperacion(email) {
  const adminRow = await AdminModel.findByEmail(email);
  if (!adminRow) throw notFound(`No existe un administrador con el email ${email}`);
  if (!adminRow.TELEFONO) {
    throw badRequest(
      "Tu cuenta no tiene un número de teléfono registrado. Contacta al administrador del sistema.",
      "NO_PHONE"
    );
  }

  const code = String(randomInt(100000, 1000000));
  saveOtp(adminRow.ID_ADMIN, code);
  const devCode = await sendSmsCode(adminRow.TELEFONO, code);

  return {
    message: "Código de recuperación enviado al número registrado",
    ...(devCode !== undefined && process.env.NODE_ENV !== "production" && { codigoDev: devCode }),
  };
}
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="administradores.service" 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Esperado: `PASS`, todos los tests verdes.

- [ ] **Step 5: Commit**

```bash
git add src/services/administradores.service.js src/tests/administradores.service.test.js
git commit -m "feat(auth): servicio solicitarRecuperacion para reset de contraseña vía SMS"
```

---

## Task 2: Servicio — `resetPasswordPublico`

**Files:**
- Modify: `src/services/administradores.service.js`
- Modify: `src/tests/administradores.service.test.js`

- [ ] **Step 1: Escribir el test que falla**

Agregar después del bloque `describe("solicitarRecuperacion")`:

```js
// ═══════════════════════════════════════════════════════════════════════════════
// resetPasswordPublico
// ═══════════════════════════════════════════════════════════════════════════════

describe("resetPasswordPublico", () => {
  test("lanza 404 si no existe admin con ese email", async () => {
    mockFindByEmail.mockResolvedValueOnce(null);
    await expect(
      Service.resetPasswordPublico("noexiste@test.com", "123456", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("lanza 400 MISSING_OTP si el código es falsy", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 400, code: "MISSING_OTP" });
  });

  test("lanza 400 INVALID_OTP si el código no es válido", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(false);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "000000", "NuevaPass1")
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_OTP" });
  });

  test("lanza 400 si la nueva contraseña no cumple la política (menos de 6 caracteres)", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(true);
    await expect(
      Service.resetPasswordPublico("admin@test.com", "123456", "abc")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("actualiza contraseña y retorna mensaje cuando todo es válido", async () => {
    mockFindByEmail.mockResolvedValueOnce(adminRow);
    mockVerifyOtp.mockReturnValueOnce(true);
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockUpdatePassword.mockResolvedValueOnce(undefined);

    const result = await Service.resetPasswordPublico(
      "admin@test.com",
      "123456",
      "NuevaPass1"
    );

    expect(mockBcryptHash).toHaveBeenCalledWith("NuevaPass1", expect.any(Number));
    expect(mockUpdatePassword).toHaveBeenCalledWith(adminRow.ID_ADMIN, "$2a$10$newhash");
    expect(result).toHaveProperty("message");
  });
});
```

- [ ] **Step 2: Verificar que el test falla**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="administradores.service" 2>&1 | grep -E "PASS|FAIL|resetPasswordPublico"
```

Esperado: `FAIL` con "Service.resetPasswordPublico is not a function"

- [ ] **Step 3: Implementar `resetPasswordPublico` en el servicio**

En `src/services/administradores.service.js`, después de `solicitarRecuperacion`:

```js
export async function resetPasswordPublico(email, codigo, nuevaPassword) {
  const adminRow = await AdminModel.findByEmail(email);
  if (!adminRow) throw notFound(`No existe un administrador con el email ${email}`);

  if (!codigo) throw badRequest("Se requiere el código SMS de recuperación", "MISSING_OTP");
  if (!verifyOtp(adminRow.ID_ADMIN, String(codigo))) {
    throw badRequest("Código SMS inválido o expirado", "INVALID_OTP");
  }

  validarPassword(nuevaPassword);

  const nuevoHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
  await AdminModel.updatePassword(adminRow.ID_ADMIN, nuevoHash);

  return { message: "Contraseña restablecida exitosamente" };
}
```

- [ ] **Step 4: Verificar que todos los tests del servicio pasan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="administradores.service" 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Esperado: `PASS`, todos los tests verdes.

- [ ] **Step 5: Commit**

```bash
git add src/services/administradores.service.js src/tests/administradores.service.test.js
git commit -m "feat(auth): servicio resetPasswordPublico — restablece contraseña con SMS OTP sin autenticación"
```

---

## Task 3: Controller y Routes

**Files:**
- Modify: `src/controllers/administradores.controller.js`
- Modify: `src/routes/administradores.routes.js`
- Modify: `src/app.js`

- [ ] **Step 1: Escribir los tests de integración que fallan**

En `src/tests/controllers-misc.test.js`, agregar al final del archivo (antes del último cierre):

```js
// ═══════════════════════════════════════════════════════════════════════════════
// POST /administradores/forgot-password — solicitarRecuperacion
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /administradores/forgot-password — solicitarRecuperacion", () => {
  test("retorna 200 con mensaje cuando el email existe y tiene teléfono", async () => {
    // findByEmail → admin con teléfono
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, TELEFONO: "8181234567" }],
    });

    const res = await request(app)
      .post("/administradores/forgot-password")
      .send({ email: "admin@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("retorna 404 si el email no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/administradores/forgot-password")
      .send({ email: "noexiste@test.com" });

    expect(res.status).toBe(404);
  });

  test("retorna 400 NO_PHONE si el admin no tiene teléfono", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ ...adminRow, TELEFONO: null }],
    });

    const res = await request(app)
      .post("/administradores/forgot-password")
      .send({ email: "admin@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("NO_PHONE");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /administradores/forgot-password/reset — resetPasswordPublico
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /administradores/forgot-password/reset — resetPasswordPublico", () => {
  test("retorna 200 cuando el código y la contraseña son válidos", async () => {
    // Guardar un OTP real en el store para validarlo
    saveOtp(adminRow.ID_ADMIN, "654321");
    // findByEmail → admin existe
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });
    // updatePassword → éxito
    mockBcryptHash.mockResolvedValueOnce("$2a$10$newhash");
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "admin@test.com", codigo: "654321", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("retorna 400 INVALID_OTP si el código es incorrecto", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [adminRow] });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "admin@test.com", codigo: "000000", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_OTP");
  });

  test("retorna 404 si el email no existe", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/administradores/forgot-password/reset")
      .send({ email: "nadie@test.com", codigo: "123456", nuevaPassword: "NuevaPass1" });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="controllers-misc" 2>&1 | grep -E "PASS|FAIL|forgot-password"
```

Esperado: `FAIL` con 404 (ruta no existe aún).

- [ ] **Step 3: Agregar handlers al controller**

En `src/controllers/administradores.controller.js`, al final del archivo agregar:

```js
export async function solicitarRecuperacion(req, res, next) {
  try {
    const result = await AdminService.solicitarRecuperacion(req.body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordPublico(req, res, next) {
  try {
    const { email, codigo, nuevaPassword } = req.body;
    const result = await AdminService.resetPasswordPublico(email, codigo, nuevaPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Agregar rutas públicas**

En `src/routes/administradores.routes.js`, después de `router.post("/login", ...)`:

```js
// Públicas — recuperación de contraseña (sin token)
router.post("/forgot-password",       AdminController.solicitarRecuperacion);
router.patch("/forgot-password/reset", AdminController.resetPasswordPublico);
```

> **Importante:** estas dos líneas deben ir ANTES de cualquier ruta con parámetros como `/:idAdmin` para evitar que Express interprete `forgot-password` como un `idAdmin`.

- [ ] **Step 5: Aplicar rate limiting a la ruta de solicitud en `app.js`**

En `src/app.js`, dentro del bloque de rate limiters específicos, agregar:

```js
app.post('/administradores/forgot-password', otpLimiter);
app.post('/api/v1/administradores/forgot-password', otpLimiter);
```

- [ ] **Step 6: Verificar que los tests pasan**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --testPathPattern="controllers-misc" 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Esperado: `PASS`, todos los tests verdes.

- [ ] **Step 7: Commit**

```bash
git add src/controllers/administradores.controller.js src/routes/administradores.routes.js src/app.js src/tests/controllers-misc.test.js
git commit -m "feat(auth): endpoints públicos forgot-password para recuperación de contraseña"
```

---

## Task 4: Frontend — Servicio API

**Files:**
- Modify: `frontend/services/administradores.ts`

- [ ] **Step 1: Agregar las dos funciones al servicio**

Al final de `frontend/services/administradores.ts`, agregar:

```ts
export function solicitarRecuperacion(email: string) {
  return apiClient.post<{ message: string; codigoDev?: string }>(
    "/administradores/forgot-password",
    { email }
  )
}

export function resetPasswordPublico(
  email: string,
  codigo: string,
  nuevaPassword: string
) {
  return apiClient.patch<{ message: string }>(
    "/administradores/forgot-password/reset",
    { email, codigo, nuevaPassword }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/services/administradores.ts
git commit -m "feat(auth): agregar solicitarRecuperacion y resetPasswordPublico al servicio frontend"
```

---

## Task 5: Frontend — `ForgotPasswordDialog`

**Files:**
- Create: `frontend/components/forgot-password-dialog.tsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/components/forgot-password-dialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { MessageSquare, Mail, KeyRound, Loader2, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { solicitarRecuperacion, resetPasswordPublico } from "@/services/administradores"

type Step = "email" | "codigo" | "done"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep]         = useState<Step>("email")
  const [email, setEmail]       = useState("")
  const [codigo, setCodigo]     = useState("")
  const [nuevaPass, setNuevaPass] = useState("")
  const [devMode, setDevMode]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function reset() {
    setStep("email")
    setEmail("")
    setCodigo("")
    setNuevaPass("")
    setDevMode(false)
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  async function handleSolicitarCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return }
    setLoading(true); setError(null)
    try {
      const res = await solicitarRecuperacion(email.trim())
      if (res.codigoDev) {
        setDevMode(true)
        setCodigo(res.codigoDev)
        toast.info(`Modo desarrollo: código ${res.codigoDev} (sin SMS real)`)
      } else {
        toast.success("Código enviado a tu número registrado")
      }
      setStep("codigo")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar el código"
      if (msg.includes("NO_PHONE") || msg.toLowerCase().includes("teléfono")) {
        setError("Tu cuenta no tiene un número de teléfono registrado. Contacta al administrador del sistema.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim())    { setError("Ingresa el código SMS"); return }
    if (!nuevaPass.trim()) { setError("Ingresa la nueva contraseña"); return }
    setLoading(true); setError(null)
    try {
      await resetPasswordPublico(email, codigo, nuevaPass)
      setStep("done")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restablecer la contraseña"
      if (msg.includes("INVALID_OTP") || msg.toLowerCase().includes("inválido")) {
        setError("Código incorrecto o expirado. Solicita uno nuevo.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar contraseña</DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Ingresa tu correo y te enviaremos un código SMS."
              : step === "codigo"
              ? "Ingresa el código recibido y tu nueva contraseña."
              : "Tu contraseña fue actualizada correctamente."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleSolicitarCodigo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Enviar código SMS
            </Button>
          </form>
        )}

        {step === "codigo" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {devMode ? (
              <div className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-[11px] text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                <MessageSquare className="size-3.5 shrink-0" />
                <span><strong>Modo desarrollo:</strong> Twilio no configurado — código auto-llenado.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                <MessageSquare className="size-3.5 shrink-0" />
                <span>Código de 6 dígitos enviado al número registrado de <strong>{email}</strong>.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Código SMS
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                autoFocus={!devMode}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("email"); setError(null) }}
                disabled={loading}
              >
                Atrás
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Restablecer contraseña
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              Tu contraseña fue actualizada. Ya puedes iniciar sesión con ella.
            </p>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Ir al login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/forgot-password-dialog.tsx
git commit -m "feat(auth): componente ForgotPasswordDialog — 2 pasos email → código + nueva contraseña"
```

---

## Task 6: Frontend — Wiring en `login-screen.tsx`

**Files:**
- Modify: `frontend/components/login-screen.tsx`

- [ ] **Step 1: Agregar import y estado**

Al inicio de `frontend/components/login-screen.tsx`, agregar el import:

```tsx
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog"
```

Dentro del componente `LoginScreen`, después de `const [error, setError] = useState(...)`, agregar:

```tsx
const [forgotOpen, setForgotOpen] = useState(false)
```

- [ ] **Step 2: Agregar el link y el dialog en el JSX**

Encontrar el bloque del botón de submit (el `<Button type="submit" ...>`) y agregar debajo de él, dentro del `<form>`:

```tsx
<div className="text-center">
  <button
    type="button"
    onClick={() => setForgotOpen(true)}
    className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
  >
    ¿Olvidaste tu contraseña?
  </button>
</div>
```

Y al final del componente, justo antes del último `</div>` de cierre del return, agregar:

```tsx
<ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
```

- [ ] **Step 3: Verificar que el frontend compila sin errores**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/login-screen.tsx
git commit -m "feat(auth): agregar enlace '¿Olvidaste tu contraseña?' en login screen"
```

---

## Task 7: Actualizar AVANCE_PROYECTO.md

**Files:**
- Modify: `AVANCE_PROYECTO.md`

- [ ] **Step 1: Marcar "Flujo de recuperación de contraseña" como completado**

En `AVANCE_PROYECTO.md`:

1. Mover "Flujo de recuperación de contraseña" de la sección `❌ Lo que falta` a `✅ Lo que está terminado`
2. En la tabla backend, actualizar la fila de **Administradores** para mencionar recuperación de contraseña
3. Marcar semana 2 como ✅ Completado en el cronograma

- [ ] **Step 2: Commit**

```bash
git add AVANCE_PROYECTO.md
git commit -m "docs: marcar recuperación de contraseña como completada en AVANCE_PROYECTO.md"
```

---

## Task 8: Push final

- [ ] **Step 1: Push a GitHub**

```bash
git push origin main
```

---

## Self-Review

### Spec coverage
- ✅ Endpoint público `POST /forgot-password` — Task 3
- ✅ Endpoint público `PATCH /forgot-password/reset` — Task 3
- ✅ SMS OTP reutilizado — Tasks 1-2
- ✅ Rate limiting en ruta de solicitud — Task 3 step 5
- ✅ Guard `codigoDev` solo en dev — Tasks 1-2
- ✅ Frontend dialog 2 pasos — Task 5
- ✅ Link en login screen — Task 6
- ✅ Documentación actualizada — Task 7

### Placeholder scan
Sin TBDs ni "implement later". Todos los steps tienen código real.

### Type consistency
- `solicitarRecuperacion(email)` — mismo nombre en service (Task 1), controller (Task 3), frontend service (Task 4), dialog (Task 5)
- `resetPasswordPublico(email, codigo, nuevaPassword)` — mismo nombre y firma en todos los layers
- `codigoDev?: string` — tipo consistente en service y frontend service
- `saveOtp(adminRow.ID_ADMIN, code)` — usa `ID_ADMIN` (campo Oracle mayúsculas) igual que en `solicitarCodigo` existente

## GSTACK REVIEW REPORT

| Run | Date | Status | Findings |
|---|---|---|---|
| — | — | NO REVIEWS YET — run `/autoplan` | — |
