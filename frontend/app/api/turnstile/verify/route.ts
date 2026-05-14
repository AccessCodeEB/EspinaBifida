import { NextResponse } from "next/server"

const CF_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function POST(req: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: "Captcha no configurado en el servidor (TURNSTILE_SECRET_KEY)." },
      { status: 503 }
    )
  }

  let token: unknown
  try {
    const body = (await req.json()) as { token?: string }
    token = body.token
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 })
  }

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Falta el token de verificación." }, { status: 400 })
  }

  const formData = new FormData()
  formData.append("secret", secret)
  formData.append("response", token)
  const forwarded = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")
  if (forwarded) {
    formData.append("remoteip", forwarded.split(",")[0].trim())
  }

  const cfRes = await fetch(CF_VERIFY_URL, { method: "POST", body: formData })
  const data = (await cfRes.json()) as { success?: boolean; "error-codes"?: string[] }

  if (!data.success) {
    const codes = data["error-codes"]?.join(", ") ?? "unknown"
    return NextResponse.json({ error: `Verificación rechazada (${codes}).` }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
