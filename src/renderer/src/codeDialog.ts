import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject
} from 'react'
import { getPref, setPref } from './prefs'

type CodeDialogKind = 'action' | 'room'

type CodeDialogState = {
  width: number
  height: number
  maximized: boolean
  version?: number
}

type CodeDialogPrefs = Partial<Record<CodeDialogKind, CodeDialogState>>
type CodeDialogSize = Pick<CodeDialogState, 'width' | 'height'>

const initialState: CodeDialogState = {
  width: 920,
  height: 680,
  maximized: false
}
const minimumSize: CodeDialogSize = { width: 520, height: 320 }
const stateVersion = 2

function number(value: unknown, fallback: number, minimum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const next = Math.round(value)
  return next >= minimum ? Math.min(4096, next) : fallback
}

function savedState(kind: CodeDialogKind): CodeDialogState {
  const prefs = getPref<CodeDialogPrefs>('codeDialogs', {})
  const value = prefs[kind]
  const collapsed = value?.version !== stateVersion &&
    typeof value?.width === 'number' && value.width <= minimumSize.width &&
    typeof value.height === 'number' && value.height <= minimumSize.height
  return {
    width: number(collapsed ? undefined : value?.width, initialState.width, minimumSize.width),
    height: number(collapsed ? undefined : value?.height, initialState.height, minimumSize.height),
    maximized: value?.maximized === true
  }
}

function saveState(kind: CodeDialogKind, value: CodeDialogState): void {
  const prefs = getPref<CodeDialogPrefs>('codeDialogs', {})
  setPref('codeDialogs', { ...prefs, [kind]: { ...value, version: stateVersion } })
}

function pixels(value: string): number {
  const result = Number.parseFloat(value)
  return Number.isFinite(result) ? result : 0
}

function inlineSize(element: HTMLElement, fallback: CodeDialogSize): CodeDialogSize {
  const width = Number.parseFloat(element.style.width)
  const height = Number.parseFloat(element.style.height)
  return {
    width: number(width, fallback.width, minimumSize.width),
    height: number(height, fallback.height, minimumSize.height)
  }
}

function applySize(element: HTMLElement, value: CodeDialogSize): void {
  element.style.width = `${value.width}px`
  element.style.height = `${value.height}px`
}

export function useCodeDialog(kind: CodeDialogKind, enabled = true): {
  dialogRef: RefObject<HTMLElement | null>
  maximized: boolean
  toggleMaximized: () => void
  closeDialog: (close: () => void) => void
} {
  const [first] = useState(() => savedState(kind))
  const dialogRef = useRef<HTMLElement>(null)
  const sizeRef = useRef({ width: first.width, height: first.height })
  const maximizedRef = useRef(first.maximized)
  const [maximized, setMaximized] = useState(first.maximized)

  const captureSize = useCallback(() => {
    if (maximizedRef.current || !dialogRef.current) return sizeRef.current
    sizeRef.current = inlineSize(dialogRef.current, sizeRef.current)
    applySize(dialogRef.current, sizeRef.current)
    return sizeRef.current
  }, [])

  const persist = useCallback((nextMaximized = maximizedRef.current) => {
    const size = nextMaximized ? sizeRef.current : captureSize()
    saveState(kind, { ...size, maximized: nextMaximized })
  }, [captureSize, kind])

  const toggleMaximized = useCallback(() => {
    if (!enabled) return
    if (!maximizedRef.current) captureSize()
    const next = !maximizedRef.current
    maximizedRef.current = next
    setMaximized(next)
    persist(next)
  }, [captureSize, enabled, persist])

  const closeDialog = useCallback((close: () => void) => {
    if (enabled) persist()
    close()
  }, [enabled, persist])

  useLayoutEffect(() => {
    if (!enabled) return
    const element = dialogRef.current
    if (!element) return
    if (maximized) {
      element.style.removeProperty('width')
      element.style.removeProperty('height')
      return
    }
    applySize(element, sizeRef.current)
  }, [enabled, maximized])

  useEffect(() => {
    if (!enabled) return
    const element = dialogRef.current
    if (!element) return
    let timer = 0
    const update = (): void => {
      if (maximizedRef.current || !element.isConnected || element.offsetParent === null) return
      const next = inlineSize(element, sizeRef.current)
      const changed = next.width !== sizeRef.current.width || next.height !== sizeRef.current.height
      sizeRef.current = next
      if (pixels(element.style.width) !== next.width || pixels(element.style.height) !== next.height) {
        applySize(element, next)
      }
      if (!changed) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => persist(false), 180)
    }
    const sizeObserver = new ResizeObserver(update)
    const styleObserver = new MutationObserver(update)
    sizeObserver.observe(element)
    styleObserver.observe(element, { attributes: true, attributeFilter: ['style'] })
    return () => {
      sizeObserver.disconnect()
      styleObserver.disconnect()
      window.clearTimeout(timer)
      persist()
    }
  }, [enabled, persist])

  return { dialogRef, maximized: enabled && maximized, toggleMaximized, closeDialog }
}
