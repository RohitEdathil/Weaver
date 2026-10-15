import type { ConversationTurn, VisualizerEvent } from './api'

export type ItemRole = 'user' | 'assistant' | 'tool' | 'error'

export interface Item {
  id: number
  role: ItemRole
  text?: string
  name?: string
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
  | { type: 'load'; turns: ConversationTurn[] }
  | { type: 'end' }

const TOOL_LABELS: Record<string, string> = {
  read_code: 'Read canvas',
  write_code: 'Wrote canvas',
  apply_patch: 'Patched canvas',
  view_canvas: 'Viewed canvas',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
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
        { role: 'tool', name: event.name },
      )
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
    case 'load': {
      const items = action.turns.map((turn, index) => ({
        id: index,
        role: turn.role,
        text: turn.text,
      }))
      return { items, nextId: items.length, activeAssistant: null }
    }
    case 'end':
      return { ...state, activeAssistant: null }
  }
}
