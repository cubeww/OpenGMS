import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type { PathData, PathPoint } from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

function tag(node: XmlElement): string {
  return (node.localName || node.nodeName).toLowerCase()
}

function children(node: XmlElement): XmlElement[] {
  const result: XmlElement[] = []
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const item = node.childNodes.item(index)
    if (item?.nodeType === 1) result.push(item as XmlElement)
  }
  return result
}

function child(node: XmlElement, name: string): XmlElement | undefined {
  const wanted = name.toLowerCase()
  return children(node).find((item) => tag(item) === wanted)
}

function text(node: XmlElement | undefined): string {
  return node?.textContent?.trim() ?? ''
}

function number(node: XmlElement, name: string, fallback = 0): number {
  const value = Number.parseFloat(text(child(node, name)))
  return Number.isFinite(value) ? value : fallback
}

function readPoint(node: XmlElement): PathPoint | undefined {
  const values = text(node).split(',').map((value) => Number.parseFloat(value.trim()))
  if (values.length < 3 || values.some((value) => !Number.isFinite(value))) return undefined
  return { x: values[0], y: values[1], speed: values[2] }
}

export async function loadPath(file: string): Promise<PathData | undefined> {
  try {
    const source = await readFile(file, 'utf8')
    const root = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    ).documentElement
    if (!root || tag(root) !== 'path') return undefined
    const kind = number(root, 'kind', 1) === 0 ? 0 : 1
    const pointRoot = child(root, 'points')
    const points = pointRoot
      ? children(pointRoot).filter((item) => tag(item) === 'point').flatMap((item) => {
          const point = readPoint(item)
          return point ? [point] : []
        })
      : []
    return {
      kind,
      closed: number(root, 'closed') !== 0,
      precision: Math.max(1, Math.min(8, Math.trunc(number(root, 'precision', 4)))),
      backgroundRoom: Math.trunc(number(root, 'backroom', -1)),
      snapX: Math.max(1, Math.trunc(number(root, 'hsnap', 32))),
      snapY: Math.max(1, Math.trunc(number(root, 'vsnap', 32))),
      points
    }
  } catch {
    return undefined
  }
}

function finite(value: unknown, min = -1000000000, max = 1000000000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error('Invalid path value')
  }
  return value
}

function int(value: unknown, min: number, max: number): number {
  const result = finite(value, min, max)
  if (!Number.isInteger(result)) throw new Error('Invalid path value')
  return result
}

function pathXml(path: PathData, eol: string): string {
  if (!Array.isArray(path.points) || path.points.length > 100000) {
    throw new Error('Invalid path data')
  }
  const lines = [
    '<path>',
    `  <kind>${path.kind === 0 ? 0 : 1}</kind>`,
    `  <closed>${path.closed ? -1 : 0}</closed>`,
    `  <precision>${int(path.precision, 1, 8)}</precision>`,
    `  <backroom>${int(path.backgroundRoom, -1, 1000000)}</backroom>`,
    `  <hsnap>${int(path.snapX, 1, 1000000)}</hsnap>`,
    `  <vsnap>${int(path.snapY, 1, 1000000)}</vsnap>`
  ]
  if (path.points.length === 0) {
    lines.push('  <points/>')
  } else {
    lines.push('  <points>')
    for (const point of path.points) {
      if (!point || typeof point !== 'object') throw new Error('Invalid path point')
      const x = finite(point.x)
      const y = finite(point.y)
      const speed = finite(point.speed, -1000000, 1000000)
      lines.push(`    <point>${x},${y},${speed}</point>`)
    }
    lines.push('  </points>')
  }
  lines.push('</path>')
  return lines.join(eol)
}

export async function savePath(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid path data')
  const path = value as PathData
  const source = await readFile(file, 'utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const root = /<path(?:\s[^>]*)?\/>|<path(?:\s[^>]*)?>[\s\S]*?<\/path>/i
  if (!root.test(source)) throw new Error('Invalid path file: <path> is missing')
  await writeFile(file, source.replace(root, pathXml(path, eol)), 'utf8')
}
