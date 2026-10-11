import type { VisualizerEvent } from './api'

export type ItemRole = 'user' | 'assistant' | 'tool' | 'error'

export interface Item {
  id: number
  role: ItemRole
  text?: string
  name?: string
  detail?: string
}

export interface LogState {
  items: Item[]
  nextId: number
  activeAssistant: number | null
}

export const initialLogState: LogState = {
  items: [],
  nextId: 0,
  activeAssistant: null,
}

export type LogAction =
  | { type: 'user'; text: string }
  | { type: 'event'; event: VisualizerEvent }
  | { type: 'end' }

const TOOL_LABELS: Record<string, string> = {
  read_code: 'Read canvas',
  write_code: 'Wrote canvas',
  apply_patch: 'Patched canvas',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
}

function truncate(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function callDetail(
  name: string,
  args: Record<string, unknown>,
): string | undefined {
  if (name === 'read_code') return undefined
  if (typeof args.code === 'string') return truncate(args.code)
  if (Array.isArray(args.patches)) {
    return args.patches
      .map((patch) => {
        const p = patch as { target?: unknown; content?: unknown }
        const target = typeof p.target === 'string' ? p.target : ''
        const content = typeof p.content === 'string' ? p.content : ''
        return `- ${target}\n+ ${content}`
      })
      .join('\n\n')
  }
  return undefined
}

function resultText(result: unknown): string | undefined {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'result' in result) {
    const inner = (result as { result: unknown }).result
    return typeof inner === 'string' ? inner : undefined
  }
  return undefined
}

function append(state: LogState, item: Omit<Item, 'id'>): LogState {
  const id = state.nextId
  return {
    ...state,
    items: [...state.items, { ...item, id }],
    nextId: state.nextId + 1,
  }
}

function applyText(state: LogState, text: string): LogState {
  if (state.activeAssistant === null) {
    const id = state.nextId
    return {
      ...state,
      items: [...state.items, { id, role: 'assistant', text }],
      nextId: state.nextId + 1,
      activeAssistant: id,
    }
  }
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === state.activeAssistant
        ? { ...item, text: (item.text ?? '') + text }
        : item,
    ),
  }
}

function applyEvent(state: LogState, event: VisualizerEvent): LogState {
  switch (event.type) {
    case 'text':
      return applyText(state, event.text)
    case 'tool_call':
      return append(
        { ...state, activeAssistant: null },
        {
          role: 'tool',
          name: event.name,
          detail: callDetail(event.name, event.args),
        },
      )
    case 'tool_result': {
      const message = resultText(event.result)
      return message?.startsWith('Error')
        ? append(state, { role: 'error', text: message })
        : state
    }
    case 'error':
      return append(
        { ...state, activeAssistant: null },
        { role: 'error', text: event.message },
      )
    case 'done':
      return { ...state, activeAssistant: null }
    case 'control':
      return state
  }
}

export function logReducer(state: LogState, action: LogAction): LogState {
  switch (action.type) {
    case 'user':
      return append(state, { role: 'user', text: action.text })
    case 'event':
      return applyEvent(state, action.event)
    case 'end':
      return { ...state, activeAssistant: null }
  }
}
