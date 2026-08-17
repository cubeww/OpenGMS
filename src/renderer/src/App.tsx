import { useEffect } from 'react'
import { Dock } from './Dock'
import { MediaDrop } from './MediaDrop'
import { MenuBar } from './MenuBar'
import { ToolBar } from './ToolBar'
import { runProject, stopProject } from './build'
import { openProjectWithSave } from './close'
import { ensureFontsBaked } from './fontBakeQueue'
import { createNewProject } from './projectNew'
import { saveBeforeClose, saveProject, saveProjectAs } from './projectSave'
import { useSaveState } from './save'
import { useApp } from './store'

export function App(): React.JSX.Element {
  const startProject = useApp((state) => state.startProject)
  const openProject = useApp((state) => state.openProject)
  const project = useApp((state) => state.project)
  const projectDirty = useApp((state) => state.projectDirty)
  const saveState = useSaveState()

  useEffect(() => {
    void startProject()
  }, [startProject])

  useEffect(() => {
    if (project) void ensureFontsBaked(project)
  }, [project])

  useEffect(() => {
    let active = true
    const offState = window.openGms.onBuildState((state) => {
      useApp.getState().setBuildState(state)
    })
    const offOutput = window.openGms.onBuildOutput((output) => {
      useApp.getState().addLog(
        output.text,
        output.stream === 'stderr' ? 'error' : 'build'
      )
      window.dispatchEvent(new CustomEvent('opengms:show-output'))
    })

    void window.openGms.getBuildState().then((state) => {
      if (active) useApp.getState().setBuildState(state)
    })

    return () => {
      active = false
      offState()
      offOutput()
    }
  }, [])

  useEffect(() => {
    window.openGms.setDirtyCount(saveState.count || (projectDirty ? 1 : 0))
  }, [projectDirty, saveState.count])

  useEffect(() => window.openGms.onSaveAndClose(() => {
    void saveBeforeClose().then((result) => window.openGms.finishClose(result))
  }), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key === 'F6'
      ) {
        event.preventDefault()
        void runProject()
      } else if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key === 'F8'
      ) {
        event.preventDefault()
        void stopProject()
      } else if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'n'
      ) {
        event.preventDefault()
        void createNewProject()
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        void openProjectWithSave(openProject)
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('opengms:show-code-search'))
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 's'
      ) {
        event.preventDefault()
        void saveProjectAs()
      } else if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 's'
      ) {
        event.preventDefault()
        void saveProject()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [openProject])

  return (
    <div className="app-shell">
      <MenuBar />
      <ToolBar />
      <main className="workspace">
        <Dock />
      </main>
      <MediaDrop />
    </div>
  )
}
