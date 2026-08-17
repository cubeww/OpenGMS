import { execFile } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { FontAtlas, FontData, FontGlyph, FontRange } from '../shared/types'

const fallbackFonts = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Consolas',
  'Courier New',
  'Georgia',
  'Impact',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
]

let fontsPromise: Promise<string[]> | null = null

function command(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => error ? reject(error) : resolve(stdout)
    )
  })
}

function cleanFonts(values: string[]): string[] {
  const unique = new Map<string, string>()
  for (const value of values) {
    const name = value.trim().replace(/\s+/g, ' ')
    if (!name || name.length > 260) continue
    const key = name.toLocaleLowerCase()
    if (!unique.has(key)) unique.set(key, name)
  }
  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  )
}

async function windowsFonts(): Promise<string[]> {
  const script = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Drawing',
    '$fonts = New-Object System.Drawing.Text.InstalledFontCollection',
    'try { $fonts.Families | ForEach-Object { $_.Name } } finally { $fonts.Dispose() }',
    'try { Add-Type -AssemblyName PresentationCore; [System.Windows.Media.Fonts]::SystemFontFamilies | ForEach-Object { $_.Source } } catch {}'
  ].join('; ')
  const output = await command('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ])
  return output.split(/\r?\n/)
}

function collectMacFonts(value: unknown, result: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMacFonts(item, result))
    return
  }
  if (!value || typeof value !== 'object') return
  const item = value as Record<string, unknown>
  if (typeof item.family === 'string') result.push(item.family)
  Object.values(item).forEach((child) => collectMacFonts(child, result))
}

async function macFonts(): Promise<string[]> {
  const output = await command('system_profiler', ['SPFontsDataType', '-json', '-detailLevel', 'mini'])
  const result: string[] = []
  collectMacFonts(JSON.parse(output) as unknown, result)
  return result
}

async function linuxFonts(): Promise<string[]> {
  const output = await command('fc-list', ['--format=%{family}\n'])
  return output.split(/\r?\n/).flatMap((line) => line.split(','))
}

async function readFonts(): Promise<string[]> {
  const values = process.platform === 'win32'
    ? await windowsFonts()
    : process.platform === 'darwin'
      ? await macFonts()
      : process.platform === 'linux'
        ? await linuxFonts()
        : []
  const fonts = cleanFonts(values)
  return fonts.length ? fonts : fallbackFonts
}

export function listFonts(): Promise<string[]> {
  fontsPromise ??= readFonts().catch(() => fallbackFonts)
  return fontsPromise
}

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid font data')
  return Math.min(max, Math.max(min, Math.round(value)))
}

function bool(value: unknown): number {
  if (typeof value !== 'boolean') throw new Error('Invalid font data')
  return value ? -1 : 0
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function setTag(source: string, name: string, value: string | number): string {
  const pattern = new RegExp(`(<${name}>)[\\s\\S]*?(<\\/${name}>)`, 'i')
  if (!pattern.test(source)) throw new Error(`Invalid font file: <${name}> is missing`)
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

function setTextureGroup(source: string, value: string): string {
  const pattern = /(<texgroups>[\s\S]*?<texgroup0>)[\s\S]*?(<\/texgroup0>)/i
  if (!pattern.test(source)) {
    throw new Error('Invalid font file: <texgroups>/<texgroup0> is missing')
  }
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

function normalizeRanges(value: unknown): FontRange[] {
  if (!Array.isArray(value) || value.length > 1024) throw new Error('Invalid font ranges')
  const ranges = value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid font ranges')
    const range = item as FontRange
    const start = int(range.start, 0, 65535)
    const end = int(range.end, 0, 65535)
    return { start: Math.min(start, end), end: Math.max(start, end) }
  }).sort((left, right) => left.start - right.start || left.end - right.end)

  const merged: FontRange[] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end + 1) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}

function setRanges(source: string, ranges: FontRange[]): string {
  const pattern = /<ranges\b[^>]*\/>|<ranges\b[^>]*>[\s\S]*?<\/ranges>/i
  if (!pattern.test(source)) throw new Error('Invalid font file: <ranges> is missing')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const body = ranges.map((range, index) =>
    `    <range${index}>${range.start},${range.end}</range${index}>`
  ).join(eol)
  const section = body ? `<ranges>${eol}${body}${eol}  </ranges>` : '<ranges/>'
  return source.replace(pattern, section)
}

function setGlyphs(source: string, glyphs: FontGlyph[]): string {
  const pattern = /<glyphs\b[^>]*\/>|<glyphs\b[^>]*>[\s\S]*?<\/glyphs>/i
  if (!pattern.test(source)) throw new Error('Invalid font file: <glyphs> is missing')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const body = glyphs.map((glyph) =>
    `    <glyph character="${glyph.character}" x="${glyph.x}" y="${glyph.y}" w="${glyph.width}" h="${glyph.height}" shift="${glyph.shift}" offset="${glyph.offset}"/>`
  ).join(eol)
  const section = body ? `<glyphs>${eol}${body}${eol}  </glyphs>` : '<glyphs/>'
  return source.replace(pattern, section)
}

function exactInt(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error('Invalid font atlas')
  }
  return value
}

function atlasData(value: unknown): { png: Buffer; width: number; height: number; glyphs: FontGlyph[] } {
  if (!value || typeof value !== 'object') throw new Error('Invalid font atlas')
  const atlas = value as FontAtlas
  if (typeof atlas.png !== 'string') throw new Error('Invalid font atlas')
  const match = /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(atlas.png)
  if (!match || match[1].length > 96 * 1024 * 1024) throw new Error('Invalid font atlas')
  const png = Buffer.from(match[1], 'base64')
  if (
    png.length < 24 ||
    png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    png.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('Invalid font atlas PNG')
  }

  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  if (
    width < 1 || height < 1 || width > 4096 || height > 4096 ||
    atlas.width !== width || atlas.height !== height ||
    !Array.isArray(atlas.glyphs) || atlas.glyphs.length > 32768
  ) {
    throw new Error('Invalid font atlas')
  }

  const used = new Set<number>()
  const glyphs = atlas.glyphs.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid font atlas')
    const glyph = item as FontGlyph
    const result = {
      character: exactInt(glyph.character, 0, 65535),
      x: exactInt(glyph.x, 0, width - 1),
      y: exactInt(glyph.y, 0, height - 1),
      width: exactInt(glyph.width, 1, width),
      height: exactInt(glyph.height, 1, height),
      shift: exactInt(glyph.shift, 0, 32767),
      offset: exactInt(glyph.offset, -32768, 32767)
    }
    if (
      used.has(result.character) ||
      result.x + result.width > width ||
      result.y + result.height > height
    ) {
      throw new Error('Invalid font atlas')
    }
    used.add(result.character)
    return result
  }).sort((left, right) => left.character - right.character)

  return { png, width, height, glyphs }
}

export async function saveFont(file: string, value: unknown, atlasValue: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid font data')
  const font = value as FontData
  if (
    typeof font.font !== 'string' ||
    typeof font.ttfName !== 'string' ||
    typeof font.textureGroup !== 'string' ||
    font.font.length < 1 ||
    font.font.length > 260 ||
    font.ttfName.length > 260 ||
    font.textureGroup.length > 128
  ) {
    throw new Error('Invalid font data')
  }

  const ranges = normalizeRanges(font.ranges)
  const atlas = atlasData(atlasValue)
  const expected = new Set<number>()
  for (const range of ranges) {
    for (let character = range.start; character <= range.end; character += 1) {
      expected.add(character)
    }
  }
  if (
    expected.size !== atlas.glyphs.length ||
    atlas.glyphs.some((glyph) => !expected.has(glyph.character))
  ) {
    throw new Error('Font atlas does not match the configured ranges')
  }
  const values: Array<[string, string | number]> = [
    ['name', xml(font.font)],
    ['size', int(font.size, 1, 512)],
    ['bold', bool(font.bold)],
    ['renderhq', bool(font.highQuality)],
    ['italic', bool(font.italic)],
    ['charset', int(font.charset, 0, 255)],
    ['aa', int(font.antiAlias, 0, 3)],
    ['includeTTF', bool(font.includeTtf)],
    ['TTFName', xml(font.ttfName)]
  ]

  const originalSource = await readFile(file, 'utf8')
  let source = originalSource
  for (const [name, data] of values) source = setTag(source, name, data)
  source = setTextureGroup(source, xml(font.textureGroup))
  source = setRanges(source, ranges)
  source = setGlyphs(source, atlas.glyphs)
  source = source.replace(
    /<kerningPairs(?:\s*\/>|>[\s\S]*?<\/kerningPairs>)/i,
    '<kerningPairs/>'
  )

  const imageName = `${basename(file).replace(/\.font\.gmx$/i, '')}.png`
  const imageFile = join(dirname(file), imageName)
  source = setTag(source, 'image', xml(imageName))
  let previousImage: Buffer | null = null
  try {
    previousImage = await readFile(imageFile)
  } catch {
    previousImage = null
  }

  try {
    await writeFile(imageFile, atlas.png)
    await writeFile(file, source, 'utf8')
  } catch (error) {
    try {
      if (previousImage) await writeFile(imageFile, previousImage)
      else await unlink(imageFile)
      await writeFile(file, originalSource, 'utf8')
    } catch {
      // Keep the original error; the best-effort rollback has already failed.
    }
    throw error
  }
}
