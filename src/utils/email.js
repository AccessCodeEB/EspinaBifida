import nodemailer from "nodemailer";

/**
 * Envía un correo con el código OTP.
 *
 * Requiere las siguientes variables de entorno (configuradas por el proveedor de correo):
 *   SMTP_HOST         — servidor SMTP  (ej. mail.espinabifida.org.mx)
 *   SMTP_PORT         — puerto         (ej. 465 para SSL, 587 para TLS)
 *   SMTP_SECURE       — "true" si usa SSL/TLS directo (puerto 465), "false" para STARTTLS (587)
 *   SMTP_USER         — usuario SMTP   (ej. procuracion@espinabifida.org.mx)
 *   SMTP_PASS         — contraseña SMTP
 *   EMAIL_FROM        — remitente visible (ej. "Espina Bífida <procuracion@espinabifida.org.mx>")
 *
 * Sin variables configuradas → modo desarrollo: imprime el código en consola
 * y lo devuelve para auto-llenado en el frontend.
 *
 * @param {string} toEmail  Correo destino
 * @param {string} code     Código OTP de 6 dígitos
 * @returns {Promise<string|undefined>} El código en modo dev, undefined en producción.
 */
export async function sendEmailCode(toEmail, code) {
  const host   = process.env.SMTP_HOST;
  const port   = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  const from   = process.env.EMAIL_FROM ?? user;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Código de verificación — Espina Bífida",
      text: `Tu código de verificación es: ${code}\n\nVálido por 5 minutos. Si no solicitaste este código, ignora este mensaje.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;border:1px solid #e2e8f0;border-radius:8px;">
          <h2 style="color:#0f4c81;margin-bottom:8px;">Código de verificación</h2>
          <p style="color:#64748b;margin-bottom:24px;">Ingresa el siguiente código para continuar:</p>
          <div style="background:#f1f5f9;border-radius:6px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#0f4c81;">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;">Válido por 5 minutos. Si no solicitaste este código, ignora este mensaje.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">Asociación de Espina Bífida de Nuevo León, A.B.P.</p>
        </div>
      `,
    });

    return undefined;
  }

  // Modo desarrollo: sin SMTP configurado, devuelve el código para mostrarlo en la UI
  console.log(`[email-dev] Código OTP para ${toEmail}: ${code}`);
  return code;
}
