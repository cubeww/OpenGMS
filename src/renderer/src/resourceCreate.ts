import type { Project, ProjectItem, ResourceType } from '../../shared/types'
import { ensureFontsBaked } from './fontBakeQueue'
import { ensureProject } from './projectNew'
import { useApp } from './store'

export type QuickResourceType =
  | 'sprite'
  | 'sound'
  | 'background'
  | 'path'
  | 'script'
  | 'shader'
  | 'font'
  | 'timeline'
  | 'object'
  | 'room'

export const quickResourceTypes: QuickResourceType[] = [
  'sprite',
  'sound',
  'background',
  'path',
  'script',
  'shader',
  'font',
  'timeline',
  'object',
  'room'
]

export const quickResourceNames: Record<QuickResourceType, string> = {
  sprite: 'Sprite',
  sound: 'Sound',
  background: 'Background',
  path: 'Path',
  script: 'Script',
  shader: 'Shader',
  font: 'Font',
  timeline: 'Timeline',
  object: 'Object',
  room: 'Room'
}

const openEvents: Record<QuickResourceType, string> = {
  sprite: 'opengms:open-sprite',
  sound: 'opengms:open-sound',
  background: 'opengms:open-background',
  path: 'opengms:open-path',
  script: 'opengms:open-script',
  shader: 'opengms:open-shader',
  font: 'opengms:open-font',
  timeline: 'opengms:open-timeline',
  object: 'opengms:open-object',
  room: 'opengms:open-room'
}

let pending: Promise<void> | null = null

function items(project: Project, type: ResourceType): Array<Extract<ProjectItem, { kind: 'resource' }>> {
  const result: Array<Extract<ProjectItem, { kind: 'resource' }>> = []
  function visit(list: ProjectItem[]): void {
    for (const item of list) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  for (const group of project.groups) visit(group.items)
  return result
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

async function create(type: QuickResourceType): Promise<void> {
  const state = useApp.getState()
  const project = state.project ?? await ensureProject()
  const name = quickResourceNames[type]
  if (!project) return
  const known = new Set(items(project, type).map((item) => item.id))
  try {
    const next = await window.openGms.createResource(type, [])
    const item = items(next, type).find((candidate) => !known.has(candidate.id))
    useApp.getState().setProject(next)
    if (type === 'font') await ensureFontsBaked(next)
    useApp.getState().addLog(`Created ${name}.`)
    if (item) {
      const current = useApp.getState().project
      const opened = current ? items(current, type).find((candidate) => candidate.id === item.id) ?? item : item
      window.dispatchEvent(new CustomEvent('opengms:select-resource', { detail: opened }))
      window.dispatchEvent(new CustomEvent(openEvents[type], { detail: opened }))
    }
  } catch (error) {
    useApp.getState().addLog(`Create ${name} failed: ${errorText(error)}`)
  }
}

export function createAndOpenResource(type: QuickResourceType): Promise<void> {
  if (pending) return pending
  pending = create(type).finally(() => { pending = null })
  return pending
}
