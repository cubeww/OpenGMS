import { useEffect, useRef, useState } from 'react'
import {
  ListRestart,
  Map,
  Redo2,
  Replace,
  Search,
  Undo2,
  WrapText
} from 'lucide-react'
import type { CodeFile } from '../../shared/types'
import {
  clearCodeBuffer,
  listenCodeReveal,
  setCodeBuffer
} from './codeReveal'
import { codeFontFamily, useEditorSettings } from './editorSettings'
import { monaco, setupMonaco } from './monaco'

type CodeEditorProps = {
  id: string
  value: string
  eol: CodeFile['eol']
  language?: string
  languageLabel?: string
  extension?: string
  ariaLabel?: string
  onChange: (value: string) => void
}

type Cursor = {
  line: number
  column: number
}

export function CodeEditor({
  id,
  value,
  eol,
  language = 'gml',
  languageLabel = 'GML',
  extension = 'gml',
  ariaLabel = 'GML code editor',
  onChange
}: CodeEditorProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<monaco.editor.ITextModel | null>(null)
  const valueRef = useRef(value)
  const changeRef = useRef(onChange)
  const settings = useEditorSettings()
  const [cursor, setCursor] = useState<Cursor>({ line: 1, column: 1 })
  const [lines, setLines] = useState(1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [wrap, setWrap] = useState(settings.wordWrap)
  const [minimap, setMinimap] = useState(settings.minimap)

  valueRef.current = value
  changeRef.current = onChange

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    setupMonaco()
    const overflowRoot = document.createElement('div')
    overflowRoot.className = 'monaco-overflow-root monaco-editor vs-dark'
    document.body.appendChild(overflowRoot)
    const uri = monaco.Uri.from({
      scheme: 'opengms',
      authority: 'code',
      path: `/${encodeURIComponent(id)}.${extension}`
    })
    const oldModel = monaco.editor.getModel(uri)
    if (oldModel) oldModel.dispose()
    const model = monaco.editor.createModel(valueRef.current, language, uri)
    setCodeBuffer(id, valueRef.current)
    model.setEOL(
      eol === 'crlf'
        ? monaco.editor.EndOfLineSequence.CRLF
        : monaco.editor.EndOfLineSequence.LF
    )

    const editor = monaco.editor.create(host, {
      model,
      theme: 'opengms-dark',
      automaticLayout: true,
      fixedOverflowWidgets: true,
      overflowWidgetsDomNode: overflowRoot,
      ariaLabel,
      fontFamily: codeFontFamily(settings.fontFamily, settings.fontFallback),
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      fontLigatures: settings.fontLigatures,
      minimap: { enabled: minimap, scale: 1, showSlider: 'mouseover' },
      wordWrap: wrap ? 'on' : 'off',
      padding: { top: 10, bottom: 10 },
      smoothScrolling: true,
      scrollBeyondLastLine: false,
      tabSize: settings.tabSize,
      insertSpaces: true,
      autoIndent: 'full',
      quickSuggestions: { other: true, comments: false, strings: false },
      suggestOnTriggerCharacters: true,
      snippetSuggestions: 'top',
      tabCompletion: 'on',
      acceptSuggestionOnEnter: 'smart',
      wordBasedSuggestions: 'currentDocument',
      parameterHints: { enabled: true, cycle: true },
      suggest: {
        showConstants: true,
        showFunctions: true,
        showKeywords: true,
        showSnippets: true,
        showVariables: true
      },
      renderWhitespace: 'selection',
      matchBrackets: 'always',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      folding: true,
      showFoldingControls: 'mouseover',
      stickyScroll: { enabled: false }
    })

    editorRef.current = editor
    modelRef.current = model
    setLines(model.getLineCount())
    const content = editor.onDidChangeModelContent(() => {
      const next = model.getValue()
      setCodeBuffer(id, next)
      changeRef.current(next)
      setLines(model.getLineCount())
      setCanUndo(model.canUndo())
      setCanRedo(model.canRedo())
    })
    const position = editor.onDidChangeCursorPosition((event) => {
      setCursor({ line: event.position.lineNumber, column: event.position.column })
    })
    const stopReveal = listenCodeReveal(id, (target) => {
      const start = model.validatePosition({
        lineNumber: target.line,
        column: target.column
      })
      const end = model.validatePosition({
        lineNumber: start.lineNumber,
        column: start.column + Math.max(1, target.length)
      })
      const range = new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column
      )
      editor.setSelection(range)
      editor.revealRangeInCenterIfOutsideViewport(range)
      editor.focus()
    })

    editor.focus()

    return () => {
      stopReveal()
      content.dispose()
      position.dispose()
      editorRef.current = null
      modelRef.current = null
      clearCodeBuffer(id)
      editor.dispose()
      model.dispose()
      overflowRoot.remove()
    }
  }, [ariaLabel, extension, id, language])

  useEffect(() => {
    const model = modelRef.current
    if (model && model.getValue() !== value) model.setValue(value)
    setCodeBuffer(id, value)
  }, [id, value])

  useEffect(() => {
    const model = modelRef.current
    if (!model) return
    model.setEOL(
      eol === 'crlf'
        ? monaco.editor.EndOfLineSequence.CRLF
        : monaco.editor.EndOfLineSequence.LF
    )
  }, [eol])

  useEffect(() => {
    const editor = editorRef.current
    const model = modelRef.current
    setWrap(settings.wordWrap)
    setMinimap(settings.minimap)
    editor?.updateOptions({
      fontFamily: codeFontFamily(settings.fontFamily, settings.fontFallback),
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      fontLigatures: settings.fontLigatures,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.minimap, scale: 1, showSlider: 'mouseover' }
    })
    model?.updateOptions({
      tabSize: settings.tabSize,
      insertSpaces: true
    })
  }, [settings])

  function run(action: string): void {
    const editor = editorRef.current
    if (!editor) return
    void editor.getAction(action)?.run()
  }

  function history(action: 'undo' | 'redo'): void {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('toolbar', action, null)
    editor.focus()
  }

  function toggleWrap(): void {
    setWrap((current) => {
      const next = !current
      editorRef.current?.updateOptions({ wordWrap: next ? 'on' : 'off' })
      return next
    })
  }

  function toggleMinimap(): void {
    setMinimap((current) => {
      const next = !current
      editorRef.current?.updateOptions({ minimap: { enabled: next } })
      return next
    })
  }

  return (
    <section className="code-editor">
      <div className="code-toolbar" role="toolbar" aria-label="Code editor tools">
        <button onClick={() => history('undo')} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button onClick={() => history('redo')} disabled={!canRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
        </button>
        <span className="code-toolbar-rule" />
        <button onClick={() => run('actions.find')} title="Find (Ctrl+F)">
          <Search size={15} />
        </button>
        <button onClick={() => run('editor.action.startFindReplaceAction')} title="Replace (Ctrl+H)">
          <Replace size={15} />
        </button>
        <button onClick={() => run('editor.action.gotoLine')} title="Go to line (Ctrl+G)">
          <ListRestart size={15} />
        </button>
        <span className="code-toolbar-rule" />
        <button className={wrap ? 'active' : ''} onClick={toggleWrap} title="Toggle word wrap" aria-pressed={wrap}>
          <WrapText size={15} />
        </button>
        <button className={minimap ? 'active' : ''} onClick={toggleMinimap} title="Toggle minimap" aria-pressed={minimap}>
          <Map size={15} />
        </button>
      </div>
      <div ref={hostRef} className="code-host" />
      <footer className="code-status">
        <span>Ln {cursor.line}, Col {cursor.column}</span>
        <span>{lines} {lines === 1 ? 'line' : 'lines'}</span>
        <span>Spaces: 4</span>
        <span>{eol.toUpperCase()}</span>
        <span>{languageLabel}</span>
      </footer>
    </section>
  )
}
