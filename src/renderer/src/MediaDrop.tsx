import { FilePlus2, Ghost, Image, Volume2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MediaImportType, Project, ProjectItem, ResourceType } from '../../shared/types'
import { openProjectWithSave } from './close'
import { useApp } from './store'

type MediaKind = 'image' | 'audio'

type DroppedMedia = {
  name: string
  path: string
  kind: MediaKind
}

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

const imageExtension = /\.(?:png|jpe?g)$/i
const audioExtension = /\.(?:wav|mp3|ogg)$/i
const projectExtension = /\.project\.gmx$/i

function mediaKind(path: string): MediaKind | null {
  if (imageExtension.test(path)) return 'image'
  if (audioExtension.test(path)) return 'audio'
  return null
}

function fileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Could not import the media file.'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function resources(project: Project | null, type: ResourceType): ResourceItem[] {
  const result: ResourceItem[] = []
  function visit(items: ProjectItem[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  for (const group of project?.groups ?? []) visit(group.items)
  return result
}

function importedResource(
  previous: Project | null,
  next: Project,
  type: MediaImportType
): ResourceItem | undefined {
  const oldIds = new Set(resources(previous, type).map((item) => item.id))
  return resources(next, type).find((item) => !oldIds.has(item.id))
}

type ImportChoice = {
  type: MediaImportType
  label: string
  detail: string
  icon: LucideIcon
}

const included: ImportChoice = {
  type: 'file',
  label: 'Included File',
  detail: 'Copy the original file',
  icon: FilePlus2
}

const imageTypes: ImportChoice[] = [
  { type: 'sprite', label: 'Sprite', detail: 'Create one sprite frame', icon: Ghost },
  { type: 'background', label: 'Background', detail: 'Create a background image', icon: Image },
  included
]

const audioTypes: ImportChoice[] = [
  { type: 'sound', label: 'Sound', detail: 'Create a sound resource', icon: Volume2 },
  included
]

const labels: Record<MediaImportType, string> = {
  sprite: 'Sprite',
  background: 'Background',
  sound: 'Sound',
  file: 'Included File'
}

export function MediaDrop(): React.JSX.Element | null {
  const project = useApp((state) => state.project)
  const loading = useApp((state) => state.loading)
  const buildPhase = useApp((state) => state.buildState.phase)
  const openProjectFile = useApp((state) => state.openProjectFile)
  const setProject = useApp((state) => state.setProject)
  const addLog = useApp((state) => state.addLog)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<DroppedMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dragDepth = useRef(0)

  useEffect(() => {
    function enter(event: DragEvent): void {
      if (!fileDrag(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    }

    function over(event: DragEvent): void {
      if (!fileDrag(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    function leave(event: DragEvent): void {
      if (!fileDrag(event)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    }

    function drop(event: DragEvent): void {
      if (!fileDrag(event)) return
      event.preventDefault()
      event.stopPropagation()
      dragDepth.current = 0
      setDragging(false)

      const source = Array.from(event.dataTransfer?.files ?? []).flatMap((file) => {
        const path = window.openGms.getDroppedFilePath(file)
        return path ? [{ file, path }] : []
      })
      const projectFiles = source.filter(({ path }) => projectExtension.test(path))

      if (projectFiles.length > 0) {
        if (source.length !== 1) {
          addLog('Drop one .project.gmx project file at a time.', 'error')
          return
        }
        if (loading || busy) {
          addLog('Wait for the current operation to finish before opening another project.', 'error')
          return
        }
        if (buildPhase !== 'idle') {
          addLog('Stop the current build or game before opening another project.', 'error')
          return
        }

        setBusy(true)
        void openProjectWithSave(async () => {
          await openProjectFile(projectFiles[0].path)
        }).finally(() => {
          setBusy(false)
        })
        return
      }

      if (!project) {
        addLog('Open a project before importing media files.')
        return
      }

      const seen = new Set<string>()
      const dropped = source.flatMap(({ file, path }) => {
        const key = path.toLowerCase()
        const kind = mediaKind(path)
        if (!path || !kind || seen.has(key)) return []
        seen.add(key)
        return [{ name: file.name, path, kind }]
      })

      if (dropped.length === 0) {
        addLog('No supported files were dropped. Use .project.gmx, PNG, JPEG, WAV, MP3, or OGG files.')
        return
      }
      setError('')
      setFiles(dropped)
    }

    window.addEventListener('dragenter', enter, true)
    window.addEventListener('dragover', over, true)
    window.addEventListener('dragleave', leave, true)
    window.addEventListener('drop', drop, true)
    return () => {
      window.removeEventListener('dragenter', enter, true)
      window.removeEventListener('dragover', over, true)
      window.removeEventListener('dragleave', leave, true)
      window.removeEventListener('drop', drop, true)
    }
  }, [addLog, buildPhase, busy, loading, openProjectFile, project])

  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busy) {
        setFiles([])
        setError('')
      }
    }
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [busy])

  async function importAs(type: MediaImportType): Promise<void> {
    setBusy(true)
    setError('')
    let imported = 0
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      try {
        const previous = useApp.getState().project
        const next = await window.openGms.importMedia(file.path, type)
        setProject(next)
        const item = importedResource(previous, next, type)
        if (item) {
          window.dispatchEvent(new CustomEvent('opengms:select-resource', { detail: item }))
          if (type !== 'file') {
            const eventName = type === 'sprite'
              ? 'opengms:open-sprite'
              : type === 'background'
                ? 'opengms:open-background'
                : 'opengms:open-sound'
            window.dispatchEvent(new CustomEvent(
              eventName,
              { detail: item }
            ))
          }
        }
        imported += 1
      } catch (reason) {
        const message = errorText(reason)
        setFiles(files.slice(index))
        setError(message)
        addLog(`Could not import ${file.name}: ${message}`)
        setBusy(false)
        return
      }
    }

    const label = labels[type]
    addLog(`Imported ${imported} ${imported === 1 ? 'file' : 'files'} as ${label}.`)
    setFiles([])
    setBusy(false)
  }

  const batchKind = files.length === 0
    ? null
    : files.every((file) => file.kind === 'image')
      ? 'image'
      : files.every((file) => file.kind === 'audio')
        ? 'audio'
        : 'mixed'
  const choices = batchKind === 'image' ? imageTypes : batchKind === 'audio' ? audioTypes : [included]
  const title = batchKind === 'image' ? 'Import Image' : batchKind === 'audio' ? 'Import Audio' : 'Import Media'

  if (!dragging && files.length === 0) return null

  return (
    <>
      {dragging && files.length === 0 && (
        <div className="image-drop-overlay" aria-hidden="true">
          <FilePlus2 size={32} />
          <strong>{project ? 'Drop media to import or a project to open' : 'Drop a project to open'}</strong>
          <span>.project.gmx, PNG, JPEG, WAV, MP3, or OGG</span>
        </div>
      )}
      {files.length > 0 && (
        <div className="image-import-backdrop">
          <section className="image-import-dialog" role="dialog" aria-modal="true" aria-labelledby="image-import-title">
            <header>
              <div>
                <strong id="image-import-title">{title}</strong>
                <span>What resource should be created?</span>
              </div>
              <button
                type="button"
                aria-label="Cancel import"
                disabled={busy}
                onClick={() => {
                  setFiles([])
                  setError('')
                }}
              >
                <X size={16} />
              </button>
            </header>
            <div className="image-import-body">
              <p>
                {files.length === 1
                  ? <>Create a resource from <strong>{files[0].name}</strong>.</>
                  : <>Create resources from <strong>{files.length} files</strong>.</>}
              </p>
              {batchKind === 'mixed' && (
                <div className="image-import-note">Mixed image and audio drops can be copied as Included Files.</div>
              )}
              <div
                className="image-import-choices"
                style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}
              >
                {choices.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.type} type="button" disabled={busy} onClick={() => void importAs(item.type)}>
                      <Icon size={20} />
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </button>
                  )
                })}
              </div>
              {error && <div className="image-import-error">{error}</div>}
              {busy && <div className="image-import-progress">Importing images…</div>}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
