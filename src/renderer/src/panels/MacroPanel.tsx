import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ListPlus,
  Plus,
  SortAsc,
  Trash2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { MacroData, MacroEntry, ProjectItem } from '../../../shared/types'
import { listenSearchReveal } from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { useSave } from '../save'
import { useApp } from '../store'

type MacroItem = Extract<ProjectItem, { kind: 'resource' }>

export type MacroParams = {
  item: MacroItem
}

function copy(value: MacroData): MacroData {
  return { config: value.config, entries: value.entries.map((item) => ({ ...item })) }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Could not save macros'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function nextName(entries: MacroEntry[]): string {
  const used = new Set(entries.map((item) => item.name))
  if (!used.has('MACRO')) return 'MACRO'
  for (let index = 2; index < 10000; index += 1) {
    const name = `MACRO_${index}`
    if (!used.has(name)) return name
  }
  return `MACRO_${Date.now()}`
}

export function MacroPanel({
  params,
  api
}: IDockviewPanelProps<MacroParams>): React.JSX.Element {
  const source = params.item.macro
  const updateMacro = useApp((state) => state.updateMacro)
  const addLog = useApp((state) => state.addLog)
  const [data, setData] = useState<MacroData | null>(() => source ? copy(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [selected, setSelected] = useState<number>(source?.entries.length ? 0 : -1)
  const [saving, setSaving] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const dirty = data ? JSON.stringify(data) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => listenSearchReveal(params.item.id, (result) => {
    if (result.kind !== 'macro' || result.macroIndex === undefined) return
    setSelected(result.macroIndex)
    window.requestAnimationFrame(() => {
      const input = rootRef.current?.querySelector<HTMLInputElement>(
        `.macro-row[data-macro-index="${result.macroIndex}"] input:last-child`
      )
      if (!input) return
      const start = Math.max(0, result.column - 1)
      input.focus()
      input.setSelectionRange(start, start + result.length)
      input.scrollIntoView({ block: 'nearest' })
    })
  }), [params.item.id])

  if (!data) {
    return <div className="macro-empty">Macro data is unavailable.</div>
  }

  function change(entries: MacroEntry[], select = selected): void {
    setData((current) => current ? { ...current, entries } : current)
    setSelected(entries.length === 0 ? -1 : Math.max(0, Math.min(select, entries.length - 1)))
  }

  function add(insert: boolean): void {
    const current = data
    if (!current) return
    const entry = { name: nextName(current.entries), value: '0' }
    const index = insert && selected >= 0 ? selected : current.entries.length
    const entries = [...current.entries]
    entries.splice(index, 0, entry)
    change(entries, index)
  }

  function move(offset: number): void {
    const current = data
    if (selected < 0 || !current) return
    const index = selected + offset
    if (index < 0 || index >= current.entries.length) return
    const entries = [...current.entries]
    ;[entries[selected], entries[index]] = [entries[index], entries[selected]]
    change(entries, index)
  }

  async function save(): Promise<void> {
    const current = data
    if (!dirty || saving || !current) return
    setSaving(true)
    try {
      const value = copy(current)
      await window.openGms.saveMacros(params.item.file, value)
      updateMacro(params.item.id, value)
      setData((latest) => latest && JSON.stringify(latest) === JSON.stringify(current) ? copy(value) : latest)
      setSaved(JSON.stringify(value))
      addLog(`Saved macros for ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save macros for ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section ref={rootRef} className="macro-editor">
      <header className="macro-head">
        <div className="macro-title">
          <span>C</span>
          <div>
            <strong>{params.item.name}</strong>
            <small>{data.config === null ? 'Available in every configuration' : 'Configuration macros'}</small>
          </div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="macro-body">
        <section className="macro-card">
          <div className="macro-table" role="grid" aria-label={`${params.item.name} macros`}>
            <div className="macro-table-head" role="row">
              <span>Name</span><span>Value</span>
            </div>
            <div className="macro-rows">
              {data.entries.map((entry, index) => (
                <div
                  className={`macro-row ${selected === index ? 'selected' : ''}`}
                  role="row"
                  key={index}
                  data-macro-index={index}
                  onClick={() => setSelected(index)}
                >
                  <input
                    value={entry.name}
                    aria-label={`Macro ${index + 1} name`}
                    spellCheck={false}
                    onFocus={() => setSelected(index)}
                    onChange={(event) => change(data.entries.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: event.target.value } : item
                    ), index)}
                  />
                  <input
                    value={entry.value}
                    aria-label={`Macro ${index + 1} value`}
                    spellCheck={false}
                    onFocus={() => setSelected(index)}
                    onChange={(event) => change(data.entries.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value: event.target.value } : item
                    ), index)}
                  />
                </div>
              ))}
              {data.entries.length === 0 && (
                <div className="macro-table-empty">
                  <span>C</span>
                  <strong>No macros defined</strong>
                  <small>Add a name and value for this configuration.</small>
                </div>
              )}
            </div>
          </div>

          <footer className="macro-actions">
            <div>
              <button onClick={() => add(true)}><ListPlus size={15} /> Insert</button>
              <button onClick={() => add(false)}><Plus size={15} /> Add</button>
              <button
                className="danger"
                disabled={selected < 0}
                onClick={() => change(data.entries.filter((_item, index) => index !== selected), selected)}
              ><Trash2 size={15} /> Delete</button>
              <button
                className="danger"
                disabled={data.entries.length === 0}
                onClick={() => change([], -1)}
              ><Trash2 size={15} /> Clear</button>
            </div>
            <div>
              <button disabled={selected <= 0} onClick={() => move(-1)}><ArrowUp size={15} /> Up</button>
              <button
                disabled={selected < 0 || selected >= data.entries.length - 1}
                onClick={() => move(1)}
              ><ArrowDown size={15} /> Down</button>
              <button
                disabled={data.entries.length < 2}
                onClick={() => change([...data.entries].sort((left, right) =>
                  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
                ), 0)}
              ><SortAsc size={15} /> Sort</button>
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}
