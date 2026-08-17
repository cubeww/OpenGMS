import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import { findNamedResource, notifyResourceChange, resourceItems } from '../resources'
import { saveAll } from '../save'
import { useApp } from '../store'

type EditMode = 'add' | 'rename' | null

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Configuration operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

export function ConfigPanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const project = useApp((state) => state.project)
  const setProject = useApp((state) => state.setProject)
  const setConfig = useApp((state) => state.setConfig)
  const addLog = useApp((state) => state.addLog)
  const [selected, setSelected] = useState(project?.configs[0] ?? '')
  const [mode, setMode] = useState<EditMode>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => api.setTitle('Configurations'), [api])

  useEffect(() => {
    if (!project?.configs.includes(selected)) setSelected(project?.configs[0] ?? '')
  }, [project?.configs, selected])

  if (!project) {
    return <div className="config-empty">Open a project to manage configurations.</div>
  }

  function begin(nextMode: Exclude<EditMode, null>): void {
    setMode(nextMode)
    setName(nextMode === 'rename' ? selected : '')
    setMessage('')
  }

  async function apply(): Promise<void> {
    const nextName = name.trim()
    const previous = project
    if (!nextName || !previous || busy) return
    setBusy(true)
    setMessage(mode === 'add' ? 'Adding configuration…' : 'Renaming configuration…')
    try {
      if (mode === 'rename' && !(await saveAll())) {
        throw new Error('Open editor changes could not be saved.')
      }
      const next = mode === 'add'
        ? await window.openGms.addConfig(nextName, selected)
        : await window.openGms.renameConfig(selected, nextName)
      setProject(next)
      const oldMacro = mode === 'rename'
        ? resourceItems(previous).find((item) => item.type === 'macro' && item.name === selected)
        : undefined
      const newMacro = mode === 'rename'
        ? findNamedResource(next, 'macro', [], nextName)
        : null
      notifyResourceChange({
        previous,
        project: next,
        renamed: oldMacro && newMacro ? { oldId: oldMacro.id, item: newMacro } : undefined
      })
      setConfig(nextName)
      setSelected(nextName)
      setMode(null)
      setName('')
      setMessage(mode === 'add' ? 'Configuration added' : 'Configuration renamed')
      addLog(`${mode === 'add' ? 'Added' : 'Renamed'} configuration ${nextName}.`)
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    const current = project
    if (!selected || !current || current.configs.length <= 1 || busy) return
    if (!window.confirm(`Delete configuration “${selected}” and its configuration files?`)) return
    setBusy(true)
    setMessage('Deleting configuration…')
    try {
      const previous = current
      const next = await window.openGms.deleteConfig(selected)
      setProject(next)
      notifyResourceChange({ previous, project: next })
      const nextConfig = next.configs[0] ?? ''
      setSelected(nextConfig)
      setConfig(nextConfig)
      setMessage('Configuration deleted')
      addLog(`Deleted configuration ${selected}.`)
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="config-editor">
      <header className="config-head">
        <span><Settings2 size={18} /></span>
        <div><strong>Manage Configurations</strong><small>Build variants and configuration-specific macros</small></div>
      </header>
      <div className="config-body">
        <section className="config-card">
          <div className="config-list" role="listbox" aria-label="Project configurations">
            {project.configs.map((config) => (
              <button
                className={selected === config ? 'selected' : ''}
                role="option"
                aria-selected={selected === config}
                key={config}
                onClick={() => {
                  setSelected(config)
                  setMessage('')
                }}
              >
                <span>{config.slice(0, 1).toUpperCase()}</span>
                <strong>{config}</strong>
              </button>
            ))}
          </div>
          <div className="config-buttons">
            <button disabled={busy} onClick={() => begin('add')}><Plus size={15} /> Add</button>
            <button disabled={!selected || busy} onClick={() => begin('rename')}><Pencil size={14} /> Rename</button>
            <button
              className="danger"
              disabled={!selected || project.configs.length <= 1 || busy}
              onClick={() => void remove()}
            ><Trash2 size={14} /> Delete</button>
          </div>
        </section>
        <footer className="config-footer">
          <span className={message.endsWith('added') || message.endsWith('renamed') || message.endsWith('deleted') ? 'success' : ''}>
            {message}
          </span>
          <button onClick={() => api.close()}><Check size={15} /> OK</button>
        </footer>
      </div>

      {mode && (
        <div className="config-dialog-backdrop" role="presentation" onMouseDown={() => !busy && setMode(null)}>
          <form
            className="config-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              void apply()
            }}
          >
            <header>
              <strong>{mode === 'add' ? 'Add Configuration' : 'Rename Configuration'}</strong>
              <button type="button" disabled={busy} onClick={() => setMode(null)}><X size={15} /></button>
            </header>
            <label>
              <span>Name</span>
              <input
                autoFocus
                value={name}
                maxLength={80}
                onChange={(event) => {
                  setName(event.target.value)
                  setMessage('')
                }}
                placeholder="Configuration name"
              />
            </label>
            {mode === 'add' && selected && <small>New settings are copied from {selected}.</small>}
            <footer>
              <button type="button" disabled={busy} onClick={() => setMode(null)}>Cancel</button>
              <button className="primary" type="submit" disabled={!name.trim() || busy}>
                <Check size={14} /> {mode === 'add' ? 'Add' : 'Rename'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  )
}
