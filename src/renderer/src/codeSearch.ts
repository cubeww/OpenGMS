import type {
  ObjectAction,
  ObjectEvent,
  Project,
  ResourceType,
  RoomData
} from '../../shared/types'
import { resourceItems, type ResourceItem } from './resources'
import { useApp } from './store'
import { codeBuffer } from './codeReveal'

export type CodeSearchOptions = {
  matchCase: boolean
  wholeWord: boolean
}

export type CodeSearchKind =
  | 'script'
  | 'shader'
  | 'object'
  | 'timeline'
  | 'room'
  | 'room-instance'
  | 'macro'

export type CodeSearchResult = {
  id: string
  resourceId: string
  resourceType: ResourceType
  resourceName: string
  kind: CodeSearchKind
  section: string
  line: number
  column: number
  length: number
  before: string
  match: string
  after: string
  stage?: 'vertex' | 'fragment'
  eventIndex?: number
  eventKey?: string
  momentIndex?: number
  momentStep?: number
  actionIndex?: number
  argumentIndex?: number
  instanceName?: string
  macroIndex?: number
  codeEditor?: boolean
}

export type CodeSearchReport = {
  results: CodeSearchResult[]
  sources: number
  errors: number
  truncated: boolean
}

type CodeSource = Omit<
  CodeSearchResult,
  'id' | 'line' | 'column' | 'length' | 'before' | 'match' | 'after'
> & {
  key: string
  code: string
}

export type ProjectCodeSource = {
  key: string
  code: string
  resourceName: string
  section: string
}

type SearchListener = (result: CodeSearchResult) => void

const resultLimit = 5000
const revealListeners = new Map<string, Set<SearchListener>>()
let pendingReveal: CodeSearchResult | null = null

function keyName(code: number): string {
  if (code >= 48 && code <= 57) return String.fromCharCode(code)
  if (code >= 65 && code <= 90) return String.fromCharCode(code)
  if (code >= 112 && code <= 123) return `F${code - 111}`
  return `${code}`
}

function eventName(event: ObjectEvent): string {
  switch (event.type) {
    case 0: return 'Create'
    case 1: return 'Destroy'
    case 2: return `Alarm ${event.number}`
    case 3: return ['Step', 'Begin Step', 'End Step'][event.number] ?? `Step ${event.number}`
    case 4: return `Collision with ${event.target || '<undefined>'}`
    case 5: return `Keyboard ${keyName(event.number)}`
    case 6: return `Mouse ${event.number}`
    case 7: return event.number >= 10 && event.number <= 25
      ? `User Event ${event.number - 10}`
      : `Other ${event.number}`
    case 8: return `Draw ${event.number}`
    case 9: return `Key Press ${keyName(event.number)}`
    case 10: return `Key Release ${keyName(event.number)}`
    default: return `Event ${event.type}:${event.number}`
  }
}

function isCodeAction(action: ObjectAction): boolean {
  return action.kind === 7 || (action.libId === 1 && action.id === 603)
}

function objectEventKey(event: ObjectEvent): string {
  return event.type === 4
    ? `${event.type}:${event.target.toLocaleLowerCase()}`
    : `${event.type}:${event.number}`
}

function actionSources(
  item: ResourceItem,
  event: ObjectEvent,
  eventIndex: number,
  action: ObjectAction,
  actionIndex: number,
  base: Pick<CodeSource, 'kind' | 'section'> & Partial<CodeSource>
): CodeSource[] {
  const eventLabel = base.section
  if (isCodeAction(action)) {
    const code = action.args[0]?.value || action.code
    return [{
      key: base.kind === 'timeline'
        ? `${item.id}/${base.momentStep}/${actionIndex}`
        : `${item.id}/${objectEventKey(event)}/${actionIndex}`,
      code,
      resourceId: item.id,
      resourceType: item.type,
      resourceName: item.name,
      kind: base.kind,
      section: `${eventLabel} · Code action ${actionIndex + 1}`,
      eventIndex,
      eventKey: base.kind === 'object' ? objectEventKey(event) : undefined,
      actionIndex,
      momentIndex: base.momentIndex,
      momentStep: base.momentStep,
      codeEditor: true
    }]
  }

  return action.args.flatMap((arg, argumentIndex) => {
    if ((arg.kind !== 0 && arg.kind !== 2) || !arg.value) return []
    return [{
      key: `${item.id}/${eventIndex}/${actionIndex}/argument/${argumentIndex}`,
      code: arg.value,
      resourceId: item.id,
      resourceType: item.type,
      resourceName: item.name,
      kind: base.kind,
      section: `${eventLabel} · Action ${actionIndex + 1} · Argument ${argumentIndex + 1}`,
      eventIndex,
      eventKey: base.kind === 'object' ? objectEventKey(event) : undefined,
      actionIndex,
      argumentIndex,
      momentIndex: base.momentIndex,
      momentStep: base.momentStep,
      codeEditor: false
    } satisfies CodeSource]
  })
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const result = new Array<R>(items.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      result[index] = await task(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return result
}

async function codeSources(project: Project): Promise<{ sources: CodeSource[]; errors: number }> {
  const items = resourceItems(project)
  const scripts = items.filter((item) => item.type === 'script' && !item.missing)
  const rooms = items.filter((item) => item.type === 'room' && !item.missing && !item.room)
  let errors = 0

  const scriptFiles = new Map<string, string>()
  await mapLimit(scripts, 16, async (item) => {
    try {
      scriptFiles.set(item.id, (await window.openGms.readScript(item.file)).text)
    } catch {
      errors += 1
    }
  })

  const roomFiles = new Map<string, RoomData>()
  await mapLimit(rooms, 8, async (item) => {
    try {
      roomFiles.set(item.id, await window.openGms.readRoom(item.file))
    } catch {
      errors += 1
    }
  })

  const sources: CodeSource[] = []
  for (const item of items) {
    if (item.type === 'script') {
      const code = scriptFiles.get(item.id)
      if (code !== undefined) sources.push({
        key: item.file,
        code,
        resourceId: item.id,
        resourceType: item.type,
        resourceName: item.name,
        kind: 'script',
        section: 'Script',
        codeEditor: true
      })
      continue
    }

    if (item.type === 'shader' && item.shader) {
      for (const stage of ['vertex', 'fragment'] as const) {
        sources.push({
          key: `${item.file}:${stage}`,
          code: item.shader[stage],
          resourceId: item.id,
          resourceType: item.type,
          resourceName: item.name,
          kind: 'shader',
          section: `${stage === 'vertex' ? 'Vertex' : 'Fragment'} shader`,
          stage,
          codeEditor: true
        })
      }
      continue
    }

    if (item.type === 'object' && item.object) {
      item.object.events.forEach((event, eventIndex) => {
        event.actions.forEach((action, actionIndex) => {
          sources.push(...actionSources(item, event, eventIndex, action, actionIndex, {
            kind: 'object',
            section: eventName(event)
          }))
        })
      })
      continue
    }

    if (item.type === 'timeline' && item.timeline) {
      item.timeline.moments.forEach((moment, momentIndex) => {
        const event: ObjectEvent = { type: -1, number: moment.step, target: '', actions: moment.actions }
        moment.actions.forEach((action, actionIndex) => {
          sources.push(...actionSources(item, event, momentIndex, action, actionIndex, {
            kind: 'timeline',
            section: `Step ${moment.step}`,
            momentIndex,
            momentStep: moment.step
          }))
        })
      })
      continue
    }

    if (item.type === 'room') {
      const room = item.room ?? roomFiles.get(item.id)
      if (!room) continue
      sources.push({
        key: `${item.id}/creation-code`,
        code: room.code,
        resourceId: item.id,
        resourceType: item.type,
        resourceName: item.name,
        kind: 'room',
        section: 'Room creation code',
        codeEditor: true
      })
      room.instances.forEach((instance) => {
        sources.push({
          key: `${item.id}/instance/${instance.name}`,
          code: instance.code,
          resourceId: item.id,
          resourceType: item.type,
          resourceName: item.name,
          kind: 'room-instance',
          section: `${instance.object} · ${instance.name} creation code`,
          instanceName: instance.name,
          codeEditor: true
        })
      })
      continue
    }

    if (item.type === 'macro' && item.macro) {
      item.macro.entries.forEach((entry, macroIndex) => {
        if (!entry.value) return
        sources.push({
          key: `${item.id}/macro/${macroIndex}`,
          code: entry.value,
          resourceId: item.id,
          resourceType: item.type,
          resourceName: item.name,
          kind: 'macro',
          section: `Macro ${entry.name}`,
          macroIndex,
          codeEditor: false
        })
      })
    }
  }

  sources.forEach((source) => {
    const open = codeBuffer(source.key)
    if (open !== undefined) source.code = open
  })

  return { sources, errors }
}

export async function projectGmlSources(project: Project): Promise<ProjectCodeSource[]> {
  const loaded = await codeSources(project)
  return loaded.sources
    .filter((source) => source.resourceType !== 'shader')
    .map((source) => ({
      key: source.key,
      code: source.code,
      resourceName: source.resourceName,
      section: source.section
    }))
}

function word(value: string | undefined): boolean {
  return Boolean(value && /[A-Za-z0-9_]/.test(value))
}

function matches(source: CodeSource, query: string, options: CodeSearchOptions): CodeSearchResult[] {
  const result: CodeSearchResult[] = []
  const { key, code, ...details } = source
  const needle = options.matchCase ? query : query.toLocaleLowerCase()
  const lines = code.split(/\r\n|\r|\n/)

  lines.forEach((line, lineIndex) => {
    const haystack = options.matchCase ? line : line.toLocaleLowerCase()
    let from = 0
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from)
      if (index < 0) break
      from = index + Math.max(1, needle.length)
      if (options.wholeWord && (word(line[index - 1]) || word(line[index + query.length]))) continue

      const contextStart = Math.max(0, index - 90)
      const contextEnd = Math.min(line.length, index + query.length + 130)
      result.push({
        ...details,
        id: `${key}:${lineIndex + 1}:${index + 1}`,
        line: lineIndex + 1,
        column: index + 1,
        length: query.length,
        before: `${contextStart > 0 ? '…' : ''}${line.slice(contextStart, index)}`,
        match: line.slice(index, index + query.length),
        after: `${line.slice(index + query.length, contextEnd)}${contextEnd < line.length ? '…' : ''}`
      })
    }
  })

  return result
}

export async function searchProjectCode(
  project: Project,
  query: string,
  options: CodeSearchOptions
): Promise<CodeSearchReport> {
  const text = query.trim()
  if (!text) return { results: [], sources: 0, errors: 0, truncated: false }
  const loaded = await codeSources(project)
  const results: CodeSearchResult[] = []
  let truncated = false

  for (const source of loaded.sources) {
    for (const result of matches(source, text, options)) {
      if (results.length >= resultLimit) {
        truncated = true
        break
      }
      results.push(result)
    }
    if (truncated) break
  }

  return {
    results,
    sources: loaded.sources.length,
    errors: loaded.errors,
    truncated
  }
}

function requestSearchReveal(result: CodeSearchResult): void {
  pendingReveal = result
  const current = revealListeners.get(result.resourceId)
  if (!current?.size) return
  pendingReveal = null
  current.forEach((listener) => listener(result))
}

export function listenSearchReveal(resourceId: string, listener: SearchListener): () => void {
  const current = revealListeners.get(resourceId) ?? new Set<SearchListener>()
  current.add(listener)
  revealListeners.set(resourceId, current)

  if (pendingReveal?.resourceId === resourceId) {
    const result = pendingReveal
    pendingReveal = null
    window.queueMicrotask(() => {
      if (current.has(listener)) listener(result)
    })
  }

  return () => {
    current.delete(listener)
    if (!current.size) revealListeners.delete(resourceId)
  }
}

export function openCodeSearchResult(result: CodeSearchResult): void {
  const project = useApp.getState().project
  const item = project && resourceItems(project).find((candidate) => candidate.id === result.resourceId)
  if (!item) return

  const events: Partial<Record<ResourceType, string>> = {
    script: 'opengms:open-script',
    shader: 'opengms:open-shader',
    object: 'opengms:open-object',
    timeline: 'opengms:open-timeline',
    room: 'opengms:open-room',
    macro: 'opengms:open-macro'
  }
  const event = events[item.type]
  if (!event) return
  requestSearchReveal(result)
  window.dispatchEvent(new CustomEvent(event, { detail: item }))
}
