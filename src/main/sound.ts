import { readFile, writeFile } from 'node:fs/promises'
import type { SoundData, SoundMode } from '../shared/types'

const modes: SoundMode[] = ['uncompressed', 'compressed', 'decompress', 'streamed']

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid sound data')
  return Math.min(max, Math.max(min, Math.round(value)))
}

function decimal(value: unknown, min: number, max: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid sound data')
  return Math.min(max, Math.max(min, value)).toFixed(3).replace(/\.?0+$/, '')
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
  if (!pattern.test(source)) throw new Error(`Invalid sound file: <${name}> is missing`)
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

function setNestedTag(
  source: string,
  parent: string,
  name: string,
  value: string | number
): string {
  const pattern = new RegExp(
    `(<${parent}>[\\s\\S]*?<${name}>)[\\s\\S]*?(<\\/${name}>)`,
    'i'
  )
  if (!pattern.test(source)) {
    throw new Error(`Invalid sound file: <${parent}>/<${name}> is missing`)
  }
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

export async function saveSound(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid sound data')
  const sound = value as SoundData
  const mode = modes.indexOf(sound.mode)
  if (
    mode < 0 ||
    typeof sound.stereo !== 'boolean' ||
    typeof sound.extension !== 'string' ||
    typeof sound.originName !== 'string' ||
    typeof sound.data !== 'string' ||
    sound.extension.length > 12 ||
    sound.originName.length > 1024 ||
    sound.data.length > 260
  ) {
    throw new Error('Invalid sound data')
  }

  const compressed = sound.mode === 'uncompressed' ? 0 : 1
  const streamed = sound.mode === 'streamed' ? 1 : 0
  const uncompress = sound.mode === 'decompress' ? 1 : 0
  let source = await readFile(file, 'utf8')

  const values: Array<[string, string | number]> = [
    ['kind', int(sound.kind, 0, 3)],
    ['extension', xml(sound.extension)],
    ['origname', xml(sound.originName)],
    ['data', xml(sound.data)],
    ['compressed', compressed],
    ['streamed', streamed],
    ['uncompressOnLoad', uncompress],
    ['audioGroup', int(sound.audioGroup, 0, 32767)]
  ]

  for (const [name, data] of values) source = setTag(source, name, data)
  source = setNestedTag(source, 'volume', 'volume', decimal(sound.volume, 0, 1))
  source = setNestedTag(source, 'bitRates', 'bitRate', int(sound.bitRate, 8, 512))
  source = setNestedTag(source, 'sampleRates', 'sampleRate', int(sound.sampleRate, 8000, 192000))
  source = setNestedTag(source, 'types', 'type', sound.stereo ? 1 : 0)
  source = setNestedTag(source, 'bitDepths', 'bitDepth', int(sound.bitDepth, 8, 32))
  await writeFile(file, source, 'utf8')
}
