import type { FontAtlas, FontData, FontGlyph } from '../../shared/types'

type Measure = {
  character: number
  text: string
  width: number
  left: number
  right: number
  ascent: number
  descent: number
}

type Bitmap = {
  character: number
  width: number
  height: number
  shift: number
  offset: number
  pixels: ImageData
}

type Packed = {
  width: number
  height: number
  positions: Map<number, { x: number; y: number }>
}

const maxGlyphs = 32768
const maxAtlasSize = 4096
const padding = 2

function familyName(value: string): string {
  return value.replace(/["\\]/g, '').trim()
}

function fontCss(font: FontData, pixels: number): string {
  const italic = font.italic ? 'italic ' : ''
  const weight = font.bold ? '700' : '400'
  return `${italic}${weight} ${pixels}px "${familyName(font.font)}"`
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = canvas.getContext('2d', { willReadFrequently: true })
  if (!result) throw new Error('Canvas is unavailable')
  return result
}

function measureWidth(paint: CanvasRenderingContext2D, font: string): number {
  paint.font = `72px ${font}`
  return paint.measureText('mmmmmmmmmwwwwwWWWWW0123456789').width
}

function fontAvailable(name: string): boolean {
  const generic = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'])
  if (generic.has(name.toLowerCase())) return true
  const paint = context(document.createElement('canvas'))
  const safe = `"${familyName(name)}"`
  const mono = measureWidth(paint, 'monospace')
  const serif = measureWidth(paint, 'serif')
  return Math.abs(measureWidth(paint, `${safe}, monospace`) - mono) > 0.01 ||
    Math.abs(measureWidth(paint, `${safe}, serif`) - serif) > 0.01
}

function codes(font: FontData): number[] {
  let count = 0
  for (const range of font.ranges) count += Math.abs(range.end - range.start) + 1
  if (count > maxGlyphs) {
    throw new Error(`Font range contains ${count} glyphs; the current limit is ${maxGlyphs}`)
  }

  const result = new Set<number>()
  for (const range of font.ranges) {
    const start = Math.max(0, Math.min(65535, Math.min(range.start, range.end)))
    const end = Math.max(0, Math.min(65535, Math.max(range.start, range.end)))
    for (let code = start; code <= end; code += 1) result.add(code)
  }
  return Array.from(result).sort((left, right) => left - right)
}

function metric(value: TextMetrics, name: 'fontBoundingBoxAscent' | 'fontBoundingBoxDescent'): number {
  const result = (value as TextMetrics & Record<typeof name, number>)[name]
  return Number.isFinite(result) ? result : 0
}

function quantize(image: ImageData, antiAlias: number): void {
  if (antiAlias >= 3) return
  const levels = antiAlias <= 0 ? 1 : antiAlias === 1 ? 4 : 16
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = Math.round((image.data[index + 3] / 255) * levels) * (255 / levels)
    image.data[index] = alpha ? 255 : 0
    image.data[index + 1] = alpha ? 255 : 0
    image.data[index + 2] = alpha ? 255 : 0
    image.data[index + 3] = Math.round(alpha)
  }
}

async function rasterize(
  font: FontData,
  onProgress?: (done: number, total: number) => void
): Promise<Bitmap[]> {
  const characters = codes(font)
  const pixels = Math.max(1, font.size * (96 / 72))
  const css = fontCss(font, pixels)
  await document.fonts.load(css, 'Hamburgefontsiv 0123456789')
  await document.fonts.ready
  if (!fontAvailable(font.font)) {
    throw new Error(`Font "${font.font}" is not installed on this system`)
  }

  const canvas = document.createElement('canvas')
  const paint = context(canvas)
  paint.font = css
  paint.textBaseline = 'alphabetic'
  const measures: Measure[] = []
  let ascent = 1
  let descent = 1

  for (const character of characters) {
    const text = String.fromCharCode(character)
    const value = paint.measureText(text)
    const item = {
      character,
      text,
      width: Math.max(0, value.width),
      left: Math.max(0, value.actualBoundingBoxLeft),
      right: Math.max(0, value.actualBoundingBoxRight),
      ascent: Math.max(0, value.actualBoundingBoxAscent),
      descent: Math.max(0, value.actualBoundingBoxDescent)
    }
    measures.push(item)
    ascent = Math.max(ascent, Math.ceil(metric(value, 'fontBoundingBoxAscent')), Math.ceil(item.ascent))
    descent = Math.max(descent, Math.ceil(metric(value, 'fontBoundingBoxDescent')), Math.ceil(item.descent))
  }

  if (characters.length === 0) {
    const sample = paint.measureText('Mg_')
    ascent = Math.max(ascent, Math.ceil(metric(sample, 'fontBoundingBoxAscent')), Math.ceil(sample.actualBoundingBoxAscent))
    descent = Math.max(descent, Math.ceil(metric(sample, 'fontBoundingBoxDescent')), Math.ceil(sample.actualBoundingBoxDescent))
  }

  const lineHeight = Math.max(1, ascent + descent)
  const result: Bitmap[] = []

  for (let index = 0; index < measures.length; index += 1) {
    const item = measures[index]
    const side = 4
    const drawX = side + Math.ceil(item.left)
    canvas.width = Math.max(8, Math.ceil(drawX + Math.max(item.width, item.right) + side))
    canvas.height = lineHeight + side * 2
    const draw = context(canvas)
    draw.font = css
    draw.textBaseline = 'alphabetic'
    draw.fillStyle = '#ffffff'
    draw.fillText(item.text, drawX, side + ascent)

    const source = draw.getImageData(0, 0, canvas.width, canvas.height)
    let minX = canvas.width
    let maxX = -1
    let maxY = -1
    for (let y = side; y < side + lineHeight; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (source.data[(y * canvas.width + x) * 4 + 3] === 0) continue
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    const shift = Math.max(0, Math.round(item.width))
    if (maxX < minX || maxY < side) {
      const width = Math.max(1, shift)
      result.push({
        character: item.character,
        width,
        height: lineHeight,
        shift,
        offset: 0,
        pixels: new ImageData(width, lineHeight)
      })
    } else {
      const width = maxX - minX + 1
      const height = Math.max(1, Math.min(lineHeight, maxY - side + 2))
      const image = draw.getImageData(minX, side, width, height)
      quantize(image, font.antiAlias)
      result.push({
        character: item.character,
        width,
        height,
        shift,
        offset: minX - drawX,
        pixels: image
      })
    }

    if ((index + 1) % 64 === 0) {
      onProgress?.(index + 1, measures.length)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }
  }
  onProgress?.(measures.length, measures.length)
  return result
}

function nextPower(value: number): number {
  let result = 1
  while (result < value) result *= 2
  return result
}

function packWidth(glyphs: Bitmap[], width: number): Packed | null {
  const sorted = [...glyphs].sort((left, right) =>
    right.height - left.height || right.width - left.width || left.character - right.character
  )
  const positions = new Map<number, { x: number; y: number }>()
  let x = padding
  let y = padding
  let rowHeight = 0

  for (const glyph of sorted) {
    if (glyph.width + padding * 2 > width) return null
    if (x + glyph.width + padding > width) {
      x = padding
      y += rowHeight + padding
      rowHeight = 0
    }
    positions.set(glyph.character, { x, y })
    x += glyph.width + padding
    rowHeight = Math.max(rowHeight, glyph.height)
  }

  const height = nextPower(Math.max(64, y + rowHeight + padding))
  return height <= maxAtlasSize ? { width, height, positions } : null
}

function pack(glyphs: Bitmap[]): Packed {
  let best: Packed | null = null
  for (let width = 64; width <= maxAtlasSize; width *= 2) {
    const current = packWidth(glyphs, width)
    if (!current) continue
    if (
      !best ||
      current.width * current.height < best.width * best.height ||
      (current.width * current.height === best.width * best.height && current.width < best.width)
    ) {
      best = current
    }
  }
  if (!best) throw new Error(`Glyphs do not fit in a ${maxAtlasSize} × ${maxAtlasSize} atlas`)
  return best
}

export async function bakeFont(
  font: FontData,
  onProgress?: (done: number, total: number) => void
): Promise<FontAtlas> {
  const bitmaps = await rasterize(font, onProgress)
  const packed = pack(bitmaps)
  const canvas = document.createElement('canvas')
  canvas.width = packed.width
  canvas.height = packed.height
  const paint = context(canvas)
  const glyphs: FontGlyph[] = []

  for (const bitmap of bitmaps) {
    const position = packed.positions.get(bitmap.character)
    if (!position) throw new Error('Could not pack a font glyph')
    paint.putImageData(bitmap.pixels, position.x, position.y)
    glyphs.push({
      character: bitmap.character,
      x: position.x,
      y: position.y,
      width: bitmap.width,
      height: bitmap.height,
      shift: bitmap.shift,
      offset: bitmap.offset
    })
  }

  return {
    png: canvas.toDataURL('image/png'),
    width: packed.width,
    height: packed.height,
    glyphs
  }
}
