import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type {
  ActionArg,
  ObjectAction,
  ObjectData,
  ObjectEvent,
  ObjectPhysics
} from '../shared/types'

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

function text(node: XmlElement | undefined, trim = true): string {
  const value = node?.textContent ?? ''
  return trim ? value.trim() : value
}

function number(root: XmlElement, name: string, fallback = 0): number {
  const value = Number.parseFloat(text(child(root, name)))
  return Number.isFinite(value) ? value : fallback
}

function flag(root: XmlElement, name: string): boolean {
  return number(root, name) !== 0
}

function resource(value: string): string {
  const name = value.trim()
  return name === '<undefined>' || name === 'self' ? '' : name
}

export function readAction(node: XmlElement): ObjectAction {
  const argsNode = child(node, 'arguments')
  const args: ActionArg[] = (argsNode ? children(argsNode) : [])
    .filter((item) => tag(item) === 'argument')
    .map((item) => {
      const valueNode = children(item).find((part) => tag(part) !== 'kind')
      return {
        kind: Math.round(number(item, 'kind')),
        value: text(valueNode, false)
      }
    })

  return {
    libId: Math.round(number(node, 'libid')),
    id: Math.round(number(node, 'id')),
    kind: Math.round(number(node, 'kind')),
    canRelative: flag(node, 'userelative'),
    question: flag(node, 'isquestion'),
    canApply: flag(node, 'useapplyto'),
    execType: Math.round(number(node, 'exetype')),
    functionName: text(child(node, 'functionname'), false),
    code: text(child(node, 'codestring'), false),
    appliesTo: text(child(node, 'whoName')) || 'self',
    relative: flag(node, 'relative'),
    not: flag(node, 'isnot'),
    args
  }
}

function readEvent(node: XmlElement): ObjectEvent {
  const type = Number.parseInt(node.getAttribute('eventtype') ?? '', 10)
  const eventNumber = Number.parseInt(node.getAttribute('enumb') ?? '', 10)
  return {
    type: Number.isFinite(type) ? type : 0,
    number: Number.isFinite(eventNumber) ? eventNumber : 0,
    target: resource(node.getAttribute('ename') ?? ''),
    actions: children(node).filter((item) => tag(item) === 'action').map(readAction)
  }
}

export async function loadObject(file: string): Promise<ObjectData | undefined> {
  try {
    const source = await readFile(file, 'utf8')
    const root = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    ).documentElement
    if (!root || tag(root) !== 'object') return undefined
    const eventsNode = child(root, 'events')
    const pointNode = child(root, 'PhysicsShapePoints')
    const points = (pointNode ? children(pointNode) : []).flatMap((item) => {
      const [xText, yText] = text(item).split(',')
      const x = Number.parseFloat(xText)
      const y = Number.parseFloat(yText)
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : []
    })

    return {
      sprite: resource(text(child(root, 'spriteName'))),
      solid: flag(root, 'solid'),
      visible: flag(root, 'visible'),
      depth: Math.round(number(root, 'depth')),
      persistent: flag(root, 'persistent'),
      parent: resource(text(child(root, 'parentName'))),
      mask: resource(text(child(root, 'maskName'))),
      events: (eventsNode ? children(eventsNode) : [])
        .filter((item) => tag(item) === 'event')
        .map(readEvent),
      physics: {
        enabled: flag(root, 'PhysicsObject'),
        sensor: flag(root, 'PhysicsObjectSensor'),
        shape: Math.round(number(root, 'PhysicsObjectShape')),
        density: number(root, 'PhysicsObjectDensity', 0.5),
        restitution: number(root, 'PhysicsObjectRestitution', 0.1),
        group: Math.round(number(root, 'PhysicsObjectGroup')),
        linearDamping: number(root, 'PhysicsObjectLinearDamping', 0.1),
        angularDamping: number(root, 'PhysicsObjectAngularDamping', 0.1),
        friction: number(root, 'PhysicsObjectFriction', 0.2),
        awake: flag(root, 'PhysicsObjectAwake'),
        kinematic: flag(root, 'PhysicsObjectKinematic'),
        points
      }
    }
  } catch {
    return undefined
  }
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function bool(value: unknown): number {
  if (typeof value !== 'boolean') throw new Error('Invalid object data')
  return value ? -1 : 0
}

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid object data')
  return Math.min(max, Math.max(min, Math.round(value)))
}

function finite(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid object data')
  return Math.min(max, Math.max(min, value))
}

function name(value: unknown): string {
  if (typeof value !== 'string' || value.length > 260 || /[\0\r\n<>]/.test(value)) {
    throw new Error('Invalid object resource name')
  }
  return value || '<undefined>'
}

function setTag(source: string, tagName: string, value: string | number): string {
  const pattern = new RegExp(`(<${tagName}>)[\\s\\S]*?(<\\/${tagName}>)`, 'i')
  if (!pattern.test(source)) throw new Error(`Invalid object file: <${tagName}> is missing`)
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

const argumentTags: Record<number, string> = {
  5: 'sprite',
  6: 'sound',
  7: 'background',
  8: 'path',
  9: 'script',
  10: 'object',
  11: 'room',
  12: 'font',
  14: 'timeline'
}

function cleanLineEndings(value: string, eol: string): string {
  return value.replace(/\r\n|\r|\n/g, eol)
}

export function actionXml(action: ObjectAction, indent: string, eol: string): string {
  const fields = [
    ['libid', int(action.libId, 0, 0x7fffffff)],
    ['id', int(action.id, 0, 0x7fffffff)],
    ['kind', int(action.kind, 0, 10)],
    ['userelative', bool(action.canRelative)],
    ['isquestion', bool(action.question)],
    ['useapplyto', bool(action.canApply)],
    ['exetype', int(action.execType, 0, 2)],
    ['functionname', xml(cleanLineEndings(action.functionName, eol))],
    ['codestring', xml(cleanLineEndings(action.code, eol))],
    ['whoName', xml(action.appliesTo || 'self')],
    ['relative', bool(action.relative)],
    ['isnot', bool(action.not)]
  ] as const
  const lines = [`${indent}<action>`]
  for (const [field, value] of fields) lines.push(`${indent}  <${field}>${value}</${field}>`)

  if (action.args.length === 0) {
    lines.push(`${indent}  <arguments/>`)
  } else {
    lines.push(`${indent}  <arguments>`)
    for (const arg of action.args) {
      if (!arg || typeof arg.value !== 'string' || arg.value.length > 16 * 1024 * 1024) {
        throw new Error('Invalid action argument')
      }
      const kind = int(arg.kind, 0, 15)
      const valueTag = argumentTags[kind] ?? 'string'
      const value = xml(cleanLineEndings(arg.value, eol))
      lines.push(`${indent}    <argument>`)
      lines.push(`${indent}      <kind>${kind}</kind>`)
      lines.push(`${indent}      <${valueTag}>${value}</${valueTag}>`)
      lines.push(`${indent}    </argument>`)
    }
    lines.push(`${indent}  </arguments>`)
  }
  lines.push(`${indent}</action>`)
  return lines.join(eol)
}

function eventsXml(events: ObjectEvent[], eol: string): string {
  if (!Array.isArray(events) || events.length > 4096) throw new Error('Invalid object events')
  if (events.length === 0) return '<events/>'
  const seen = new Set<string>()
  const lines = ['<events>']

  for (const event of events) {
    if (!event || !Array.isArray(event.actions) || event.actions.length > 4096) {
      throw new Error('Invalid object event')
    }
    const type = int(event.type, 0, 11)
    const eventNumber = int(event.number, 0, 255)
    const target = type === 4 ? name(event.target) : ''
    const key = type === 4 ? `${type}:${target.toLowerCase()}` : `${type}:${eventNumber}`
    if (seen.has(key)) throw new Error('Duplicate object event')
    seen.add(key)
    const attribute = type === 4 ? `ename="${xml(target)}"` : `enumb="${eventNumber}"`
    lines.push(`    <event eventtype="${type}" ${attribute}>`)
    for (const action of event.actions) lines.push(actionXml(action, '      ', eol))
    lines.push('    </event>')
  }
  lines.push('  </events>')
  return lines.join(eol)
}

function pointsXml(physics: ObjectPhysics, eol: string): string {
  if (!Array.isArray(physics.points) || physics.points.length > 256) {
    throw new Error('Invalid object physics points')
  }
  if (physics.points.length === 0) return '<PhysicsShapePoints/>'
  const lines = ['<PhysicsShapePoints>']
  for (const point of physics.points) {
    lines.push(`    <point>${finite(point.x, -1000000, 1000000)},${finite(point.y, -1000000, 1000000)}</point>`)
  }
  lines.push('  </PhysicsShapePoints>')
  return lines.join(eol)
}

export async function saveObject(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid object data')
  const object = value as ObjectData
  if (!Array.isArray(object.events) || !object.physics || typeof object.physics !== 'object') {
    throw new Error('Invalid object data')
  }

  const physics = object.physics
  const values: Array<[string, string | number]> = [
    ['spriteName', xml(name(object.sprite))],
    ['solid', bool(object.solid)],
    ['visible', bool(object.visible)],
    ['depth', int(object.depth, -0x7fffffff, 0x7fffffff)],
    ['persistent', bool(object.persistent)],
    ['parentName', xml(name(object.parent))],
    ['maskName', xml(name(object.mask))],
    ['PhysicsObject', bool(physics.enabled)],
    ['PhysicsObjectSensor', bool(physics.sensor)],
    ['PhysicsObjectShape', int(physics.shape, 0, 2)],
    ['PhysicsObjectDensity', finite(physics.density, 0, 1000000)],
    ['PhysicsObjectRestitution', finite(physics.restitution, 0, 1)],
    ['PhysicsObjectGroup', int(physics.group, -32768, 32767)],
    ['PhysicsObjectLinearDamping', finite(physics.linearDamping, 0, 1000000)],
    ['PhysicsObjectAngularDamping', finite(physics.angularDamping, 0, 1000000)],
    ['PhysicsObjectFriction', finite(physics.friction, 0, 1000000)],
    ['PhysicsObjectAwake', bool(physics.awake)],
    ['PhysicsObjectKinematic', bool(physics.kinematic)]
  ]

  let source = await readFile(file, 'utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  for (const [tagName, data] of values) source = setTag(source, tagName, data)
  const eventPattern = /<events\s*\/>|<events>[\s\S]*?<\/events>/i
  if (!eventPattern.test(source)) throw new Error('Invalid object file: <events> is missing')
  source = source.replace(eventPattern, eventsXml(object.events, eol))
  const pointsPattern = /<PhysicsShapePoints\s*\/>|<PhysicsShapePoints>[\s\S]*?<\/PhysicsShapePoints>/i
  if (!pointsPattern.test(source)) {
    throw new Error('Invalid object file: <PhysicsShapePoints> is missing')
  }
  source = source.replace(pointsPattern, pointsXml(physics, eol))
  await writeFile(file, source, 'utf8')
}
