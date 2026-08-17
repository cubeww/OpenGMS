import { readFile, writeFile } from 'node:fs/promises'
import { DOMParser } from '@xmldom/xmldom'
import type { MacroData, MacroEntry } from '../shared/types'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

const maxFileSize = 32 * 1024 * 1024

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

function constantsRoot(root: XmlElement, config: string | null): XmlElement | undefined {
  if (config === null) return child(root, 'constants')
  return child(child(root, 'ConfigConstants') ?? root, 'constants')
}

function readEntries(root: XmlElement, config: string | null): MacroEntry[] {
  const constants = constantsRoot(root, config)
  if (!constants) return []
  return children(constants).flatMap((item) => {
    if (tag(item) !== 'constant') return []
    const name = item.getAttribute('name')?.trim() ?? ''
    return name ? [{ name, value: item.textContent ?? '' }] : []
  })
}

export async function loadMacros(file: string, config: string | null): Promise<MacroData | undefined> {
  try {
    const bytes = await readFile(file)
    if (bytes.length > maxFileSize) return undefined
    const errors: string[] = []
    const root = new DOMParser({
      onError: (level, message) => {
        if (level !== 'warning') errors.push(message)
      }
    }).parseFromString(bytes.toString('utf8'), 'application/xml').documentElement
    if (!root || errors.length > 0) return undefined
    if (config === null && tag(root) !== 'assets') return undefined
    if (config !== null && tag(root) !== 'config') return undefined
    return { config, entries: readEntries(root, config) }
  } catch {
    return undefined
  }
}

function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.includes('\0') || value.length > max) {
    throw new Error('Invalid macro value')
  }
  return value
}

function macroName(value: unknown): string {
  const name = string(value, 256).trim()
  if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error(`Invalid macro name: ${name || '(empty)'}`)
  return name
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xmlAttr(value: string): string {
  return xml(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function validate(value: unknown): MacroData {
  if (!value || typeof value !== 'object') throw new Error('Invalid macro data')
  const data = value as MacroData
  if (data.config !== null) string(data.config, 260)
  if (!Array.isArray(data.entries) || data.entries.length > 10000) {
    throw new Error('Invalid macro list')
  }
  const used = new Set<string>()
  const entries = data.entries.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid macro')
    const name = macroName(item.name)
    if (used.has(name)) throw new Error(`Macro ${name} is defined more than once`)
    used.add(name)
    return { name, value: string(item.value, 65536) }
  })
  return { config: data.config, entries }
}

function constants(entries: MacroEntry[], eol: string, indent: string): string {
  if (entries.length === 0) return `<constants number="0"/>`
  return [
    `<constants number="${entries.length}">`,
    ...entries.map((item) =>
      `${indent}  <constant name="${xmlAttr(item.name)}">${xml(item.value)}</constant>`
    ),
    `${indent}</constants>`
  ].join(eol)
}

function replaceSection(source: string, name: string, value: string, parent: string, eol: string): string {
  const pattern = new RegExp(`<${name}\\b[^>]*\\/\\s*>|<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'i')
  if (pattern.test(source)) return source.replace(pattern, value)
  return source.replace(new RegExp(`</${parent}>`, 'i'), `  ${value}${eol}</${parent}>`)
}

export async function saveMacros(file: string, value: unknown): Promise<void> {
  const data = validate(value)
  const bytes = await readFile(file)
  if (bytes.length > maxFileSize) throw new Error('Macro file is too large')
  let source = bytes.toString('utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'

  if (data.config === null) {
    if (!/<assets\b/i.test(source)) throw new Error('Invalid project file')
    source = replaceSection(source, 'constants', constants(data.entries, eol, '  '), 'assets', eol)
  } else {
    if (!/<Config\b/i.test(source)) throw new Error('Invalid configuration file')
    const section = data.entries.length === 0
      ? '<ConfigConstants/>'
      : [
          '<ConfigConstants>',
          `    ${constants(data.entries, eol, '    ')}`,
          '  </ConfigConstants>'
        ].join(eol)
    source = replaceSection(source, 'ConfigConstants', section, 'Config', eol)
  }

  if (Buffer.byteLength(source, 'utf8') > maxFileSize) throw new Error('Macro file is too large')
  await writeFile(file, source, 'utf8')
}
