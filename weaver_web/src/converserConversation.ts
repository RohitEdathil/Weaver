import type { ConverserEvent } from './api'

export type ConverserRole = 'user' | 'agent' | 'tool' | 'error'

export interface ConverserItem {
  id: number
  role: ConverserRole
  text?: string
  name?: string
}

export interface ConverserLogState {
  items: ConverserItem[]
  nextId: number
  activeUser: number | null
  activeAgent: number | null
}

export const initialConverserLog: ConverserLogState = {
  items: [],
  nextId: 0,
  activeUser: null,
  activeAgent: null,
}

export type ConverserLogAction =
  | { type: 'event'; event: ConverserEvent }
  | { type: 'end' }

const TOOL_LABELS: Record<string, string> = {
  use_visualizer: 'Using visualizer',
}

export function converserToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
}

function append(
  state: ConverserLogState,
  item: Omit<ConverserItem, 'id'>,
): ConverserLogState {
  const id = state.nextId
  return {
    ...state,
    items: [...state.items, { ...item, id }],
    nextId: state.nextId + 1,
  }
}

function applyTranscript(
  state: ConverserLogState,
  role: 'user' | 'agent',
  text: string,
  partial: boolean,
): ConverserLogState {
  const activeId = role === 'user' ? state.activeUser : state.activeAgent
  if (activeId === null) {
    const id = state.nextId
    return {
      ...state,
      items: [...state.items, { id, role, text }],
      nextId: state.nextId + 1,
      ...(role === 'user' ? { activeUser: id } : { activeAgent: id }),
    }
  }
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== activeId) return item
      // Partial chunks are deltas; a final chunk repeats the full text.
      const next = partial ? (item.text ?? '') + text : text
      return { ...item, text: next }
    }),
  }
}

function applyEvent(
  state: ConverserLogState,
  event: ConverserEvent,
): ConverserLogState {
  switch (event.type) {
    case 'transcript':
      return applyTranscript(state, event.role, event.text, event.partial)
    case 'tool_call':
      return append(state, { role: 'tool', name: event.name })
    case 'error':
      return append(state, { role: 'error', text: event.message })
    case 'interrupted':
      return { ...state, activeAgent: null }
    case 'done':
      return { ...state, activeUser: null, activeAgent: null }
    case 'audio':
    case 'control':
      return state
  }
}

export function converserLogReducer(
  state: ConverserLogState,
  action: ConverserLogAction,
): ConverserLogState {
  switch (action.type) {
    case 'event':
      return applyEvent(state, action.event)
    case 'end':
      return { ...state, activeUser: null, activeAgent: null }
  }
}
