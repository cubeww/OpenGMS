import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type {
  GameInfoAlign,
  GameInfoData,
  GameInfoParagraph,
  GameInfoRun
} from '../shared/types'

const maxFileSize = 8 * 1024 * 1024
const maxParagraphs = 10000
const maxRuns = 100000
const maxTextSize = 4 * 1024 * 1024
const aligns = new Set<GameInfoAlign>(['left', 'center', 'right', 'justify'])
const destinations = new Set([
  'colortbl',
  'datastore',
  'filetbl',
  'fonttbl',
  'generator',
  'info',
  'listoverridetable',
  'listtable',
  'object',
  'pict',
  'revtbl',
  'rsidtbl',
  'stylesheet',
  'themedata',
  'xmlnstbl'
])

type FormatState = {
  skip: boolean
  starred: boolean
  uc: number
  font: string
  size: number
  color?: string
  background?: string
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  align: GameInfoAlign
}

function emptyData(): GameInfoData {
  return { paragraphs: [{ align: 'left', list: null, runs: [] }] }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function fontName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const font = value.trim().replace(/[^\p{L}\p{N} .,_-]/gu, '').slice(0, 80)
  return font || undefined
}

function colorValue(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return undefined
  return value.toUpperCase()
}

function cleanRun(value: unknown): GameInfoRun {
  if (!value || typeof value !== 'object') throw new Error('Invalid Game Information run')
  const run = value as Partial<GameInfoRun>
  if (typeof run.text !== 'string' || run.text.includes('\0')) {
    throw new Error('Invalid Game Information text')
  }

  const result: GameInfoRun = { text: run.text }
  const font = fontName(run.font)
  const color = colorValue(run.color)
  const background = colorValue(run.background)
  if (font) result.font = font
  if (typeof run.size === 'number' && Number.isFinite(run.size)) {
    result.size = Math.round(clamp(run.size, 6, 144) * 2) / 2
  }
  if (color) result.color = color
  if (background) result.background = background
  if (run.bold === true) result.bold = true
  if (run.italic === true) result.italic = true
  if (run.underline === true) result.underline = true
  if (run.strike === true) result.strike = true
  return result
}

export function normalizeGameInfo(value: unknown): GameInfoData {
  if (!value || typeof value !== 'object') throw new Error('Invalid Game Information data')
  const source = value as Partial<GameInfoData>
  if (!Array.isArray(source.paragraphs) || source.paragraphs.length > maxParagraphs) {
    throw new Error('Invalid Game Information paragraphs')
  }

  let runCount = 0
  let textSize = 0
  const paragraphs = source.paragraphs.map((value): GameInfoParagraph => {
    if (!value || typeof value !== 'object') throw new Error('Invalid Game Information paragraph')
    const paragraph = value as Partial<GameInfoParagraph>
    if (!Array.isArray(paragraph.runs)) throw new Error('Invalid Game Information paragraph')
    runCount += paragraph.runs.length
    if (runCount > maxRuns) throw new Error('Game Information has too many text runs')

    const runs = paragraph.runs.map((run) => {
      const clean = cleanRun(run)
      textSize += Buffer.byteLength(clean.text, 'utf8')
      if (textSize > maxTextSize) throw new Error('Game Information is too large')
      return clean
    })
    const align = aligns.has(paragraph.align as GameInfoAlign)
      ? paragraph.align as GameInfoAlign
      : 'left'
    const list = paragraph.list === 'bullet' || paragraph.list === 'number'
      ? paragraph.list
      : null
    return { align, list, runs }
  })

  return { paragraphs: paragraphs.length > 0 ? paragraphs : emptyData().paragraphs }
}

function group(source: string, control: string): string | undefined {
  const start = source.indexOf(`{\\${control}`)
  if (start < 0) return undefined
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return undefined
}

function fonts(source: string): Map<number, string> {
  const result = new Map<number, string>()
  const table = group(source, 'fonttbl')
  if (!table) return result
  const entries = table.match(/\{\\f\d+[^{}]*;\}/g) ?? []

  for (const entry of entries) {
    const number = /\\f(\d+)/.exec(entry)
    if (!number) continue
    const name = entry
      .replace(/^\{\\f\d+/, '')
      .replace(/\\[a-z]+-?\d* ?/gi, '')
      .replace(/[{};]/g, '')
      .trim()
    if (name) result.set(Number.parseInt(number[1], 10), name)
  }
  return result
}

function colors(source: string): Map<number, string> {
  const result = new Map<number, string>()
  const table = group(source, 'colortbl')
  if (!table) return result
  const body = table.slice(table.indexOf('\\colortbl') + 9, -1)

  for (const [index, entry] of body.split(';').entries()) {
    const red = /\\red(\d+)/i.exec(entry)
    const green = /\\green(\d+)/i.exec(entry)
    const blue = /\\blue(\d+)/i.exec(entry)
    if (!red || !green || !blue) continue
    const hex = [red[1], green[1], blue[1]]
      .map((part) => clamp(Number.parseInt(part, 10), 0, 255).toString(16).padStart(2, '0'))
      .join('')
    result.set(index, `#${hex.toUpperCase()}`)
  }
  return result
}

function decoderName(codePage: number): string {
  const names: Record<number, string> = {
    932: 'shift_jis',
    936: 'gbk',
    949: 'euc-kr',
    950: 'big5',
    65001: 'utf-8'
  }
  return names[codePage] ?? `windows-${codePage}`
}

function decodeBytes(bytes: number[], codePage: number): string {
  if (bytes.length === 0) return ''
  try {
    return new TextDecoder(decoderName(codePage)).decode(Uint8Array.from(bytes))
  } catch {
    return new TextDecoder('windows-1252').decode(Uint8Array.from(bytes))
  }
}

function sameRun(left: GameInfoRun, right: GameInfoRun): boolean {
  return left.font === right.font &&
    left.size === right.size &&
    left.color === right.color &&
    left.background === right.background &&
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strike === right.strike
}

function removePrefix(paragraph: GameInfoParagraph, prefix: RegExp): boolean {
  const first = paragraph.runs[0]
  if (!first) return false
  const match = prefix.exec(first.text)
  if (!match) return false
  first.text = first.text.slice(match[0].length)
  if (!first.text) paragraph.runs.shift()
  return true
}

export function parseRtf(source: string): GameInfoData {
  const fontTable = fonts(source)
  const colorTable = colors(source)
  const defaultNumber = Number.parseInt(/\\deff(\d+)/i.exec(source)?.[1] ?? '0', 10)
  const defaultFont = fontTable.get(defaultNumber) ?? fontTable.values().next().value ?? 'Arial'
  let codePage = Number.parseInt(/\\ansicpg(\d+)/i.exec(source)?.[1] ?? '1252', 10)
  let state: FormatState = {
    skip: false,
    starred: false,
    uc: 1,
    font: defaultFont,
    size: 12,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    align: 'left'
  }
  const stack: FormatState[] = []
  const paragraphs: GameInfoParagraph[] = [{ align: 'left', list: null, runs: [] }]
  let current = paragraphs[0]
  let atStart = true
  let skipFallback = 0

  function add(value: string): void {
    if (!value || state.skip) return
    const next: GameInfoRun = {
      text: value,
      font: state.font,
      size: state.size,
      ...(state.color ? { color: state.color } : {}),
      ...(state.background ? { background: state.background } : {}),
      ...(state.bold ? { bold: true } : {}),
      ...(state.italic ? { italic: true } : {}),
      ...(state.underline ? { underline: true } : {}),
      ...(state.strike ? { strike: true } : {})
    }
    const last = current.runs[current.runs.length - 1]
    if (last && sameRun(last, next)) last.text += value
    else current.runs.push(next)
  }

  function paragraph(): void {
    if (state.skip) return
    current = { align: state.align, list: null, runs: [] }
    paragraphs.push(current)
  }

  for (let index = 0; index < source.length;) {
    const character = source[index]

    if (skipFallback > 0) {
      if (character === '\r' || character === '\n') {
        index += 1
        continue
      }
      if (source.slice(index, index + 2) === "\\'") index += 4
      else if (character === '\\') index += Math.min(2, source.length - index)
      else index += 1
      skipFallback -= 1
      continue
    }

    if (character === '{') {
      stack.push({ ...state })
      state = { ...state, starred: false }
      atStart = true
      index += 1
      continue
    }
    if (character === '}') {
      state = stack.pop() ?? state
      atStart = false
      index += 1
      continue
    }
    if (character === '\r' || character === '\n' || character === '\0') {
      index += 1
      continue
    }

    if (character !== '\\') {
      const code = source.charCodeAt(index)
      if (code >= 128 && code <= 255) {
        const bytes: number[] = []
        while (index < source.length) {
          const value = source.charCodeAt(index)
          if (value < 128 || value > 255) break
          bytes.push(value)
          index += 1
        }
        add(decodeBytes(bytes, codePage))
      } else {
        add(character)
        index += 1
      }
      atStart = false
      continue
    }

    const symbol = source[index + 1]
    if (!symbol) break
    if (symbol === '\\' || symbol === '{' || symbol === '}') {
      add(symbol)
      index += 2
      atStart = false
      continue
    }
    if (symbol === "'") {
      const bytes: number[] = []
      while (source.slice(index, index + 2) === "\\'") {
        const value = Number.parseInt(source.slice(index + 2, index + 4), 16)
        if (!Number.isFinite(value)) break
        bytes.push(value)
        index += 4
      }
      add(decodeBytes(bytes, codePage))
      atStart = false
      continue
    }
    if (!/[a-z]/i.test(symbol)) {
      if (symbol === '*') {
        state.starred = true
      } else if (!state.skip) {
        if (symbol === '~') add('\u00a0')
        else if (symbol === '_') add('\u2011')
      }
      index += 2
      continue
    }

    let end = index + 1
    while (/[a-z]/i.test(source[end] ?? '')) end += 1
    const word = source.slice(index + 1, end).toLowerCase()
    let sign = 1
    if (source[end] === '-') {
      sign = -1
      end += 1
    }
    const numberStart = end
    while (/\d/.test(source[end] ?? '')) end += 1
    const parameter = end > numberStart
      ? sign * Number.parseInt(source.slice(numberStart, end), 10)
      : undefined
    if (source[end] === ' ') end += 1
    index = end

    if (atStart && (state.starred || destinations.has(word))) state.skip = true
    atStart = false
    if (state.skip) continue

    switch (word) {
      case 'ansicpg':
        if (parameter !== undefined) codePage = parameter
        break
      case 'b':
        state.bold = parameter !== 0
        break
      case 'i':
        state.italic = parameter !== 0
        break
      case 'ul':
        state.underline = parameter !== 0
        break
      case 'ulnone':
        state.underline = false
        break
      case 'strike':
        state.strike = parameter !== 0
        break
      case 'f':
        if (parameter !== undefined) state.font = fontTable.get(parameter) ?? state.font
        break
      case 'fs':
        if (parameter !== undefined) state.size = clamp(parameter / 2, 6, 144)
        break
      case 'cf':
        state.color = parameter ? colorTable.get(parameter) : undefined
        break
      case 'highlight':
      case 'cb':
        state.background = parameter ? colorTable.get(parameter) : undefined
        break
      case 'plain':
        state = {
          ...state,
          font: defaultFont,
          size: 12,
          color: undefined,
          background: undefined,
          bold: false,
          italic: false,
          underline: false,
          strike: false
        }
        break
      case 'pard':
      case 'ql':
        state.align = 'left'
        current.align = 'left'
        break
      case 'qc':
        state.align = 'center'
        current.align = 'center'
        break
      case 'qr':
        state.align = 'right'
        current.align = 'right'
        break
      case 'qj':
        state.align = 'justify'
        current.align = 'justify'
        break
      case 'par':
        paragraph()
        break
      case 'line':
        add('\n')
        break
      case 'tab':
        add('\t')
        break
      case 'bullet':
        add('\u2022')
        break
      case 'emdash':
        add('\u2014')
        break
      case 'endash':
        add('\u2013')
        break
      case 'lquote':
        add('\u2018')
        break
      case 'rquote':
        add('\u2019')
        break
      case 'ldblquote':
        add('\u201c')
        break
      case 'rdblquote':
        add('\u201d')
        break
      case 'uc':
        if (parameter !== undefined) state.uc = clamp(parameter, 0, 8)
        break
      case 'u':
        if (parameter !== undefined) {
          add(String.fromCharCode(parameter < 0 ? parameter + 65536 : parameter))
          skipFallback = state.uc
        }
        break
      case 'bin':
        if (parameter !== undefined && parameter > 0) index += parameter
        break
    }
  }

  while (paragraphs.length > 1 && paragraphs.at(-1)?.runs.length === 0) paragraphs.pop()
  for (const item of paragraphs) {
    if (removePrefix(item, /^\u2022\t/)) item.list = 'bullet'
    else if (removePrefix(item, /^\d+\.\t/)) item.list = 'number'
  }
  return normalizeGameInfo({ paragraphs })
}

function rtfText(value: string): string {
  let result = ''
  for (const character of value) {
    if (character === '\\' || character === '{' || character === '}') {
      result += `\\${character}`
      continue
    }
    if (character === '\r') continue
    if (character === '\n') {
      result += '\\line '
      continue
    }
    if (character === '\t') {
      result += '\\tab '
      continue
    }

    const code = character.codePointAt(0) ?? 0
    if (code >= 32 && code <= 126) {
      result += character
      continue
    }
    for (let index = 0; index < character.length; index += 1) {
      const unit = character.charCodeAt(index)
      result += `\\u${unit > 32767 ? unit - 65536 : unit}?`
    }
  }
  return result
}

export function toRtf(value: unknown): string {
  const data = normalizeGameInfo(value)
  const fontList = ['Arial']
  const colorList: string[] = []

  for (const paragraph of data.paragraphs) {
    for (const run of paragraph.runs) {
      if (run.font && !fontList.includes(run.font)) fontList.push(run.font)
      for (const color of [run.color, run.background]) {
        if (color && !colorList.includes(color)) colorList.push(color)
      }
    }
  }

  const fontTable = fontList
    .map((font, index) => `{\\f${index}\\fnil\\fcharset0 ${rtfText(font)};}`)
    .join('')
  const colorTable = colorList.map((color) => {
    const number = Number.parseInt(color.slice(1), 16)
    return `\\red${(number >> 16) & 255}\\green${(number >> 8) & 255}\\blue${number & 255};`
  }).join('')
  const alignControl: Record<GameInfoAlign, string> = {
    left: '\\ql',
    center: '\\qc',
    right: '\\qr',
    justify: '\\qj'
  }
  let number = 1
  let body = ''

  for (const paragraph of data.paragraphs) {
    body += `\\pard${alignControl[paragraph.align]}`
    if (paragraph.list === 'bullet') {
      body += '\\fi-360\\li720{\\pntext\\f0\\bullet\\tab}'
    } else if (paragraph.list === 'number') {
      body += `\\fi-360\\li720{\\pntext\\f0 ${number}.\\tab}`
      number += 1
    } else {
      number = 1
    }

    for (const run of paragraph.runs) {
      const font = Math.max(0, fontList.indexOf(run.font ?? 'Arial'))
      const size = Math.round((run.size ?? 12) * 2)
      let controls = `\\f${font}\\fs${size}`
      if (run.bold) controls += '\\b'
      if (run.italic) controls += '\\i'
      if (run.underline) controls += '\\ul'
      if (run.strike) controls += '\\strike'
      if (run.color) controls += `\\cf${colorList.indexOf(run.color) + 1}`
      if (run.background) controls += `\\highlight${colorList.indexOf(run.background) + 1}`
      body += `{${controls} ${rtfText(run.text)}}`
    }
    body += '\\par\n'
  }

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033` +
    `{\\fonttbl${fontTable}}\n` +
    `{\\colortbl ;${colorTable}}\n` +
    `\\viewkind4\\uc1\n${body}}`
}

export async function loadGameInfo(file: string): Promise<GameInfoData> {
  let data: Buffer
  try {
    data = await readFile(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyData()
    throw error
  }
  if (data.length > maxFileSize) throw new Error('Game Information file is too large')
  const source = data.toString('latin1').replace(/\0+$/g, '')
  if (!/^\s*\{\\rtf\d/i.test(source)) throw new Error('Invalid Game Information RTF file')
  return parseRtf(source)
}

export async function saveGameInfo(file: string, data: unknown): Promise<void> {
  const rtf = toRtf(data)
  if (Buffer.byteLength(rtf, 'ascii') > maxFileSize) {
    throw new Error('Game Information file is too large')
  }
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, Buffer.from(`${rtf}\0`, 'ascii'))
}
