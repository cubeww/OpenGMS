import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type { TimelineData, TimelineMoment } from '../shared/types'
import { actionXml, readAction } from './object'

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

function step(node: XmlElement): number | undefined {
  const value = Number.parseInt(text(child(node, 'step')), 10)
  return Number.isFinite(value) ? value : undefined
}

function sortedMoments(moments: TimelineMoment[]): TimelineMoment[] {
  const result: TimelineMoment[] = []
  for (const moment of [...moments].sort((left, right) => left.step - right.step)) {
    const last = result[result.length - 1]
    if (last?.step === moment.step) last.actions.push(...moment.actions)
    else result.push({ step: moment.step, actions: [...moment.actions] })
  }
  return result
}

export async function loadTimeline(file: string): Promise<TimelineData | undefined> {
  try {
    const source = await readFile(file, 'utf8')
    const root = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    ).documentElement
    if (!root || tag(root) !== 'timeline') return undefined

    const moments = children(root).flatMap<TimelineMoment>((entry) => {
      if (tag(entry) !== 'entry') return []
      const value = step(entry)
      if (value === undefined) return []
      const event = child(entry, 'event')
      const actions = event
        ? children(event).filter((item) => tag(item) === 'action').map(readAction)
        : []
      return [{ step: value, actions }]
    })
    return { moments: sortedMoments(moments) }
  } catch {
    return undefined
  }
}

function int(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < -0x80000000 ||
    value > 0x7fffffff
  ) {
    throw new Error('Invalid timeline moment')
  }
  return value
}

function entriesXml(moments: TimelineMoment[], eol: string): string {
  if (!Array.isArray(moments) || moments.length > 65536) throw new Error('Invalid timeline data')
  const lines = ['<timeline>']

  for (const moment of sortedMoments(moments)) {
    if (!moment || !Array.isArray(moment.actions) || moment.actions.length > 4096) {
      throw new Error('Invalid timeline moment')
    }
    lines.push('  <entry>')
    lines.push(`    <step>${int(moment.step)}</step>`)
    if (moment.actions.length === 0) {
      lines.push('    <event/>')
    } else {
      lines.push('    <event>')
      for (const action of moment.actions) {
        lines.push(actionXml(action, '      ', eol))
      }
      lines.push('    </event>')
    }
    lines.push('  </entry>')
  }
  lines.push('</timeline>')
  return lines.join(eol)
}

export async function saveTimeline(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid timeline data')
  const timeline = value as TimelineData
  if (!Array.isArray(timeline.moments)) throw new Error('Invalid timeline data')

  const source = await readFile(file, 'utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const root = /<timeline(?:\s[^>]*)?\/>|<timeline(?:\s[^>]*)?>[\s\S]*?<\/timeline>/i
  if (!root.test(source)) throw new Error('Invalid timeline file: <timeline> is missing')
  await writeFile(file, source.replace(root, entriesXml(timeline.moments, eol)), 'utf8')
}
