import type { AiAction } from "./ai-chat-types"

const ACTION_REGEX = /\{\{ACTION:([\s\S]*)\}\}/

export function parseAction(text: string): { clean: string; action: AiAction | null } {
  const match = text.match(ACTION_REGEX)
  if (!match) return { clean: text, action: null }
  try {
    const action = JSON.parse(match[1]) as AiAction
    const clean = text.replace(ACTION_REGEX, "").trimEnd()
    return { clean, action }
  } catch {
    return { clean: text, action: null }
  }
}
