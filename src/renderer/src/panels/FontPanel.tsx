import { useEffect, useMemo, useState } from 'react'
import {
  FileCode2,
  FileText,
  Minus,
  Package,
  Plus,
  Settings2,
  Type,
  X
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { FontData, FontRange, ProjectItem } from '../../../shared/types'
import { bakeFont } from '../fontBake'
import { waitForFontBake } from '../fontBakeQueue'
import { EditorOk } from '../EditorOk'
import { FontPicker } from '../FontPicker'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'

type FontItem = Extract<ProjectItem, { kind: 'resource' }>

export type FontParams = {
  item: FontItem
  projectPath: string
}

function copyFont(font: FontData): FontData {
  return { ...font, ranges: font.ranges.map((range) => ({ ...range })) }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function normalizeRanges(ranges: FontRange[]): FontRange[] {
  const sorted = ranges.map((range) => {
    const start = Math.max(0, Math.min(65535, Math.round(range.start)))
    const end = Math.max(0, Math.min(65535, Math.round(range.end)))
    return { start: Math.min(start, end), end: Math.max(start, end) }
  }).sort((left, right) => left.start - right.start || left.end - right.end)
  const result: FontRange[] = []

  for (const range of sorted) {
    const last = result[result.length - 1]
    if (last && range.start <= last.end + 1) last.end = Math.max(last.end, range.end)
    else result.push({ ...range })
  }
  return result
}

function textFromRanges(ranges: FontRange[]): string {
  let result = ''
  for (const range of normalizeRanges(ranges)) {
    for (let code = range.start; code <= range.end; code += 1) {
      result += String.fromCodePoint(code)
    }
  }
  return result
}

function rangesFromText(value: string): FontRange[] {
  const codes = Array.from(new Set(
    Array.from(value, (character) => character.codePointAt(0) ?? -1)
      .filter((code) => code >= 0 && code <= 65535)
  )).sort((left, right) => left - right)
  return normalizeRanges(codes.map((code) => ({ start: code, end: code })))
}

function normalizeFont(font: FontData): FontData {
  return {
    ...font,
    size: Math.max(1, Math.min(512, Math.round(font.size))),
    antiAlias: Math.max(0, Math.min(3, Math.round(font.antiAlias))),
    charset: Math.max(0, Math.min(255, Math.round(font.charset))),
    ranges: normalizeRanges(font.ranges)
  }
}

function codeName(code: number): string {
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`
}

function visibleCharacter(code: number): string {
  if (code === 32) return '·'
  if (code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff)) return '□'
  return String.fromCodePoint(code)
}

function glyphs(ranges: FontRange[], limit: number): { items: Array<{ code: number; text: string }>; total: number } {
  const items: Array<{ code: number; text: string }> = []
  let total = 0
  for (const range of ranges) {
    total += range.end - range.start + 1
    if (items.length >= limit) continue
    const end = Math.min(range.end, range.start + limit - items.length - 1)
    for (let code = range.start; code <= end; code += 1) {
      items.push({ code, text: visibleCharacter(code) })
    }
  }
  return { items, total }
}

function CheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="sprite-check-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function FontRangePanel({
  onAdd,
  onCancel
}: {
  onAdd: (ranges: FontRange[]) => void
  onCancel: () => void
}): React.JSX.Element {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const textRanges = useMemo(() => rangesFromText(text), [text])
  const characterCount = useMemo(
    () => textRanges.reduce((total, item) => total + item.end - item.start + 1, 0),
    [textRanges]
  )

  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onCancel])

  function preset(nextStart: number, nextEnd: number): void {
    setStart(nextStart)
    setEnd(nextEnd)
    setText(textFromRanges([{ start: nextStart, end: nextEnd }]))
    setMessage('')
  }

  function changeRange(nextStart: number, nextEnd: number): void {
    setStart(nextStart)
    setEnd(nextEnd)
    setText(textFromRanges([{ start: nextStart, end: nextEnd }]))
    setMessage('')
  }

  function letters(): void {
    setStart(65)
    setEnd(122)
    setText(textFromRanges([{ start: 65, end: 90 }, { start: 97, end: 122 }]))
    setMessage('')
  }

  function add(): void {
    if (textRanges.length === 0) {
      setMessage('Enter at least one character')
      return
    }
    onAdd(textRanges)
  }

  async function fromCode(): Promise<void> {
    if (loading) return
    setLoading(true)
    setMessage('Scanning project code…')
    try {
      const ranges = await window.openGms.fontRangesFromCode()
      if (ranges.length === 0) {
        setMessage('No string literals found in project code')
        return
      }
      setText(textFromRanges(ranges))
      setMessage(`${ranges.reduce((total, item) => total + item.end - item.start + 1, 0)} characters loaded from project code`)
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  async function fromFile(): Promise<void> {
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const ranges = await window.openGms.fontRangesFromFile()
      if (!ranges) return
      if (ranges.length === 0) {
        setMessage('The selected file has no usable characters')
        return
      }
      setText(textFromRanges(ranges))
      setMessage(`${ranges.reduce((total, item) => total + item.end - item.start + 1, 0)} characters loaded from file`)
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-range-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="font-range-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Add glyph range"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><Type size={16} /><strong>Add Glyph Range</strong></div>
          <button onClick={onCancel} title="Close"><X size={16} /></button>
        </header>

        <div className="font-range-body">
          <section className="font-range-fields">
            <h3>Range</h3>
            <div className="font-range-numbers">
              <label>
                <span>From</span>
                <input
                  type="number"
                  min="0"
                  max="65535"
                  value={start}
                  onChange={(event) => changeRange(Number(event.target.value) || 0, end)}
                />
              </label>
              <span>to</span>
              <label>
                <span>Until</span>
                <input
                  type="number"
                  min="0"
                  max="65535"
                  value={end}
                  onChange={(event) => changeRange(start, Number(event.target.value) || 0)}
                />
              </label>
            </div>
            <div className="font-range-presets">
              <button onClick={() => preset(32, 127)}>Normal</button>
              <button onClick={() => preset(0, 255)}>ASCII</button>
              <button onClick={() => preset(48, 57)}>Digits</button>
              <button onClick={letters}>Letters</button>
            </div>
          </section>

          <section className="font-range-import">
            <button onClick={() => void fromCode()} disabled={loading}>
              <FileCode2 size={15} /> From Code
            </button>
            <button onClick={() => void fromFile()} disabled={loading}>
              <FileText size={15} /> From File
            </button>
          </section>

          <section className="font-range-text">
            <div className="font-range-preview-head">
              <span>Characters</span>
              <span>{characterCount} unique glyphs</span>
            </div>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setMessage('')
              }}
              placeholder="Type or paste the characters to include…"
              spellCheck={false}
              autoFocus
            />
          </section>
        </div>

        <footer>
          <span>{message}</span>
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button onClick={add}>OK</button>
        </footer>
      </section>
    </div>
  )
}

export function FontPanel({ params, api }: IDockviewPanelProps<FontParams>): React.JSX.Element {
  const source = params.item.font
  const [font, setFont] = useState<FontData | null>(() => source ? copyFont(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [sample, setSample] = useState('Hello World!!')
  const [selected, setSelected] = useState(0)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fonts, setFonts] = useState<string[] | null>(null)
  const updateFont = useApp((state) => state.updateFont)
  const addLog = useApp((state) => state.addLog)
  const dirty = font ? JSON.stringify(font) !== saved : false
  useSave(api.id, dirty, save)
  const glyphData = useMemo(() => glyphs(font?.ranges ?? [], 768), [font?.ranges])

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    if (font && selected >= font.ranges.length) setSelected(Math.max(0, font.ranges.length - 1))
  }, [font, selected])

  useEffect(() => {
    let canceled = false
    void window.openGms.listFonts().then((value) => {
      if (!canceled) setFonts(value)
    }).catch((error) => {
      if (canceled) return
      setFonts([])
      addLog(`Failed to read installed fonts: ${errorText(error)}`)
    })
    return () => { canceled = true }
  }, [addLog])

  if (!font) {
    return (
      <div className="font-empty">
        <Type size={34} />
        <strong>Font data is unavailable</strong>
        <span>The font descriptor is missing or could not be parsed.</span>
      </div>
    )
  }
  const data = font
  const fontOptions = [...new Map(
    [...(fonts ?? []), data.font].map((name) => [name.toLocaleLowerCase(), name])
  ).values()].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  )
  const previewStyle = {
    fontFamily: `"${data.font.replace(/"/g, '')}", sans-serif`,
    fontSize: `${Math.min(128, Math.max(6, data.size))}px`,
    fontWeight: data.bold ? 700 : 400,
    fontStyle: data.italic ? 'italic' : 'normal'
  }

  function patch(change: Partial<FontData>): void {
    setFont((current) => current ? { ...current, ...change } : current)
  }

  function addRanges(ranges: FontRange[]): void {
    const next = normalizeRanges([...data.ranges, ...ranges])
    patch({ ranges: next })
    setSelected(Math.max(0, next.length - 1))
    setRangeOpen(false)
  }

  function removeRange(): void {
    if (!data.ranges.length) return
    patch({ ranges: data.ranges.filter((_range, index) => index !== selected) })
  }

  async function save(): Promise<void> {
    if (!font || !dirty || saving) return
    setSaving(true)
    const editingValue = JSON.stringify(font)
    const next = { ...normalizeFont(font), baked: true }
    const savedValue = JSON.stringify(next)
    try {
      await waitForFontBake(params.item.file)
      const atlas = await bakeFont(next)
      await window.openGms.saveFont(params.item.file, next, atlas)
      updateFont(params.item.id, copyFont(next))
      setFont((current) => current && JSON.stringify(current) === editingValue ? next : current)
      setSaved(savedValue)
      addLog(`Saved font ${params.item.name} with a ${atlas.width} × ${atlas.height} atlas.`)
    } catch (error) {
      addLog(`Failed to save font ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="font-editor">
      <header className="font-editor-head">
        <div className="sprite-title font-title">
          <span className="sprite-title-icon"><Type size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Font resource</small></div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="font-editor-body">
        <aside className="font-settings">
          <section className="sprite-group">
            <h3><Type size={15} /> Font</h3>
            <div className="sprite-group-body">
              <label className="sprite-text-field">
                <span>Name</span>
                <ResourceName item={params.item} />
              </label>
              <div className="sprite-text-field">
                <span>Font Family</span>
                <FontPicker
                  value={data.font}
                  options={fontOptions}
                  loading={fonts === null}
                  onChange={(font) => patch({ font })}
                />
              </div>
            </div>
          </section>

          <section className="sprite-group">
            <h3><Settings2 size={15} /> Style</h3>
            <div className="sprite-group-body">
              <div className="font-style-fields">
                <label className="sprite-text-field">
                  <span>Anti-Aliasing</span>
                  <select value={data.antiAlias} onChange={(event) => patch({ antiAlias: Number(event.target.value) })}>
                    <option value="0">Off</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </label>
                <label className="sprite-number-field">
                  <span>Size</span>
                  <input type="number" min="1" max="512" value={data.size} onChange={(event) => patch({ size: Number(event.target.value) || 1 })} />
                </label>
              </div>
              <div className="font-checks">
                <CheckField label="High Quality" checked={data.highQuality} onChange={(highQuality) => patch({ highQuality })} />
                <CheckField label="Bold" checked={data.bold} onChange={(bold) => patch({ bold })} />
                <CheckField label="Italic" checked={data.italic} onChange={(italic) => patch({ italic })} />
              </div>
            </div>
          </section>

          <section className="sprite-group">
            <h3><Package size={15} /> Packaging</h3>
            <div className="sprite-group-body">
              <CheckField label="Include in Asset Package" checked={data.includeTtf} onChange={(includeTtf) => patch({ includeTtf })} />
              {data.includeTtf && (
                <label className="sprite-text-field">
                  <span>TTF Name</span>
                  <input value={data.ttfName} onChange={(event) => patch({ ttfName: event.target.value })} />
                </label>
              )}
              <label className="sprite-text-field">
                <span>Texture Group</span>
                <select value={data.textureGroup} onChange={(event) => patch({ textureGroup: event.target.value })}>
                  <option value={data.textureGroup}>{data.textureGroup === '0' ? 'Default' : data.textureGroup}</option>
                </select>
              </label>
            </div>
          </section>
        </aside>

        <main className="font-workspace">
          <section className="font-sample">
            <div className="font-section-head">
              <div><strong>Preview</strong><span>Type to change the sample</span></div>
              <span>{data.font} · {data.size}px</span>
            </div>
            <textarea value={sample} onChange={(event) => setSample(event.target.value)} style={previewStyle} spellCheck={false} />
          </section>

          <section className="font-glyph-section">
            <div className="font-range-list">
              <div className="font-section-head">
                <div><strong>Glyph Ranges</strong><span>{data.ranges.length} ranges</span></div>
              </div>
              <div className="font-range-items">
                {data.ranges.map((range, index) => (
                  <button
                    key={`${range.start}-${range.end}-${index}`}
                    className={selected === index ? 'selected' : ''}
                    onClick={() => setSelected(index)}
                  >
                    <span>{range.start} to {range.end}</span>
                    <small>{range.end - range.start + 1} characters</small>
                  </button>
                ))}
                {data.ranges.length === 0 && <span className="font-no-ranges">No ranges added</span>}
              </div>
              <div className="font-range-actions">
                <button onClick={() => setRangeOpen(true)} title="Add range"><Plus size={16} /></button>
                <button onClick={removeRange} disabled={!data.ranges.length} title="Remove range"><Minus size={16} /></button>
                <button onClick={() => patch({ ranges: [] })} disabled={!data.ranges.length}>Clear All</button>
              </div>
            </div>

            <div className="font-glyph-preview">
              <div className="font-section-head">
                <div><strong>Characters</strong><span>{glyphData.total} glyphs</span></div>
                {glyphData.total > glyphData.items.length && <span>First {glyphData.items.length} shown</span>}
              </div>
              <div className="font-glyph-grid" style={{ ...previewStyle, fontSize: `${Math.min(42, Math.max(12, data.size))}px` }}>
                {glyphData.items.map((item) => (
                  <span key={item.code} title={`${codeName(item.code)} · ${item.code}`}>{item.text}</span>
                ))}
                {glyphData.items.length === 0 && <small>Add a glyph range to preview characters.</small>}
              </div>
            </div>
          </section>
        </main>
      </div>

      {rangeOpen && <FontRangePanel onAdd={addRanges} onCancel={() => setRangeOpen(false)} />}
    </section>
  )
}
