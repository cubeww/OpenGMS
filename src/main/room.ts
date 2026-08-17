import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type {
  RoomBackground,
  RoomData,
  RoomInstance,
  RoomPhysics,
  RoomTile,
  RoomView
} from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

const maxRoomSize = 128 * 1024 * 1024
const instanceFields = new Set([
  'objname', 'x', 'y', 'name', 'locked', 'code', 'scalex', 'scaley', 'colour', 'rotation'
])

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

function attrText(node: XmlElement, name: string, fallback = ''): string {
  return node.getAttribute(name) ?? fallback
}

function attrNumber(node: XmlElement, name: string, fallback = 0): number {
  const value = Number.parseFloat(attrText(node, name))
  return Number.isFinite(value) ? value : fallback
}

function attrFlag(node: XmlElement, name: string): boolean {
  return attrNumber(node, name) !== 0
}

function resource(value: string): string {
  const name = value.trim()
  return name === '<undefined>' ? '' : name
}

function readBackground(node: XmlElement): RoomBackground {
  return {
    visible: attrFlag(node, 'visible'),
    foreground: attrFlag(node, 'foreground'),
    name: resource(attrText(node, 'name')),
    x: attrNumber(node, 'x'),
    y: attrNumber(node, 'y'),
    tileX: attrFlag(node, 'htiled'),
    tileY: attrFlag(node, 'vtiled'),
    speedX: attrNumber(node, 'hspeed'),
    speedY: attrNumber(node, 'vspeed'),
    stretch: attrFlag(node, 'stretch')
  }
}

function defaultBackground(): RoomBackground {
  return {
    visible: false,
    foreground: false,
    name: '',
    x: 0,
    y: 0,
    tileX: true,
    tileY: true,
    speedX: 0,
    speedY: 0,
    stretch: false
  }
}

function readView(node: XmlElement): RoomView {
  return {
    visible: attrFlag(node, 'visible'),
    object: resource(attrText(node, 'objName')),
    x: attrNumber(node, 'xview'),
    y: attrNumber(node, 'yview'),
    width: attrNumber(node, 'wview', 640),
    height: attrNumber(node, 'hview', 480),
    portX: attrNumber(node, 'xport'),
    portY: attrNumber(node, 'yport'),
    portWidth: attrNumber(node, 'wport', 640),
    portHeight: attrNumber(node, 'hport', 480),
    borderX: attrNumber(node, 'hborder', 32),
    borderY: attrNumber(node, 'vborder', 32),
    speedX: attrNumber(node, 'hspeed', -1),
    speedY: attrNumber(node, 'vspeed', -1)
  }
}

function defaultView(width: number, height: number): RoomView {
  const viewWidth = Math.min(640, width)
  const viewHeight = Math.min(480, height)
  return {
    visible: false,
    object: '',
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
    portX: 0,
    portY: 0,
    portWidth: viewWidth,
    portHeight: viewHeight,
    borderX: 32,
    borderY: 32,
    speedX: -1,
    speedY: -1
  }
}

function readInstance(node: XmlElement): RoomInstance {
  const extra: Record<string, string> = {}
  for (let index = 0; index < node.attributes.length; index += 1) {
    const item = node.attributes.item(index)
    if (item && !instanceFields.has(item.name.toLowerCase())) extra[item.name] = item.value
  }

  return {
    object: resource(attrText(node, 'objName')),
    x: attrNumber(node, 'x'),
    y: attrNumber(node, 'y'),
    name: attrText(node, 'name'),
    locked: attrFlag(node, 'locked'),
    code: attrText(node, 'code'),
    scaleX: attrNumber(node, 'scaleX', 1),
    scaleY: attrNumber(node, 'scaleY', 1),
    color: attrNumber(node, 'colour', 0xffffffff),
    rotation: attrNumber(node, 'rotation'),
    extra
  }
}

function readTile(node: XmlElement): RoomTile {
  return {
    background: resource(attrText(node, 'bgName')),
    x: attrNumber(node, 'x'),
    y: attrNumber(node, 'y'),
    width: attrNumber(node, 'w'),
    height: attrNumber(node, 'h'),
    sourceX: attrNumber(node, 'xo'),
    sourceY: attrNumber(node, 'yo'),
    id: attrNumber(node, 'id'),
    name: attrText(node, 'name'),
    depth: attrNumber(node, 'depth', 1000000),
    locked: attrFlag(node, 'locked'),
    color: attrNumber(node, 'colour', 0xffffffff),
    scaleX: attrNumber(node, 'scaleX', 1),
    scaleY: attrNumber(node, 'scaleY', 1)
  }
}

function pad<T>(items: T[], count: number, create: () => T): T[] {
  const result = items.slice(0, count)
  while (result.length < count) result.push(create())
  return result
}

export async function loadRoom(file: string): Promise<RoomData | undefined> {
  try {
    const bytes = await readFile(file)
    if (bytes.length > maxRoomSize) return undefined
    const source = bytes.toString('utf8')
    const root = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    ).documentElement
    if (!root || tag(root) !== 'room') return undefined

    const width = Math.round(number(root, 'width', 640))
    const height = Math.round(number(root, 'height', 480))
    const backgroundsNode = child(root, 'backgrounds')
    const viewsNode = child(root, 'views')
    const instancesNode = child(root, 'instances')
    const tilesNode = child(root, 'tiles')
    const backgrounds = backgroundsNode
      ? children(backgroundsNode).filter((item) => tag(item) === 'background').map(readBackground)
      : []
    const views = viewsNode
      ? children(viewsNode).filter((item) => tag(item) === 'view').map(readView)
      : []

    return {
      caption: text(child(root, 'caption'), false),
      width,
      height,
      snapX: Math.round(number(root, 'hsnap', 32)),
      snapY: Math.round(number(root, 'vsnap', 32)),
      isometric: flag(root, 'isometric'),
      speed: Math.round(number(root, 'speed', 30)),
      persistent: flag(root, 'persistent'),
      color: number(root, 'colour', 0xc0c0c0),
      showColor: flag(root, 'showcolour'),
      code: text(child(root, 'code'), false),
      enableViews: flag(root, 'enableViews'),
      clearViewBackground: flag(root, 'clearViewBackground'),
      clearDisplayBuffer: flag(root, 'clearDisplayBuffer'),
      backgrounds: pad(backgrounds, 8, defaultBackground),
      views: pad(views, 8, () => defaultView(width, height)),
      instances: instancesNode
        ? children(instancesNode).filter((item) => tag(item) === 'instance').map(readInstance)
        : [],
      tiles: tilesNode
        ? children(tilesNode).filter((item) => tag(item) === 'tile').map(readTile)
        : [],
      physics: {
        enabled: flag(root, 'PhysicsWorld'),
        top: Math.round(number(root, 'PhysicsWorldTop')),
        left: Math.round(number(root, 'PhysicsWorldLeft')),
        right: Math.round(number(root, 'PhysicsWorldRight')),
        bottom: Math.round(number(root, 'PhysicsWorldBottom')),
        gravityX: number(root, 'PhysicsWorldGravityX'),
        gravityY: number(root, 'PhysicsWorldGravityY', 10),
        pixelsToMeters: number(root, 'PhysicsWorldPixToMeters', 0.1)
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

function xmlAttr(value: string): string {
  return xml(value).replace(/\r\n|\r|\n/g, '&#xA;').replace(/\t/g, '&#x9;')
}

function bool(value: unknown): number {
  if (typeof value !== 'boolean') throw new Error('Invalid room data')
  return value ? -1 : 0
}

function finite(value: unknown, min = -100000000, max = 100000000): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid room data')
  return Math.min(max, Math.max(min, value))
}

function int(value: unknown, min = -0x7fffffff, max = 0x7fffffff): number {
  return Math.round(finite(value, min, max))
}

function uint(value: unknown): number {
  return int(value, 0, 0xffffffff)
}

function string(value: unknown, max = 16 * 1024 * 1024): string {
  if (typeof value !== 'string' || value.includes('\0') || value.length > max) {
    throw new Error('Invalid room text')
  }
  return value
}

function name(value: unknown, undefinedName = false): string {
  const result = string(value, 260).trim()
  if (/[\r\n<>]/.test(result)) throw new Error('Invalid room resource name')
  return result || (undefinedName ? '<undefined>' : '')
}

function backgroundXml(value: RoomBackground): string {
  return `    <background visible="${bool(value.visible)}" foreground="${bool(value.foreground)}" name="${xmlAttr(name(value.name))}" x="${int(value.x)}" y="${int(value.y)}" htiled="${bool(value.tileX)}" vtiled="${bool(value.tileY)}" hspeed="${finite(value.speedX)}" vspeed="${finite(value.speedY)}" stretch="${bool(value.stretch)}"/>`
}

function viewXml(value: RoomView): string {
  return `    <view visible="${bool(value.visible)}" objName="${xmlAttr(name(value.object, true))}" xview="${int(value.x)}" yview="${int(value.y)}" wview="${int(value.width, 1)}" hview="${int(value.height, 1)}" xport="${int(value.portX)}" yport="${int(value.portY)}" wport="${int(value.portWidth, 1)}" hport="${int(value.portHeight, 1)}" hborder="${int(value.borderX, 0)}" vborder="${int(value.borderY, 0)}" hspeed="${int(value.speedX)}" vspeed="${int(value.speedY)}"/>`
}

function instanceXml(value: RoomInstance): string {
  if (!value.extra || typeof value.extra !== 'object' || Array.isArray(value.extra)) {
    throw new Error('Invalid room instance attributes')
  }
  const extra: string[] = []
  for (const [key, data] of Object.entries(value.extra)) {
    if (!/^[A-Za-z_][\w:.-]*$/.test(key) || instanceFields.has(key.toLowerCase())) continue
    extra.push(` ${key}="${xmlAttr(string(data, 1024 * 1024))}"`)
  }
  return `    <instance objName="${xmlAttr(name(value.object, true))}" x="${int(value.x)}" y="${int(value.y)}" name="${xmlAttr(name(value.name))}" locked="${bool(value.locked)}" code="${xmlAttr(string(value.code))}" scaleX="${finite(value.scaleX)}" scaleY="${finite(value.scaleY)}" colour="${uint(value.color)}" rotation="${finite(value.rotation)}"${extra.join('')}/>`
}

function tileXml(value: RoomTile): string {
  return `    <tile bgName="${xmlAttr(name(value.background, true))}" x="${int(value.x)}" y="${int(value.y)}" w="${int(value.width, 1)}" h="${int(value.height, 1)}" xo="${int(value.sourceX, 0)}" yo="${int(value.sourceY, 0)}" id="${int(value.id, 0)}" name="${xmlAttr(name(value.name))}" depth="${int(value.depth)}" locked="${bool(value.locked)}" colour="${uint(value.color)}" scaleX="${finite(value.scaleX)}" scaleY="${finite(value.scaleY)}"/>`
}

function section(name: string, lines: string[], eol: string): string {
  return [`  <${name}>`, ...lines, `  </${name}>`].join(eol)
}

function setTag(source: string, tagName: string, value: string | number): string {
  const pattern = new RegExp(`(<${tagName}>)[\\s\\S]*?(<\\/${tagName}>)`, 'i')
  if (!pattern.test(source)) throw new Error(`Invalid room file: <${tagName}> is missing`)
  return source.replace(pattern, (_match, open: string, close: string) => `${open}${value}${close}`)
}

function setSection(source: string, name: string, value: string): string {
  const pattern = new RegExp(`<${name}\\b[^>]*\\/\\s*>|<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'i')
  if (!pattern.test(source)) throw new Error(`Invalid room file: <${name}> is missing`)
  return source.replace(pattern, value)
}

function validatePhysics(value: unknown): RoomPhysics {
  if (!value || typeof value !== 'object') throw new Error('Invalid room physics data')
  return value as RoomPhysics
}

export async function saveRoom(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid room data')
  const room = value as RoomData
  if (
    !Array.isArray(room.backgrounds) || room.backgrounds.length > 8 ||
    !Array.isArray(room.views) || room.views.length > 8 ||
    !Array.isArray(room.instances) || room.instances.length > 200000 ||
    !Array.isArray(room.tiles) || room.tiles.length > 1000000
  ) {
    throw new Error('Invalid room data')
  }
  const physics = validatePhysics(room.physics)
  const bytes = await readFile(file)
  if (bytes.length > maxRoomSize) throw new Error('Room file is too large')
  let source = bytes.toString('utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const cleanCode = xml(string(room.code).replace(/\r\n|\r|\n/g, eol))
  const values: Array<[string, string | number]> = [
    ['caption', xml(string(room.caption, 4096))],
    ['width', int(room.width, 1, 10000000)],
    ['height', int(room.height, 1, 10000000)],
    ['vsnap', int(room.snapY, 1, 1000000)],
    ['hsnap', int(room.snapX, 1, 1000000)],
    ['isometric', bool(room.isometric)],
    ['speed', int(room.speed, 1, 1000000)],
    ['persistent', bool(room.persistent)],
    ['colour', uint(room.color)],
    ['showcolour', bool(room.showColor)],
    ['code', cleanCode],
    ['enableViews', bool(room.enableViews)],
    ['clearViewBackground', bool(room.clearViewBackground)],
    ['clearDisplayBuffer', bool(room.clearDisplayBuffer)],
    ['PhysicsWorld', bool(physics.enabled)],
    ['PhysicsWorldTop', int(physics.top)],
    ['PhysicsWorldLeft', int(physics.left)],
    ['PhysicsWorldRight', int(physics.right)],
    ['PhysicsWorldBottom', int(physics.bottom)],
    ['PhysicsWorldGravityX', finite(physics.gravityX)],
    ['PhysicsWorldGravityY', finite(physics.gravityY)],
    ['PhysicsWorldPixToMeters', finite(physics.pixelsToMeters, 0.000001, 1000000)]
  ]
  for (const [tagName, data] of values) source = setTag(source, tagName, data)

  source = setSection(source, 'backgrounds', section('backgrounds', room.backgrounds.map(backgroundXml), eol))
  source = setSection(source, 'views', section('views', room.views.map(viewXml), eol))
  source = setSection(source, 'instances', section('instances', room.instances.map(instanceXml), eol))
  source = setSection(source, 'tiles', section('tiles', room.tiles.map(tileXml), eol))
  if (Buffer.byteLength(source, 'utf8') > maxRoomSize) throw new Error('Room file is too large')
  await writeFile(file, source, 'utf8')
}
