import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Copy,
  Eraser,
  Highlighter,
  Info,
  Italic,
  List,
  Palette,
  Redo2,
  Scissors,
  Underline,
  Undo2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  GameInfoAlign,
  GameInfoData,
  GameInfoParagraph,
  GameInfoRun
} from '../../../shared/types'
import { EditorOk } from '../EditorOk'
import { useSave } from '../save'
import { useApp } from '../store'

const fontSizes = [8, 10, 12, 14, 18, 24, 36]
const fonts = [
  'Arial',
  'Calibri',
  'Verdana',
  'Tahoma',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Consolas'
]

type RunStyle = Omit<GameInfoRun, 'text'>

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeFont(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const font = value.replace(/^["']|["']$/g, '').replace(/[^\p{L}\p{N} .,_-]/gu, '').slice(0, 80)
  return font || undefined
}

function htmlColor(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (short) return `#${short.slice(1).map((part) => part + part).join('')}`.toUpperCase()
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value)
  if (!rgb) return undefined
  return `#${rgb.slice(1, 4)
    .map((part) => Math.min(255, Number.parseInt(part, 10)).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()
}

function runHtml(run: GameInfoRun): string {
  const styles: string[] = []
  const font = safeFont(run.font)
  if (font) styles.push(`font-family:&quot;${escapeHtml(font)}&quot;`)
  if (run.size) styles.push(`font-size:${run.size}pt`)
  if (run.color) styles.push(`color:${run.color}`)
  if (run.background) styles.push(`background-color:${run.background}`)
  if (run.bold) styles.push('font-weight:700')
  if (run.italic) styles.push('font-style:italic')
  const decoration = [run.underline ? 'underline' : '', run.strike ? 'line-through' : '']
    .filter(Boolean)
    .join(' ')
  if (decoration) styles.push(`text-decoration:${decoration}`)
  const text = escapeHtml(run.text).replace(/\n/g, '<br>').replace(/\t/g, '&#9;')
  return `<span${styles.length ? ` style="${styles.join(';')}"` : ''}>${text}</span>`
}

function dataHtml(data: GameInfoData): string {
  let html = ''
  let list: GameInfoParagraph['list'] = null

  function closeList(): void {
    if (!list) return
    html += list === 'bullet' ? '</ul>' : '</ol>'
    list = null
  }

  for (const paragraph of data.paragraphs) {
    const content = paragraph.runs.map(runHtml).join('') || '<br>'
    if (paragraph.list) {
      if (list !== paragraph.list) {
        closeList()
        list = paragraph.list
        html += list === 'bullet' ? '<ul>' : '<ol>'
      }
      html += `<li style="text-align:${paragraph.align}">${content}</li>`
    } else {
      closeList()
      html += `<div style="text-align:${paragraph.align}">${content}</div>`
    }
  }
  closeList()
  return html || '<div><br></div>'
}

function sameStyle(left: GameInfoRun, right: RunStyle): boolean {
  return left.font === right.font &&
    left.size === right.size &&
    left.color === right.color &&
    left.background === right.background &&
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strike === right.strike
}

function addText(runs: GameInfoRun[], text: string, style: RunStyle): void {
  if (!text) return
  const last = runs[runs.length - 1]
  if (last && sameStyle(last, style)) last.text += text
  else runs.push({ text, ...style })
}

function elementStyle(element: HTMLElement, inherited: RunStyle): RunStyle {
  const next = { ...inherited }
  const tag = element.tagName
  if (tag === 'B' || tag === 'STRONG') next.bold = true
  if (tag === 'I' || tag === 'EM') next.italic = true
  if (tag === 'U') next.underline = true
  if (tag === 'S' || tag === 'STRIKE') next.strike = true

  if (tag === 'FONT') {
    const font = safeFont(element.getAttribute('face'))
    const color = htmlColor(element.getAttribute('color'))
    const size = Number.parseInt(element.getAttribute('size') ?? '', 10)
    if (font) next.font = font
    if (color) next.color = color
    if (size >= 1 && size <= 7) next.size = fontSizes[size - 1]
  }

  const style = element.style
  const font = safeFont(style.fontFamily)
  if (font) next.font = font
  if (style.fontSize) {
    const size = Number.parseFloat(style.fontSize)
    if (Number.isFinite(size)) next.size = Math.round((style.fontSize.endsWith('px') ? size * 0.75 : size) * 2) / 2
  }
  if (style.fontWeight === 'bold' || Number.parseInt(style.fontWeight, 10) >= 600) next.bold = true
  if (style.fontStyle === 'italic') next.italic = true
  if (style.textDecoration.includes('underline')) next.underline = true
  if (style.textDecoration.includes('line-through')) next.strike = true
  const color = htmlColor(style.color)
  const background = htmlColor(style.backgroundColor)
  if (color) next.color = color
  if (background) next.background = background
  return next
}

function readInline(nodes: Iterable<Node>, inherited: RunStyle = {}): GameInfoRun[] {
  const runs: GameInfoRun[] = []

  function visit(node: Node, style: RunStyle): void {
    if (node.nodeType === Node.TEXT_NODE) {
      addText(runs, node.nodeValue ?? '', style)
      return
    }
    if (!(node instanceof HTMLElement)) return
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return
    if (node.tagName === 'BR') {
      addText(runs, '\n', style)
      return
    }
    const next = elementStyle(node, style)
    for (const child of node.childNodes) visit(child, next)
  }

  for (const node of nodes) visit(node, inherited)
  const last = runs[runs.length - 1]
  if (last?.text.endsWith('\n')) {
    last.text = last.text.slice(0, -1)
    if (!last.text) runs.pop()
  }
  return runs
}

function alignment(element: HTMLElement): GameInfoAlign {
  const value = (element.style.textAlign || element.getAttribute('align') || '').toLowerCase()
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left'
}

function editorData(root: HTMLElement): GameInfoData {
  const paragraphs: GameInfoParagraph[] = []
  const loose: Node[] = []

  function flushLoose(): void {
    if (loose.length === 0) return
    paragraphs.push({ align: 'left', list: null, runs: readInline(loose) })
    loose.length = 0
  }

  for (const node of root.childNodes) {
    if (!(node instanceof HTMLElement)) {
      loose.push(node)
      continue
    }
    const tag = node.tagName
    if (tag === 'UL' || tag === 'OL') {
      flushLoose()
      const list = tag === 'UL' ? 'bullet' : 'number'
      for (const child of node.children) {
        if (child instanceof HTMLElement && child.tagName === 'LI') {
          paragraphs.push({ align: alignment(child), list, runs: readInline(child.childNodes) })
        }
      }
      continue
    }
    if (/^(DIV|P|H[1-6])$/.test(tag)) {
      flushLoose()
      paragraphs.push({ align: alignment(node), list: null, runs: readInline(node.childNodes) })
      continue
    }
    loose.push(node)
  }
  flushLoose()
  return { paragraphs: paragraphs.length > 0 ? paragraphs : [{ align: 'left', list: null, runs: [] }] }
}

function signature(data: GameInfoData): string {
  return JSON.stringify(data)
}

function closeMenu(target: HTMLElement): void {
  const details = target.closest('details') as HTMLDetailsElement | null
  if (details) details.open = false
}

function keepOneMenuOpen(event: React.SyntheticEvent<HTMLDetailsElement>): void {
  const current = event.currentTarget
  if (!current.open) return
  for (const item of current.parentElement?.querySelectorAll('details[open]') ?? []) {
    if (item !== current && item instanceof HTMLDetailsElement) item.open = false
  }
}

export function GameInfoPanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const project = useApp((state) => state.project)
  const addLog = useApp((state) => state.addLog)
  const editor = useRef<HTMLDivElement | null>(null)
  const selection = useRef<Range | null>(null)
  const [data, setData] = useState<GameInfoData | null>(null)
  const [saved, setSaved] = useState('')
  const [initialHtml, setInitialHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const currentSignature = useMemo(() => data ? signature(data) : '', [data])
  const dirty = Boolean(data) && currentSignature !== saved
  useSave(api.id, dirty, save)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void window.openGms.readGameInfo().then((value) => {
      if (!active) return
      setData(value)
      setSaved(signature(value))
      setInitialHtml(dataHtml(value))
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(errorText(reason))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [project?.path])

  useEffect(() => {
    api.setTitle(`Game Information${dirty ? ' •' : ''}`)
  }, [api, dirty])

  useLayoutEffect(() => {
    if (!loading && editor.current) editor.current.innerHTML = initialHtml
  }, [initialHtml, loading])

  function rememberSelection(): void {
    const root = editor.current
    const active = window.getSelection()
    if (!root || !active || active.rangeCount === 0) return
    const range = active.getRangeAt(0)
    if (root.contains(range.commonAncestorContainer)) selection.current = range.cloneRange()
  }

  function restoreSelection(): void {
    const root = editor.current
    const range = selection.current
    if (!root) return
    root.focus()
    if (!range || !root.contains(range.commonAncestorContainer)) return
    const active = window.getSelection()
    active?.removeAllRanges()
    active?.addRange(range)
  }

  function sync(): GameInfoData | null {
    if (!editor.current) return data
    const next = editorData(editor.current)
    setData(next)
    rememberSelection()
    return next
  }

  function command(name: string, value?: string): void {
    restoreSelection()
    document.execCommand(name, false, value)
    sync()
  }

  async function paste(): Promise<void> {
    restoreSelection()
    try {
      const text = await navigator.clipboard.readText()
      document.execCommand('insertText', false, text)
      sync()
    } catch {
      addLog('Game Information: clipboard access was denied.')
    }
  }

  async function save(): Promise<void> {
    const next = editor.current ? editorData(editor.current) : data
    if (!next || saving) return
    const nextSignature = signature(next)
    setData(next)
    if (nextSignature === saved) return
    setSaving(true)
    try {
      await window.openGms.saveGameInfo(next)
      setSaved(nextSignature)
      addLog('Saved Game Information.')
    } catch (reason) {
      addLog(`Failed to save Game Information: ${errorText(reason)}`)
    } finally {
      setSaving(false)
    }
  }

  function menuAction(event: React.MouseEvent<HTMLButtonElement>, action: () => void): void {
    event.preventDefault()
    closeMenu(event.currentTarget)
    action()
  }

  if (loading) {
    return <div className="game-info-empty"><Info size={34} /><strong>Opening Game Information…</strong></div>
  }
  if (!data || error) {
    return (
      <div className="game-info-empty">
        <Info size={34} />
        <strong>Game Information is unavailable</strong>
        <span>{error || 'The RTF file could not be read.'}</span>
      </div>
    )
  }

  return (
    <section className="game-info-editor">
      <header className="game-info-head">
        <nav className="game-info-menus" aria-label="Game Information menus">
          <details onToggle={keepOneMenuOpen}>
            <summary>Edit</summary>
            <div>
              <button onMouseDown={(event) => menuAction(event, () => command('undo'))}><Undo2 size={14} /> Undo</button>
              <button onMouseDown={(event) => menuAction(event, () => command('redo'))}><Redo2 size={14} /> Redo</button>
              <span />
              <button onMouseDown={(event) => menuAction(event, () => command('cut'))}><Scissors size={14} /> Cut</button>
              <button onMouseDown={(event) => menuAction(event, () => command('copy'))}><Copy size={14} /> Copy</button>
              <button onMouseDown={(event) => menuAction(event, () => void paste())}><ClipboardPaste size={14} /> Paste</button>
            </div>
          </details>
          <details onToggle={keepOneMenuOpen}>
            <summary>Format</summary>
            <div>
              <button onMouseDown={(event) => menuAction(event, () => command('removeFormat'))}>
                <Eraser size={14} /> Clear formatting
              </button>
            </div>
          </details>
          <EditorOk api={api} />
        </nav>

        <div className="game-info-toolbar" role="toolbar" aria-label="Rich text formatting">
          <button title="Undo" onMouseDown={(event) => { event.preventDefault(); command('undo') }}><Undo2 size={15} /></button>
          <button title="Redo" onMouseDown={(event) => { event.preventDefault(); command('redo') }}><Redo2 size={15} /></button>
          <button title="Cut" onMouseDown={(event) => { event.preventDefault(); command('cut') }}><Scissors size={15} /></button>
          <button title="Copy" onMouseDown={(event) => { event.preventDefault(); command('copy') }}><Copy size={15} /></button>
          <button title="Paste text" onMouseDown={(event) => { event.preventDefault(); void paste() }}><ClipboardPaste size={15} /></button>
          <span className="tool-rule" />
          <select
            defaultValue="Arial"
            aria-label="Font family"
            onMouseDown={rememberSelection}
            onChange={(event) => command('fontName', event.target.value)}
          >
            {fonts.map((font) => <option key={font}>{font}</option>)}
          </select>
          <select
            className="game-info-size"
            defaultValue="12"
            aria-label="Font size"
            onMouseDown={rememberSelection}
            onChange={(event) => command('fontSize', String(fontSizes.indexOf(Number(event.target.value)) + 1))}
          >
            {fontSizes.map((size) => <option key={size}>{size}</option>)}
          </select>
          <button title="Bold" onMouseDown={(event) => { event.preventDefault(); command('bold') }}><Bold size={15} /></button>
          <button title="Italic" onMouseDown={(event) => { event.preventDefault(); command('italic') }}><Italic size={15} /></button>
          <button title="Underline" onMouseDown={(event) => { event.preventDefault(); command('underline') }}><Underline size={15} /></button>
          <label className="game-info-color" title="Text color" onMouseDown={rememberSelection}>
            <Palette size={15} />
            <input type="color" defaultValue="#E3E7ED" onChange={(event) => command('foreColor', event.target.value)} />
          </label>
          <label className="game-info-color" title="Highlight color" onMouseDown={rememberSelection}>
            <Highlighter size={15} />
            <input type="color" defaultValue="#FFE082" onChange={(event) => command('hiliteColor', event.target.value)} />
          </label>
          <span className="tool-rule" />
          <button title="Align left" onMouseDown={(event) => { event.preventDefault(); command('justifyLeft') }}><AlignLeft size={15} /></button>
          <button title="Align center" onMouseDown={(event) => { event.preventDefault(); command('justifyCenter') }}><AlignCenter size={15} /></button>
          <button title="Align right" onMouseDown={(event) => { event.preventDefault(); command('justifyRight') }}><AlignRight size={15} /></button>
          <button title="Justify" onMouseDown={(event) => { event.preventDefault(); command('justifyFull') }}><AlignJustify size={15} /></button>
          <button title="Bullet list" onMouseDown={(event) => { event.preventDefault(); command('insertUnorderedList') }}><List size={15} /></button>
          <button title="Clear formatting" onMouseDown={(event) => { event.preventDefault(); command('removeFormat') }}><Eraser size={15} /></button>
        </div>
      </header>

      <div
        ref={editor}
        className="game-info-canvas"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={() => sync()}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
      />
    </section>
  )
}
