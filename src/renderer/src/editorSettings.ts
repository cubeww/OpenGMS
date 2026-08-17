import { useSyncExternalStore } from 'react'

export type EditorSettings = {
  fontFamily: string
  fontFallback: string
  fontSize: number
  lineHeight: number
  tabSize: number
  fontLigatures: boolean
  wordWrap: boolean
  minimap: boolean
}

export const defaultEditorSettings: EditorSettings = {
  fontFamily: 'Cascadia Code',
  fontFallback: 'JetBrains Mono',
  fontSize: 13,
  lineHeight: 21,
  tabSize: 4,
  fontLigatures: true,
  wordWrap: false,
  minimap: true
}

const storageKey = 'opengms.editor-settings.v1'
const listeners = new Set<() => void>()

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback
}

function normalize(value: Partial<EditorSettings>): EditorSettings {
  const fontFamily = typeof value.fontFamily === 'string'
    ? value.fontFamily.slice(0, 120)
    : defaultEditorSettings.fontFamily
  const fontFallback = typeof value.fontFallback === 'string'
    ? value.fontFallback.slice(0, 120)
    : defaultEditorSettings.fontFallback
  return {
    fontFamily,
    fontFallback,
    fontSize: number(value.fontSize, defaultEditorSettings.fontSize, 9, 40),
    lineHeight: number(value.lineHeight, defaultEditorSettings.lineHeight, 12, 64),
    tabSize: number(value.tabSize, defaultEditorSettings.tabSize, 1, 16),
    fontLigatures: typeof value.fontLigatures === 'boolean'
      ? value.fontLigatures
      : defaultEditorSettings.fontLigatures,
    wordWrap: typeof value.wordWrap === 'boolean'
      ? value.wordWrap
      : defaultEditorSettings.wordWrap,
    minimap: typeof value.minimap === 'boolean'
      ? value.minimap
      : defaultEditorSettings.minimap
  }
}

function load(): EditorSettings {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) return normalize(JSON.parse(saved) as Partial<EditorSettings>)
  } catch {
    // Ignore malformed or unavailable local settings.
  }
  return { ...defaultEditorSettings }
}

let current = load()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function save(): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(current))
  } catch {
    // The active settings still apply for this session.
  }
}

export function updateEditorSettings(change: Partial<EditorSettings>): void {
  current = normalize({ ...current, ...change })
  save()
  emit()
}

export function resetEditorSettings(): void {
  current = { ...defaultEditorSettings }
  save()
  emit()
}

export function useEditorSettings(): EditorSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => defaultEditorSettings
  )
}

export function codeFontFamily(font: string, fallback: string): string {
  const seen = new Set<string>()
  const names = [font, fallback]
    .map((name) => name.trim())
    .filter((name) => {
      const key = name.toLocaleLowerCase()
      if (!name || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((name) => `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
  return [...names, 'monospace'].join(', ')
}
