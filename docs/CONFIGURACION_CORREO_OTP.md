# Configuración de Correo para Recuperación de Contraseña

## Contexto

El sistema utiliza un código de verificación de 6 dígitos (OTP) para dos flujos de seguridad:

1. **Recuperar contraseña** — el administrador olvidó su contraseña y solicita un código desde la pantalla de login.
2. **Cambiar contraseña** — el administrador está autenticado y quiere cambiar su contraseña desde su perfil.

En ambos casos, el sistema envía el código al correo electrónico del administrador registrado en el sistema.

---

## Qué necesita el socio formador

Para que el envío de correos funcione en producción, se necesitan las **credenciales SMTP** del buzón `procuracion@espinabifida.org.mx`.

Estas credenciales las proporciona el proveedor de hosting donde está alojado ese correo (por ejemplo: cPanel, Plesk, Google Workspace, Zoho, etc.).

### Variables a configurar en el servidor (archivo `.env`)

```env
SMTP_HOST=mail.espinabifida.org.mx   # Servidor SMTP (preguntar al hosting)
SMTP_PORT=587                         # Puerto: 587 (recomendado) o 465
SMTP_SECURE=false                     # false para puerto 587, true para 465
SMTP_USER=procuracion@espinabifida.org.mx
SMTP_PASS=contraseña-del-buzon        # Contraseña del correo
EMAIL_FROM=Espina Bífida <procuracion@espinabifida.org.mx>
```

> **Nota:** Estas variables **nunca** se suben al repositorio. Se configuran directamente en el servidor de producción.

---

## Cómo obtener los datos SMTP

El socio debe contactar a su proveedor de hosting y solicitar:

| Dato | Pregunta al hosting |
|---|---|
| `SMTP_HOST` | ¿Cuál es el servidor de correo saliente (SMTP)? |
| `SMTP_PORT` | ¿Qué puerto usan para SMTP? (587 o 465) |
| `SMTP_SECURE` | ¿Usan SSL/TLS directo (465) o STARTTLS (587)? |
| `SMTP_USER` | El correo completo: `procuracion@espinabifida.org.mx` |
| `SMTP_PASS` | La contraseña del buzón |

Los proveedores más comunes responden en minutos por chat de soporte.

---

## Comportamiento sin configurar (desarrollo)

Si las variables SMTP no están definidas, el sistema entra en **modo desarrollo**:

- El código OTP se imprime en la consola del servidor (`[email-dev] Código OTP para ...`).
- En el formulario del navegador, el campo se auto-llena con el código (para facilitar las pruebas).
- Se muestra un aviso naranja: *"SMTP no configurado — código auto-llenado"*.

Esto permite probar el flujo completo sin necesitar configurar correo real.

---

## Flujo del usuario (producción)

```
1. Admin hace clic en "¿Olvidaste tu contraseña?"
2. Ingresa su correo electrónico
3. El sistema envía un correo desde procuracion@espinabifida.org.mx
   con asunto: "Código de verificación — Espina Bífida"
4. Admin ingresa el código de 6 dígitos recibido
5. Admin ingresa su nueva contraseña
6. Sistema actualiza la contraseña
```

El código expira en **5 minutos**.

---

## Sin costo adicional

Esta implementación usa el correo institucional que la asociación ya tiene. **No requiere contratar ningún servicio externo** (se eliminó la dependencia de Twilio/SMS).
