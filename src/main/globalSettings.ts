import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import type {
  AudioGroupSettings,
  GlobalResourceRef,
  GlobalSettingsData,
  TextureGroupSettings
} from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>
type ConfigRef = { name: string; path: string; file: string }
type ResourceRef = GlobalResourceRef & { file: string }

const maxProjectSize = 16 * 1024 * 1024
const maxConfigSize = 16 * 1024 * 1024
const maxResourceSize = 8 * 1024 * 1024
const allTargets = '9223372036854775807'

const resourceSections = [
  { section: 'sprites', item: 'sprite', type: 'sprite', ext: '.sprite.gmx' },
  { section: 'backgrounds', item: 'background', type: 'background', ext: '.background.gmx' },
  { section: 'fonts', item: 'font', type: 'font', ext: '.font.gmx' },
  { section: 'sounds', item: 'sound', type: 'sound', ext: '.sound.gmx' }
] as const

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

function parseXml(source: string, label: string): XmlElement {
  const errors: string[] = []
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message)
    }
  }).parseFromString(source, 'application/xml')
  if (errors.length > 0 || !document.documentElement) {
    throw new Error(`Invalid ${label} XML${errors[0] ? `: ${errors[0]}` : ''}`)
  }
  return document.documentElement
}

function cleanPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function inside(folder: string, file: string): boolean {
  const path = relative(resolve(folder), resolve(file))
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function filePath(folder: string, value: string, extension: string): string {
  let path = cleanPath(value)
  if (extension && !path.toLowerCase().endsWith(extension.toLowerCase())) path += extension
  return resolve(folder, ...path.split('/').filter(Boolean))
}

function itemName(value: string, extension: string): string {
  const name = basename(cleanPath(value))
  return extension && name.toLowerCase().endsWith(extension.toLowerCase())
    ? name.slice(0, -extension.length)
    : name
}

async function readText(file: string, limit: number, label: string): Promise<string> {
  const source = await readFile(file, 'utf8')
  if (Buffer.byteLength(source, 'utf8') > limit) throw new Error(`${label} is too large`)
  return source
}

function parseConfigs(root: XmlElement, folder: string): ConfigRef[] {
  const node = child(root, 'Configs')
  if (!node) {
    return [{
      name: 'Default',
      path: 'Configs/Default',
      file: filePath(folder, 'Configs/Default', '.config.gmx')
    }]
  }

  const refs = children(node).flatMap((item) => {
    if (tag(item) !== 'config') return []
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

function collectItems(node: XmlElement, section: string, item: string, result: string[]): void {
  for (const current of children(node)) {
    const currentTag = tag(current)
    if (currentTag === item) {
      const value = text(current)
      if (value) result.push(value)
    } else if (currentTag === section) {
      collectItems(current, section, item, result)
    }
  }
}

function resources(root: XmlElement, folder: string): ResourceRef[] {
  const result: ResourceRef[] = []
  for (const section of resourceSections) {
    const node = child(root, section.section)
    if (!node) continue
    const items: string[] = []
    collectItems(node, section.section, section.item, items)
    for (const value of items) {
      const file = filePath(folder, value, section.ext)
      if (!inside(folder, file)) continue
      result.push({
        type: section.type,
        name: itemName(value, section.ext),
        file
      })
    }
  }
  return result
}

function parseOptions(source: string): Map<string, string> {
  const root = parseXml(source, 'configuration')
  const node = child(root, 'Options')
  if (!node) throw new Error('Invalid configuration: <Options> is missing')
  return new Map(children(node).map((item) => [tag(item), text(item)]))
}

function option(options: Map<string, string>, name: string, fallback = ''): string {
  return options.get(name.toLowerCase()) ?? fallback
}

function integer(options: Map<string, string>, name: string, fallback = 0): number {
  const value = Number.parseInt(option(options, name), 10)
  return Number.isFinite(value) ? value : fallback
}

function flag(options: Map<string, string>, name: string, fallback = false): boolean {
  const value = option(options, name)
  if (!value) return fallback
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase())
}

function audioNames(root: XmlElement): string[] {
  const group = child(root, 'audiogroups')
  if (!group) return ['audiogroup_default']
  const names = children(group)
    .filter((item) => tag(item) === 'audiogroup')
    .map((item) => item.getAttribute('name')?.trim() ?? '')
    .filter(Boolean)
  return names.length > 0 ? names : ['audiogroup_default']
}

function textureGroups(options: Map<string, string>): TextureGroupSettings[] {
  const count = Math.max(1, Math.min(256, integer(options, 'option_textureGroup_count', 1)))
  return Array.from({ length: count }, (_, index) => ({
    sourceIndex: index,
    name: option(options, `option_textureGroups${index}`, index === 0 ? 'Default' : `Group ${index}`),
    scaled: flag(options, `option_textureGroup${index}_scaled`),
    noCropping: flag(options, `option_textureGroup${index}_nocropping`),
    border: Math.max(0, integer(options, `option_textureGroup${index}_border`, 2)),
    parent: (() => {
      const value = option(options, `option_textureGroup${index}_parent`)
      return value === '<none>' ? '' : value
    })(),
    targets: option(options, `option_textureGroup${index}_targets`, allTargets),
    contents: []
  }))
}

function audioGroups(root: XmlElement, options: Map<string, string>): AudioGroupSettings[] {
  return audioNames(root).map((name, index) => ({
    sourceIndex: index,
    name,
    targets: index === 0
      ? allTargets
      : option(options, `option_audioGroup${index}_targets`, allTargets),
    contents: []
  }))
}

const namedColors: Record<string, string> = {
  clblack: '#000000',
  clwhite: '#ffffff',
  clred: '#ff0000',
  clgreen: '#00ff00',
  clblue: '#0000ff',
  clgray: '#808080',
  clgrey: '#808080',
  clyellow: '#ffff00',
  claqua: '#00ffff',
  clfuchsia: '#ff00ff'
}

function htmlColor(value: string): string {
  const named = namedColors[value.toLowerCase()]
  if (named) return named
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  let number: bigint
  try {
    number = value.startsWith('$') ? BigInt(`0x${value.slice(1)}`) : BigInt(value || '0')
  } catch {
    return '#000000'
  }
  const red = Number(number & 255n)
  const green = Number((number >> 8n) & 255n)
  const blue = Number((number >> 16n) & 255n)
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
}

function gmxColor(value: string): string {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
  if (color.toLowerCase() === '#000000') return 'clBlack'
  if (color.toLowerCase() === '#ffffff') return 'clWhite'
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return String(red | (green << 8) | (blue << 16))
}

function resourceGroup(root: XmlElement, resource: ResourceRef, configIndex: number): number {
  if (resource.type === 'sound') {
    const value = Number.parseInt(text(child(root, 'audioGroup')), 10)
    return Number.isFinite(value) && value >= 0 ? value : 0
  }
  const parent = resource.type === 'font' ? child(root, 'texgroups') : child(root, 'TextureGroups')
  const name = resource.type === 'font' ? `texgroup${configIndex}` : `TextureGroup${configIndex}`
  const value = Number.parseInt(text(parent ? child(parent, name) : undefined), 10)
  return Number.isFinite(value) && value >= 0 ? value : 0
}

async function addContents(
  refs: ResourceRef[],
  configIndex: number,
  textures: TextureGroupSettings[],
  audio: AudioGroupSettings[]
): Promise<void> {
  const found = await Promise.all(refs.map(async (resource) => {
    if (!existsSync(resource.file)) return null
    try {
      const source = await readText(resource.file, maxResourceSize, 'Resource file')
      const root = parseXml(source, 'resource')
      return { resource, group: resourceGroup(root, resource, configIndex) }
    } catch {
      return null
    }
  }))

  for (const item of found) {
    if (!item) continue
    const ref: GlobalResourceRef = { type: item.resource.type, name: item.resource.name }
    if (item.resource.type === 'sound') (audio[item.group] ?? audio[0]).contents.push(ref)
    else (textures[item.group] ?? textures[0]).contents.push(ref)
  }
  for (const group of [...textures, ...audio]) {
    group.contents.sort((left, right) => left.name.localeCompare(right.name))
  }
}

type Context = {
  projectFile: string
  folder: string
  projectSource: string
  root: XmlElement
  refs: ConfigRef[]
  selected: ConfigRef
  configIndex: number
  configSource: string
  options: Map<string, string>
  resources: ResourceRef[]
}

async function context(projectFile: string, configName: unknown): Promise<Context> {
  if (typeof configName !== 'string' || !configName.trim()) throw new Error('Invalid configuration')
  const file = resolve(projectFile)
  const folder = dirname(file)
  const projectSource = await readText(file, maxProjectSize, 'Project file')
  const root = parseXml(projectSource, 'project')
  if (tag(root) !== 'assets') throw new Error('Invalid GameMaker project')
  const refs = parseConfigs(root, folder)
  const configIndex = refs.findIndex((item) => item.name === configName)
  if (configIndex < 0) throw new Error(`Configuration ${configName} does not exist`)
  const selected = refs[configIndex]
  if (!inside(folder, selected.file) || !existsSync(selected.file)) {
    throw new Error(`Configuration file ${selected.name} is missing`)
  }
  const configSource = await readText(selected.file, maxConfigSize, 'Configuration file')
  return {
    projectFile: file,
    folder,
    projectSource,
    root,
    refs,
    selected,
    configIndex,
    configSource,
    options: parseOptions(configSource),
    resources: resources(root, folder)
  }
}

function settingData(data: Context): GlobalSettingsData {
  const options = data.options
  return {
    config: data.selected.name,
    general: {
      gameId: integer(options, 'option_gameid'),
      guid: option(options, 'option_gameguid'),
      windowColor: htmlColor(option(options, 'option_windowcolor', 'clBlack')),
      useNewAudio: flag(options, 'option_use_new_audio', true),
      shortCircuit: flag(options, 'option_shortcircuit', true),
      fastCollision: flag(options, 'option_use_fast_collision'),
      collisionCompatibility: flag(
        options,
        'option_fast_collision_compatibility',
        flag(options, 'option_collision_compatibility')
      )
    },
    textureGroups: textureGroups(options),
    audioGroups: audioGroups(data.root, options),
    projectInfo: {
      author: option(options, 'option_author'),
      version: option(options, 'option_version', '100'),
      lastChanged: option(options, 'option_lastchanged'),
      information: option(options, 'option_information')
    },
    windows: {
      displayName: option(options, 'option_display_name'),
      version: [
        integer(options, 'option_version_major', 1),
        integer(options, 'option_version_minor'),
        integer(options, 'option_version_release'),
        integer(options, 'option_version_build')
      ],
      company: option(options, 'option_version_company'),
      product: option(options, 'option_version_product'),
      copyright: option(options, 'option_version_copyright'),
      description: option(options, 'option_version_description'),
      showCursor: flag(options, 'option_showcursor', true),
      gameIcon: cleanPath(option(options, 'option_windows_game_icon')),
      saveLocation: integer(options, 'option_windows_save_location'),
      sleepMargin: integer(options, 'option_windows_sleep_margin', 1),
      splashScreen: cleanPath(option(options, 'option_windows_splash_screen')),
      useSplash: flag(options, 'option_windows_use_splash'),
      fullscreen: flag(options, 'option_fullscreen'),
      interpolate: flag(options, 'option_interpolate'),
      sizable: flag(options, 'option_sizeable'),
      keepAspect: integer(options, 'option_scale', -1) !== 0,
      allowFullscreen: flag(options, 'option_screenkey', true),
      borderless: flag(options, 'option_borderless'),
      syncVertex: flag(options, 'option_sync_vertex'),
      createTexturesOnDemand: flag(options, 'option_windows_create_textures_on_demand'),
      vertexBufferMethod: integer(options, 'option_windows_vertex_buffer_method2', 1),
      alternateSyncMethod: flag(options, 'option_windows_alternate_sync_method'),
      texturePage: integer(options, 'option_windows_texture_page', 2048),
      runnerFinished: cleanPath(option(options, 'option_windows_runner_finished')),
      runnerHeader: cleanPath(option(options, 'option_windows_runner_header')),
      installerScript: cleanPath(option(options, 'option_windows_nsis_file')),
      license: cleanPath(option(options, 'option_windows_license'))
    }
  }
}

export async function loadGlobalSettings(
  projectFile: string,
  configName: unknown
): Promise<GlobalSettingsData> {
  const data = await context(projectFile, configName)
  const result = settingData(data)
  await addContents(data.resources, data.configIndex, result.textureGroups, result.audioGroups)
  return result
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}`)
  return value as Record<string, unknown>
}

function string(value: unknown, label: string, max = 512): string {
  if (typeof value !== 'string' || value.length > max || /[\0]/.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${label}`)
  return value
}

function number(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`Invalid ${label}`)
  }
  return value as number
}

function mask(value: unknown, label: string): string {
  const source = string(value, label, 32).trim()
  let result: bigint
  try {
    result = source.startsWith('$') ? BigInt(`0x${source.slice(1)}`) : BigInt(source)
  } catch {
    throw new Error(`Invalid ${label}`)
  }
  if (result < 0n || result > 0x7fffffffffffffffn) throw new Error(`Invalid ${label}`)
  return result.toString()
}

function groupName(value: unknown, label: string): string {
  const result = string(value, label, 80).trim()
  if (!result || /[<>"'\\/\x00-\x1f]/.test(result)) throw new Error(`Invalid ${label}`)
  return result
}

function sourceIndex(value: unknown, oldCount: number, label: string): number | null {
  if (value === null) return null
  return number(value, label, 0, oldCount - 1)
}

function validateTextureGroups(value: unknown, old: TextureGroupSettings[]): TextureGroupSettings[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 256) {
    throw new Error('Invalid texture groups')
  }
  const result = value.map((entry, index) => {
    const item = object(entry, 'texture group')
    return {
      sourceIndex: sourceIndex(item.sourceIndex, old.length, 'texture group source'),
      name: groupName(item.name, 'texture group name'),
      scaled: boolean(item.scaled, 'texture group scaling'),
      noCropping: boolean(item.noCropping, 'texture group cropping'),
      border: number(item.border, 'texture group border', 0, 64),
      parent: string(item.parent, 'texture group parent', 80).trim(),
      targets: mask(item.targets, 'texture group targets'),
      contents: []
    } satisfies TextureGroupSettings
  })
  validateGroupSources(result, old.length, 'texture')
  validateNames(result.map((item) => item.name), 'texture group')

  const names = new Map(result.map((item, index) => [item.name.toLowerCase(), index]))
  for (let index = 0; index < result.length; index += 1) {
    const parent = result[index].parent
    if (!parent) continue
    const parentIndex = names.get(parent.toLowerCase())
    if (parentIndex === undefined || parentIndex === index) throw new Error('Invalid texture group parent')
    const seen = new Set([index])
    let next: number | undefined = parentIndex
    while (next !== undefined) {
      if (seen.has(next)) throw new Error('Texture group parents cannot form a cycle')
      seen.add(next)
      const parentName: string = result[next].parent
      next = parentName ? names.get(parentName.toLowerCase()) : undefined
    }
  }
  return result
}

function validateAudioGroups(value: unknown, old: AudioGroupSettings[]): AudioGroupSettings[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 256) {
    throw new Error('Invalid audio groups')
  }
  const result = value.map((entry) => {
    const item = object(entry, 'audio group')
    return {
      sourceIndex: sourceIndex(item.sourceIndex, old.length, 'audio group source'),
      name: groupName(item.name, 'audio group name'),
      targets: mask(item.targets, 'audio group targets'),
      contents: []
    } satisfies AudioGroupSettings
  })
  validateGroupSources(result, old.length, 'audio')
  validateNames(result.map((item) => item.name), 'audio group')
  return result
}

function validateGroupSources(
  groups: Array<{ sourceIndex: number | null }>,
  oldCount: number,
  label: string
): void {
  if (groups[0].sourceIndex !== 0) throw new Error(`The default ${label} group must remain first`)
  const sources = groups.flatMap((item) => item.sourceIndex === null ? [] : [item.sourceIndex])
  if (new Set(sources).size !== sources.length || sources.some((item) => item >= oldCount)) {
    throw new Error(`Invalid ${label} group mapping`)
  }
}

function validateNames(names: string[], label: string): void {
  const unique = new Set(names.map((name) => name.toLowerCase()))
  if (unique.size !== names.length) throw new Error(`Duplicate ${label} name`)
}

function validateData(value: unknown, old: GlobalSettingsData): GlobalSettingsData {
  const data = object(value, 'global settings')
  const general = object(data.general, 'general settings')
  const info = object(data.projectInfo, 'project information')
  const windows = object(data.windows, 'Windows settings')
  if (!Array.isArray(windows.version) || windows.version.length !== 4) {
    throw new Error('Invalid Windows version')
  }
  const color = string(general.windowColor, 'outside color', 7).toLowerCase()
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error('Invalid outside color')
  const guid = string(general.guid, 'game GUID', 38).toUpperCase()
  if (!/^\{[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\}$/.test(guid)) {
    throw new Error('Invalid game GUID')
  }
  const texturePage = number(windows.texturePage, 'texture page size', 128, 16384)
  if (![256, 512, 1024, 2048, 4096, 8192].includes(texturePage)) {
    throw new Error('Invalid texture page size')
  }

  return {
    config: old.config,
    general: {
      gameId: number(general.gameId, 'game identifier', 0, 2147483647),
      guid,
      windowColor: color,
      useNewAudio: boolean(general.useNewAudio, 'audio engine setting'),
      shortCircuit: boolean(general.shortCircuit, 'short-circuit setting'),
      fastCollision: boolean(general.fastCollision, 'fast collision setting'),
      collisionCompatibility: boolean(
        general.collisionCompatibility,
        'collision compatibility setting'
      )
    },
    textureGroups: validateTextureGroups(data.textureGroups, old.textureGroups),
    audioGroups: validateAudioGroups(data.audioGroups, old.audioGroups),
    projectInfo: {
      author: string(info.author, 'author', 260),
      version: string(info.version, 'project version', 80),
      lastChanged: old.projectInfo.lastChanged,
      information: string(info.information, 'project information', 64 * 1024)
    },
    windows: {
      displayName: string(windows.displayName, 'display name', 260),
      version: windows.version.map((item, index) =>
        number(item, `Windows version part ${index + 1}`, 0, 65535)
      ) as [number, number, number, number],
      company: string(windows.company, 'company', 260),
      product: string(windows.product, 'product', 260),
      copyright: string(windows.copyright, 'copyright', 512),
      description: string(windows.description, 'description', 512),
      showCursor: boolean(windows.showCursor, 'cursor setting'),
      gameIcon: string(windows.gameIcon, 'game icon path', 512),
      saveLocation: number(windows.saveLocation, 'save data location', 0, 1),
      sleepMargin: number(windows.sleepMargin, 'sleep margin', 0, 1000),
      splashScreen: string(windows.splashScreen, 'splash screen path', 512),
      useSplash: boolean(windows.useSplash, 'splash setting'),
      fullscreen: boolean(windows.fullscreen, 'fullscreen setting'),
      interpolate: boolean(windows.interpolate, 'interpolation setting'),
      sizable: boolean(windows.sizable, 'window resize setting'),
      keepAspect: boolean(windows.keepAspect, 'scaling setting'),
      allowFullscreen: boolean(windows.allowFullscreen, 'fullscreen switch setting'),
      borderless: boolean(windows.borderless, 'borderless setting'),
      syncVertex: boolean(windows.syncVertex, 'synchronization setting'),
      createTexturesOnDemand: boolean(windows.createTexturesOnDemand, 'texture setting'),
      vertexBufferMethod: number(windows.vertexBufferMethod, 'vertex buffer method', 0, 2),
      alternateSyncMethod: boolean(windows.alternateSyncMethod, 'alternate sync setting'),
      texturePage,
      runnerFinished: string(windows.runnerFinished, 'installer image path', 512),
      runnerHeader: string(windows.runnerHeader, 'installer header path', 512),
      installerScript: string(windows.installerScript, 'installer script path', 512),
      license: string(windows.license, 'license path', 512)
    }
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

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeOptionPrefix(source: string, prefix: string): string {
  const name = escaped(prefix)
  return source.replace(
    new RegExp(`^[ \\t]*<${name}[A-Za-z0-9_]*\\b[^>]*>[\\s\\S]*?<\\/${name}[A-Za-z0-9_]*>[ \\t]*(?:\\r?\\n)?`, 'gmi'),
    ''
  )
}

function putOptions(source: string, values: Array<[string, string]>): string {
  const missing: Array<[string, string]> = []
  let result = source
  for (const [name, value] of values) {
    const pattern = new RegExp(`(<${escaped(name)}\\b[^>]*>)[\\s\\S]*?(<\\/${escaped(name)}>)`, 'i')
    if (pattern.test(result)) {
      result = result.replace(pattern, (_match, open: string, close: string) =>
        `${open}${xml(value)}${close}`
      )
    }
    else missing.push([name, value])
  }
  if (missing.length === 0) return result
  const eol = result.includes('\r\n') ? '\r\n' : '\n'
  const block = missing.map(([name, value]) => `    <${name}>${xml(value)}</${name}>`).join(eol)
  const closing = /(^[ \t]*)<\/Options>/mi
  if (!closing.test(result)) throw new Error('Invalid configuration: <Options> is missing')
  return result.replace(closing, (match) => `${block}${eol}${match}`)
}

function bool(value: boolean): string {
  return value ? 'True' : 'False'
}

function changedAt(): string {
  const date = new Date()
  const part = (value: number): string => String(value).padStart(2, '0')
  return `${part(date.getDate())}/${part(date.getMonth() + 1)}/${part(date.getFullYear() % 100)} ${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`
}

function staticOptions(data: GlobalSettingsData): Array<[string, string]> {
  const windows = data.windows
  return [
    ['option_gameid', String(data.general.gameId)],
    ['option_gameguid', data.general.guid],
    ['option_windowcolor', gmxColor(data.general.windowColor)],
    ['option_use_new_audio', bool(data.general.useNewAudio)],
    ['option_shortcircuit', bool(data.general.shortCircuit)],
    ['option_use_fast_collision', bool(data.general.fastCollision)],
    ['option_fast_collision_compatibility', bool(data.general.collisionCompatibility)],
    ['option_author', data.projectInfo.author],
    ['option_version', data.projectInfo.version],
    ['option_lastchanged', changedAt()],
    ['option_information', data.projectInfo.information],
    ['option_display_name', windows.displayName],
    ['option_version_major', String(windows.version[0])],
    ['option_version_minor', String(windows.version[1])],
    ['option_version_release', String(windows.version[2])],
    ['option_version_build', String(windows.version[3])],
    ['option_version_company', windows.company],
    ['option_version_product', windows.product],
    ['option_version_copyright', windows.copyright],
    ['option_version_description', windows.description],
    ['option_showcursor', bool(windows.showCursor)],
    ['option_windows_game_icon', windows.gameIcon.replace(/\//g, '\\')],
    ['option_windows_save_location', String(windows.saveLocation)],
    ['option_windows_sleep_margin', String(windows.sleepMargin)],
    ['option_windows_splash_screen', windows.splashScreen.replace(/\//g, '\\')],
    ['option_windows_use_splash', windows.useSplash ? '1' : '0'],
    ['option_fullscreen', bool(windows.fullscreen)],
    ['option_interpolate', bool(windows.interpolate)],
    ['option_sizeable', bool(windows.sizable)],
    ['option_scale', windows.keepAspect ? '-1' : '0'],
    ['option_screenkey', bool(windows.allowFullscreen)],
    ['option_borderless', bool(windows.borderless)],
    ['option_sync_vertex', windows.syncVertex ? '1' : '0'],
    ['option_windows_create_textures_on_demand', bool(windows.createTexturesOnDemand)],
    ['option_windows_vertex_buffer_method2', String(windows.vertexBufferMethod)],
    ['option_windows_alternate_sync_method', bool(windows.alternateSyncMethod)],
    ['option_windows_texture_page', String(windows.texturePage)],
    ['option_windows_runner_finished', windows.runnerFinished.replace(/\//g, '\\')],
    ['option_windows_runner_header', windows.runnerHeader.replace(/\//g, '\\')],
    ['option_windows_nsis_file', windows.installerScript.replace(/\//g, '\\')],
    ['option_windows_license', windows.license.replace(/\//g, '\\')]
  ]
}

function textureOptions(groups: TextureGroupSettings[]): Array<[string, string]> {
  return [
    ['option_textureGroup_count', String(groups.length)],
    ...groups.flatMap((group, index): Array<[string, string]> => [
      [`option_textureGroups${index}`, group.name],
      [`option_textureGroup${index}_scaled`, group.scaled ? '1' : '0'],
      [`option_textureGroup${index}_nocropping`, group.noCropping ? '1' : '0'],
      [`option_textureGroup${index}_border`, String(group.border)],
      [`option_textureGroup${index}_targets`, group.targets],
      [`option_textureGroup${index}_parent`, group.parent || '<none>']
    ])
  ]
}

function audioOptions(groups: AudioGroupSettings[], old: Map<string, string>, selected: boolean): Array<[string, string]> {
  return [
    ['option_audioGroupCount', String(groups.length)],
    ...groups.slice(1).map<[string, string]>((group, offset) => {
      const index = offset + 1
      const value = selected
        ? group.targets
        : group.sourceIndex === null
          ? allTargets
          : option(old, `option_audioGroup${group.sourceIndex}_targets`, allTargets)
      return [`option_audioGroup${index}_targets`, value]
    })
  ]
}

function indexMap(groups: Array<{ sourceIndex: number | null }>): Map<number, number> {
  const result = new Map<number, number>()
  groups.forEach((group, index) => {
    if (group.sourceIndex !== null) result.set(group.sourceIndex, index)
  })
  return result
}

function replaceElement(source: string, name: string, value: string): string {
  const pattern = new RegExp(`(<${escaped(name)}\\b[^>]*>)[\\s\\S]*?(<\\/${escaped(name)}>)`, 'i')
  if (!pattern.test(source)) throw new Error(`Resource is missing <${name}>`)
  return source.replace(pattern, (_match, open: string, close: string) =>
    `${open}${xml(value)}${close}`
  )
}

async function remapResources(
  data: Context,
  textureMap: Map<number, number>,
  audioMap: Map<number, number>
): Promise<Array<{ file: string; source: string }>> {
  const updates = await Promise.all(data.resources.map(async (resource) => {
    if (!existsSync(resource.file)) return null
    const source = await readText(resource.file, maxResourceSize, 'Resource file')
    const root = parseXml(source, 'resource')
    const oldIndex = resourceGroup(root, resource, data.configIndex)
    const nextIndex = (resource.type === 'sound' ? audioMap : textureMap).get(oldIndex) ?? 0
    if (nextIndex === oldIndex) return null
    const name = resource.type === 'sound'
      ? 'audioGroup'
      : resource.type === 'font'
        ? `texgroup${data.configIndex}`
        : `TextureGroup${data.configIndex}`
    return { file: resource.file, source: replaceElement(source, name, String(nextIndex)) }
  }))
  return updates.flatMap((item) => item ? [item] : [])
}

function audioGroupSource(source: string, groups: AudioGroupSettings[]): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = [
    '  <audiogroups name="audiogroups">',
    ...groups.map((group) => `    <audiogroup name="${xml(group.name)}"/>`),
    '  </audiogroups>'
  ]
  const block = `${lines.join(eol)}${eol}`
  const existing = /^[ \t]*<audiogroups\b[^>]*>[\s\S]*?<\/audiogroups>[ \t]*(?:\r?\n)?/mi
  if (existing.test(source)) return source.replace(existing, () => block)
  const configs = /(^[ \t]*<\/Configs>[ \t]*\r?\n)/mi
  if (configs.test(source)) return source.replace(configs, (match) => `${match}${block}`)
  const root = /(<assets\b[^>]*>\r?\n?)/i
  if (!root.test(source)) throw new Error('Invalid project: <assets> is missing')
  return source.replace(root, (match) => `${match}${block}`)
}

export async function saveGlobalSettings(
  projectFile: string,
  configName: unknown,
  value: unknown
): Promise<void> {
  const data = await context(projectFile, configName)
  const old = settingData(data)
  const settings = validateData(value, old)
  const textureMap = indexMap(settings.textureGroups)
  const audioMap = indexMap(settings.audioGroups)
  const resourceUpdates = await remapResources(data, textureMap, audioMap)

  const configUpdates: Array<{ file: string; source: string }> = []
  for (const ref of data.refs) {
    if (!inside(data.folder, ref.file) || !existsSync(ref.file)) {
      throw new Error(`Configuration file ${ref.name} is missing`)
    }
    const source = ref.file === data.selected.file
      ? data.configSource
      : await readText(ref.file, maxConfigSize, 'Configuration file')
    const options = parseOptions(source)
    let edited = removeOptionPrefix(source, 'option_audioGroup')
    const values = audioOptions(settings.audioGroups, options, ref.file === data.selected.file)
    if (ref.file === data.selected.file) {
      edited = removeOptionPrefix(edited, 'option_textureGroup')
      values.push(...staticOptions(settings), ...textureOptions(settings.textureGroups))
      if (options.has('option_collision_compatibility')) {
        values.push(['option_collision_compatibility', bool(settings.general.collisionCompatibility)])
      }
    }
    edited = putOptions(edited, values)
    parseXml(edited, 'configuration')
    configUpdates.push({ file: ref.file, source: edited })
  }

  const projectSource = audioGroupSource(data.projectSource, settings.audioGroups)
  parseXml(projectSource, 'project')
  await Promise.all([
    ...resourceUpdates.map((item) => writeFile(item.file, item.source, 'utf8')),
    ...configUpdates.map((item) => writeFile(item.file, item.source, 'utf8')),
    writeFile(data.projectFile, projectSource, 'utf8')
  ])
}
