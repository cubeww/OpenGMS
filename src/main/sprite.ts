import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import type { SpriteData, SpriteFramesFile, SpriteShape } from '../shared/types'

const shapes: SpriteShape[] = ['precise', 'rectangle', 'ellipse', 'diamond']

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid sprite data')
  return Math.min(max, Math.max(min, Math.round(value)))
}

function bool(value: unknown): number {
  if (typeof value !== 'boolean') throw new Error('Invalid sprite data')
  return value ? -1 : 0
}

function setTag(source: string, name: string, value: string | number): string {
  const pattern = new RegExp(`(<${name}>)[\\s\\S]*?(<\\/${name}>)`, 'i')
  if (!pattern.test(source)) throw new Error(`Invalid sprite file: <${name}> is missing`)
  return source.replace(pattern, `$1${value}$2`)
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inside(folder: string, file: string): boolean {
  const path = relative(resolve(folder), resolve(file))
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function png(value: unknown): { data: Buffer; width: number; height: number } {
  if (typeof value !== 'string' || value.length > 96 * 1024 * 1024) {
    throw new Error('Invalid sprite frame image')
  }
  const match = /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(value)
  if (!match) throw new Error('Invalid sprite frame image')
  const data = Buffer.from(match[1], 'base64')
  if (
    data.length < 24 ||
    data.length > 64 * 1024 * 1024 ||
    data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    data.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('Invalid sprite frame PNG')
  }
  const width = data.readUInt32BE(16)
  const height = data.readUInt32BE(20)
  if (width < 1 || height < 1 || width > 32767 || height > 32767) {
    throw new Error('Unsupported sprite frame size')
  }
  return { data, width, height }
}

function setFrames(source: string, file: string, projectFolder: string, sprite: SpriteData): string {
  if (!Array.isArray(sprite.frames) || sprite.frames.length > 2048) {
    throw new Error('Invalid sprite frames')
  }
  const used = new Set<number>()
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = sprite.frames.map((frame, position) => {
    const index = Number.isInteger(frame.index) ? frame.index : position
    if (index < 0 || index > 32767 || used.has(index) || typeof frame.image !== 'string') {
      throw new Error('Invalid sprite frame')
    }
    used.add(index)
    const image = resolve(projectFolder, ...frame.image.replace(/\\/g, '/').split('/').filter(Boolean))
    if (!inside(projectFolder, image) || extname(image).toLowerCase() !== '.png') {
      throw new Error('Invalid sprite frame path')
    }
    const path = relative(dirname(file), image).replace(/\//g, '\\')
    return `    <frame index="${index}">${xml(path)}</frame>`
  })
  const frames = lines.length > 0
    ? `<frames>${eol}${lines.join(eol)}${eol}  </frames>`
    : '<frames/>'
  const pattern = /<frames\b[^>]*\/>|<frames\b[^>]*>[\s\S]*?<\/frames>/i
  if (!pattern.test(source)) throw new Error('Invalid sprite file: <frames> is missing')
  return source.replace(pattern, frames)
}

export async function writeSpriteFrames(
  file: string,
  projectFolder: string,
  value: unknown
): Promise<SpriteFramesFile> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2048) {
    throw new Error('Invalid sprite strip')
  }
  const images = value.map(png)
  const width = images[0].width
  const height = images[0].height
  if (images.some((image) => image.width !== width || image.height !== height)) {
    throw new Error('Sprite strip frames must have the same size')
  }
  const total = images.reduce((size, image) => size + image.data.length, 0)
  if (total > 256 * 1024 * 1024) throw new Error('Sprite strip is too large')

  const folder = resolve(dirname(file), 'images')
  if (!inside(projectFolder, folder)) throw new Error('Invalid sprite image folder')
  const name = basename(file).replace(/\.sprite\.gmx$/i, '')
  let batch = 0
  let targets: string[]
  do {
    targets = images.map((_, index) => resolve(folder, `${name}_strip${batch}_${index}.png`))
    batch += 1
  } while (targets.some((target) => existsSync(target)))

  try {
    await mkdir(folder, { recursive: true })
    for (let index = 0; index < images.length; index += 1) {
      await writeFile(targets[index], images[index].data)
    }
  } catch (error) {
    await Promise.allSettled(targets.map((target) => rm(target, { force: true })))
    throw error
  }

  return {
    width,
    height,
    frames: targets.map((target, index) => ({
      index,
      image: relative(projectFolder, target).replace(/\\/g, '/'),
      missing: false
    }))
  }
}

export async function saveSprite(file: string, projectFolder: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid sprite data')
  const sprite = value as SpriteData
  const shape = shapes.indexOf(sprite.shape)
  const boxMode = ['auto', 'full', 'manual'].indexOf(sprite.boxMode)
  if (shape < 0 || boxMode < 0 || !sprite.box || typeof sprite.textureGroup !== 'string') {
    throw new Error('Invalid sprite data')
  }

  const values: Array<[string, string | number]> = [
    ['width', int(sprite.width, 0, 32767)],
    ['height', int(sprite.height, 0, 32767)],
    ['xorig', int(sprite.xOrigin, -32768, 32767)],
    ['yorigin', int(sprite.yOrigin, -32768, 32767)],
    ['colkind', shape],
    ['coltolerance', int(sprite.tolerance, 0, 255)],
    ['sepmasks', bool(sprite.separateMasks)],
    ['bboxmode', boxMode],
    ['bbox_left', int(sprite.box.left, 0, 32767)],
    ['bbox_right', int(sprite.box.right, 0, 32767)],
    ['bbox_top', int(sprite.box.top, 0, 32767)],
    ['bbox_bottom', int(sprite.box.bottom, 0, 32767)],
    ['HTile', bool(sprite.tileX)],
    ['VTile', bool(sprite.tileY)],
    ['For3D', bool(sprite.for3D)]
  ]

  let source = await readFile(file, 'utf8')
  for (const [name, data] of values) source = setTag(source, name, data)
  source = setFrames(source, file, projectFolder, sprite)
  await writeFile(file, source, 'utf8')
}
