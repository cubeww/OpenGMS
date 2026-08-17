import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import type { ActionInfo, ActionLibrary } from '../shared/types'

class Reader {
  private pos = 0

  constructor(private readonly data: Buffer) {}

  byte(): number {
    this.need(1)
    return this.data[this.pos++]
  }

  uint3(): number {
    this.need(3)
    const value = this.data[this.pos] | (this.data[this.pos + 1] << 8) | (this.data[this.pos + 2] << 16)
    this.pos += 3
    return value
  }

  uint(): number {
    this.need(4)
    const value = this.data.readUInt32LE(this.pos)
    this.pos += 4
    return value
  }

  bool(): boolean {
    const value = this.uint()
    if (value !== 0 && value !== 1) throw new Error('Invalid action library boolean')
    return value === 1
  }

  string(): string {
    return this.bytes(this.uint()).toString('latin1')
  }

  bytes(size: number): Buffer {
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('Invalid action library size')
    this.need(size)
    const value = this.data.subarray(this.pos, this.pos + size)
    this.pos += size
    return value
  }

  skip(size: number): void {
    void this.bytes(size)
  }

  private need(size: number): void {
    if (this.pos + size > this.data.length) throw new Error('Unexpected end of action library')
  }
}

let crcTable: Uint32Array | null = null

function crc(data: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let index = 0; index < 256; index += 1) {
      let value = index
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1
      }
      crcTable[index] = value >>> 0
    }
  }

  let value = 0xffffffff
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function pngChunk(name: string, data: Buffer): Buffer {
  const type = Buffer.from(name, 'ascii')
  const size = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  const check = Buffer.alloc(4)
  check.writeUInt32BE(crc(Buffer.concat([type, data])))
  return Buffer.concat([size, type, data, check])
}

function bmpPng(data: Buffer): string {
  if (data.length < 54 || data.toString('ascii', 0, 2) !== 'BM') {
    throw new Error('Invalid action icon')
  }

  const offset = data.readUInt32LE(10)
  const width = data.readInt32LE(18)
  const sourceHeight = data.readInt32LE(22)
  const height = Math.abs(sourceHeight)
  const bits = data.readUInt16LE(28)
  const compression = data.readUInt32LE(30)
  if (width < 1 || height < 1 || width > 256 || height > 256 || bits !== 32 || compression !== 0) {
    throw new Error('Unsupported action icon')
  }

  const rowSize = width * 4
  if (offset + rowSize * height > data.length) throw new Error('Invalid action icon')
  const iconWidth = Math.min(24, width)
  const iconHeight = Math.min(24, height)

  function pixel(x: number, y: number): [number, number, number] {
    const row = sourceHeight > 0 ? height - 1 - y : y
    const start = offset + row * rowSize + x * 4
    return [data[start + 2], data[start + 1], data[start]]
  }

  const key = pixel(0, height - 1)
  const raw = Buffer.alloc((iconWidth * 4 + 1) * iconHeight)
  for (let y = 0; y < iconHeight; y += 1) {
    const row = y * (iconWidth * 4 + 1)
    for (let x = 0; x < iconWidth; x += 1) {
      const [red, green, blue] = pixel(x, y)
      const target = row + 1 + x * 4
      raw[target] = red
      raw[target + 1] = green
      raw[target + 2] = blue
      raw[target + 3] = red === key[0] && green === key[1] && blue === key[2] ? 0 : 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(iconWidth, 0)
  header.writeUInt32BE(iconHeight, 4)
  header[8] = 8
  header[9] = 6
  const png = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
  return `data:image/png;base64,${png.toString('base64')}`
}

function parseLibrary(data: Buffer): ActionLibrary {
  const input = new Reader(data)
  const version = input.uint3()
  if ((version !== 500 && version !== 520) || input.byte() !== 0) {
    throw new Error('Unsupported action library')
  }

  const name = input.string()
  const id = input.uint()
  input.skip(input.uint())
  input.skip(4)
  input.skip(8)
  input.skip(input.uint())
  input.skip(input.uint())
  const advanced = input.bool()
  input.skip(4)
  const count = input.uint()
  if (count > 2048) throw new Error('Invalid action library')
  const actions: ActionInfo[] = []

  for (let index = 0; index < count; index += 1) {
    const actionVersion = input.uint()
    if (actionVersion !== 500 && actionVersion !== 520) throw new Error('Unsupported action entry')
    const actionName = input.string()
    const actionId = input.uint()
    const iconData = input.bytes(input.uint())
    const hidden = input.bool()
    input.bool()
    if (actionVersion === 520) input.bool()
    const description = input.string()
    const listText = input.string()
    const hintText = input.string()
    const kind = input.uint()
    const interfaceKind = input.uint()
    const question = input.bool()
    const canApply = input.bool()
    const canRelative = input.bool()
    const argCount = input.uint()
    const storedArgs = input.uint()
    if (argCount > 64 || storedArgs > 64) throw new Error('Invalid action arguments')
    const args = Array.from({ length: storedArgs }, () => ({
      caption: input.string(),
      kind: input.uint(),
      defaultValue: input.string(),
      menu: input.string().split('|').filter(Boolean)
    }))
    while (args.length < argCount) {
      args.push({ caption: `Argument ${args.length + 1}`, kind: 0, defaultValue: '', menu: [] })
    }
    const execType = input.uint()
    const functionName = input.string()
    const code = input.string()

    if (!hidden && kind < 8) {
      let icon: string | undefined
      try {
        icon = bmpPng(iconData)
      } catch {
        icon = `data:image/bmp;base64,${iconData.toString('base64')}`
      }
      actions.push({
        libraryId: id,
        id: actionId,
        name: actionName.replace(/_/g, ' ').trim() || `Action ${actionId}`,
        description,
        listText,
        hintText,
        kind,
        interfaceKind,
        question,
        canApply,
        canRelative,
        execType,
        execInfo: execType === 1 ? functionName : execType === 2 ? code : '',
        args: args.slice(0, argCount),
        icon
      })
    }
  }

  return { id, name, advanced, actions }
}

export async function loadActionLibraries(folder: string): Promise<ActionLibrary[]> {
  const files = (await readdir(folder))
    .filter((file) => file.toLowerCase().endsWith('.lib'))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))
  const libraries: ActionLibrary[] = []

  for (const file of files) {
    const data = await readFile(join(folder, file))
    if (data.length > 8 * 1024 * 1024) throw new Error(`Action library is too large: ${file}`)
    libraries.push(parseLibrary(data))
  }
  return libraries
}
