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
import {
  gmlEnumDecorations,
  gmlResourceAt,
  gmlResourceDecorations,
  openGmlResource
} from './gml'
import { applyEditorTheme, monaco, setupMonaco } from './monaco'
import { useApp } from './store'

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
  const localValueRef = useRef<string | null>(null)
  const syncingRef = useRef(false)
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

    setupMonaco(settings.colors)
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
      if (!syncingRef.current) {
        localValueRef.current = next
        changeRef.current(next)
      }
      setLines(model.getLineCount())
      setCanUndo(model.canUndo())
      setCanRedo(model.canRedo())
    })
    const position = editor.onDidChangeCursorPosition((event) => {
      setCursor({ line: event.position.lineNumber, column: event.position.column })
    })
    const resourceLink = editor.createDecorationsCollection()
    const resourceStyle = editor.createDecorationsCollection()
    const enumStyle = editor.createDecorationsCollection()
    let enumTimer = 0
    let enumRequest = 0
    let resourceTimer = 0
    let disposed = false
    let hoverPosition: monaco.Position | null = null

    const refreshEnums = (): void => {
      window.clearTimeout(enumTimer)
      enumRequest += 1
      const request = enumRequest
      if (language !== 'gml') {
        enumStyle.clear()
        return
      }
      enumTimer = window.setTimeout(() => {
        void gmlEnumDecorations(monaco, model).then((decorations) => {
          if (!disposed && request === enumRequest && !model.isDisposed()) enumStyle.set(decorations)
        })
      }, 60)
    }

    const enumContent = model.onDidChangeContent(() => {
      refreshEnums()
      window.dispatchEvent(new Event('opengms:gml-enums-changed'))
    })
    const enumsChanged = (): void => refreshEnums()
    window.addEventListener('opengms:gml-enums-changed', enumsChanged)
    refreshEnums()

    const refreshResources = (): void => {
      window.clearTimeout(resourceTimer)
      if (language !== 'gml') {
        resourceStyle.clear()
        return
      }
      resourceTimer = window.setTimeout(() => {
        if (!disposed && !model.isDisposed()) resourceStyle.set(gmlResourceDecorations(model))
      }, 60)
    }
    const resourceContent = model.onDidChangeContent(refreshResources)
    const stopProject = useApp.subscribe((state, previous) => {
      if (state.project !== previous.project) refreshResources()
    })
    refreshResources()

    const showResourceLink = (targetPosition: monaco.Position | null): void => {
      if (language !== 'gml' || !targetPosition) {
        resourceLink.clear()
        return
      }
      const target = gmlResourceAt(model, targetPosition)
      resourceLink.set(target ? [{
        range: target.range,
        options: {
          inlineClassName: 'gml-resource-link'
        }
      }] : [])
    }

    const resourceMove = editor.onMouseMove((event) => {
      hoverPosition = event.target.position
      if (event.event.ctrlKey) showResourceLink(hoverPosition)
      else resourceLink.clear()
    })
    const resourceLeave = editor.onMouseLeave(() => {
      hoverPosition = null
      resourceLink.clear()
    })
    const resourceKeyDown = editor.onKeyDown((event) => {
      if (event.ctrlKey) showResourceLink(hoverPosition)
    })
    const resourceKeyUp = editor.onKeyUp((event) => {
      if (!event.ctrlKey) resourceLink.clear()
    })
    const resourceOpen = editor.onMouseDown((event) => {
      if (
        language !== 'gml' ||
        !event.event.leftButton ||
        !event.event.ctrlKey ||
        !event.target.position
      ) return

      const target = gmlResourceAt(model, event.target.position)
      if (!target) return
      event.event.preventDefault()
      event.event.stopPropagation()
      resourceLink.clear()
      openGmlResource(target.name)
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
      disposed = true
      window.clearTimeout(enumTimer)
      window.clearTimeout(resourceTimer)
      window.removeEventListener('opengms:gml-enums-changed', enumsChanged)
      stopProject()
      stopReveal()
      content.dispose()
      position.dispose()
      enumContent.dispose()
      resourceContent.dispose()
      resourceMove.dispose()
      resourceLeave.dispose()
      resourceKeyDown.dispose()
      resourceKeyUp.dispose()
      resourceOpen.dispose()
      resourceLink.clear()
      resourceStyle.clear()
      enumStyle.clear()
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
    if (!model) {
      setCodeBuffer(id, value)
      return
    }

    const current = model.getValue()
    if (current === value) {
      localValueRef.current = null
      setCodeBuffer(id, current)
      return
    }

    // React can briefly render an older value while Monaco is already ahead of it.
    // Treat that value as a stale acknowledgement of local input instead of
    // replacing the model, which would reset the cursor and undo stack.
    if (localValueRef.current === current) return

    syncingRef.current = true
    try {
      model.setValue(value)
    } finally {
      syncingRef.current = false
    }
    localValueRef.current = null
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
    applyEditorTheme(settings.colors)
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
    editor.focus()
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
