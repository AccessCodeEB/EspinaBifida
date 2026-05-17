export type AiAction =
  | { type: "navigate"; to: string }
  | { type: "openDialog"; dialog: string }
  | { type: "search"; query: string }
  | {
      type: "createCita"
      beneficiarioBusqueda: string
      idTipoServicio: number
      fecha: string
      hora: string
      especialista?: string
      notas?: string
    }

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
