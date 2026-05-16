import Groq from "groq-sdk"
import { AI_SYSTEM_PROMPT } from "@/lib/ai-knowledge-base"
import type { ChatApiMessage } from "@/lib/ai-chat-types"

// Singleton — una sola instancia por proceso Node
let groq: Groq | null = null

function getClient(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("GROQ_API_KEY no está configurada en .env.local")
    groq = new Groq({ apiKey })
  }
  return groq
}

const GROQ_MODEL = "llama-3.3-70b-versatile"
const MAX_HISTORY = 20

function validateMessages(raw: unknown): ChatApiMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Se requiere al menos un mensaje")
  }
  return raw.map((m, i) => {
    if (typeof m !== "object" || m === null) throw new Error(`Mensaje ${i} inválido`)
    const { role, content } = m as Record<string, unknown>
    if (role !== "user" && role !== "assistant") {
      throw new Error(`Rol inválido en mensaje ${i}: ${String(role)}`)
    }
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`Contenido vacío en mensaje ${i}`)
    }
    return { role, content } as ChatApiMessage
  })
}

export async function POST(request: Request) {
  let messages: ChatApiMessage[]

  try {
    const body = await request.json()
    messages = validateMessages(body.messages)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cuerpo de la solicitud inválido"
    return Response.json({ error: msg }, { status: 400 })
  }

  const trimmed = messages.slice(-MAX_HISTORY)

  try {
    const stream = await getClient().chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        ...trimmed,
      ],
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) controller.enqueue(new TextEncoder().encode(text))
          }
        } catch (streamErr) {
          console.error("[chat/stream]", streamErr)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    console.error("[chat/groq]", err)
    const msg = err instanceof Error ? err.message : "Error al contactar la IA"
    return Response.json({ error: msg }, { status: 500 })
  }
}
