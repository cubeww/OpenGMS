import { useSyncExternalStore } from 'react'
import { getPref, setPref } from './prefs'

export type EditorColors = {
  text: string
  keyword: string
  operator: string
  builtInFunction: string
  function: string
  resource: string
  variable: string
  constant: string
  string: string
  number: string
  comment: string
  docComment: string
  enumName: string
  enumMember: string
}

export type EditorSettings = {
  fontFamily: string
  fontFallback: string
  fontSize: number
  lineHeight: number
  tabSize: number
  fontLigatures: boolean
  wordWrap: boolean
  minimap: boolean
  colors: EditorColors
}

export const defaultEditorColors: EditorColors = {
  text: '#D7DCE5',
  keyword: '#C792EA',
  operator: '#89DDFF',
  builtInFunction: '#82AAFF',
  function: '#80CBC4',
  resource: '#E6A96B',
  variable: '#F78C6C',
  constant: '#FFCB6B',
  string: '#C3E88D',
  number: '#F78C6C',
  comment: '#667085',
  docComment: '#7F9F7F',
  enumName: '#80CBC4',
  enumMember: '#FFCB6B'
}

export const defaultEditorSettings: EditorSettings = {
  fontFamily: 'Cascadia Code',
  fontFallback: 'JetBrains Mono',
  fontSize: 13,
  lineHeight: 21,
  tabSize: 4,
  fontLigatures: true,
  wordWrap: false,
  minimap: true,
  colors: defaultEditorColors
}

const listeners = new Set<() => void>()

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback
}

function color(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return /^#[0-9a-f]{6}$/i.test(next) ? next.toUpperCase() : fallback
}

function colors(value: unknown): EditorColors {
  const source = value && typeof value === 'object'
    ? value as Partial<EditorColors>
    : {}
  return {
    text: color(source.text, defaultEditorColors.text),
    keyword: color(source.keyword, defaultEditorColors.keyword),
    operator: color(source.operator, defaultEditorColors.operator),
    builtInFunction: color(source.builtInFunction, defaultEditorColors.builtInFunction),
    function: color(source.function, defaultEditorColors.function),
    resource: color(source.resource, defaultEditorColors.resource),
    variable: color(source.variable, defaultEditorColors.variable),
    constant: color(source.constant, defaultEditorColors.constant),
    string: color(source.string, defaultEditorColors.string),
    number: color(source.number, defaultEditorColors.number),
    comment: color(source.comment, defaultEditorColors.comment),
    docComment: color(source.docComment, defaultEditorColors.docComment),
    enumName: color(source.enumName, defaultEditorColors.enumName),
    enumMember: color(source.enumMember, defaultEditorColors.enumMember)
  }
}

function defaults(): EditorSettings {
  return { ...defaultEditorSettings, colors: { ...defaultEditorColors } }
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
      : defaultEditorSettings.minimap,
    colors: colors(value.colors)
  }
}

function load(): EditorSettings {
  return normalize(getPref<Partial<EditorSettings>>('editor', {}))
}

let current = defaults()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function save(): void {
  setPref('editor', current)
}

export function initEditorSettings(): void {
  current = load()
  emit()
}

export function updateEditorSettings(change: Partial<EditorSettings>): void {
  current = normalize({ ...current, ...change })
  save()
  emit()
}

export function resetEditorSettings(): void {
  current = defaults()
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
