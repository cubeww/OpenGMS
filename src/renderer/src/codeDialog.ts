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
}

type CodeDialogPrefs = Partial<Record<CodeDialogKind, CodeDialogState>>
type CodeDialogSize = Pick<CodeDialogState, 'width' | 'height'>

const initialState: CodeDialogState = {
  width: 920,
  height: 680,
  maximized: false
}
const minimumSize: CodeDialogSize = { width: 520, height: 320 }

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(240, Math.min(4096, Math.round(value)))
    : fallback
}

function savedState(kind: CodeDialogKind): CodeDialogState {
  const prefs = getPref<CodeDialogPrefs>('codeDialogs', {})
  const value = prefs[kind]
  return {
    width: number(value?.width, initialState.width),
    height: number(value?.height, initialState.height),
    maximized: value?.maximized === true
  }
}

function saveState(kind: CodeDialogKind, value: CodeDialogState): void {
  const prefs = getPref<CodeDialogPrefs>('codeDialogs', {})
  setPref('codeDialogs', { ...prefs, [kind]: value })
}

function pixels(value: string): number {
  const result = Number.parseFloat(value)
  return Number.isFinite(result) ? result : 0
}

function availableSize(element: HTMLElement): CodeDialogSize {
  const parent = element.parentElement
  if (!parent) {
    return {
      width: Math.max(1, window.innerWidth - 40),
      height: Math.max(1, window.innerHeight - 40)
    }
  }
  const style = window.getComputedStyle(parent)
  return {
    width: Math.max(1, parent.clientWidth - pixels(style.paddingLeft) - pixels(style.paddingRight)),
    height: Math.max(1, parent.clientHeight - pixels(style.paddingTop) - pixels(style.paddingBottom))
  }
}

function clampSize(element: HTMLElement, value: CodeDialogSize): CodeDialogSize {
  const available = availableSize(element)
  const minimum = {
    width: Math.min(minimumSize.width, available.width),
    height: Math.min(minimumSize.height, available.height)
  }
  return {
    width: Math.max(minimum.width, Math.min(value.width, available.width)),
    height: Math.max(minimum.height, Math.min(value.height, available.height))
  }
}

function inlineSize(element: HTMLElement, fallback: CodeDialogSize): CodeDialogSize {
  const width = Number.parseFloat(element.style.width)
  const height = Number.parseFloat(element.style.height)
  return clampSize(element, {
    width: number(width, fallback.width),
    height: number(height, fallback.height)
  })
}

function applySize(element: HTMLElement, value: CodeDialogSize): CodeDialogSize {
  const next = clampSize(element, value)
  element.style.width = `${next.width}px`
  element.style.height = `${next.height}px`
  return next
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
    sizeRef.current = applySize(element, sizeRef.current)
  }, [enabled, maximized])

  useEffect(() => {
    if (!enabled) return
    const element = dialogRef.current
    if (!element) return
    let timer = 0
    const update = (): void => {
      if (maximizedRef.current) return
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
    if (element.parentElement) sizeObserver.observe(element.parentElement)
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
