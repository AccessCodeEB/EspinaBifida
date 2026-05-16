"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, ChevronDown, Loader2, Send, Sparkles, X } from "lucide-react"
import { parseAction } from "@/lib/ai-action-parser"
import type { AiAction, ChatApiMessage, ChatMessage } from "@/lib/ai-chat-types"

export type { AiAction }

// ─── Utilidad ────────────────────────────────────────────────────────────────

function newId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Oculta el bloque de acción mientras el texto llega en streaming */
function stripActionBlock(text: string): string {
  return text.replace(/\{\{ACTION:[\s\S]*\}\}/g, "").trimEnd()
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy el Asistente EB. Puedo ayudarte a usar el sistema paso a paso o realizar acciones por ti. ¿En qué te puedo ayudar?",
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function ActionBadge({
  action,
  onExecute,
}: {
  action: AiAction
  onExecute: (action: AiAction) => void
}) {
  const [executed, setExecuted] = useState(false)

  const label =
    action.type === "navigate"
      ? `Ir a ${action.to}`
      : action.type === "openDialog"
        ? "Abrir formulario"
        : `Buscar: ${(action as Extract<AiAction, { type: "search" }>).query}`

  return (
    <button
      onClick={() => { setExecuted(true); onExecute(action) }}
      disabled={executed}
      className="mt-2 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-default disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
    >
      <Sparkles className="size-3 shrink-0" />
      {executed ? "Ejecutado ✓" : label}
    </button>
  )
}

function MessageBubble({
  message,
  onExecute,
}: {
  message: ChatMessage
  onExecute: (action: AiAction) => void
}) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-[#0f4c81] text-white"
            : "rounded-bl-sm border border-border/60 bg-muted/40 text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.action && (
          <ActionBadge action={message.action} onExecute={onExecute} />
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AiChatPanel({ onAction }: { onAction: (action: AiAction) => void }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  // Contenido del mensaje que se está construyendo en streaming (null = no hay streaming)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    // Cancelar stream anterior si lo hubiera
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setStreamingContent("")

    // Solo enviamos al API los mensajes reales (sin el saludo local)
    const history: ChatApiMessage[] = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map(({ role, content }) => ({ role, content }))

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error ?? `Error del servidor (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      const { clean, action } = parseAction(accumulated)
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: clean,
        action: action ?? undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: `⚠️ ${msg}` },
      ])
    } finally {
      setStreamingContent(null)
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleActionExecute = useCallback((action: AiAction) => {
    onAction(action)
    if (action.type === "navigate") setOpen(false)
  }, [onAction])

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente IA"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: "#0f4c81", width: 52, height: 52 }}
      >
        {open
          ? <ChevronDown className="size-5 text-white" />
          : <Bot className="size-5 text-white" />
        }
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-[74px] right-6 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl sm:w-[380px]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#0f4c81" }}>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
                <Bot className="size-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Asistente EB</p>
                <p className="text-[10px] text-white/70">Sistema de gestión Espina Bífida</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex size-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex h-[360px] flex-col gap-3 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onExecute={handleActionExecute} />
            ))}

            {/* Burbuja de streaming en vivo */}
            {streamingContent !== null && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
                  {stripActionBlock(streamingContent)
                    ? <p className="whitespace-pre-wrap">{stripActionBlock(streamingContent)}</p>
                    : (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Escribiendo...</span>
                      </div>
                    )
                  }
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/40 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 focus-within:border-[#0f4c81] focus-within:ring-1 focus-within:ring-[#0f4c81]/20">
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe tu duda o pide una acción..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex size-6 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
                style={{ backgroundColor: "#0f4c81" }}
              >
                <Send className="size-3 text-white" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Puede cometer errores. Verifica información importante.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
