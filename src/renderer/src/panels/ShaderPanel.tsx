import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { ProjectItem, ShaderData, ShaderType } from '../../../shared/types'
import { CodeEditor } from '../CodeEditor'
import { requestCodeReveal } from '../codeReveal'
import { listenSearchReveal } from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'

type ShaderItem = Extract<ProjectItem, { kind: 'resource' }>
type ShaderPage = 'vertex' | 'fragment'

export type ShaderParams = {
  item: ShaderItem
}

const typeNames: Record<ShaderType, string> = {
  GLSLES: 'GLSL ES',
  GLSL: 'GLSL',
  HLSL9: 'HLSL 9',
  HLSL11: 'HLSL 11'
}

function copyShader(shader: ShaderData): ShaderData {
  return { ...shader }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

export function ShaderPanel({ params, api }: IDockviewPanelProps<ShaderParams>): React.JSX.Element {
  const source = params.item.shader
  const [shader, setShader] = useState<ShaderData | null>(() => source ? copyShader(source) : null)
  const [saved, setSaved] = useState<ShaderData | null>(() => source ? copyShader(source) : null)
  const [page, setPage] = useState<ShaderPage>('vertex')
  const [saving, setSaving] = useState(false)
  const updateShader = useApp((state) => state.updateShader)
  const addLog = useApp((state) => state.addLog)
  const dirty = shader && saved ? JSON.stringify(shader) !== JSON.stringify(saved) : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => listenSearchReveal(params.item.id, (result) => {
    if (result.kind !== 'shader') return
    const stage = result.stage ?? 'vertex'
    setPage(stage)
    requestCodeReveal({
      id: `${params.item.file}:${stage}`,
      line: result.line,
      column: result.column,
      length: result.length
    })
  }), [params.item.file, params.item.id])

  if (!shader || !saved) {
    return (
      <div className="script-empty shader-empty">
        <Sparkles size={34} />
        <strong>Shader is unavailable</strong>
        <span>The shader file is missing or could not be parsed.</span>
      </div>
    )
  }

  const data = shader
  const glsl = data.type === 'GLSLES' || data.type === 'GLSL'
  const language = glsl ? 'glsl' : 'hlsl'
  function patch(change: Partial<ShaderData>): void {
    setShader((current) => current ? { ...current, ...change } : current)
  }

  async function save(): Promise<void> {
    if (!shader || !saved || saving) return
    const next = copyShader(shader)
    if (JSON.stringify(next) === JSON.stringify(saved)) return
    setSaving(true)
    try {
      await window.openGms.saveShader(params.item.file, next)
      updateShader(params.item.id, copyShader(next))
      setSaved(copyShader(next))
      addLog(`Saved shader ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save shader ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="shader-editor">
      <header className="shader-editor-head">
        <div className="sprite-title shader-title">
          <span className="sprite-title-icon"><Sparkles size={18} /></span>
          <div><ResourceName className="resource-title-name" item={params.item} /><small>{params.item.path}</small></div>
        </div>
        <label className="shader-type">
          <span>Type</span>
          <select value={data.type} onChange={(event) => patch({ type: event.target.value as ShaderType })}>
            {(Object.keys(typeNames) as ShaderType[]).map((type) => <option key={type} value={type}>{typeNames[type]}</option>)}
          </select>
        </label>
        <EditorOk api={api} />
      </header>
      <nav className="shader-tabs" aria-label="Shader stages">
        <button className={page === 'vertex' ? 'active' : ''} onClick={() => setPage('vertex')}>Vertex{data.vertex !== saved.vertex ? ' •' : ''}</button>
        <button className={page === 'fragment' ? 'active' : ''} onClick={() => setPage('fragment')}>Fragment{data.fragment !== saved.fragment ? ' •' : ''}</button>
      </nav>
      <CodeEditor
        id={`${params.item.file}:${page}`}
        value={data[page]}
        eol={data.eol}
        language={language}
        languageLabel={typeNames[data.type]}
        extension={glsl ? (page === 'vertex' ? 'vert' : 'frag') : 'hlsl'}
        ariaLabel={`${page === 'vertex' ? 'Vertex' : 'Fragment'} shader editor`}
        onChange={(value) => patch({ [page]: value })}
      />
    </section>
  )
}
