/**
 * Envía un SMS con el código OTP.
 * En producción usa Twilio si TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER están definidos.
 * En desarrollo imprime el código en consola.
 */
export async function sendSmsCode(toPhone, code) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      To:   toPhone,
      From: from,
      Body: `Tu código de verificación EspinaBifida es: ${code}. Válido 5 minutos.`,
    });

    const res = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message ?? "Error al enviar SMS por Twilio");
    }
    return;
  }

  // Fallback desarrollo: código visible en consola del servidor
  console.log(`[sms-dev] Código OTP para ${toPhone}: ${code}`);
}
