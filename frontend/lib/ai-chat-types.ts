export type AiAction =
  | { type: "navigate"; to: string }
  | { type: "openDialog"; dialog: string }
  | { type: "search"; query: string }

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  action?: AiAction
}

/** Formato plano enviado al API route */
export type ChatApiMessage = {
  role: "user" | "assistant"
  content: string
}
