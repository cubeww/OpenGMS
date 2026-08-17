import type {
  Project,
  ProjectItem,
  ResourceTreeRef,
  ResourceType
} from '../../shared/types'
import { saveAll } from './save'
import { useApp } from './store'

export type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

export type ResourceRename = {
  oldId: string
  item: ResourceItem
}

export type ResourceChange = {
  previous: Project
  project: Project
  renamed?: ResourceRename
}

export const resourceChangeEvent = 'opengms:resources-changed'

function walk(
  items: ProjectItem[],
  visit: (item: ResourceItem, groupPath: string[]) => boolean,
  groupPath: string[] = []
): boolean {
  for (const item of items) {
    if (item.kind === 'group') {
      if (walk(item.items, visit, [...groupPath, item.name])) return true
    } else if (visit(item, groupPath)) {
      return true
    }
  }
  return false
}

export function resourceItems(project: Project): ResourceItem[] {
  const result: ResourceItem[] = []
  for (const group of project.groups) {
    walk(group.items, (item) => {
      result.push(item)
      return false
    })
  }
  return result
}

export function resourceRef(project: Project, target: ResourceItem): ResourceTreeRef | null {
  let result: ResourceTreeRef | null = null
  const group = project.groups.find((item) => item.type === target.type)
  if (!group) return null

  walk(group.items, (item, groupPath) => {
    if (item.id !== target.id && item.file !== target.file) return false
    result = {
      type: item.type,
      kind: 'resource',
      groupPath,
      path: item.path
    }
    return true
  })
  return result
}

export function findNamedResource(
  project: Project,
  type: ResourceType,
  groupPath: string[],
  name: string
): ResourceItem | null {
  const group = project.groups.find((item) => item.type === type)
  if (!group) return null

  let exact: ResourceItem | null = null
  let fallback: ResourceItem | null = null
  let fallbackCount = 0
  walk(group.items, (item, path) => {
    if (item.name !== name) return false
    fallback = item
    fallbackCount += 1
    if (path.length === groupPath.length && path.every((part, index) => part === groupPath[index])) {
      exact = item
      return true
    }
    return false
  })
  return exact ?? (fallbackCount === 1 ? fallback : null)
}

export function matchResource(change: ResourceChange, item: ResourceItem): ResourceItem | null {
  if (change.renamed?.oldId === item.id) return change.renamed.item
  const previous = resourceItems(change.previous)
  const resources = resourceItems(change.project)
  const direct = resources.find((next) => next.id === item.id)
    ?? resources.find((next) => next.file === item.file)
    ?? (() => {
      const matches = resources.filter((next) =>
        next.type === item.type && next.path === item.path && next.name === item.name)
      return matches.length === 1 ? matches[0] : null
    })()
  if (direct) return direct

  const removed = previous.filter((old) => !resources.some((next) =>
    next.id === old.id || next.file === old.file))
  const added = resources.filter((next) => !previous.some((old) =>
    old.id === next.id || old.file === next.file))
  const oldCandidates = removed.filter((old) => old.type === item.type)
  const newCandidates = added.filter((next) => next.type === item.type)
  if (oldCandidates.length === 1 && newCandidates.length === 1) return newCandidates[0]
  return null
}

export function notifyResourceChange(change: ResourceChange): void {
  window.dispatchEvent(new CustomEvent<ResourceChange>(resourceChangeEvent, { detail: change }))
}

export async function renameResource(item: ResourceItem, name: string): Promise<ResourceItem> {
  const clean = name.trim()
  const previous = useApp.getState().project
  if (!previous) throw new Error('No project is open.')
  if (!clean || clean === item.name) return item

  const ref = resourceRef(previous, item)
  if (!ref) throw new Error('Resource no longer exists.')
  if (!(await saveAll())) throw new Error('Open editor changes could not be saved.')

  const project = await window.openGms.renameResourceItem(ref, clean)
  const renamed = findNamedResource(project, item.type, ref.groupPath, clean)
  if (!renamed) throw new Error('The renamed resource could not be found.')

  useApp.getState().setProject(project)
  notifyResourceChange({ previous, project, renamed: { oldId: item.id, item: renamed } })
  return renamed
}
