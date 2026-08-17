import type { FontData, Project, ProjectItem } from '../../shared/types'
import { bakeFont } from './fontBake'
import { useApp } from './store'

type FontItem = Extract<ProjectItem, { kind: 'resource' }>

const jobs = new Map<string, Promise<boolean>>()

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function fonts(project: Project): FontItem[] {
  const result: FontItem[] = []

  function visit(items: ProjectItem[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === 'font' && item.font) result.push(item)
    }
  }

  for (const group of project.groups) {
    if (group.type === 'font') visit(group.items)
  }
  return result
}

function current(project: Project): boolean {
  return useApp.getState().project?.path === project.path
}

async function bake(project: Project, item: FontItem, font: FontData): Promise<boolean> {
  try {
    const atlas = await bakeFont(font)
    if (!current(project)) return false
    await window.openGms.saveFont(item.file, font, atlas)
    if (!current(project)) return false
    useApp.getState().updateFont(item.id, { ...font, baked: true })
    useApp.getState().addLog(`Baked font ${item.name} with a ${atlas.width} × ${atlas.height} atlas.`)
    return true
  } catch (error) {
    useApp.getState().addLog(`Failed to bake font ${item.name}: ${errorText(error)}`, 'error')
    return false
  }
}

function queue(project: Project, item: FontItem): Promise<boolean> {
  const running = jobs.get(item.file)
  if (running) return running

  const font = item.font
  if (!font || font.baked) return Promise.resolve(true)
  const job = bake(project, item, font).finally(() => jobs.delete(item.file))
  jobs.set(item.file, job)
  return job
}

export async function ensureFontsBaked(project: Project): Promise<boolean> {
  const results = await Promise.all(
    fonts(project).filter((item) => !item.font?.baked).map((item) => queue(project, item))
  )
  return results.every(Boolean)
}

export async function waitForFontBake(file: string): Promise<void> {
  const job = jobs.get(file)
  if (job) await job
}
