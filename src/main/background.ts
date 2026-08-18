import { readFile, writeFile } from 'node:fs/promises'
import { canUseFor3D } from '../shared/image'
import type { BackgroundData } from '../shared/types'

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid background data')
  }
  return Math.min(max, Math.max(min, Math.round(value)))
}

function bool(value: unknown): number {
  if (typeof value !== 'boolean') throw new Error('Invalid background data')
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
  if (!pattern.test(source)) throw new Error(`Invalid background file: <${name}> is missing`)
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

function setTextureGroup(source: string, value: string): string {
  const pattern = /(<TextureGroups>[\s\S]*?<TextureGroup0>)[\s\S]*?(<\/TextureGroup0>)/i
  if (!pattern.test(source)) {
    throw new Error('Invalid background file: <TextureGroups>/<TextureGroup0> is missing')
  }
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

export async function saveBackground(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid background data')
  const background = value as BackgroundData
  if (
    typeof background.textureGroup !== 'string' ||
    typeof background.data !== 'string' ||
    background.textureGroup.length > 128 ||
    background.data.length > 260
  ) {
    throw new Error('Invalid background data')
  }

  const width = int(background.width, 0, 32767)
  const height = int(background.height, 0, 32767)
  const for3D = bool(background.for3D)
  const values: Array<[string, string | number]> = [
    ['istileset', bool(background.tileSet)],
    ['tilewidth', int(background.tileWidth, 0, 32767)],
    ['tileheight', int(background.tileHeight, 0, 32767)],
    ['tilexoff', int(background.tileXOffset, 0, 32767)],
    ['tileyoff', int(background.tileYOffset, 0, 32767)],
    ['tilehsep', int(background.tileHSeparation, 0, 32767)],
    ['tilevsep', int(background.tileVSeparation, 0, 32767)],
    ['HTile', bool(background.tileX)],
    ['VTile', bool(background.tileY)],
    ['For3D', canUseFor3D(width, height) ? for3D : 0],
    ['width', width],
    ['height', height],
    ['data', xml(background.data)]
  ]

  let source = await readFile(file, 'utf8')
  for (const [name, data] of values) source = setTag(source, name, data)
  source = setTextureGroup(source, xml(background.textureGroup))
  await writeFile(file, source, 'utf8')
}
