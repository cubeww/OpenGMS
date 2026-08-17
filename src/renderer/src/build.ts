import type { BuildMode } from '../../shared/types'
import { ensureProject } from './projectNew'
import { ensureFontsBaked } from './fontBakeQueue'
import { getSaveState, saveAll } from './save'
import { useApp } from './store'

let pending: Promise<void> | null = null

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

async function start(mode: BuildMode): Promise<void> {
  let before = useApp.getState()
  if (before.buildState.phase !== 'idle' || getSaveState().saving) return
  if (!before.project) {
    if (mode === 'clean' || !(await ensureProject())) return
    before = useApp.getState()
  }

  if (mode !== 'clean' && !(await saveAll())) {
    before.addLog(`${mode === 'run' ? 'Run' : 'Build'} stopped because some resources could not be saved.`, 'error')
    return
  }

  const saved = useApp.getState()
  if (mode !== 'clean' && saved.project && !(await ensureFontsBaked(saved.project))) {
    saved.addLog(`${mode === 'run' ? 'Run' : 'Build'} stopped because one or more fonts could not be baked.`, 'error')
    return
  }

  const state = useApp.getState()
  if (!state.project || state.buildState.phase !== 'idle') return
  const config = state.config || state.project.configs[0] || 'Default'
  window.dispatchEvent(new CustomEvent('opengms:show-output'))

  try {
    const next = mode === 'clean'
      ? await window.openGms.cleanProject()
      : mode === 'run'
        ? await window.openGms.runProject(config)
        : await window.openGms.buildProject(config)
    useApp.getState().setBuildState(next)
  } catch (error) {
    const label = mode === 'run' ? 'Run' : mode === 'clean' ? 'Clean' : 'Build'
    useApp.getState().addLog(`${label} failed: ${errorText(error)}`, 'error')
  }
}

function queue(mode: BuildMode): Promise<void> {
  if (pending) return pending
  pending = start(mode).finally(() => {
    pending = null
  })
  return pending
}

export function buildProject(): Promise<void> {
  return queue('build')
}

export function runProject(): Promise<void> {
  return queue('run')
}

export function cleanProject(): Promise<void> {
  return queue('clean')
}

export async function stopProject(): Promise<void> {
  if (useApp.getState().buildState.phase === 'idle') return
  try {
    const state = await window.openGms.stopProject()
    useApp.getState().setBuildState(state)
  } catch (error) {
    useApp.getState().addLog(`Stop failed: ${errorText(error)}`, 'error')
  }
}
