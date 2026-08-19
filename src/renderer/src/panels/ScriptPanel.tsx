import { useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { CodeFile, ProjectItem } from '../../../shared/types'
import { parseScriptInfo } from '../../../shared/script'
import { CodeEditor } from '../CodeEditor'
import { requestCodeReveal } from '../codeReveal'
import { listenSearchReveal } from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'

type ScriptItem = Extract<ProjectItem, { kind: 'resource' }>

export type ScriptParams = {
  item: ScriptItem
  projectPath: string
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

export function ScriptPanel({ params, api }: IDockviewPanelProps<ScriptParams>): React.JSX.Element {
  const [code, setCode] = useState<CodeFile | null>(null)
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const addLog = useApp((state) => state.addLog)
  const updateScript = useApp((state) => state.updateScript)
  const dirty = code ? code.text !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void window.openGms.readScript(params.item.file).then((file) => {
      if (!active) return
      setCode(file)
      setSaved(file.text)
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(errorText(reason))
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [params.item.file])

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => listenSearchReveal(params.item.id, (result) => {
    if (result.kind !== 'script') return
    requestCodeReveal({
      id: params.item.file,
      line: result.line,
      column: result.column,
      length: result.length
    })
  }), [params.item.file, params.item.id])

  function change(text: string): void {
    setCode((current) => current ? { ...current, text } : current)
  }

  async function save(): Promise<void> {
    if (!code || saving || code.text === saved) return
    const next = { ...code }
    setSaving(true)
    try {
      await window.openGms.saveScript(params.item.file, next)
      updateScript(params.item.id, parseScriptInfo(params.item.name, next.text))
      setSaved(next.text)
      addLog(`Saved script ${params.item.name}.`)
    } catch (reason) {
      addLog(`Failed to save script ${params.item.name}: ${errorText(reason)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="script-empty">
        <ScrollText size={34} />
        <strong>Opening script…</strong>
      </div>
    )
  }

  if (!code || error) {
    return (
      <div className="script-empty">
        <ScrollText size={34} />
        <strong>Script is unavailable</strong>
        <span>{error || 'The script file could not be read.'}</span>
      </div>
    )
  }

  return (
    <section className="script-editor">
      <header className="script-editor-head">
        <div className="sprite-title script-title">
          <span className="sprite-title-icon"><ScrollText size={18} /></span>
          <div><ResourceName className="resource-title-name" item={params.item} /><small>{params.item.path}</small></div>
        </div>
        <EditorOk api={api} />
      </header>
      <CodeEditor
        id={params.item.file}
        value={code.text}
        eol={code.eol}
        onChange={change}
      />
    </section>
  )
}
