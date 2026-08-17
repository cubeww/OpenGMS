import type { CloseSaveResult } from '../../shared/types'
import { getSaveState, saveAll } from './save'
import { useApp } from './store'

let pending: Promise<CloseSaveResult> | null = null
let pendingSaveAs = false

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

async function run(saveAs: boolean): Promise<CloseSaveResult> {
  const state = useApp.getState()
  if (!state.project || getSaveState().saving) return 'failed'

  if (!(await saveAll())) {
    state.addLog('Save stopped because one or more resources could not be saved.')
    return 'failed'
  }

  const current = useApp.getState()
  if (!current.project) return 'failed'
  if (!saveAs && !current.project.untitled) return 'saved'

  try {
    const project = await window.openGms.saveProjectAs()
    if (!project) return 'cancelled'

    useApp.getState().setProject(project, false)
    useApp.getState().addLog(`Saved project as ${project.name}.`)
    window.openGms.setTitle(`${project.name} - OpenGMS`)
    return 'saved'
  } catch (error) {
    useApp.getState().addLog(`Save As failed: ${errorText(error)}`)
    return 'failed'
  }
}

function queue(saveAs: boolean): Promise<CloseSaveResult> {
  if (pending) {
    if (!saveAs || pendingSaveAs) return pending
    const current = pending
    return current.then((result) => result === 'saved' ? queue(true) : result)
  }
  pendingSaveAs = saveAs
  pending = run(saveAs).finally(() => {
    pending = null
    pendingSaveAs = false
  })
  return pending
}

export function saveProject(): Promise<CloseSaveResult> {
  return queue(false)
}

export function saveProjectAs(): Promise<CloseSaveResult> {
  return queue(true)
}

export function saveBeforeClose(): Promise<CloseSaveResult> {
  return useApp.getState().project?.untitled ? queue(true) : queue(false)
}
