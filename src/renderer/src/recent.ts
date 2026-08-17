import type { Project } from '../../shared/types'

export type RecentProject = {
  name: string
  path: string
}

const storageKey = 'opengms.recent-projects'
const limit = 10

function pathKey(path: string): string {
  const value = path.replace(/\\/g, '/')
  return /^[a-z]:\//i.test(value) ? value.toLocaleLowerCase() : value
}

function clean(value: unknown): RecentProject[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: RecentProject[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Partial<RecentProject>
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    const path = typeof entry.path === 'string' ? entry.path.trim() : ''
    const key = pathKey(path)
    if (!name || !path || seen.has(key)) continue
    seen.add(key)
    result.push({ name, path })
    if (result.length === limit) break
  }

  return result
}

function write(items: RecentProject[]): RecentProject[] {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  } catch {
    // Recent projects are optional when storage is unavailable.
  }
  return items
}

export function loadRecentProjects(): RecentProject[] {
  try {
    return clean(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]'))
  } catch {
    return []
  }
}

export function addRecentProject(project: Project): RecentProject[] {
  const current = loadRecentProjects()
  if (project.untitled) return current
  const key = pathKey(project.path)
  return write([
    { name: project.name, path: project.path },
    ...current.filter((item) => pathKey(item.path) !== key)
  ].slice(0, limit))
}

export function removeRecentProject(path: string): RecentProject[] {
  const key = pathKey(path)
  return write(loadRecentProjects().filter((item) => pathKey(item.path) !== key))
}

export function clearRecentProjects(): RecentProject[] {
  return write([])
}
