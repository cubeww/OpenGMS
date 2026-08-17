import type { Project } from '../../shared/types'
import { confirmAll } from './close'
import { useApp } from './store'

let pending: Promise<Project | null> | null = null

async function create(confirm: boolean): Promise<Project | null> {
  const state = useApp.getState()
  if (state.loading || state.buildState.phase !== 'idle') return null
  if (confirm && !(await confirmAll())) return null
  return useApp.getState().newProject()
}

function queue(confirm: boolean): Promise<Project | null> {
  if (pending) return pending
  pending = create(confirm).finally(() => {
    pending = null
  })
  return pending
}

export function createNewProject(): Promise<Project | null> {
  return queue(true)
}

export function ensureProject(): Promise<Project | null> {
  const project = useApp.getState().project
  return project ? Promise.resolve(project) : queue(false)
}
