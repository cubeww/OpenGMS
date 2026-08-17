import { useEffect, useState } from 'react'
import { Braces, RotateCcw, Settings2, Type } from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import {
  codeFontFamily,
  resetEditorSettings,
  updateEditorSettings,
  useEditorSettings
} from '../editorSettings'
import { FontPicker } from '../FontPicker'

function NumberField({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}): React.JSX.Element {
  const [text, setText] = useState(String(value))

  useEffect(() => setText(String(value)), [value])

  function commit(): void {
    const next = Number(text)
    if (!Number.isFinite(next)) {
      setText(String(value))
      return
    }
    onChange(Math.max(min, Math.min(max, Math.round(next))))
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export function PreferencesPanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const settings = useEditorSettings()
  const [fonts, setFonts] = useState<string[] | null>(null)

  useEffect(() => {
    api.setTitle('Preferences')
  }, [api])

  useEffect(() => {
    let active = true
    void window.openGms.listFonts().then((items) => {
      if (active) setFonts(items)
    }).catch(() => {
      if (active) setFonts([])
    })
    return () => { active = false }
  }, [])

  return (
    <section className="preferences-editor">
      <header className="preferences-head">
        <div className="sprite-title preferences-title">
          <span className="sprite-title-icon"><Settings2 size={18} /></span>
          <div><strong>Preferences</strong><small>Changes are saved automatically</small></div>
        </div>
        <button className="preferences-reset" onClick={resetEditorSettings}>
          <RotateCcw size={14} /> Restore Defaults
        </button>
      </header>

      <div className="preferences-body">
        <nav className="preferences-nav" aria-label="Preference categories">
          <button className="active"><Braces size={15} /><span>Code Editor</span></button>
        </nav>

        <main className="preferences-content">
          <section className="preferences-section">
            <header><Type size={18} /><div><h2>Editor Font</h2><p>Choose how code is displayed in scripts and embedded code editors.</p></div></header>
            <div className="preferences-fields">
              <div className="preferences-field wide">
                <span>Preferred font</span>
                <FontPicker
                  value={settings.fontFamily}
                  options={fonts ?? []}
                  loading={fonts === null}
                  onChange={(fontFamily) => updateEditorSettings({ fontFamily })}
                />
              </div>
              <div className="preferences-field wide">
                <span>Fallback font</span>
                <FontPicker
                  value={settings.fontFallback}
                  options={fonts ?? []}
                  loading={fonts === null}
                  onChange={(fontFallback) => updateEditorSettings({ fontFallback })}
                />
              </div>
              <label className="preferences-field">
                <span>Font size</span>
                <NumberField
                  min={9}
                  max={40}
                  value={settings.fontSize}
                  onChange={(fontSize) => updateEditorSettings({ fontSize })}
                />
              </label>
              <label className="preferences-field">
                <span>Line height</span>
                <NumberField
                  min={12}
                  max={64}
                  value={settings.lineHeight}
                  onChange={(lineHeight) => updateEditorSettings({ lineHeight })}
                />
              </label>
              <label className="preferences-field">
                <span>Tab size</span>
                <select
                  value={settings.tabSize}
                  onChange={(event) => updateEditorSettings({ tabSize: Number(event.target.value) })}
                >
                  {[2, 3, 4, 8].map((size) => <option key={size} value={size}>{size} spaces</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="preferences-section">
            <header><Braces size={18} /><div><h2>Editor Display</h2><p>These defaults apply to every Monaco code editor.</p></div></header>
            <div className="preferences-checks">
              <label><input type="checkbox" checked={settings.fontLigatures} onChange={(event) => updateEditorSettings({ fontLigatures: event.target.checked })} /><span><strong>Font ligatures</strong><small>Use programming ligatures when supported by the selected font.</small></span></label>
              <label><input type="checkbox" checked={settings.wordWrap} onChange={(event) => updateEditorSettings({ wordWrap: event.target.checked })} /><span><strong>Word wrap</strong><small>Wrap long lines to the editor width by default.</small></span></label>
              <label><input type="checkbox" checked={settings.minimap} onChange={(event) => updateEditorSettings({ minimap: event.target.checked })} /><span><strong>Minimap</strong><small>Show the code overview on the right side of the editor.</small></span></label>
            </div>
          </section>

          <section className="preferences-preview">
            <span>Preview</span>
            <pre style={{
              fontFamily: codeFontFamily(settings.fontFamily, settings.fontFallback),
              fontSize: `${settings.fontSize}px`,
              lineHeight: `${settings.lineHeight}px`,
              fontVariantLigatures: settings.fontLigatures ? 'normal' : 'none'
            }}><code><i>/// Create player state</i>{'\n'}<b>var</b> speed = <em>4</em>;{'\n'}x += lengthdir_x(speed, direction);</code></pre>
          </section>
        </main>
      </div>
    </section>
  )
}
