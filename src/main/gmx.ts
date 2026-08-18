import { existsSync } from 'node:fs'
import { open, readFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { loadObject } from './object'
import { loadExtension } from './extension'
import { loadMacros } from './macro'
import { loadPath } from './path'
import { loadShader, shaderType } from './shader'
import { loadTimeline } from './timeline'
import type {
  BackgroundData,
  FontData,
  Project,
  ProjectGroup,
  ProjectItem,
  ResourceType,
  ScriptInfo,
  ShaderType,
  SoundData,
  SoundMode,
  SpriteBoxMode,
  SpriteData,
  SpriteShape
} from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>
type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

type Section = {
  tag: string
  item: string
  type: ResourceType
  name: string
  ext: string
}

export type ProjectLoader = {
  canLoad: (file: string) => boolean
  load: (file: string) => Promise<Project>
}

const sections: Section[] = [
  { tag: 'sprites', item: 'sprite', type: 'sprite', name: 'Sprites', ext: '.sprite.gmx' },
  { tag: 'sounds', item: 'sound', type: 'sound', name: 'Sounds', ext: '.sound.gmx' },
  {
    tag: 'backgrounds',
    item: 'background',
    type: 'background',
    name: 'Backgrounds',
    ext: '.background.gmx'
  },
  { tag: 'paths', item: 'path', type: 'path', name: 'Paths', ext: '.path.gmx' },
  { tag: 'scripts', item: 'script', type: 'script', name: 'Scripts', ext: '.gml' },
  { tag: 'shaders', item: 'shader', type: 'shader', name: 'Shaders', ext: '.shader' },
  { tag: 'fonts', item: 'font', type: 'font', name: 'Fonts', ext: '.font.gmx' },
  {
    tag: 'timelines',
    item: 'timeline',
    type: 'timeline',
    name: 'Time Lines',
    ext: '.timeline.gmx'
  },
  { tag: 'objects', item: 'object', type: 'object', name: 'Objects', ext: '.object.gmx' },
  { tag: 'rooms', item: 'room', type: 'room', name: 'Rooms', ext: '.room.gmx' }
]

function tag(node: XmlElement): string {
  return (node.localName || node.nodeName).toLowerCase()
}

function children(node: XmlElement): XmlElement[] {
  const result: XmlElement[] = []

  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index)
    if (child?.nodeType === 1) result.push(child as XmlElement)
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

function cleanPath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function addExt(path: string, ext: string): string {
  if (!ext || path.toLowerCase().endsWith(ext.toLowerCase())) return path
  return `${path}${ext}`
}

function filePath(folder: string, path: string, ext: string): string {
  const relative = addExt(cleanPath(path), ext)
  return resolve(folder, ...relative.split('/').filter(Boolean))
}

function itemName(path: string, ext: string): string {
  const name = basename(cleanPath(path))
  return ext && name.toLowerCase().endsWith(ext.toLowerCase()) ? name.slice(0, -ext.length) : name
}

function resource(
  folder: string,
  type: ResourceType,
  path: string,
  ext: string,
  trail: string[],
  name = itemName(path, ext),
  shaderType?: ShaderType
): ProjectItem {
  const clean = cleanPath(path)
  const file = filePath(folder, clean, ext)

  return {
    id: `${type}:resource:${[...trail, clean].join('/')}`,
    kind: 'resource',
    type,
    name,
    path: clean,
    file,
    missing: !inside(folder, file) || !existsSync(file),
    shaderType
  }
}

function inside(folder: string, file: string): boolean {
  const root = resolve(folder)
  const target = resolve(file)
  return target === root || target.startsWith(`${root}${sep}`)
}

function parseItems(
  node: XmlElement,
  section: Section,
  folder: string,
  trail: string[] = []
): ProjectItem[] {
  const result: ProjectItem[] = []

  for (const nodeItem of children(node)) {
    const nodeTag = tag(nodeItem)

    if (nodeTag === section.tag.toLowerCase()) {
      const name = nodeItem.getAttribute('name')?.trim() || 'Group'
      const nextTrail = [...trail, name]
      result.push({
        id: `${section.type}:group:${nextTrail.join('/')}`,
        kind: 'group',
        type: section.type,
        name,
        items: parseItems(nodeItem, section, folder, nextTrail)
      })
      continue
    }

    if (nodeTag === section.item) {
      const path = text(nodeItem)
      if (path) {
        const type = section.type === 'shader' ? shaderType(nodeItem.getAttribute('type')) : undefined
        result.push(resource(folder, section.type, path, section.ext, trail, itemName(path, section.ext), type))
      }
    }
  }

  return result
}

function parseFiles(node: XmlElement, folder: string, trail: string[] = []): ProjectItem[] {
  const result: ProjectItem[] = []

  for (const nodeItem of children(node)) {
    const nodeTag = tag(nodeItem)

    if (nodeTag === 'datafiles') {
      const name = nodeItem.getAttribute('name')?.trim() || 'Group'
      const nextTrail = [...trail, name]
      result.push({
        id: `file:group:${nextTrail.join('/')}`,
        kind: 'group',
        type: 'file',
        name,
        items: parseFiles(nodeItem, folder, nextTrail)
      })
      continue
    }

    if (nodeTag === 'datafile') {
      const name = text(child(nodeItem, 'name')) || text(child(nodeItem, 'filename'))
      const filename = text(child(nodeItem, 'filename')) || name
      if (!filename) continue
      const path = cleanPath(filename)
      const file = filePath(folder, ['datafiles', ...trail, path].join('/'), '')
      result.push({
        id: `file:resource:${[...trail, path].join('/')}`,
        kind: 'resource',
        type: 'file',
        name,
        path,
        file,
        missing: !inside(folder, file) || !existsSync(file)
      })
    }
  }

  return result
}

function parseExtensions(node: XmlElement | undefined, folder: string): ProjectItem[] {
  if (!node) return []

  return children(node).flatMap((nodeItem) => {
    const path = tag(nodeItem) === 'extension' ? text(nodeItem) : ''
    return path ? [resource(folder, 'extension', path, '.extension.gmx', [])] : []
  })
}

function count(items: ProjectItem[]): number {
  return items.reduce(
    (total, item) => total + (item.kind === 'group' ? count(item.items) : 1),
    0
  )
}

function countMissing(items: ProjectItem[]): number {
  return items.reduce(
    (total, item) =>
      total + (item.kind === 'group' ? countMissing(item.items) : Number(item.missing)),
    0
  )
}

function resources(groups: ProjectGroup[], type: ResourceType): ResourceItem[] {
  const result: ResourceItem[] = []

  function visit(items: ProjectItem[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }

  for (const group of groups) visit(group.items)
  return result
}

async function readXml(file: string): Promise<XmlElement | undefined> {
  try {
    const source = await readFile(file, 'utf8')
    const document = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    )
    return document.documentElement ?? undefined
  } catch {
    return undefined
  }
}

async function each<T>(items: T[], task: (item: T) => Promise<void>): Promise<void> {
  let next = 0

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      await task(items[index])
    }
  }

  const workers = Math.min(32, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
}

function number(root: XmlElement, name: string, fallback = 0): number {
  const value = Number.parseInt(text(child(root, name)), 10)
  return Number.isFinite(value) ? value : fallback
}

function flag(root: XmlElement, name: string): boolean {
  return number(root, name) !== 0
}

function nested(root: XmlElement, parent: string, name: string): string {
  const group = child(root, parent)
  return group ? text(child(group, name)) || text(group) : ''
}

function nestedNumber(root: XmlElement, parent: string, name: string, fallback = 0): number {
  const value = Number.parseFloat(nested(root, parent, name))
  return Number.isFinite(value) ? value : fallback
}

async function pngSize(file: string): Promise<{ width: number; height: number } | undefined> {
  try {
    const handle = await open(file, 'r')
    try {
      const header = Buffer.alloc(24)
      const result = await handle.read(header, 0, header.length, 0)
      if (
        result.bytesRead < header.length ||
        header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        header.subarray(12, 16).toString('ascii') !== 'IHDR'
      ) {
        return undefined
      }
      const width = header.readUInt32BE(16)
      const height = header.readUInt32BE(20)
      return width >= 1 && height >= 1 && width <= 32767 && height <= 32767
        ? { width, height }
        : undefined
    } finally {
      await handle.close()
    }
  } catch {
    return undefined
  }
}

async function loadSprite(item: ResourceItem, folder: string): Promise<SpriteData | undefined> {
  const root = await readXml(item.file)
  if (!root || tag(root) !== 'sprite') return undefined

  const frames = root ? child(root, 'frames') : undefined
  const frameItems = frames ? children(frames).filter((item) => tag(item) === 'frame') : []
  const imageFiles: string[] = []
  const spriteFrames = frameItems.map((frame, position) => {
    const value = Number.parseInt(frame.getAttribute('index') ?? '', 10)
    const index = Number.isFinite(value) ? value : position
    const framePath = text(frame)
    const file = framePath ? filePath(dirname(item.file), framePath, '') : ''
    const valid = Boolean(file) && inside(folder, file)

    const missing = !valid || !existsSync(file)
    if (!missing) imageFiles.push(file)

    return {
      index,
      image: valid ? relative(folder, file).replace(/\\/g, '/') : undefined,
      missing
    }
  })

  const shapes: SpriteShape[] = ['precise', 'rectangle', 'ellipse', 'diamond']
  const boxModes: SpriteBoxMode[] = ['auto', 'full', 'manual']
  const textureGroups = child(root, 'TextureGroups')
  const textureGroup = textureGroups ? text(children(textureGroups)[0]) : ''
  let width = number(root, 'width')
  let height = number(root, 'height')
  if ((width < 1 || height < 1) && imageFiles[0]) {
    const size = await pngSize(imageFiles[0])
    if (size) {
      if (width < 1) width = size.width
      if (height < 1) height = size.height
    }
  }

  return {
    width,
    height,
    xOrigin: number(root, 'xorig'),
    yOrigin: number(root, 'yorigin'),
    shape: shapes[number(root, 'colkind')] ?? 'precise',
    tolerance: number(root, 'coltolerance'),
    separateMasks: flag(root, 'sepmasks'),
    boxMode: boxModes[number(root, 'bboxmode')] ?? 'auto',
    box: {
      left: number(root, 'bbox_left'),
      right: number(root, 'bbox_right'),
      top: number(root, 'bbox_top'),
      bottom: number(root, 'bbox_bottom')
    },
    tileX: flag(root, 'HTile'),
    tileY: flag(root, 'VTile'),
    for3D: flag(root, 'For3D'),
    textureGroup: textureGroup || '0',
    frames: spriteFrames
  }
}

async function loadSound(item: ResourceItem, folder: string): Promise<SoundData | undefined> {
  const root = await readXml(item.file)
  if (!root || tag(root) !== 'sound') return undefined

  const data = cleanPath(text(child(root, 'data')))
  const audioFile = data ? resolve(dirname(item.file), 'audio', ...data.split('/').filter(Boolean)) : ''
  const valid = Boolean(audioFile) && inside(folder, audioFile)
  const mode: SoundMode = flag(root, 'streamed')
    ? 'streamed'
    : flag(root, 'uncompressOnLoad')
      ? 'decompress'
      : flag(root, 'compressed')
        ? 'compressed'
        : 'uncompressed'

  return {
    kind: number(root, 'kind'),
    mode,
    extension: text(child(root, 'extension')) || extname(data),
    originName: text(child(root, 'origname')),
    data,
    audio: valid ? relative(folder, audioFile).replace(/\\/g, '/') : undefined,
    missing: !valid || !existsSync(audioFile),
    volume: Math.min(1, Math.max(0, nestedNumber(root, 'volume', 'volume', 1))),
    bitRate: Math.round(nestedNumber(root, 'bitRates', 'bitRate', 192)),
    sampleRate: Math.round(nestedNumber(root, 'sampleRates', 'sampleRate', 44100)),
    stereo: Math.round(nestedNumber(root, 'types', 'type')) === 1,
    bitDepth: Math.round(nestedNumber(root, 'bitDepths', 'bitDepth', 16)),
    audioGroup: number(root, 'audioGroup')
  }
}

async function loadBackground(
  item: ResourceItem,
  folder: string
): Promise<BackgroundData | undefined> {
  const root = await readXml(item.file)
  if (!root || tag(root) !== 'background') return undefined

  const data = cleanPath(text(child(root, 'data')))
  const imageFile = data
    ? resolve(dirname(item.file), ...data.split('/').filter(Boolean))
    : ''
  const valid = Boolean(imageFile) && inside(folder, imageFile)
  const textureGroups = child(root, 'TextureGroups')
  const textureGroup = textureGroups ? text(children(textureGroups)[0]) : ''

  return {
    width: number(root, 'width'),
    height: number(root, 'height'),
    data,
    image: valid ? relative(folder, imageFile).replace(/\\/g, '/') : undefined,
    missing: !valid || !existsSync(imageFile),
    tileSet: flag(root, 'istileset'),
    tileWidth: number(root, 'tilewidth'),
    tileHeight: number(root, 'tileheight'),
    tileXOffset: number(root, 'tilexoff'),
    tileYOffset: number(root, 'tileyoff'),
    tileHSeparation: number(root, 'tilehsep'),
    tileVSeparation: number(root, 'tilevsep'),
    tileX: flag(root, 'HTile'),
    tileY: flag(root, 'VTile'),
    for3D: flag(root, 'For3D'),
    textureGroup: textureGroup || '0'
  }
}

async function loadFont(item: ResourceItem): Promise<FontData | undefined> {
  const root = await readXml(item.file)
  if (!root || tag(root) !== 'font') return undefined

  const rangeNode = child(root, 'ranges')
  const ranges = (rangeNode ? children(rangeNode) : []).flatMap((item) => {
    const [startText, endText] = text(item).split(',')
    const start = Number.parseInt(startText, 10)
    const end = Number.parseInt(endText, 10)
    return Number.isFinite(start) && Number.isFinite(end)
      ? [{
          start: Math.max(0, Math.min(65535, Math.min(start, end))),
          end: Math.max(0, Math.min(65535, Math.max(start, end)))
        }]
      : []
  })
  const textureGroups = child(root, 'texgroups')
  const textureGroup = textureGroups ? text(children(textureGroups)[0]) : ''
  const expected = new Set<number>()
  for (const range of ranges) {
    for (let character = range.start; character <= range.end; character += 1) {
      expected.add(character)
    }
  }
  const glyphNode = child(root, 'glyphs')
  const glyphs = new Set((glyphNode ? children(glyphNode) : []).flatMap((item) => {
    if (tag(item) !== 'glyph') return []
    const character = Number.parseInt(item.getAttribute('character') ?? '', 10)
    return Number.isInteger(character) && character >= 0 && character <= 65535
      ? [character]
      : []
  }))
  const imageName = cleanPath(text(child(root, 'image')))
  const imageFile = imageName
    ? resolve(dirname(item.file), ...imageName.split('/').filter(Boolean))
    : ''
  const baked = Boolean(imageFile) &&
    inside(dirname(item.file), imageFile) &&
    existsSync(imageFile) &&
    glyphs.size === expected.size &&
    [...expected].every((character) => glyphs.has(character))

  return {
    font: text(child(root, 'name')) || 'Arial',
    size: number(root, 'size', 12),
    bold: flag(root, 'bold'),
    italic: flag(root, 'italic'),
    highQuality: flag(root, 'renderhq'),
    antiAlias: number(root, 'aa', 3),
    charset: number(root, 'charset', 1),
    includeTtf: flag(root, 'includeTTF'),
    ttfName: text(child(root, 'TTFName')),
    textureGroup: textureGroup || '0',
    ranges,
    baked
  }
}

async function loadScriptInfo(item: ResourceItem): Promise<ScriptInfo | undefined> {
  try {
    const source = await readFile(item.file, 'utf8')
    const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/)
    const header = lines.slice(0, 12).map((line) =>
      line.match(/^\s*\/\/\/\s*(.*)$/)?.[1]?.trim() ?? ''
    )
    const signatureLine = header.find((line) =>
      new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`, 'i').test(line)
    )
    const signatureMatch = signatureLine?.match(/^[a-zA-Z_]\w*\s*\(([^)]*)\)/)
    let args = signatureMatch?.[1]
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^[a-zA-Z_]\w*$/.test(value)) ?? []

    if (!signatureMatch) {
      let highest = -1
      for (const match of source.matchAll(/\bargument(\d+)\b/g)) {
        highest = Math.max(highest, Number.parseInt(match[1], 10))
      }
      args = Array.from({ length: Math.min(32, highest + 1) }, (_value, index) => `argument${index}`)
    }

    const description = header.find((line) =>
      line && line !== signatureLine && !/^argument\d+\b/i.test(line)
    )?.replace(/^@description\s*/i, '') ?? ''

    return {
      signature: `${item.name}(${args.join(', ')})`,
      description
    }
  } catch {
    return undefined
  }
}

async function loadAssets(groups: ProjectGroup[], folder: string): Promise<void> {
  const sprites = resources(groups, 'sprite')
  const sounds = resources(groups, 'sound')
  const backgrounds = resources(groups, 'background')
  const fonts = resources(groups, 'font')
  const scripts = resources(groups, 'script')
  const shaders = resources(groups, 'shader')
  const timelines = resources(groups, 'timeline')
  const paths = resources(groups, 'path')
  const objects = resources(groups, 'object')
  const extensions = resources(groups, 'extension')
  const objectSprites = new Map<ResourceItem, string>()

  await Promise.all([
    each(sprites, async (item) => {
      item.sprite = await loadSprite(item, folder)
      const first =
        item.sprite?.frames.find((frame) => frame.index === 0) ?? item.sprite?.frames[0]
      item.image = first && !first.missing ? first.image : undefined
    }),
    each(objects, async (item) => {
      item.object = await loadObject(item.file)
      if (item.object?.sprite) objectSprites.set(item, item.object.sprite)
    }),
    each(sounds, async (item) => {
      item.sound = await loadSound(item, folder)
    }),
    each(backgrounds, async (item) => {
      item.background = await loadBackground(item, folder)
      item.image = item.background && !item.background.missing ? item.background.image : undefined
    }),
    each(fonts, async (item) => {
      item.font = await loadFont(item)
    }),
    each(scripts, async (item) => {
      item.script = await loadScriptInfo(item)
    }),
    each(shaders, async (item) => {
      item.shader = await loadShader(item.file, item.shaderType ?? 'GLSLES')
    }),
    each(timelines, async (item) => {
      item.timeline = await loadTimeline(item.file)
    }),
    each(paths, async (item) => {
      item.pathData = await loadPath(item.file)
    }),
    each(extensions, async (item) => {
      item.extension = await loadExtension(item.file)
    })
  ])

  const images = new Map(
    sprites.filter((item) => item.image).map((item) => [item.name.toLowerCase(), item.image!])
  )

  for (const [item, sprite] of objectSprites) item.image = images.get(sprite.toLowerCase())
}

function sectionGroup(root: XmlElement, section: Section, folder: string): ProjectGroup {
  const node = children(root).find((item) => tag(item) === section.tag.toLowerCase())
  const items = node ? parseItems(node, section, folder) : []
  return { type: section.type, name: section.name, count: count(items), items }
}

function simpleGroup(
  type: ResourceType,
  name: string,
  items: ProjectItem[]
): ProjectGroup {
  return { type, name, count: count(items), items }
}

type ConfigRef = { name: string; path: string; file: string }

function parseConfigs(root: XmlElement, folder: string): ConfigRef[] {
  const configs = children(root).find((item) => tag(item) === 'configs')
  if (!configs) {
    return [{
      name: 'Default',
      path: 'Configs/Default',
      file: filePath(folder, 'Configs/Default', '.config.gmx')
    }]
  }

  const refs = children(configs)
    .filter((item) => tag(item) === 'config')
    .flatMap((item) => {
      const path = cleanPath(text(item))
      const name = itemName(path, '')
      return path && name ? [{ name, path, file: filePath(folder, path, '.config.gmx') }] : []
    })

  return refs.length > 0 ? refs : [{
    name: 'Default',
    path: 'Configs/Default',
    file: filePath(folder, 'Configs/Default', '.config.gmx')
  }]
}

async function macroGroup(file: string, configs: ConfigRef[]): Promise<ProjectGroup> {
  const all = await loadMacros(file, null)
  const items: ProjectItem[] = [{
    id: 'macro:resource:all-configurations',
    kind: 'resource',
    type: 'macro',
    name: 'All configurations',
    path: 'All configurations',
    file,
    missing: !all,
    macro: all ?? { config: null, entries: [] }
  }]

  for (const config of configs) {
    const macro = inside(resolve(dirname(file), 'Configs'), config.file)
      ? await loadMacros(config.file, config.name)
      : undefined
    items.push({
      id: `macro:resource:${config.path.toLowerCase()}`,
      kind: 'resource',
      type: 'macro',
      name: config.name,
      path: config.path,
      file: config.file,
      missing: !macro,
      macro: macro ?? { config: config.name, entries: [] }
    })
  }
  return simpleGroup('macro', 'Macros', items)
}

function parseAudioGroups(root: XmlElement): string[] {
  const group = children(root).find((item) => tag(item) === 'audiogroups')
  if (!group) return ['audiogroup_default']

  const names = children(group)
    .filter((item) => tag(item) === 'audiogroup')
    .map((item) => item.getAttribute('name')?.trim() ?? '')
    .filter(Boolean)

  return names.length > 0 ? names : ['audiogroup_default']
}

function gameInfoFile(root: XmlElement, folder: string): string {
  const help = child(root, 'help')
  const name = cleanPath((help ? text(child(help, 'rtf')) : '') || 'help.rtf')
  const file = filePath(folder, name, '')
  return inside(folder, file) && extname(file).toLowerCase() === '.rtf'
    ? file
    : resolve(folder, 'help.rtf')
}

async function loadGmx(file: string): Promise<Project> {
  const path = resolve(file)
  const folder = dirname(path)
  const source = await readFile(path, 'utf8')
  const errors: string[] = []

  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message)
    }
  }).parseFromString(source, 'application/xml')

  if (errors.length > 0) throw new Error(`Invalid project XML: ${errors[0]}`)

  const root = document.documentElement
  if (!root || tag(root) !== 'assets') throw new Error('Invalid GameMaker project: <assets> is missing')

  const datafiles = children(root).find((item) => tag(item) === 'datafiles')
  const extensions = children(root).find(
    (item) => tag(item) === 'newextensions' || tag(item) === 'extensions'
  )
  const groups = sections.map((section) => sectionGroup(root, section, folder))
  const configs = parseConfigs(root, folder)
  groups.push(
    simpleGroup('file', 'Included Files', datafiles ? parseFiles(datafiles, folder) : []),
    simpleGroup('extension', 'Extensions', parseExtensions(extensions, folder)),
    await macroGroup(path, configs)
  )
  await loadAssets(groups, folder)

  return {
    format: 'gmx',
    path,
    folder,
    name: basename(path).replace(/\.project\.gmx$/i, ''),
    gameInfoFile: gameInfoFile(root, folder),
    configs: configs.map((item) => item.name),
    audioGroups: parseAudioGroups(root),
    groups,
    total: groups.reduce((total, group) => total + group.count, 0),
    missing: groups.reduce((total, group) => total + countMissing(group.items), 0)
  }
}

export const gmxLoader: ProjectLoader = {
  canLoad: (file) => file.toLowerCase().endsWith('.project.gmx'),
  load: loadGmx
}
