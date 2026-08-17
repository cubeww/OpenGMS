export type CodeReveal = {
  id: string
  line: number
  column: number
  length: number
}

type RevealListener = (target: CodeReveal) => void

const listeners = new Map<string, Set<RevealListener>>()
const buffers = new Map<string, string>()
let pending: CodeReveal | null = null

export function setCodeBuffer(id: string, value: string): void {
  buffers.set(id, value)
}

export function clearCodeBuffer(id: string): void {
  buffers.delete(id)
}

export function codeBuffer(id: string): string | undefined {
  return buffers.get(id)
}

export function requestCodeReveal(target: CodeReveal): void {
  pending = target
  const current = listeners.get(target.id)
  if (!current?.size) return
  pending = null
  current.forEach((listener) => listener(target))
}

export function listenCodeReveal(id: string, listener: RevealListener): () => void {
  const current = listeners.get(id) ?? new Set<RevealListener>()
  current.add(listener)
  listeners.set(id, current)

  if (pending?.id === id) {
    const target = pending
    pending = null
    window.queueMicrotask(() => {
      if (current.has(listener)) listener(target)
    })
  }

  return () => {
    current.delete(listener)
    if (!current.size) listeners.delete(id)
  }
}
