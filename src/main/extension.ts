import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type {
  ExtensionData,
  ExtensionFile,
  ExtensionFramework,
  ExtensionFunction,
  ExtensionProxy,
  ExtensionResource,
  ResourceType
} from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

const maxExtensionSize = 32 * 1024 * 1024
const maxMask = 0x7fffffffffffffffn

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

function version(value: string): [number, number, number] {
  const parts = value.split('.').slice(0, 3).map((part) => Number.parseInt(part, 10))
  return [0, 1, 2].map((index) => {
    const part = parts[index]
    return Number.isFinite(part) ? Math.max(0, Math.min(9999, part)) : 0
  }) as [number, number, number]
}

function mask(value: string): string {
  try {
    const result = BigInt(value.trim())
    return result >= 0n && result <= maxMask ? result.toString() : maxMask.toString()
  } catch {
    return maxMask.toString()
  }
}

function readMasks(root: XmlElement): Record<string, string> {
  const result: Record<string, string> = {}
  const options = child(root, 'ConfigOptions')
  if (options) {
    for (const config of children(options)) {
      if (tag(config) !== 'config') continue
      const name = config.getAttribute('name')?.trim() || 'Default'
      result[name] = mask(text(child(config, 'CopyToMask')))
    }
  }
  if (Object.keys(result).length === 0) result.Default = maxMask.toString()
  return result
}

function readFrameworks(root: XmlElement, name: string): ExtensionFramework[] {
  const section = child(root, name)
  if (!section) return []
  return children(section).flatMap((item) => {
    const value = text(item)
    return value
      ? [{
          name: value,
          weak: !['', '0'].includes(item.getAttribute('weak')?.trim() ?? ''),
          tag: item.nodeName || 'framework'
        }]
      : []
  })
}

const folderTypes: Array<[string, ResourceType]> = [
  ['sprites', 'sprite'],
  ['sound', 'sound'],
  ['background', 'background'],
  ['paths', 'path'],
  ['scripts', 'script'],
  ['shaders', 'shader'],
  ['fonts', 'font'],
  ['timelines', 'timeline'],
  ['objects', 'object'],
  ['rooms', 'room'],
  ['datafiles', 'file']
]

function resourceType(node: XmlElement, value: string): ResourceType {
  const hint = (node.getAttribute('type') || tag(node)).toLowerCase().replace(/[\s_-]/g, '')
  const byName: Record<string, ResourceType> = {
    sprite: 'sprite', sprites: 'sprite', sound: 'sound', sounds: 'sound',
    background: 'background', backgrounds: 'background', path: 'path', paths: 'path',
    script: 'script', scripts: 'script', shader: 'shader', shaders: 'shader',
    font: 'font', fonts: 'font', timeline: 'timeline', timelines: 'timeline',
    object: 'object', objects: 'object', room: 'room', rooms: 'room',
    file: 'file', files: 'file', includedfile: 'file', datafile: 'file'
  }
  if (byName[hint]) return byName[hint]

  const folder = value.trim().replace(/\\/g, '/').split('/')[0].toLowerCase()
  return folderTypes.find(([name]) => name === folder)?.[1] ?? 'file'
}

function readResources(root: XmlElement): ExtensionResource[] {
  const section = child(root, 'IncludedResources')
  if (!section) return []
  return children(section).flatMap((item) => {
    const path = text(item).replace(/\//g, '\\')
    return path
      ? [{ type: resourceType(item, path), path, tag: item.nodeName || 'resource' }]
      : []
  })
}

function integer(node: XmlElement | undefined, fallback: number): number {
  const value = Number.parseInt(text(node), 10)
  return Number.isFinite(value) ? value : fallback
}

function readProxyFiles(root: XmlElement): ExtensionProxy[] {
  const section = child(root, 'ProxyFiles')
  if (!section) return []
  return children(section).flatMap((item) => {
    if (tag(item) !== 'proxyfile') return []
    const name = text(child(item, 'Name'))
    return name ? [{ name, targetMask: mask(text(child(item, 'TargetMask'))) }] : []
  })
}

function readFunctions(root: XmlElement): ExtensionFunction[] {
  const section = child(root, 'functions')
  if (!section) return []
  return children(section).flatMap((item) => {
    if (tag(item) !== 'function') return []
    const args = child(item, 'args')
    return [{
      name: text(child(item, 'name')),
      externalName: text(child(item, 'externalName')),
      kind: integer(child(item, 'kind'), 12),
      help: text(child(item, 'help'), false),
      returnType: integer(child(item, 'returnType'), 2),
      argCount: integer(child(item, 'argCount'), 0),
      args: args ? children(args)
        .filter((arg) => tag(arg) === 'arg')
        .map((arg) => integer(arg, 2)) : []
    }]
  })
}

function readFiles(root: XmlElement): ExtensionFile[] {
  const section = child(root, 'files')
  if (!section) return []
  return children(section).flatMap((item) => {
    if (tag(item) !== 'file') return []
    return [{
      filename: text(child(item, 'filename')),
      originalName: text(child(item, 'origname')),
      init: text(child(item, 'init')),
      final: text(child(item, 'final')),
      kind: integer(child(item, 'kind'), 1),
      uncompress: !['', '0'].includes(text(child(item, 'uncompress'))),
      copyMasks: readMasks(item),
      proxyFiles: readProxyFiles(item),
      functions: readFunctions(item)
    }]
  })
}

export async function loadExtension(file: string): Promise<ExtensionData | undefined> {
  try {
    const bytes = await readFile(file)
    if (bytes.length > maxExtensionSize) return undefined
    const source = bytes.toString('utf8')
    const root = new DOMParser({ onError: () => undefined }).parseFromString(
      source,
      'application/xml'
    ).documentElement
    if (!root || tag(root) !== 'extension') return undefined

    const permissions = child(root, 'androidPermissions')
    return {
      name: text(child(root, 'name')),
      version: version(text(child(root, 'version'))),
      copyMasks: readMasks(root),
      className: text(child(root, 'classname'), false),
      compilerFlags: text(child(root, 'maccompilerflags'), false),
      linkerFlags: text(child(root, 'maclinkerflags'), false),
      plist: text(child(root, 'iosplistinject'), false),
      systemFrameworks: readFrameworks(root, 'iosSystemFrameworks'),
      thirdPartyFrameworks: readFrameworks(root, 'iosThirdPartyFrameworks'),
      androidClassName: text(child(root, 'androidclassname'), false),
      permissions: permissions
        ? children(permissions).map((item) => text(item)).filter(Boolean)
        : [],
      androidManifest: text(child(root, 'androidmanifestinject'), false),
      androidApplication: text(child(root, 'androidinject'), false),
      androidActivity: text(child(root, 'androidactivityinject'), false),
      gradle: text(child(root, 'gradleinject'), false),
      includedResources: readResources(root),
      files: readFiles(root)
    }
  } catch {
    return undefined
  }
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xmlAttr(value: string): string {
  return xml(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function string(value: unknown, max = 4 * 1024 * 1024): string {
  if (typeof value !== 'string' || value.includes('\0') || value.length > max) {
    throw new Error('Invalid extension text')
  }
  return value
}

function name(value: unknown, max = 260): string {
  const result = string(value, max).trim()
  if (!result || /[\r\n<>]/.test(result)) throw new Error('Invalid extension name')
  return result
}

function tagName(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z_][\w:.-]*$/.test(value)) return fallback
  return value
}

function replaceElement(source: string, name: string, value: string): string {
  const pattern = new RegExp(`<${name}\\b[^>]*\\/\\s*>|<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'i')
  const element = `<${name}>${value}</${name}>`
  if (pattern.test(source)) return source.replace(pattern, element)
  return source.replace(/<\/extension>/i, `  ${element}\n</extension>`)
}

function section(name: string, lines: string[], eol: string): string {
  return lines.length === 0
    ? `  <${name}/>`
    : [`  <${name}>`, ...lines, `  </${name}>`].join(eol)
}

function replaceSection(source: string, name: string, value: string): string {
  const pattern = new RegExp(`<${name}\\b[^>]*\\/\\s*>|<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'i')
  if (pattern.test(source)) return source.replace(pattern, value)
  return source.replace(/<\/extension>/i, `${value}\n</extension>`)
}

function frameworkLines(values: unknown, eol: string): string[] {
  if (!Array.isArray(values) || values.length > 2048) throw new Error('Invalid framework list')
  return values.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid framework')
    const value = item as ExtensionFramework
    const framework = name(value.name, 4096)
    const node = tagName(value.tag, 'framework')
    if (typeof value.weak !== 'boolean') throw new Error('Invalid framework')
    return `    <${node} weak="${value.weak ? 1 : 0}">${xml(framework.replace(/\r\n|\r|\n/g, eol))}</${node}>`
  })
}

function maskValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{1,20}$/.test(value)) {
    throw new Error('Invalid extension target mask')
  }
  const result = BigInt(value)
  if (result < 0n || result > maxMask) throw new Error('Invalid extension target mask')
  return result.toString()
}

function wholeNumber(value: unknown, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`Invalid extension ${label}`)
  }
  return value as number
}

function optionalName(value: unknown, max = 260): string {
  const result = string(value, max).trim()
  if (/[^\S ]|[<>]/.test(result)) throw new Error('Invalid extension function name')
  return result
}

type ElementRange = { start: number; end: number; source: string }

function elementRanges(source: string, nodeName: string): ElementRange[] {
  const pattern = new RegExp(
    `<${nodeName}\\b[^>]*\\/\\s*>|<${nodeName}\\b[^>]*>[\\s\\S]*?<\\/${nodeName}>`,
    'gi'
  )
  const result: ElementRange[] = []
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue
    result.push({ start: match.index, end: match.index + match[0].length, source: match[0] })
  }
  return result
}

function indexedChild(source: string, sectionName: string, childName: string, index: number): ElementRange {
  wholeNumber(index, 0, 100000, `${childName} index`)
  const sectionRange = elementRanges(source, sectionName)[0]
  if (!sectionRange) throw new Error(`Extension ${sectionName} section is missing`)
  const childRange = elementRanges(sectionRange.source, childName)[index]
  if (!childRange) throw new Error(`Extension ${childName} was not found`)
  return {
    start: sectionRange.start + childRange.start,
    end: sectionRange.start + childRange.end,
    source: childRange.source
  }
}

function replaceRange(source: string, range: ElementRange, value: string): string {
  return source.slice(0, range.start) + value + source.slice(range.end)
}

function replaceChildElement(source: string, parent: string, nodeName: string, value: string, eol: string): string {
  const pattern = new RegExp(
    `<${nodeName}\\b[^>]*\\/\\s*>|<${nodeName}\\b[^>]*>[\\s\\S]*?<\\/${nodeName}>`,
    'i'
  )
  const element = `<${nodeName}>${value}</${nodeName}>`
  if (pattern.test(source)) return source.replace(pattern, element)
  return source.replace(new RegExp(`</${parent}>$`, 'i'), `  ${element}${eol}</${parent}>`)
}

function nestedSection(name: string, lines: string[], eol: string): string {
  return lines.length === 0
    ? `<${name}/>`
    : [`<${name}>`, ...lines, `    </${name}>`].join(eol)
}

function replaceChildSection(source: string, parent: string, name: string, value: string, eol: string): string {
  const pattern = new RegExp(`<${name}\\b[^>]*\\/\\s*>|<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'i')
  if (pattern.test(source)) return source.replace(pattern, value)
  return source.replace(new RegExp(`</${parent}>$`, 'i'), `    ${value}${eol}</${parent}>`)
}

function configLines(values: unknown): string[] {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new Error('Invalid extension target masks')
  }
  const configs = Object.entries(values)
  if (configs.length === 0 || configs.length > 256) throw new Error('Invalid extension target masks')
  return configs.flatMap(([config, data]) => [
    `      <Config name="${xmlAttr(name(config, 260))}">`,
    `        <CopyToMask>${maskValue(data)}</CopyToMask>`,
    '      </Config>'
  ])
}

function proxyLines(values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 4096) throw new Error('Invalid proxy file list')
  return values.flatMap((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid proxy file')
    const proxy = item as ExtensionProxy
    return [
      '      <ProxyFile>',
      `        <Name>${xml(name(proxy.name, 32768))}</Name>`,
      `        <TargetMask>${maskValue(proxy.targetMask)}</TargetMask>`,
      '      </ProxyFile>'
    ]
  })
}

function argumentLines(values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 64) throw new Error('Invalid extension arguments')
  return values.map((value) => `      <arg>${wholeNumber(value, 0, 255, 'argument type')}</arg>`)
}

async function extensionSource(file: string): Promise<{ source: string; eol: string }> {
  const bytes = await readFile(file)
  if (bytes.length > maxExtensionSize) throw new Error('Extension file is too large')
  const source = bytes.toString('utf8')
  return { source, eol: source.includes('\r\n') ? '\r\n' : '\n' }
}

async function writeExtension(file: string, source: string): Promise<void> {
  if (Buffer.byteLength(source, 'utf8') > maxExtensionSize) {
    throw new Error('Extension file is too large')
  }
  await writeFile(file, source, 'utf8')
}

export async function saveExtensionFile(file: string, index: number, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid extension file data')
  const data = value as ExtensionFile
  if (typeof data.uncompress !== 'boolean') throw new Error('Invalid extension uncompress option')

  const filename = name(data.filename, 32768)
  const init = optionalName(data.init, 4096)
  const final = optionalName(data.final, 4096)
  const kind = wholeNumber(data.kind, 0, 255, 'file kind')
  const { source: original, eol } = await extensionSource(file)
  const range = indexedChild(original, 'files', 'file', index)
  let edited = range.source
  edited = replaceChildElement(edited, 'file', 'filename', xml(filename), eol)
  edited = replaceChildElement(edited, 'file', 'init', xml(init), eol)
  edited = replaceChildElement(edited, 'file', 'final', xml(final), eol)
  edited = replaceChildElement(edited, 'file', 'kind', kind.toString(), eol)
  edited = replaceChildElement(edited, 'file', 'uncompress', data.uncompress ? '-1' : '0', eol)
  edited = replaceChildSection(
    edited,
    'file',
    'ConfigOptions',
    nestedSection('ConfigOptions', configLines(data.copyMasks), eol),
    eol
  )
  edited = replaceChildSection(
    edited,
    'file',
    'ProxyFiles',
    nestedSection('ProxyFiles', proxyLines(data.proxyFiles), eol),
    eol
  )
  await writeExtension(file, replaceRange(original, range, edited))
}

export async function saveExtensionFunction(
  file: string,
  fileIndex: number,
  functionIndex: number,
  value: unknown
): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid extension function data')
  const data = value as ExtensionFunction
  const functionName = name(data.name, 4096)
  const externalName = optionalName(data.externalName, 4096)
  const kind = wholeNumber(data.kind, 0, 255, 'function kind')
  const returnType = wholeNumber(data.returnType, 0, 255, 'return type')
  const argCount = wholeNumber(data.argCount, -1, 64, 'argument count')
  const args = argumentLines(data.args)
  if (argCount >= 0 && argCount !== args.length) {
    throw new Error('Extension argument count does not match its arguments')
  }

  const { source: original, eol } = await extensionSource(file)
  const fileRange = indexedChild(original, 'files', 'file', fileIndex)
  const functionRange = indexedChild(fileRange.source, 'functions', 'function', functionIndex)
  let edited = functionRange.source
  edited = replaceChildElement(edited, 'function', 'name', xml(functionName), eol)
  edited = replaceChildElement(edited, 'function', 'externalName', xml(externalName), eol)
  edited = replaceChildElement(edited, 'function', 'kind', kind.toString(), eol)
  edited = replaceChildElement(
    edited,
    'function',
    'help',
    xml(string(data.help, 65536).replace(/\r\n|\r|\n/g, eol)),
    eol
  )
  edited = replaceChildElement(edited, 'function', 'returnType', returnType.toString(), eol)
  edited = replaceChildElement(edited, 'function', 'argCount', argCount.toString(), eol)
  edited = replaceChildSection(
    edited,
    'function',
    'args',
    nestedSection('args', args, eol),
    eol
  )

  const nextFile = replaceRange(fileRange.source, functionRange, edited)
  await writeExtension(file, replaceRange(original, fileRange, nextFile))
}

const resourceTypes = new Set<ResourceType>([
  'sprite', 'sound', 'background', 'path', 'script', 'shader', 'font', 'timeline',
  'object', 'room', 'file', 'extension', 'macro'
])

function resourceLines(values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 100000) throw new Error('Invalid resource list')
  return values.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid extension resource')
    const value = item as ExtensionResource
    if (!resourceTypes.has(value.type)) throw new Error('Invalid extension resource type')
    const path = name(value.path, 32768).replace(/\//g, '\\')
    const node = tagName(value.tag, 'resource')
    return `    <${node} type="${value.type}">${xml(path)}</${node}>`
  })
}

export async function saveExtension(file: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid extension data')
  const extension = value as ExtensionData
  if (!Array.isArray(extension.version) || extension.version.length !== 3) {
    throw new Error('Invalid extension version')
  }
  const version = extension.version.map((part) => {
    if (!Number.isInteger(part) || part < 0 || part > 9999) throw new Error('Invalid extension version')
    return part
  }).join('.')
  if (!extension.copyMasks || typeof extension.copyMasks !== 'object' || Array.isArray(extension.copyMasks)) {
    throw new Error('Invalid extension target masks')
  }

  const bytes = await readFile(file)
  if (bytes.length > maxExtensionSize) throw new Error('Extension file is too large')
  let source = bytes.toString('utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const fields: Array<[string, string]> = [
    ['name', xml(name(extension.name))],
    ['version', version],
    ['classname', xml(string(extension.className, 4096))],
    ['maccompilerflags', xml(string(extension.compilerFlags, 65536))],
    ['maclinkerflags', xml(string(extension.linkerFlags, 65536))],
    ['iosplistinject', xml(string(extension.plist).replace(/\r\n|\r|\n/g, eol))],
    ['androidclassname', xml(string(extension.androidClassName, 4096))],
    ['androidmanifestinject', xml(string(extension.androidManifest).replace(/\r\n|\r|\n/g, eol))],
    ['androidinject', xml(string(extension.androidApplication).replace(/\r\n|\r|\n/g, eol))],
    ['androidactivityinject', xml(string(extension.androidActivity).replace(/\r\n|\r|\n/g, eol))],
    ['gradleinject', xml(string(extension.gradle).replace(/\r\n|\r|\n/g, eol))]
  ]
  for (const [field, data] of fields) source = replaceElement(source, field, data)

  const configs = Object.entries(extension.copyMasks)
  if (configs.length === 0 || configs.length > 256) throw new Error('Invalid extension target masks')
  const configLines = configs.flatMap(([config, data]) => {
    const configName = name(config, 260)
    return [
      `    <Config name="${xmlAttr(configName)}">`,
      `      <CopyToMask>${maskValue(data)}</CopyToMask>`,
      '    </Config>'
    ]
  })
  source = replaceSection(source, 'ConfigOptions', section('ConfigOptions', configLines, eol))
  source = replaceSection(
    source,
    'iosSystemFrameworks',
    section('iosSystemFrameworks', frameworkLines(extension.systemFrameworks, eol), eol)
  )
  source = replaceSection(
    source,
    'iosThirdPartyFrameworks',
    section('iosThirdPartyFrameworks', frameworkLines(extension.thirdPartyFrameworks, eol), eol)
  )

  if (!Array.isArray(extension.permissions) || extension.permissions.length > 4096) {
    throw new Error('Invalid Android permission list')
  }
  const permissions = extension.permissions.map((permission) =>
    `    <permission>${xml(name(permission, 4096))}</permission>`
  )
  source = replaceSection(source, 'androidPermissions', section('androidPermissions', permissions, eol))
  source = replaceSection(
    source,
    'IncludedResources',
    section('IncludedResources', resourceLines(extension.includedResources), eol)
  )

  if (Buffer.byteLength(source, 'utf8') > maxExtensionSize) {
    throw new Error('Extension file is too large')
  }
  await writeFile(file, source, 'utf8')
}
