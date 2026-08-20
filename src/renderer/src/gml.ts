import type * as Monaco from 'monaco-editor/editor/editor.api'
import type { Project, ProjectItem, ResourceType } from '../../shared/types'
import { parseScriptInfo } from '../../shared/script'
import { codeBuffer } from './codeReveal'
import { projectGmlSources } from './codeSearch'
import { gmlFunctions, type GmlFunction } from './gmlBuiltins'
import { gmlCoreFunctions } from './gmlCore'
import { gmlConstants, gmlVariables } from './gmlSymbols'
import { useApp } from './store'

type MonacoApi = typeof Monaco

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

type ProjectSymbol = {
  name: string
  detail: string
  type: 'function' | 'resource' | 'constant'
  signature?: string
  description?: string
  resource?: ResourceItem
}

type Call = {
  name: string
  argument: number
}

export type GmlResourceTarget = {
  name: string
  detail: string
  kind: ProjectSymbol['type']
  range: Monaco.IRange
}

type ResourceTargetCache = {
  version: number
  project: Project | null
  targets: GmlResourceTarget[]
}

type EnumMember = {
  name: string
  value: string
  start: number
  end: number
}

type GmlEnum = {
  name: string
  start: number
  end: number
  members: EnumMember[]
}

type EnumSource = {
  key: string
  label: string
  enums: GmlEnum[]
  model?: Monaco.editor.ITextModel
}

type EnumSymbol = GmlEnum & {
  source: EnumSource
}

const keywords = [
  'begin', 'break', 'case', 'continue', 'default', 'do', 'else', 'end', 'exit',
  'enum', 'for', 'globalvar', 'if', 'repeat', 'return', 'switch', 'then', 'until', 'var',
  'while', 'with'
]

const wordOperators = ['and', 'div', 'mod', 'not', 'or', 'xor']

const constants = [...gmlConstants]

const builtInVariables = [...gmlVariables]

const snippets = [
  { label: 'if', detail: 'If statement', text: 'if (${1:condition}) {\n\t$0\n}' },
  { label: 'ifelse', detail: 'If / else statement', text: 'if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}' },
  { label: 'for', detail: 'For loop', text: 'for (var ${1:i} = ${2:0}; $1 < ${3:count}; $1 += 1) {\n\t$0\n}' },
  { label: 'while', detail: 'While loop', text: 'while (${1:condition}) {\n\t$0\n}' },
  { label: 'do', detail: 'Do / until loop', text: 'do {\n\t$0\n} until (${1:condition});' },
  { label: 'repeat', detail: 'Repeat loop', text: 'repeat (${1:count}) {\n\t$0\n}' },
  { label: 'with', detail: 'With block', text: 'with (${1:object}) {\n\t$0\n}' },
  { label: 'switch', detail: 'Switch statement', text: 'switch (${1:value}) {\n\tcase ${2:value}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}' },
  { label: 'enum', detail: 'Enum declaration', text: 'enum ${1:Name} {\n\t${2:Member}\n}\n$0' },
  { label: 'description', detail: 'Script description', text: '/// @description ${1:Description}\n$0' }
]

const hiddenFunctions: GmlFunction[] = [
  {
    name: 'variable_global_exists',
    signature: 'variable_global_exists(name)',
    description: 'Returns whether a global variable with the given name exists.',
    category: 'Variables'
  },
  {
    name: 'variable_global_get',
    signature: 'variable_global_get(name)',
    description: 'Returns the value of a global variable by name.',
    category: 'Variables'
  },
  {
    name: 'variable_global_set',
    signature: 'variable_global_set(name, value)',
    description: 'Sets the value of a global variable by name.',
    category: 'Variables'
  },
  {
    name: 'variable_instance_exists',
    signature: 'variable_instance_exists(id, name)',
    description: 'Returns whether an instance variable with the given name exists.',
    category: 'Variables'
  },
  {
    name: 'variable_instance_get',
    signature: 'variable_instance_get(id, name)',
    description: 'Returns the value of an instance variable by name.',
    category: 'Variables'
  },
  {
    name: 'variable_instance_get_names',
    signature: 'variable_instance_get_names(id)',
    description: 'Returns the names of the variables defined on an instance.',
    category: 'Variables'
  },
  {
    name: 'variable_instance_set',
    signature: 'variable_instance_set(id, name, value)',
    description: 'Sets the value of an instance variable by name.',
    category: 'Variables'
  }
]

function expandedFunctions(): GmlFunction[] {
  const result = new Map<string, GmlFunction>()
  for (const item of [...gmlFunctions, ...gmlCoreFunctions, ...hiddenFunctions]) {
    result.set(item.name, item)
  }

  const spellings = [
    ['colour', 'color'],
    ['normalised', 'normalized']
  ] as const
  for (const item of [...result.values()]) {
    for (const [source, target] of spellings) {
      if (!item.name.includes(source)) continue
      const name = item.name.replaceAll(source, target)
      if (result.has(name)) continue
      result.set(name, {
        ...item,
        name,
        signature: item.signature.replaceAll(source, target)
      })
    }
  }

  return [...result.values()]
}

const builtInFunctions = expandedFunctions()
const functionByName = new Map(builtInFunctions.map((item) => [item.name, item]))
const projectCache = new WeakMap<Project, ProjectSymbol[]>()
const enumCache = new WeakMap<Project, Promise<Map<string, EnumSource>>>()
let enumModelProject: Project | null = null
let enumModelVersion = ''
let enumModelCache: Promise<Map<string, EnumSymbol>> | null = null
const resourceTargetCache = new WeakMap<Monaco.editor.ITextModel, ResourceTargetCache>()

const resourceOpenEvents: Partial<Record<ResourceType, string>> = {
  sprite: 'opengms:open-sprite',
  sound: 'opengms:open-sound',
  background: 'opengms:open-background',
  path: 'opengms:open-path',
  font: 'opengms:open-font',
  script: 'opengms:open-script',
  shader: 'opengms:open-shader',
  object: 'opengms:open-object',
  timeline: 'opengms:open-timeline',
  room: 'opengms:open-room',
  extension: 'opengms:open-extension',
  macro: 'opengms:open-macro'
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function codeMask(source: string): string {
  const result = source.split('')
  let quote = ''
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n' || char === '\r') lineComment = false
      else result[index] = ' '
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        result[index] = ' '
        result[index + 1] = ' '
        blockComment = false
        index += 1
      } else if (char !== '\n' && char !== '\r') result[index] = ' '
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      if (char !== '\n' && char !== '\r') result[index] = ' '
      continue
    }
    if (char === '/' && next === '/') {
      result[index] = ' '
      result[index + 1] = ' '
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      result[index] = ' '
      result[index + 1] = ' '
      blockComment = true
      index += 1
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      result[index] = ' '
    }
  }

  return result.join('')
}

function closingBrace(mask: string, start: number): number {
  let depth = 0
  for (let index = start; index < mask.length; index += 1) {
    if (mask[index] === '{') depth += 1
    else if (mask[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function closingEnd(mask: string, start: number): number {
  const token = /\b(begin|end)\b/g
  token.lastIndex = start
  let depth = 0
  let match: RegExpExecArray | null
  while ((match = token.exec(mask))) {
    if (match[1] === 'begin') depth += 1
    else {
      depth -= 1
      if (depth === 0) return match.index
    }
  }
  return -1
}

function enumMembers(source: string, mask: string, start: number, end: number): EnumMember[] {
  const members: EnumMember[] = []
  let part = start
  let round = 0
  let square = 0
  let curly = 0

  function add(partEnd: number): void {
    const masked = mask.slice(part, partEnd)
    const match = masked.match(/^\s*([a-zA-Z_]\w*)/)
    if (!match || match.index === undefined) return
    const name = match[1]
    const memberStart = part + match.index + match[0].lastIndexOf(name)
    const restStart = memberStart + name.length
    const equals = mask.slice(restStart, partEnd).indexOf('=')
    members.push({
      name,
      value: equals < 0 ? '' : source.slice(restStart + equals + 1, partEnd).trim(),
      start: memberStart,
      end: memberStart + name.length
    })
  }

  for (let index = start; index < end; index += 1) {
    const char = mask[index]
    if (char === '(') round += 1
    else if (char === ')') round = Math.max(0, round - 1)
    else if (char === '[') square += 1
    else if (char === ']') square = Math.max(0, square - 1)
    else if (char === '{') curly += 1
    else if (char === '}') curly = Math.max(0, curly - 1)
    else if (char === ',' && round === 0 && square === 0 && curly === 0) {
      add(index)
      part = index + 1
    }
  }
  add(end)
  return members
}

function parseEnums(source: string): GmlEnum[] {
  const mask = codeMask(source)
  const result: GmlEnum[] = []
  const declaration = /\benum\s+([a-zA-Z_]\w*)\s*(\{|begin\b)/g
  let match: RegExpExecArray | null

  while ((match = declaration.exec(mask))) {
    const name = match[1]
    const nameStart = match.index + match[0].indexOf(name, 4)
    const opener = match.index + match[0].lastIndexOf(match[2])
    const close = match[2] === '{'
      ? closingBrace(mask, opener)
      : closingEnd(mask, opener)
    if (close < 0) continue

    const bodyStart = opener + match[2].length
    result.push({
      name,
      start: nameStart,
      end: nameStart + name.length,
      members: enumMembers(source, mask, bodyStart, close)
    })
    declaration.lastIndex = match[2] === '{' ? close + 1 : close + 3
  }

  return result
}

function modelSourceKey(model: Monaco.editor.ITextModel): string {
  const path = model.uri.path.replace(/^\//, '').replace(/\.gml$/i, '')
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function projectEnums(project: Project): Promise<Map<string, EnumSource>> {
  const cached = enumCache.get(project)
  if (cached) return cached
  const loading = projectGmlSources(project).then((sources) => new Map(
    sources.map((source) => [source.key, {
      key: source.key,
      label: `${source.resourceName} · ${source.section}`,
      enums: parseEnums(source.code)
    }])
  )).catch(() => new Map<string, EnumSource>())
  enumCache.set(project, loading)
  return loading
}

async function enumSymbols(api: MonacoApi): Promise<Map<string, EnumSymbol>> {
  const project = useApp.getState().project
  const models = api.editor.getModels().filter((model) => model.getLanguageId() === 'gml')
  const version = models.map((model) => `${model.uri.toString()}:${model.getVersionId()}`).join('|')
  if (enumModelCache && enumModelProject === project && enumModelVersion === version) return enumModelCache

  enumModelProject = project
  enumModelVersion = version
  enumModelCache = (async () => {
    const sources = project ? new Map(await projectEnums(project)) : new Map<string, EnumSource>()
    for (const model of models) {
      const key = modelSourceKey(model)
      sources.set(key, {
        key,
        label: key,
        enums: parseEnums(model.getValue()),
        model
      })
    }

    const result = new Map<string, EnumSymbol>()
    for (const source of sources.values()) {
      for (const item of source.enums) result.set(item.name, { ...item, source })
    }
    return result
  })()
  return enumModelCache
}

function memberText(item: EnumMember): string {
  return item.value ? `${item.name} = ${item.value}` : item.name
}

function memberContext(
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): { enumName: string; memberName: string } | null {
  const offset = model.getOffsetAt(position)
  const source = codeMask(model.getValue())
  const word = model.getWordAtPosition(position)
  const end = word && position.column >= word.startColumn && position.column <= word.endColumn
    ? model.getOffsetAt({ lineNumber: position.lineNumber, column: word.endColumn })
    : offset
  const before = source.slice(Math.max(0, end - 1000), end)
  const match = before.match(/\b([a-zA-Z_]\w*)\s*\.\s*([a-zA-Z_]\w*)?$/)
  if (!match) return null
  return { enumName: match[1], memberName: match[2] ?? '' }
}

function localEnumMember(model: Monaco.editor.ITextModel, position: Monaco.Position): {
  item: GmlEnum
  member: EnumMember
} | null {
  const offset = model.getOffsetAt(position)
  for (const item of parseEnums(model.getValue())) {
    const member = item.members.find((candidate) => offset >= candidate.start && offset <= candidate.end)
    if (member) return { item, member }
  }
  return null
}

function enumRange(model: Monaco.editor.ITextModel, start: number, end: number): Monaco.IRange {
  const from = model.getPositionAt(start)
  const to = model.getPositionAt(end)
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column
  }
}

export async function gmlEnumDecorations(
  api: MonacoApi,
  model: Monaco.editor.ITextModel
): Promise<Monaco.editor.IModelDeltaDecoration[]> {
  const symbols = await enumSymbols(api)
  const source = model.getValue()
  const mask = codeMask(source)
  const result: Monaco.editor.IModelDeltaDecoration[] = []
  const used = new Set<string>()

  function add(start: number, end: number, className: string): void {
    const key = `${start}:${end}:${className}`
    if (used.has(key)) return
    used.add(key)
    result.push({
      range: enumRange(model, start, end),
      options: { inlineClassName: className, inlineClassNameAffectsLetterSpacing: false }
    })
  }

  for (const item of parseEnums(source)) {
    add(item.start, item.end, 'gml-enum-name')
    item.members.forEach((member) => add(member.start, member.end, 'gml-enum-member'))
  }

  const reference = /\b([a-zA-Z_]\w*)\s*\.\s*([a-zA-Z_]\w*)/g
  let match: RegExpExecArray | null
  while ((match = reference.exec(mask))) {
    const item = symbols.get(match[1])
    if (!item || !item.members.some((member) => member.name === match![2])) continue
    const enumStart = match.index
    const memberStart = match.index + match[0].lastIndexOf(match[2])
    add(enumStart, enumStart + match[1].length, 'gml-enum-name')
    add(memberStart, memberStart + match[2].length, 'gml-enum-member')
  }

  return result
}

function parameters(name: string, signature: string): string[] {
  const match = signature.match(new RegExp(`(?:^|\\s)${escapeRegex(name)}\\s*\\(([^)]*)\\)`))
  if (!match || !match[1].trim()) return []
  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && item !== '...')
}

function placeholder(value: string, index: number): string {
  const clean = value
    .replace(/[\[\]]/g, '')
    .replace(/[^a-zA-Z0-9_ .]/g, '')
    .trim() || `argument${index}`
  return `\${${index}:${clean}}`
}

function functionSnippet(item: GmlFunction): string {
  const args = parameters(item.name, item.signature)
  return `${item.name}(${args.map((arg, index) => placeholder(arg, index + 1)).join(', ')})`
}

function resourceDetail(type: ResourceType): string {
  const names: Record<ResourceType, string> = {
    sprite: 'Sprite resource',
    sound: 'Sound resource',
    background: 'Background resource',
    path: 'Path resource',
    script: 'Project script',
    shader: 'Shader resource',
    font: 'Font resource',
    timeline: 'Timeline resource',
    object: 'Object resource',
    room: 'Room resource',
    file: 'Included file',
    extension: 'Extension resource',
    macro: 'Macro configuration'
  }
  return names[type]
}

function projectSymbols(project: Project | null): ProjectSymbol[] {
  if (!project) return []
  const cached = projectCache.get(project)
  if (cached) return liveScriptSymbols(cached)

  const symbols = new Map<string, ProjectSymbol>()
  const add = (symbol: ProjectSymbol): void => {
    if (!symbols.has(symbol.name)) symbols.set(symbol.name, symbol)
  }

  function visit(item: ProjectItem): void {
    if (item.kind === 'group') {
      item.items.forEach(visit)
      return
    }

    if (item.type === 'macro') {
      item.macro?.entries.forEach((entry) => add({
        name: entry.name,
        detail: `Project macro · ${item.name}`,
        type: 'constant',
        description: entry.value,
        resource: item
      }))
      return
    }

    add({
      name: item.name,
      detail: resourceDetail(item.type),
      type: item.type === 'script' ? 'function' : 'resource',
      signature: item.type === 'script' ? item.script?.signature ?? `${item.name}()` : undefined,
      description: item.type === 'script'
        ? item.script?.description || item.path
        : item.path,
      resource: item
    })

    if (item.type === 'extension') {
      item.extension?.files.forEach((file) => file.functions.forEach((fn) => {
        const args = Array.from({ length: Math.max(0, fn.argCount) }, (_value, index) =>
          `argument${index}`
        )
        add({
          name: fn.name,
          detail: `Extension function · ${item.name}`,
          type: 'function',
          signature: `${fn.name}(${args.join(', ')})`,
          description: fn.help || fn.externalName
        })
      }))
    }
  }

  project.groups.forEach((group) => group.items.forEach(visit))
  const result = [...symbols.values()]
  projectCache.set(project, result)
  return liveScriptSymbols(result)
}

function liveScriptSymbols(symbols: ProjectSymbol[]): ProjectSymbol[] {
  return symbols.map((symbol) => {
    const resource = symbol.resource
    if (resource?.type !== 'script') return symbol
    const source = codeBuffer(resource.file)
    if (source === undefined) return symbol
    const info = parseScriptInfo(resource.name, source)
    return {
      ...symbol,
      signature: info.signature,
      description: info.description || resource.path
    }
  })
}

export function openGmlResource(name: string): boolean {
  const symbol = projectSymbols(useApp.getState().project).find((item) => item.name === name)
  const resource = symbol?.resource
  const event = resource && resourceOpenEvents[resource.type]
  if (!resource || !event) return false

  window.dispatchEvent(new CustomEvent('opengms:select-resource', { detail: resource }))
  window.dispatchEvent(new CustomEvent(event, { detail: resource }))
  return true
}

function resourceTargets(model: Monaco.editor.ITextModel): GmlResourceTarget[] {
  const project = useApp.getState().project
  const version = model.getVersionId()
  const cached = resourceTargetCache.get(model)
  if (cached?.version === version && cached.project === project) return cached.targets

  const symbols = new Map(
    projectSymbols(project)
      .filter((item) => item.resource && resourceOpenEvents[item.resource.type])
      .map((item) => [item.name, item])
  )
  if (!symbols.size) {
    resourceTargetCache.set(model, { version, project, targets: [] })
    return []
  }

  const shadowed = new Set([
    ...localNames(model).map((item) => item.name),
    ...parseEnums(model.getValue()).map((item) => item.name)
  ])
  const targets: GmlResourceTarget[] = []
  let blockComment = false
  let quote = ''

  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
    const line = model.getLineContent(lineNumber)

    for (let index = 0; index < line.length;) {
      const char = line[index]
      const next = line[index + 1]

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false
          index += 2
        } else index += 1
        continue
      }

      if (quote) {
        if (char === quote) quote = ''
        index += 1
        continue
      }

      if (char === '/' && next === '/') break
      if (char === '/' && next === '*') {
        blockComment = true
        index += 2
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        index += 1
        continue
      }
      if (char === '$') {
        index += 1
        while (/[0-9a-fA-F]/.test(line[index] ?? '')) index += 1
        continue
      }
      if (/\d/.test(char)) {
        index += 1
        while (/[a-zA-Z0-9_.]/.test(line[index] ?? '')) index += 1
        continue
      }
      if (!/[a-zA-Z_]/.test(char)) {
        index += 1
        continue
      }

      const start = index
      index += 1
      while (/\w/.test(line[index] ?? '')) index += 1
      const name = line.slice(start, index)
      const symbol = symbols.get(name)
      const before = line.slice(0, start).trimEnd().at(-1)
      if (!symbol || shadowed.has(name) || before === '.') continue

      targets.push({
        name,
        detail: symbol.detail,
        kind: symbol.type,
        range: {
          startLineNumber: lineNumber,
          startColumn: start + 1,
          endLineNumber: lineNumber,
          endColumn: index + 1
        }
      })
    }
  }

  resourceTargetCache.set(model, { version, project, targets })
  return targets
}

export function gmlResourceAt(
  model: Monaco.editor.ITextModel,
  position: Monaco.IPosition
): GmlResourceTarget | null {
  return resourceTargets(model).find((target) => (
    target.range.startLineNumber === position.lineNumber &&
    position.column >= target.range.startColumn &&
    position.column < target.range.endColumn
  )) ?? null
}

export function gmlResourceDecorations(
  model: Monaco.editor.ITextModel
): Monaco.editor.IModelDeltaDecoration[] {
  return resourceTargets(model).filter((target) => target.kind === 'resource').map((target) => ({
    range: target.range,
    options: {
      inlineClassName: 'gml-resource-name',
      inlineClassNameAffectsLetterSpacing: false
    }
  }))
}

function localNames(model: Monaco.editor.ITextModel): Array<{ name: string; detail: string }> {
  const source = codeMask(model.getValue())
  const names = new Map<string, string>()
  const declaration = /\b(var|globalvar)\s+([^;\r\n]+)/g
  let match: RegExpExecArray | null

  while ((match = declaration.exec(source))) {
    const detail = match[1] === 'globalvar' ? 'Global variable' : 'Local variable'
    const body = match[2]
    let start = 0
    let round = 0
    let square = 0
    let curly = 0

    const add = (end: number): void => {
      const name = body.slice(start, end).match(/^\s*([a-zA-Z_]\w*)/)?.[1]
      if (name) names.set(name, detail)
    }

    for (let index = 0; index < body.length; index += 1) {
      const char = body[index]
      if (char === '(') round += 1
      else if (char === ')') round = Math.max(0, round - 1)
      else if (char === '[') square += 1
      else if (char === ']') square = Math.max(0, square - 1)
      else if (char === '{') curly += 1
      else if (char === '}') curly = Math.max(0, curly - 1)
      else if (char === ',' && round === 0 && square === 0 && curly === 0) {
        add(index)
        start = index + 1
      }
    }
    add(body.length)
  }

  const globalVariable = /\bglobal\.([a-zA-Z_]\w*)/g
  while ((match = globalVariable.exec(source))) names.set(match[1], 'Global variable')

  return [...names].map(([name, detail]) => ({ name, detail }))
}

function activeCall(model: Monaco.editor.ITextModel, position: Monaco.Position): Call | null {
  const offset = model.getOffsetAt(position)
  const source = model.getValue().slice(Math.max(0, offset - 20000), offset)
  const stack: Array<{ token: '(' | '[' | '{'; name: string; argument: number }> = []
  let quote = ''
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === '(') {
      const before = source.slice(0, index).match(/([a-zA-Z_]\w*)\s*$/)?.[1] ?? ''
      stack.push({ token: '(', name: before, argument: 0 })
    } else if (char === '[') stack.push({ token: '[', name: '', argument: 0 })
    else if (char === '{') stack.push({ token: '{', name: '', argument: 0 })
    else if (char === ')' || char === ']' || char === '}') stack.pop()
    else if (char === ',' && stack.at(-1)?.token === '(') stack[stack.length - 1].argument += 1
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].token === '(' && stack[index].name) {
      return { name: stack[index].name, argument: stack[index].argument }
    }
  }
  return null
}

function projectFunction(name: string): GmlFunction | null {
  const symbol = projectSymbols(useApp.getState().project).find((item) =>
    item.type === 'function' && item.name === name
  )
  if (!symbol?.signature) return null
  return {
    name,
    signature: symbol.signature,
    description: symbol.description || symbol.detail,
    category: symbol.detail
  }
}

function completionKind(api: MonacoApi, symbol: ProjectSymbol): Monaco.languages.CompletionItemKind {
  if (symbol.type === 'function') return api.languages.CompletionItemKind.Function
  if (symbol.type === 'constant') return api.languages.CompletionItemKind.Constant
  if (symbol.detail.startsWith('Object')) return api.languages.CompletionItemKind.Class
  if (symbol.detail.startsWith('Room')) return api.languages.CompletionItemKind.Module
  if (symbol.detail.startsWith('Timeline')) return api.languages.CompletionItemKind.Event
  return api.languages.CompletionItemKind.Reference
}

export function registerGml(api: MonacoApi): void {
  api.languages.register({ id: 'gml', extensions: ['.gml'], aliases: ['GML', 'GameMaker Language'] })
  api.languages.setLanguageConfiguration('gml', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string', 'comment'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /\{[^}"']*$/,
      decreaseIndentPattern: /^\s*\}/
    },
    folding: {
      markers: {
        start: /^\s*\/\/\s*#?region\b/i,
        end: /^\s*\/\/\s*#?endregion\b/i
      }
    },
    onEnterRules: [
      {
        beforeText: /^\s*\/\*\*(?!\/).*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: api.languages.IndentAction.IndentOutdent, appendText: ' * ' }
      },
      {
        beforeText: /^.*\{\s*$/,
        afterText: /^\s*\}/,
        action: { indentAction: api.languages.IndentAction.IndentOutdent }
      }
    ]
  })

  api.languages.setMonarchTokensProvider('gml', {
    defaultToken: '',
    tokenPostfix: '.gml',
    keywords,
    wordOperators,
    constants,
    variables: builtInVariables,
    builtins: builtInFunctions.map((item) => item.name),
    tokenizer: {
      root: [
        [/\/\/\/.*$/, 'comment.doc'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
        [/\$[0-9a-fA-F]+/, 'number.hex'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/\d+([eE][-+]?\d+)?/, 'number'],
        [/[a-zA-Z_]\w*(?=\s*\()/, {
          cases: {
            '@keywords': 'keyword',
            '@builtins': 'builtin.function',
            '@default': 'function'
          }
        }],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@wordOperators': 'operator.word',
            '@constants': 'constant',
            '@variables': 'variable.predefined',
            '@builtins': 'builtin.function',
            '@default': 'identifier'
          }
        }],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
        [/[<>!=~?:&|+\-*/^%@#]+/, 'operator'],
        [/"/, 'string', '@stringDouble'],
        [/'/, 'string', '@stringSingle']
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ],
      stringDouble: [
        [/\\#/, 'string.escape'],
        [/#/, 'string.escape'],
        [/[^\\#"]+/, 'string'],
        [/\\(?!#)/, 'string'],
        [/"/, 'string', '@pop']
      ],
      stringSingle: [
        [/\\#/, 'string.escape'],
        [/#/, 'string.escape'],
        [/[^\\#']+/, 'string'],
        [/\\(?!#)/, 'string'],
        [/'/, 'string', '@pop']
      ]
    }
  })

  const functionItems = builtInFunctions.map((item) => ({
    label: item.name,
    kind: api.languages.CompletionItemKind.Function,
    detail: item.signature,
    documentation: {
      value: `${item.description}\n\n_GMS 1.4 · ${item.category}_`
    },
    insertText: functionSnippet(item),
    insertTextRules: api.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: `3_${item.name}`,
    command: parameters(item.name, item.signature).length
      ? { id: 'editor.action.triggerParameterHints', title: 'Show parameter hints' }
      : undefined
  }))

  api.languages.registerCompletionItemProvider('gml', {
    triggerCharacters: ['.'],
    async provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = new api.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      )
      const enums = await enumSymbols(api)
      const context = memberContext(model, position)
      const enumItem = context ? enums.get(context.enumName) : undefined
      if (enumItem) {
        return {
          suggestions: enumItem.members.map((member) => ({
            label: member.name,
            kind: api.languages.CompletionItemKind.EnumMember,
            detail: `${enumItem.name}.${memberText(member)}`,
            documentation: `GML enum member · ${enumItem.source.label}`,
            insertText: member.name,
            sortText: `0_${member.name}`,
            range
          }))
        }
      }

      const suggestions: Monaco.languages.CompletionItem[] = functionItems.map((item) => ({
        ...item,
        range
      }))

      for (const item of snippets) {
        suggestions.push({
          label: item.label,
          kind: api.languages.CompletionItemKind.Snippet,
          detail: item.detail,
          insertText: item.text,
          insertTextRules: api.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: `0_${item.label}`,
          range
        })
      }

      for (const item of localNames(model)) {
        suggestions.push({
          label: item.name,
          kind: api.languages.CompletionItemKind.Variable,
          detail: item.detail,
          insertText: item.name,
          sortText: `1_${item.name}`,
          range
        })
      }

      for (const item of enums.values()) {
        suggestions.push({
          label: item.name,
          kind: api.languages.CompletionItemKind.Enum,
          detail: `enum ${item.name}`,
          documentation: `${item.members.length} members · ${item.source.label}`,
          insertText: item.name,
          sortText: `1_${item.name}`,
          range
        })
      }

      for (const symbol of projectSymbols(useApp.getState().project)) {
        const args = symbol.signature ? parameters(symbol.name, symbol.signature) : []
        suggestions.push({
          label: symbol.name,
          kind: completionKind(api, symbol),
          detail: symbol.signature || symbol.detail,
          documentation: symbol.description,
          insertText: symbol.type === 'function'
            ? `${symbol.name}(${args.length
              ? args.map((arg, index) => placeholder(arg, index + 1)).join(', ')
              : '$0'})`
            : symbol.name,
          insertTextRules: symbol.type === 'function'
            ? api.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          sortText: `2_${symbol.name}`,
          range
        })
      }

      for (const name of builtInVariables) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Variable,
          detail: 'GML built-in variable',
          insertText: name,
          sortText: `4_${name}`,
          range
        })
      }

      for (const name of constants) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Constant,
          detail: 'GML constant',
          insertText: name,
          sortText: `4_${name}`,
          range
        })
      }

      for (const name of [...keywords, ...wordOperators]) {
        suggestions.push({
          label: name,
          kind: api.languages.CompletionItemKind.Keyword,
          detail: 'GML keyword',
          insertText: name,
          sortText: `5_${name}`,
          range
        })
      }

      return { suggestions }
    }
  })

  api.languages.registerSignatureHelpProvider('gml', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp(model, position) {
      const call = activeCall(model, position)
      if (!call) return null
      const item = functionByName.get(call.name) ?? projectFunction(call.name)
      if (!item) return null
      const args = parameters(item.name, item.signature)
      return {
        value: {
          signatures: [{
            label: item.signature,
            documentation: item.description,
            parameters: args.map((label) => ({ label }))
          }],
          activeSignature: 0,
          activeParameter: Math.min(call.argument, Math.max(0, args.length - 1))
        },
        dispose: () => undefined
      }
    }
  })

  api.languages.registerDefinitionProvider('gml', {
    async provideDefinition(model, position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      const local = localEnumMember(model, position)
      if (local) {
        return {
          uri: model.uri,
          range: enumRange(model, local.member.start, local.member.end)
        }
      }

      const enums = await enumSymbols(api)
      const context = memberContext(model, position)
      const item = context ? enums.get(context.enumName) : enums.get(word.word)
      const sourceModel = item?.source.model
      if (!item || !sourceModel) return null
      const member = context
        ? item.members.find((candidate) => candidate.name === word.word)
        : undefined
      return {
        uri: sourceModel.uri,
        range: enumRange(
          sourceModel,
          member?.start ?? item.start,
          member?.end ?? item.end
        )
      }
    }
  })

  api.languages.registerHoverProvider('gml', {
    async provideHover(model, position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      const range = new api.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
      const enums = await enumSymbols(api)
      const context = memberContext(model, position)
      const enumItem = context ? enums.get(context.enumName) : undefined
      const enumMember = enumItem?.members.find((member) => member.name === word.word)
      const declaredMember = localEnumMember(model, position)

      if (enumItem && enumMember) {
        return {
          range,
          contents: [
            { value: `\`${enumItem.name}.${memberText(enumMember)}\`` },
            { value: `GML enum member · ${enumItem.source.label}` }
          ]
        }
      }
      if (declaredMember) {
        return {
          range,
          contents: [
            { value: `\`${declaredMember.item.name}.${memberText(declaredMember.member)}\`` },
            { value: 'GML enum member' }
          ]
        }
      }

      const declaredEnum = enums.get(word.word)
      if (declaredEnum) {
        const preview = declaredEnum.members.slice(0, 12).map((member) => memberText(member)).join(', ')
        const remaining = Math.max(0, declaredEnum.members.length - 12)
        return {
          range,
          contents: [
            { value: `\`enum ${declaredEnum.name}\`` },
            { value: `${declaredEnum.members.length} members · ${declaredEnum.source.label}` },
            ...(preview ? [{ value: `${preview}${remaining ? `, … (+${remaining})` : ''}` }] : [])
          ]
        }
      }

      const item = functionByName.get(word.word) ?? projectFunction(word.word)
      if (item) {
        return {
          range,
          contents: [
            { value: `\`${item.signature}\`` },
            { value: item.description },
            { value: `_GMS 1.4 · ${item.category}_` }
          ]
        }
      }

      const symbol = projectSymbols(useApp.getState().project).find((entry) => entry.name === word.word)
      if (!symbol) return null
      return {
        range,
        contents: [
          { value: `**${symbol.name}**` },
          { value: symbol.detail },
          ...(symbol.description ? [{ value: symbol.description }] : [])
        ]
      }
    }
  })
}
